import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, emptyLedger, Ledger, NearbyPreferences, normalizePreferences } from './model';

const key = (owner: string, suffix: string) => `moa-nearby-v1:${encodeURIComponent(owner)}:${suffix}`;
export const ACTIVE_KEY = 'moa-nearby-v1:active';
export type BackgroundSession = { ownerId: string; expiresAt: number };
export const readPreferences = async (owner: string): Promise<NearbyPreferences> => {
  const raw = await AsyncStorage.getItem(key(owner, 'preferences'));
  // Corrupt storage is an error, never silently enable tracking or reset deduplication.
  return raw ? normalizePreferences(JSON.parse(raw)) : { ...DEFAULT_PREFERENCES };
};
export const writePreferences = (owner: string, p: NearbyPreferences) => AsyncStorage.setItem(key(owner, 'preferences'), JSON.stringify(normalizePreferences(p)));
export async function readLedger(owner: string, test = false): Promise<Ledger> {
  const raw = await AsyncStorage.getItem(key(owner, test ? 'test-ledger' : 'ledger'));
  if (!raw) return emptyLedger();
  const value = JSON.parse(raw) as Ledger;
  if (!value || !Array.isArray(value.sent) || !value.requests || !value.places
    || ![...value.sent, ...Object.values(value.requests), ...Object.values(value.places)].every((t) => typeof t === 'number' && Number.isFinite(t) && t >= 0)) {
    throw new Error('알림 기록을 읽지 못했어요. 안전을 위해 근처 알림을 멈췄어요.');
  }
  return value;
}
export const writeLedger = (owner: string, value: Ledger, test = false) => AsyncStorage.setItem(key(owner, test ? 'test-ledger' : 'ledger'), JSON.stringify(value));
export const readBackgroundSession = async (): Promise<BackgroundSession | null> => {
  const raw = await AsyncStorage.getItem(ACTIVE_KEY);
  if (!raw) return null;
  const session = JSON.parse(raw) as BackgroundSession;
  return typeof session.ownerId === 'string' && Number.isFinite(session.expiresAt) ? session : null;
};
export const writeBackgroundSession = (session: BackgroundSession | null) => session
  ? AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(session)) : AsyncStorage.removeItem(ACTIVE_KEY);

// Headless TaskManager and foreground checks share the same JS runtime/queue.
// Reserve on disk BEFORE asking the OS to send (at-most-once on crash/retry).
let pending: Promise<unknown> = Promise.resolve();
export function serial<T>(work: () => Promise<T>): Promise<T> {
  const next = pending.then(work, work);
  pending = next.catch(() => undefined);
  return next;
}

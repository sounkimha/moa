import type { Country } from '@moa/domain';

const key = 'moa-trip-draft-v1';
const countryCodes = ['JP', 'KR', 'TW', 'HK', 'CN', 'TH', 'VN', 'SG', 'MY', 'ID', 'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'PE', 'CO', 'GB', 'FR', 'IT', 'ES', 'DE', 'CH', 'AU', 'NZ', 'IN', 'PH', 'KH', 'AE', 'TR', 'ZA', 'EG', 'MA', 'KE', 'TZ'] as const;
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type TripDraft = {
  departureCountry: Country;
  departureCity: string;
  destinationCountry: Country;
  cities: string[];
  startDate: string;
  endDate: string;
  placeIds: string[];
  capacity: string;
};

export function clearTripDraft(storage: SessionStorage) {
  try { storage.removeItem(key); } catch { /* Private browsing can disable storage. */ }
}

const validStrings = (value: unknown, maxItems: number, maxLength: number): value is string[] =>
  Array.isArray(value) && value.length <= maxItems &&
  value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= maxLength) &&
  new Set(value).size === value.length;

export function readTripDraft(storage: SessionStorage, ownerId: string): TripDraft | null {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > 50_000) return null;
    const saved = JSON.parse(raw), draft = saved.draft;
    if (saved.ownerId !== ownerId || !draft ||
      !countryCodes.includes(draft.departureCountry) ||
      typeof draft.departureCity !== 'string' || draft.departureCity.length > 40 ||
      !countryCodes.includes(draft.destinationCountry) ||
      !validStrings(draft.cities, 12, 40) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.endDate) ||
      !validStrings(draft.placeIds, 12, 200) ||
      typeof draft.capacity !== 'string' || !/^\d{0,2}$/.test(draft.capacity)) {
      clearTripDraft(storage);
      return null;
    }
    return draft as TripDraft;
  } catch {
    clearTripDraft(storage);
    return null;
  }
}

// Web tab-session only. Tickets, account tokens and identity data never belong here.
export function writeTripDraft(storage: SessionStorage, ownerId: string, draft: TripDraft | null): boolean {
  if (!draft) { clearTripDraft(storage); return true; }
  try {
    const serialized = JSON.stringify({ ownerId, draft });
    if (serialized.length > 50_000) throw new Error('Draft too large');
    storage.setItem(key, serialized);
    return true;
  } catch {
    clearTripDraft(storage);
    return false;
  }
}

import type { Snapshot } from '@moa/domain';
import { API_URL } from '../lib/api';
import { backgroundLoginToken } from '../lib/auth-storage';
import { nearbyRevision, onNearbyInterrupt } from './lifecycle';
import { activeTrips, findNearby, nextNotification, notificationContent, parsePayload, Point, reserveNotification, routeCandidates, validCoordinates } from './model';
import * as native from './platform';
import { readBackgroundSession, readLedger, readPreferences, serial, writeBackgroundSession, writeLedger } from './storage';

let foregroundOwner: string | null = null;
let blocked = false;
let regionQueue: Promise<unknown> = Promise.resolve();
let regionFingerprint = '';
function regionsSerial(work: () => Promise<void>) {
  const result = regionQueue.then(work, work);
  regionQueue = result.catch(() => undefined);
  return result;
}
export function bindNearbyOwner(owner: string | null, permitted = true) { foregroundOwner = owner; blocked = !owner || !permitted; }
async function stopRegionsAndSession() {
  regionFingerprint = '';
  // Try both even if one fails; never leave tracking on because storage failed.
  const results = await Promise.allSettled([writeBackgroundSession(null), native.stopRegions()]);
  if (results.some((r) => r.status === 'rejected')) throw new Error('백그라운드 알림을 중지하지 못했어요.');
}
export const stopBackground = () => regionsSerial(stopRegionsAndSession);
onNearbyInterrupt(() => {
  blocked = true;
  foregroundOwner = null;
  // Stop registration even if a fetch or scheduling operation is still pending.
  void stopBackground().catch(() => undefined);
  void native.dismissNearby().catch(() => undefined);
});
native.installPresentationGuard(async (raw) => {
  const payload = parsePayload(raw);
  if (!payload || blocked || (payload.test && !__DEV__)) return false;
  const owner = foregroundOwner || (await readBackgroundSession())?.ownerId;
  if (owner !== payload.ownerId) return false;
  const p = await readPreferences(owner);
  return p.notificationsEnabled && p.nearbyEnabled;
});

export async function sendNearby(d: Snapshot, point: Point, allow: () => boolean, testTripNow?: number): Promise<string> {
  return serial(async () => {
    const epoch = nearbyRevision();
    const safe = () => !blocked && allow() && epoch === nearbyRevision();
    if (!safe() || (testTripNow !== undefined && !__DEV__)) return '알림이 꺼져 있어요.';
    const p = await readPreferences(d.me.id);
    if (!p.nearbyEnabled || !p.notificationsEnabled) return '알림이 꺼져 있어요.';
    const permission = await native.permissions();
    if (!permission.location || !permission.notifications || !safe()) return '위치와 알림 권한을 확인해주세요.';
    const now = Date.now();
    const candidates = findNearby(d, point, p, 'traveler', now, testTripNow ?? now);
    if (!candidates.length) return '이 동선 근처에 지원 가능한 부탁이 없어요.';
    const test = testTripNow !== undefined;
    const ledger = await readLedger(d.me.id, test);
    const group = nextNotification(candidates, ledger, p, now);
    if (!group) return '이미 안내했거나 오늘의 알림 한도에 도달했어요.';
    if (!safe()) return '알림을 멈췄어요.';
    await writeLedger(d.me.id, reserveNotification(ledger, group, now), test);
    // Fail closed after logout/OFF, including while the disk write was pending.
    if (!safe()) return '알림을 멈췄어요.';
    await native.deliver(notificationContent(group, d.me.id, test));
    return `부탁 ${group.items.length}건을 한 알림으로 보냈어요.`;
  });
}

export function configureBackground(d: Snapshot, traveler: boolean): Promise<void> {
  const epoch = nearbyRevision();
  return regionsSerial(async () => {
  if (epoch !== nearbyRevision()) return;
  const safe = () => !blocked && traveler && foregroundOwner === d.me.id && epoch === nearbyRevision();
  const p = await readPreferences(d.me.id);
  if (!safe() || !native.backgroundSupported || !p.notificationsEnabled || !p.nearbyEnabled || !p.backgroundEnabled) {
    await stopRegionsAndSession(); return;
  }
  const trips = activeTrips(d, Date.now());
  const permission = await native.permissions();
  if (!trips.length || !permission.location || !permission.notifications || !permission.background || !await backgroundLoginToken() || !safe()) {
    await stopRegionsAndSession(); return;
  }
  const plannedPlaces = d.places.filter((place) => validCoordinates(place)
    && trips.some((trip) => trip.placeIds.includes(place.id) && trip.destinationCountry === place.country));
  const places = [...new Map([...routeCandidates(d, Date.now()).map((item) => item.place), ...plannedPlaces]
    .map((place) => [place.id, place])).values()].slice(0, 20);
  if (!places.length) { await stopRegionsAndSession(); return; }
  // iOS supports at most 20 monitored regions. Refresh on foreground/snapshot changes.
  const expiresAt = Math.max(...trips.map((t) => new Date(`${t.endDate}T23:59:59`).getTime()));
  const regions = places.map((place) => ({ identifier: place.id, latitude: place.latitude, longitude: place.longitude,
    radius: p.radius, notifyOnEnter: true, notifyOnExit: false }));
  const fingerprint = JSON.stringify([d.me.id, expiresAt, regions]);
  if (regionFingerprint === fingerprint && safe()) return;
  await writeBackgroundSession({ ownerId: d.me.id, expiresAt });
  if (!safe()) { await stopRegionsAndSession(); return; }
  await native.startRegions(regions);
  if (!safe()) await stopRegionsAndSession();
  else regionFingerprint = fingerprint;
  });
}

async function fetchBackgroundSnapshot(token: string): Promise<Snapshot | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    // No traveler coordinates are sent. Reuse the authenticated public request snapshot.
    const response = await fetch(`${API_URL}/api/snapshot`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) await stopBackground();
      return null;
    }
    const d = await response.json();
    return d?.me?.id && ['trips', 'places', 'requests', 'transactions', 'offers'].every((k) => Array.isArray(d[k])) ? d : null;
  } finally { clearTimeout(timer); }
}
export async function onPlaceEntry(): Promise<void> {
  const epoch = nearbyRevision();
  const session = await readBackgroundSession();
  if (blocked || !session || session.expiresAt < Date.now()) { await stopBackground(); return; }
  const p = await readPreferences(session.ownerId);
  if (!p.notificationsEnabled || !p.nearbyEnabled || !p.backgroundEnabled) { await stopBackground(); return; }
  const permission = await native.permissions();
  if (!permission.location || !permission.notifications || !permission.background) { await stopBackground(); return; }
  const token = await backgroundLoginToken();
  if (!token) { await stopBackground(); return; }
  const d = await fetchBackgroundSnapshot(token);
  if (!d) return;
  if (d.me.id !== session.ownerId) { await stopBackground(); return; }
  if (!activeTrips(d, Date.now()).length) { await stopBackground(); return; }
  if (blocked || epoch !== nearbyRevision()) return;
  const point = await native.currentPoint();
  if (!point) return;
  await sendNearby(d, point, () => !blocked && epoch === nearbyRevision());
}

import type { Place, ProductRequest, Role, Snapshot, Trip } from '@moa/domain';

export type NearbyPreferences = {
  notificationsEnabled: boolean;
  nearbyEnabled: boolean;
  radius: 300 | 500 | 1000;
  dailyLimit: 3 | 5 | null;
  backgroundEnabled: boolean;
};
export const DEFAULT_PREFERENCES: NearbyPreferences = {
  notificationsEnabled: true, nearbyEnabled: false, radius: 500, dailyLimit: 3, backgroundEnabled: false,
};
export type Point = { latitude: number; longitude: number; timestamp: number; accuracy: number | null };
export type Candidate = { request: ProductRequest; place: Place; trip: Trip; distance: number };
export type Group = { place: Place; items: Candidate[]; distance: number };
export type Ledger = { requests: Record<string, number>; places: Record<string, number>; sent: number[] };
export const emptyLedger = (): Ledger => ({ requests: {}, places: {}, sent: [] });
export type NearbyPayload = {
  version: 1;
  ownerId: string;
  type: 'NEARBY_REQUEST' | 'NEARBY_REQUEST_GROUP';
  requestId?: string;
  placeId: string;
  requestIds: string[];
  test?: boolean;
};
const HOUR = 3600000;
export const localDay = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function normalizePreferences(value: unknown): NearbyPreferences {
  const p = value && typeof value === 'object' ? value as Partial<NearbyPreferences> : {};
  return {
    notificationsEnabled: p.notificationsEnabled !== false,
    nearbyEnabled: p.nearbyEnabled === true,
    backgroundEnabled: p.backgroundEnabled === true && p.nearbyEnabled === true && p.notificationsEnabled !== false,
    radius: p.radius === 300 || p.radius === 1000 ? p.radius : 500,
    dailyLimit: p.dailyLimit === null || p.dailyLimit === 5 ? p.dailyLimit : 3,
  };
}
export function validCoordinates(p: Pick<Point, 'latitude' | 'longitude'>): boolean {
  return Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90
    && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;
}
export function distanceMeters(a: Pick<Point, 'latitude' | 'longitude'>, b: Pick<Point, 'latitude' | 'longitude'>): number {
  if (!validCoordinates(a) || !validCoordinates(b)) return Infinity;
  const rad = (v: number) => v * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export const freshPoint = (point: Point, now: number) => validCoordinates(point)
  && now - point.timestamp >= -10000 && now - point.timestamp <= 120000
  && point.accuracy !== null && point.accuracy >= 0 && point.accuracy <= 150;
export const activeTrips = (d: Snapshot, now: number) => d.trips.filter((t) =>
  t.travelerId === d.me.id && t.startDate <= localDay(now) && t.endDate >= localDay(now));

// The existing offer flow requires this place to be in the trip and the return
// country/date to suit delivery. Do not surface requests the traveler cannot apply to.
export function routeCandidates(d: Snapshot, now: number): Omit<Candidate, 'distance'>[] {
  const trips = activeTrips(d, now);
  const places = new Map(d.places.map((p) => [p.id, p]));
  const remaining = new Map(trips.map((trip) => {
    const reserved = d.offers.filter((o) => o.tripId === trip.id && ['PENDING', 'ACCEPTED'].includes(o.status)
      && !d.transactions.some((t) => t.offerId === o.id && t.status === 'CANCELLED'))
      .reduce((sum, o) => sum + (d.requests.find((r) => r.id === o.requestId)?.quantity ?? trip.maxItems), 0);
    return [trip.id, Math.max(0, trip.maxItems - reserved)];
  }));
  return d.requests.flatMap((request) => {
    const place = places.get(request.placeId);
    if (!place || !validCoordinates(place) || request.requesterId === d.me.id
      || !['REQUESTED', 'OFFER_RECEIVED'].includes(request.status)
      || ['OUT_OF_STOCK', 'PREORDER'].includes(request.inventoryStatus || '')
      || request.country !== place.country || request.city !== place.city
      || request.quantity < 1 || !Number.isFinite(request.localPrice) || request.localPrice < 0
      || d.transactions.some((t) => t.requestId === request.id && !['CANCELLED', 'REFUNDED'].includes(t.status))
      || d.offers.some((o) => o.requestId === request.id && (o.status === 'ACCEPTED'
        || (o.travelerId === d.me.id && o.status === 'PENDING')))) return [];
    const trip = trips.find((t) => t.placeIds.includes(place.id)
      && t.destinationCountry === place.country
      && t.departureCountry === request.deliveryCountry
      && (request.transport !== 'MEETUP' || t.departureCity === request.deliveryCity)
      && t.endDate <= request.desiredDate && request.quantity <= (remaining.get(t.id) || 0));
    // A multi-city trip's explicit placeIds are authoritative, not just its headline city.
    return trip ? [{ request, place, trip }] : [];
  });
}
export function findNearby(d: Snapshot, point: Point, p: NearbyPreferences, role: Role, now: number, tripNow = now): Candidate[] {
  if (!p.notificationsEnabled || !p.nearbyEnabled || role !== 'traveler' || !freshPoint(point, now)) return [];
  return routeCandidates(d, tripNow).map((item) => ({ ...item, distance: distanceMeters(point, item.place) }))
    .filter((item) => item.distance <= p.radius).sort((a, b) => a.distance - b.distance);
}
export function groupNearby(items: Candidate[]): Group[] {
  const groups: Group[] = [];
  for (const item of items) {
    const group = groups.find((g) => g.place.id === item.place.id || (g.place.country === item.place.country
      && g.place.city === item.place.city && distanceMeters(g.place, item.place) <= 50));
    if (group) group.items.push(item);
    else groups.push({ place: item.place, items: [item], distance: item.distance });
  }
  return groups.sort((a, b) => a.distance - b.distance);
}
export function nextNotification(items: Candidate[], ledger: Ledger, p: NearbyPreferences, now: number): Group | null {
  if (!p.notificationsEnabled || !p.nearbyEnabled) return null;
  // A backwards clock change must not bypass limits. One alert per check, >= 1 minute apart.
  if (ledger.sent.some((time) => now - time < 60000)) return null;
  const today = ledger.sent.filter((time) => time > now || localDay(time) === localDay(now)).length;
  if (p.dailyLimit !== null && today >= p.dailyLimit) return null;
  return groupNearby(items.filter(({ request, place }) =>
    (ledger.requests[request.id] === undefined || now - ledger.requests[request.id] >= 24 * HOUR)
    && (ledger.places[place.id] === undefined || now - ledger.places[place.id] >= HOUR)))
    .map((g) => ({ ...g, items: g.items.slice(0, 50) }))[0] || null;
}
export function reserveNotification(ledger: Ledger, group: Group, now: number): Ledger {
  const recent = (entries: Record<string, number>) => Object.fromEntries(Object.entries(entries).filter(([, t]) => now - t < 48 * HOUR));
  return {
    requests: { ...recent(ledger.requests), ...Object.fromEntries(group.items.map((i) => [i.request.id, now])) },
    places: { ...recent(ledger.places), ...Object.fromEntries(group.items.map((i) => [i.place.id, now])) },
    sent: [...ledger.sent.filter((t) => now - t < 48 * HOUR), now],
  };
}
export function notificationContent(group: Group, ownerId: string, test = false) {
  const ids = group.items.map((i) => i.request.id);
  const places = new Set(group.items.map((i) => i.place.id));
  const reward = group.items.reduce((sum, i) => sum + (i.request.requestedReward || 0), 0);
  const rewardText = group.items.every((i) => i.request.requestedReward !== undefined)
    ? `보상 ${ids.length > 1 ? '합계 ' : ''}₩${reward.toLocaleString('ko-KR')} · 수수료 차감 전`
    : '보상은 부탁 상세에서 확인해요';
  const data: NearbyPayload = { version: 1, ownerId, type: ids.length === 1 ? 'NEARBY_REQUEST' : 'NEARBY_REQUEST_GROUP',
    placeId: group.place.id, requestIds: ids, ...(ids.length === 1 ? { requestId: ids[0] } : {}), ...(test ? { test: true } : {}) };
  return {
    title: `${test ? '[테스트] ' : ''}가는 길에 부탁이 있어요 ✈️`,
    body: `${group.place.name}${places.size > 1 ? ` 근처 ${places.size}곳` : ''} · 약 ${Math.round(group.distance)}m\n${ids.length > 1 ? `이곳에서 부탁 ${ids.length}건을 확인해보세요.` : group.items[0].request.productName}\n${rewardText}`,
    data,
  };
}
export function parsePayload(raw: unknown): NearbyPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<NearbyPayload>;
  const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(v);
  if (p.version !== 1 || !id(p.ownerId) || !id(p.placeId)
    || !['NEARBY_REQUEST', 'NEARBY_REQUEST_GROUP'].includes(p.type || '')
    || !Array.isArray(p.requestIds) || !p.requestIds.length || p.requestIds.length > 50
    || !p.requestIds.every(id) || new Set(p.requestIds).size !== p.requestIds.length
    || (p.type === 'NEARBY_REQUEST' && (p.requestIds.length !== 1 || p.requestId !== p.requestIds[0]))) return null;
  return { version: 1, ownerId: p.ownerId, placeId: p.placeId, type: p.type!, requestIds: p.requestIds,
    ...(p.type === 'NEARBY_REQUEST' ? { requestId: p.requestId } : {}), ...(p.test === true ? { test: true } : {}) };
}
export const distanceLabel = (meters: number) => meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;

// Notification identifiers are untrusted input; verify every grouped place
// against the current public snapshot, including adjacent stores in a 50m cluster.
export function requestsFromAlert(d: Snapshot, payload: Pick<NearbyPayload, 'placeId' | 'requestIds'>): ProductRequest[] {
  const anchor = d.places.find((p) => p.id === payload.placeId);
  if (!anchor) return [];
  return d.requests.filter((r) => {
    const place = d.places.find((p) => p.id === r.placeId);
    return payload.requestIds.includes(r.id) && r.requesterId !== d.me.id && ['REQUESTED', 'OFFER_RECEIVED'].includes(r.status)
      && place && place.country === anchor.country && place.city === anchor.city && distanceMeters(place, anchor) <= 50;
  });
}

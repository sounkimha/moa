const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { seedDatabase } = require('@moa/domain/dist/seed');
const { travelerEarnings, groupForTrip } = require('@moa/domain');
const { RequestsService } = require('../dist/requests/requests');
const future = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
function fixture() {
  let db = seedDatabase();
  const trip = db.trips.find((t) => t.id === 'trip-u-min');
  Object.assign(trip, { startDate: future(4), endDate: future(7), departureCountry: 'KR', departureCity: '서울', maxItems: 10 });
  db.requests = [0, 1].map((index) => ({ ...db.requests[0], id: `audit-${index}`, requesterId: 'u-me',
    placeId: 'p-station', country: 'JP', deliveryCountry: 'KR', deliveryCity: '서울',
    status: 'REQUESTED', revision: 0, quantity: 1, desiredDate: future(12),
    transport: index ? 'MEETUP' : 'DOMESTIC_PARCEL', meetupLocation: index ? '서울역' : undefined }));
  db.offers = []; db.transactions = [];
  const service = new RequestsService({ transaction: async (fn) => {
    const next = structuredClone(db), result = fn(next); db = next; return result;
  } });
  return { service, trip, snapshot: () => db, body: { tripId: trip.id, reward: 1000,
    estimatedPurchaseDate: future(5), estimatedDeliveryDate: future(9),
    message: '원래 가는 길에 가져올게요.', transport: 'DOMESTIC_PARCEL', requestIds: ['audit-0', 'audit-1'],
    rewards: { 'audit-0': 5000, 'audit-1': 8000 } } };
}
test('traveler net reward plus commission equals gross, including half-won rounding', () => {
  for (const reward of [0, 5, 15, 1015, 2275, 50000]) {
    const result = travelerEarnings(reward);
    assert.equal(result.netReward + result.platformCommission, reward);
    assert.equal(result.platformCommission, Math.round(reward * 0.1));
  }
});
test('same-place bundle retains each buyer delivery choice and traveler-proposed reward', async () => {
  const f = fixture();
  const result = await f.service.claimBundle('u-min', randomUUID(), f.body);
  assert.equal(result.transactions.length, 2);
  assert.deepEqual(result.transactions.map((t) => t.shippingFee), [3500, 0]);
  assert.deepEqual(f.snapshot().offers.map((o) => o.transport), ['DOMESTIC_PARCEL', 'MEETUP']);
  assert.deepEqual(f.snapshot().offers.map((o) => o.reward), [5000, 8000]);
});
test('acceptance rejects delivery before return; recommendations exclude incompatible return locations', async () => {
  const f = fixture();
  await assert.rejects(f.service.claimBundle('u-min', randomUUID(), { ...f.body, estimatedDeliveryDate: future(6) }), /귀국/);
  assert.equal(f.snapshot().offers.length, 0);
  const db = f.snapshot();
  assert.equal(groupForTrip(db, f.trip).flatMap((b) => b.requests).length, 2);
  db.requests[0].deliveryCountry = 'JP'; db.requests[1].deliveryCity = '부산';
  assert.equal(groupForTrip(db, f.trip).length, 0);
  assert.equal(groupForTrip(db, { ...f.trip, endDate: future(-1) }).length, 0);
});

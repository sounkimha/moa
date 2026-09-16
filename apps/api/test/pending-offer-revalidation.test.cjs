const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { seedDatabase } = require('@moa/domain/dist/seed');
const { quote } = require('@moa/domain');
const { TransactionsService } = require('../dist/transactions/transactions');
const future = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function fixture() {
  let db = seedDatabase();
  const request = db.requests.find((r) => r.id === 'r-1');
  const offer = db.offers.find((o) => o.id === 'offer-1');
  const trip = db.trips.find((t) => t.id === offer.tripId);
  Object.assign(trip, { startDate: future(1), endDate: future(5) });
  Object.assign(offer, { estimatedPurchaseDate: future(2), estimatedDeliveryDate: future(7) });
  request.desiredDate = future(9);
  const service = new TransactionsService({ transaction: (fn) => { const draft = structuredClone(db); const result = fn(draft); db = draft; return result; } });
  return { db, request, offer, trip, service, state: () => db, accept: () => service.accept('u-me', randomUUID(), offer.id, { expectedRevision: request.revision }) };
}

test('pending offer cannot be selected after its purchase day has passed', () => {
  const f = fixture();
  f.offer.estimatedPurchaseDate = future(-1);
  assert.throws(f.accept, /구매·수령일/);
  assert.equal(f.state().transactions.length, 0);
  assert.equal(f.state().offers.find((o) => o.id === f.offer.id).status, 'PENDING');
});

test('pending selection rechecks changed travel route, delivery deadline and identity', () => {
  for (const change of [
    (f) => { f.trip.departureCountry = 'JP'; },
    (f) => { f.trip.placeIds = ['p-shibuya']; },
    (f) => { f.request.transport = f.offer.transport = 'MEETUP'; f.request.deliveryCity = '부산'; },
    (f) => { f.request.desiredDate = future(6); },
    (f) => { f.db.verifications = f.db.verifications.filter((v) => !(v.userId === f.offer.travelerId && v.kind === 'IDENTITY')); },
  ]) {
    const f = fixture(); change(f);
    assert.throws(f.accept, /일정|본인인증|구매·수령일/);
    assert.equal(f.state().transactions.length, 0);
    assert.equal(f.state().rooms.length, 0);
  }
});

test('buyer reward remains authoritative at final pending selection; repeat command creates one trade', () => {
  const f = fixture(), key = randomUUID();
  f.request.requestedReward = 0;
  Object.assign(f.db.requestFundings.find((funding) => funding.requestId === f.request.id), quote(f.request, 0, f.request.transport));
  f.offer.reward = 9000;
  const result = f.service.accept('u-me', key, f.offer.id, { expectedRevision: 0 });
  const retry = f.service.accept('u-me', key, f.offer.id, { expectedRevision: 0 });
  assert.equal(result.travelerReward, 0);
  assert.equal(result.id, retry.id);
  assert.equal(f.state().transactions.length, 1);
  assert.equal(f.state().rooms.length, 1);
});
test('changing a prepaid quote cannot change the amount at selection', () => {
  const f = fixture();
  f.request.requestedReward = 9000;
  assert.throws(f.accept, /결제한 조건과 달라요/);
  assert.equal(f.state().transactions.length, 0);
  assert.equal(f.state().requestFundings.find((funding) => funding.requestId === f.request.id).status, 'HELD');
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { seedDatabase } = require('@moa/domain/dist/seed');
const { MAX_DEMO_REWARD } = require('@moa/domain');
const { RequestsService } = require('../dist/requests/requests');
const { MockPaymentProvider } = require('../dist/infrastructure/adapters');

const future = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
function setup() {
  const db = seedDatabase();
  const trip = db.trips.find((t) => t.id === 'trip-u-min');
  trip.startDate = future(2);
  trip.endDate = future(5);
  trip.maxItems = 20;
  const service = new RequestsService({ transaction: (work) => work(db) }, new MockPaymentProvider());
  const request = (reward) => {
    const created = service.create('u-me', randomUUID(), {
    productName: '도쿄역 한정 키링', placeId: 'p-station', localPrice: 2200,
    quantity: 1, desiredDate: future(10), category: 'CHARACTER', transport: 'MEETUP',
    meetupLocation: '서울역 1번 출구',
    ...(reward === undefined ? {} : { requestedReward: reward }),
    });
    return service.pay('u-me', randomUUID(), created.id, { expectedRevision: created.revision, paymentMethod: 'CARD', paymentReference: '체험 카드 4242' });
  };
  const acceptance = (reward = 45000) => ({
    tripId: trip.id, reward, estimatedPurchaseDate: future(3),
    estimatedDeliveryDate: future(6), message: '가는 길에 가져올게요.', transport: 'MEETUP',
  });
  return { db, service, request, acceptance };
}

test('buyer reward is stored as an integer and invalid input is rejected', () => {
  const { request } = setup();
  assert.equal(request(3700).requestedReward, 3700);
  assert.equal(request(0).requestedReward, 0);
  for (const reward of [-1, 0.5, MAX_DEMO_REWARD + 1, '3700']) {
    assert.throws(() => request(reward), /requestedReward/);
  }
});

test('traveler cannot change a prepaid reward through the legacy claim route', () => {
  const { db, service, request, acceptance } = setup();
  const r = request(3700);
  const result = service.claim('u-min', randomUUID(), r.id, acceptance(99000));
  assert.equal(result.reward, 3700);
  assert.equal(db.transactions.length, 0);
  assert.equal(db.offers.find((o) => o.id === result.id).reward, 3700);
});

test('pending offers also preserve the buyer reward, including zero', () => {
  const { service, request, acceptance } = setup();
  const r = request(0);
  const offer = service.offer('u-min', randomUUID(), r.id, acceptance());
  assert.equal(offer.reward, 0);
  assert.equal(offer.status, 'PENDING');
});

test('bundle acceptance keeps each buyer reward instead of one traveler-supplied amount', () => {
  const { service, request, acceptance, db } = setup();
  const first = request(3200), second = request(0);
  const result = service.claimBundle('u-min', randomUUID(), {
    ...acceptance(), requestIds: [first.id, second.id],
    rewards: { [first.id]: 90000, [second.id]: 45000 },
  });
  assert.equal(result.totalReward, 3200);
  assert.deepEqual(result.offerIds.map((id) => db.offers.find((o) => o.id === id).reward), [3200, 0]);
  assert.equal(db.transactions.length, 0);
});

test('a missing reward is resolved before prepayment and cannot be invented by the traveler', () => {
  const { service, request, acceptance } = setup();
  const r = request();
  const offer = service.offer('u-min', randomUUID(), r.id, acceptance(5100));
  assert.equal(r.requestedReward, 0);
  assert.equal(offer.reward, 0);
  assert.equal(offer.status, 'PENDING');
});

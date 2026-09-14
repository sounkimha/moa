const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm, readFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { seedDatabase } = require('@moa/domain/dist/seed');
const { Store } = require('../dist/infrastructure/store');
let app, url, temp;
const tokens = {};
const future = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
async function call(route, body, actor = 'u-me', key = randomUUID()) {
  const response = await fetch(url + '/api' + route, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(tokens[actor] ? { Authorization: 'Bearer ' + tokens[actor] } : {}),
      'Idempotency-Key': key,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, data };
}
const requestBody = (overrides = {}) => ({
  productName: '테스트 한정 키링',
  productUrl: '',
  productImage: '',
  art: 'keyring',
  placeId: 'p-station',
  localPrice: 2420,
  quantity: 1,
  desiredDate: future(20),
  category: 'CHARACTER',
  option: '기본',
  transport: 'DOMESTIC_PARCEL',
  deliveryRecipient: '테스트 구매자',
  deliveryPhone: '010-1234-5678',
  deliveryPostalCode: '04524',
  deliveryAddress1: '서울 중구 세종대로 110',
  deliveryAddress2: '테스트 주소',
  ...overrides,
});
const offerBody = (overrides = {}) => ({
  tripId: 'trip-u-min',
  reward: 7000,
  estimatedPurchaseDate: future(5),
  estimatedDeliveryDate: future(14),
  message: '방문 예정이에요.',
  transport: 'DOMESTIC_PARCEL',
  ...overrides,
});
async function createMatch() {
  const r = await call('/requests', requestBody());
  assert.equal(r.status, 201);
  const o = await call(`/requests/${r.data.id}/offers`, offerBody(), 'u-min');
  assert.equal(o.status, 201);
  const t = await call(`/offers/${o.data.id}/accept`, { expectedRevision: 1 });
  assert.equal(t.status, 201);
  return t.data;
}
async function act(t, action, actor, extra = {}, key) {
  const response = await call(
    `/transactions/${t.id}/actions`,
    { action, expectedRevision: t.revision, ...extra },
    actor,
    key,
  );
  if (response.status === 201) return response.data;
  return response;
}
const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/CXkAAAAASUVORK5CYII=';
before(async () => {
  temp = await mkdtemp(path.join(tmpdir(), 'moa-test-'));
  process.env.DATA_FILE = path.join(temp, 'state.json');
  process.env.PORT = '0';
  process.env.QUIET = '1';
  delete process.env.DATABASE_URL;
  const { bootstrap } = require('../dist/main');
  app = await bootstrap();
  url = (await app.getUrl()).replace('[::1]', '127.0.0.1').replace('0.0.0.0', '127.0.0.1');
  for (const userId of ['u-me', 'u-min', 'u-haru', 'u-joon', 'u-sora']) {
    const r = await call('/auth/demo', { userId, provider: 'DEMO' });
    tokens[userId] = r.data.token;
  }
  // Increase the test traveler's explicit capacity, to isolate independent test scenarios.
  await app.get(Store).transaction((db) => {
    db.trips.find((t) => t.id === 'trip-u-min').maxItems = 20;
  });
});
after(async () => {
  await app?.close();
  if (temp) await rm(temp, { recursive: true, force: true });
});
test('unauthenticated clients cannot read private snapshots', async () => {
  assert.equal((await call('/snapshot', undefined, 'anonymous')).status, 401);
});
test('metadata has a deterministic catalog and safe manual fallback', async () => {
  assert.equal(
    (await call('/metadata', { url: 'https://demo.moa.local/products/1' })).data.status,
    'DEMO_FOUND',
  );
  const result = await call('/metadata', { url: 'http://127.0.0.1/private' });
  assert.equal(result.data.status, 'LINK_UNREACHABLE');
  assert.equal(result.data.product, null);
});
test('sample OCR and visual recognition identifies a catalog product', async () => {
  const result = await call('/recognize', { sample: 'chiikawa' });
  assert.equal(result.status, 201);
  assert.equal(result.data.status, 'PRODUCT_IDENTIFIED');
  assert.equal(result.data.product.id, 'product-1');
  assert.equal(result.data.signals.character, '치이카와');
  assert.equal(result.data.suggestion.productName, '치이카와 도쿄역 한정 키링');
  assert.equal(result.data.suggestion.placeId, 'p-station');
  assert.equal(result.data.suggestion.storeName, '도쿄역 캐릭터 스트리트');
  assert.equal(result.data.suggestion.category, 'CHARACTER');
  assert.ok(result.data.confidence >= 0.8);
  assert.equal((await call('/recognize', {})).status, 400);
});
test('negative amounts, prohibited categories, incomplete delivery and impossible dates fail validation', async () => {
  for (const body of [
    requestBody({ localPrice: -1 }),
    requestBody({ category: 'ALCOHOL' }),
    requestBody({ desiredDate: '2026-02-30' }),
    requestBody({ deliveryAddress1: '' }),
    requestBody({ transport: 'MEETUP', deliveryRecipient: undefined, deliveryPhone: undefined, deliveryPostalCode: undefined, deliveryAddress1: undefined, deliveryAddress2: undefined, meetupLocation: '' }),
  ])
    assert.equal((await call('/requests', body)).status, 400);
});
test('addresses can be added and selected as default', async () => {
  const added = await call('/addresses', {
    label: '회사', recipient: '테스트 구매자', phone: '010-9999-8888', postalCode: '06236',
    address1: '서울 강남구 테헤란로 1', address2: '10층', isDefault: false,
  });
  assert.equal(added.status, 201);
  assert.equal((await call(`/addresses/${added.data.id}/default`, {})).status, 201);
  const snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.addresses.find((item) => item.id === added.data.id).isDefault, true);
  assert.equal(snapshot.addresses.filter((item) => item.userId === 'u-me' && item.isDefault).length, 1);
});
test('one trip can include multiple cities in the same country', async () => {
  const trip = await call('/trips', {
    departureCountry: 'KR', departureCity: '서울', destinationCountry: 'JP', destinationCity: '도쿄',
    startDate: future(4), endDate: future(9), placeIds: ['p-shibuya', 'p-sapporo'], maxItems: 5,
  });
  assert.equal(trip.status, 201);
  assert.deepEqual(trip.data.placeIds, ['p-shibuya', 'p-sapporo']);
});
test('self offers and trips outside the request location are rejected', async () => {
  const r = (await call('/requests', requestBody())).data;
  assert.equal(
    (await call(`/requests/${r.id}/offers`, offerBody({ tripId: 'trip-u-me' }))).status,
    409,
  );
  assert.equal(
    (await call(`/requests/${r.id}/offers`, offerBody({ tripId: 'trip-u-me' }), 'u-min')).status,
    409,
  );
  assert.equal(
    (
      await call(
        `/requests/${r.id}/offers`,
        offerBody({ estimatedPurchaseDate: future(30) }),
        'u-min',
      )
    ).status,
    409,
  );
});
test('traveler hand-carries across borders and buyer chooses last-mile delivery', async () => {
  const request = await call(
    '/requests',
    requestBody({
      placeId: 'p-seongsu',
      localPrice: 22000,
      deliveryCountry: 'JP',
      deliveryCity: '도쿄',
    }),
  );
  assert.equal(request.status, 201);
  assert.equal(request.data.currency, 'KRW');
  const trip = await call(
    '/trips',
    {
      departureCountry: 'JP',
      departureCity: '도쿄',
      destinationCountry: 'KR',
      destinationCity: '서울',
      startDate: future(4),
      endDate: future(7),
      placeIds: ['p-seongsu'],
      maxItems: 3,
    },
    'u-min',
  );
  assert.equal(trip.status, 201);
  assert.equal(
    (
      await call(
        `/requests/${request.data.id}/offers`,
        offerBody({ tripId: trip.data.id, transport: 'INTERNATIONAL_SHIPPING' }),
        'u-min',
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        `/requests/${request.data.id}/offers`,
        offerBody({ tripId: trip.data.id }),
        'u-min',
      )
    ).status,
    201,
  );
});
test('mixed-place bundle rollback leaves zero partial offers', async () => {
  const a = (await call('/requests', requestBody())).data,
    b = (await call('/requests', requestBody({ placeId: 'p-shibuya' }))).data;
  const result = await call(
    '/bundles/offers',
    { ...offerBody(), requestIds: [a.id, b.id] },
    'u-min',
  );
  assert.equal(result.status, 409);
  const snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.offers.filter((o) => [a.id, b.id].includes(o.requestId)).length, 0);
});
test('one invalid item rolls back the entire same-place bundle', async () => {
  const a = (await call('/requests', requestBody())).data,
    b = (await call('/requests', requestBody({ desiredDate: future(6) }))).data;
  const result = await call(
    '/bundles/offers',
    { ...offerBody(), requestIds: [a.id, b.id] },
    'u-min',
  );
  assert.equal(result.status, 409);
  const snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.offers.filter((o) => [a.id, b.id].includes(o.requestId)).length, 0);
});
test('valid bundle produces individual offers and rejects duplicate IDs', async () => {
  const a = (await call('/requests', requestBody())).data,
    b = (await call('/requests', requestBody())).data;
  assert.equal(
    (await call('/bundles/offers', { ...offerBody(), requestIds: [a.id, a.id] }, 'u-min')).status,
    409,
  );
  const result = await call(
    '/bundles/offers',
    { ...offerBody(), requestIds: [a.id, b.id] },
    'u-min',
  );
  assert.equal(result.status, 201);
  assert.equal(result.data.offerIds.length, 2);
  assert.equal(result.data.totalReward, 4550);
});
test('traveler acceptance immediately opens a matched transaction and chat', async () => {
  const request = (await call('/requests', requestBody())).data;
  const result = await call(`/requests/${request.id}/claim`, offerBody(), 'u-min');
  assert.equal(result.status, 201);
  assert.equal(result.data.status, 'MATCHED');
  assert.equal(result.data.travelerReward, 2275);
  const snapshot = (await call('/snapshot', undefined, 'u-min')).data;
  assert.ok(snapshot.rooms.some((room) => room.transactionId === result.data.id));
});
test('concurrent offer selection creates exactly one transaction', async () => {
  const r = (await call('/requests', requestBody())).data;
  const o1 = (await call(`/requests/${r.id}/offers`, offerBody(), 'u-min')).data;
  const o2 = (
    await call(`/requests/${r.id}/offers`, offerBody({ tripId: 'trip-u-joon' }), 'u-joon')
  ).data;
  const results = await Promise.all([
    call(`/offers/${o1.id}/accept`, { expectedRevision: 2 }),
    call(`/offers/${o2.id}/accept`, { expectedRevision: 2 }),
  ]);
  assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
  const snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.transactions.filter((t) => t.requestId === r.id).length, 1);
});
test('mock payment failure has no ledger write, duplicate success is idempotent', async () => {
  let t = await createMatch();
  assert.equal((await act(t, 'PAY', 'u-me', { simulateFailure: true })).status, 400);
  let snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.escrows.filter((e) => e.transactionId === t.id).length, 0);
  const k = randomUUID();
  const [a, b] = await Promise.all([act(t, 'PAY', 'u-me', {}, k), act(t, 'PAY', 'u-me', {}, k)]);
  assert.equal(a.id, b.id);
  assert.equal(a.status, 'PAYMENT_HELD');
  snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.payments.filter((p) => p.transactionId === t.id).length, 1);
  const mismatch = await call(
    `/transactions/${t.id}/actions`,
    { action: 'PAY', expectedRevision: 99 },
    'u-me',
    k,
  );
  assert.equal(mismatch.status, 409);
});
test('full buyer/traveler flow settles once and separates reimbursement from reward', async () => {
  let t = await createMatch();
  t = await act(t, 'PAY', 'u-me');
  assert.equal((await act(t, 'SETTLE', 'u-min')).status, 409);
  assert.equal(
    (
      await act(t, 'PURCHASE', 'u-me', {
        productImage: png,
        receiptImage: png,
        storeName: '예시 매장',
        purchasedAt: future(5),
        localAmount: 2420,
        locationNote: '도쿄역',
      })
    ).status,
    403,
  );
  t = await act(t, 'PURCHASE', 'u-min', {
    productImage: png,
    receiptImage: png,
    storeName: '예시 매장',
    purchasedAt: future(5),
    localAmount: 2420,
    locationNote: '도쿄역',
  });
  assert.equal(t.status, 'PURCHASED');
  t = await act(t, 'TRAVEL', 'u-min');
  t = await act(t, 'SHIP', 'u-min', { carrier: '테스트 배송사', trackingNumber: 'DEMO-123' });
  t = await act(t, 'RECEIVE', 'u-me');
  t = await act(t, 'CONFIRM', 'u-me');
  const key = randomUUID(),
    before = t;
  t = await act(t, 'SETTLE', 'u-min', {}, key);
  assert.equal(t.status, 'SETTLED');
  assert.equal((await act(before, 'SETTLE', 'u-min', {}, key)).status, 'SETTLED');
  const snap = (await call('/snapshot', undefined, 'u-min')).data,
    p = snap.payouts.find((p) => p.transactionId === t.id);
  assert.equal(p.reward, 2275);
  assert.equal(p.platformCommission, 228);
  assert.equal(p.netReward, 2047);
  assert.equal(p.reimbursement, 22748);
  assert.equal(p.amount, 28295);
  assert.equal(snap.payouts.filter((p) => p.transactionId === t.id).length, 1);
  assert.equal(
    (await call(`/transactions/${t.id}/reviews`, { rating: 5, text: '꼼꼼하게 전달해주셨어요.' }))
      .status,
    201,
  );
  assert.equal(
    (await call(`/transactions/${t.id}/reviews`, { rating: 5, text: '중복 후기' })).status,
    409,
  );
});
test('unrelated users cannot read receipts, escrow, chats or issue commands', async () => {
  const snapshot = (await call('/snapshot', undefined, 'u-sora')).data;
  assert.equal(snapshot.transactions.length, 0);
  assert.equal(snapshot.receipts.length, 0);
  assert.equal(snapshot.escrows.length, 0);
  assert.equal(snapshot.messages.length, 0);
  assert.equal(snapshot.addresses.length, 0);
  assert.equal(snapshot.requests.find((request) => request.id === 'r-1').deliveryAddress1, undefined);
  assert.equal(snapshot.commands, undefined);
  assert.equal(snapshot.verifications, undefined);
  const own = (await call('/snapshot')).data;
  assert.equal(
    (await call(`/rooms/${own.rooms[0].id}/messages`, { text: 'Unauthorized' }, 'u-sora')).status,
    409,
  );
});
test('chat message retries do not send twice and participants can read them', async () => {
  const own = (await call('/snapshot')).data,
    room = own.rooms[0],
    key = randomUUID();
  const [a, b] = await Promise.all([
    call(`/rooms/${room.id}/messages`, { text: '영수증 부탁드려요.' }, 'u-me', key),
    call(`/rooms/${room.id}/messages`, { text: '영수증 부탁드려요.' }, 'u-me', key),
  ]);
  assert.equal(a.data.id, b.data.id);
  const snapshot = (await call('/snapshot', undefined, room.travelerId)).data;
  assert.equal(snapshot.messages.filter((m) => m.id === a.data.id).length, 1);
});
test('dispute freezes escrow and blocks payout', async () => {
  let t = await createMatch();
  t = await act(t, 'PAY', 'u-me');
  t = await act(t, 'DISPUTE', 'u-me', { reason: '상품 구매 진행에 문제가 있어요.' });
  assert.equal(t.status, 'DISPUTED');
  assert.equal((await act(t, 'SETTLE', 'u-min')).status, 409);
  const snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.escrows.find((e) => e.transactionId === t.id).status, 'FROZEN');
});
test('pre-purchase cancellation refunds the mock ledger completely', async () => {
  let t = await createMatch();
  t = await act(t, 'PAY', 'u-me');
  t = await act(t, 'CANCEL', 'u-me');
  assert.equal(t.status, 'CANCELLED');
  const snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.escrows.find((e) => e.transactionId === t.id).status, 'REFUNDED');
  assert.equal(snapshot.payments.find((e) => e.transactionId === t.id).status, 'REFUNDED');
});
test('international shipping is rejected for new requests and direct acceptance', async () => {
  const invalidRequest = await call('/requests', requestBody({ transport: 'INTERNATIONAL_SHIPPING' }));
  assert.equal(invalidRequest.status, 400);
  assert.match(invalidRequest.data.message, /국내 택배 또는 직거래/);
  const request = await call('/requests', requestBody());
  const claim = await call(`/requests/${request.data.id}/claim`, offerBody({ transport: 'INTERNATIONAL_SHIPPING' }), 'u-min');
  assert.equal(claim.status, 400);
});
test('file repository survives a new instance and failed mutations roll back', async () => {
  const store = app.get(Store);
  const before = await store.read((db) => db.requests.length);
  await assert.rejects(
    store.transaction((db) => {
      db.requests = [];
      throw new Error('rollback');
    }),
  );
  const other = new Store();
  assert.equal(await other.read((db) => db.requests.length), before);
});
test('PostgreSQL schema loads seed and rejects invalid totals and foreign keys', async () => {
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite();
  try {
    await db.exec(await readFile(path.resolve('../../database/001_initial.sql'), 'utf8'));
    const data = seedDatabase();
    await db.exec('BEGIN; SET CONSTRAINTS ALL DEFERRED;');
    for (const [table, rows] of Object.entries(data))
      for (const row of rows)
        await db.query(`INSERT INTO moa.${table}(id,payload) VALUES($1,$2)`, [
          row.id,
          JSON.stringify(row),
        ]);
    await db.exec('COMMIT');
    const count = await db.query('SELECT count(*)::int AS n FROM moa.requests');
    assert.equal(count.rows[0].n, 15);
    const request = { ...data.requests[0], id: 'bad-fk', placeId: 'missing-place' };
    await assert.rejects(
      db.query('INSERT INTO moa.requests(id,payload) VALUES($1,$2)', [
        request.id,
        JSON.stringify(request),
      ]),
    );
    const t = {
      id: 'bad-total',
      createdAt: new Date().toISOString(),
      requestId: 'r-1',
      offerId: 'offer-1',
      travelerId: 'u-min',
      buyerId: 'u-me',
      productPrice: 100,
      travelerReward: 100,
      platformFee: 10,
      shippingFee: 0,
      taxReserve: 0,
      totalPrice: 999,
      status: 'MATCHED',
      revision: 0,
      transport: 'INTERNATIONAL_SHIPPING',
      estimatedDeliveryDate: future(14),
      fxRate: 9.4,
    };
    await assert.rejects(
      db.query('INSERT INTO moa.transactions(id,payload) VALUES($1,$2)', [t.id, JSON.stringify(t)]),
    );
  } finally {
    await db.close();
  }
});

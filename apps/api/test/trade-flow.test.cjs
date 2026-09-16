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
  requestedReward: 7000,
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
// Most lifecycle tests begin with a published, prepaid request.
async function fundedRequest(body, actor = 'u-me', key = randomUUID()) {
  const created = await call('/requests', body, actor, key);
  if (created.status !== 201) return created;
  return call(`/requests/${created.data.id}/pay`, { expectedRevision: 0, paymentMethod: 'CARD', paymentReference: '체험 카드 4242' }, actor, `fund-${key}`);
}
async function createMatch() {
  const r = await fundedRequest(requestBody());
  assert.equal(r.status, 201);
  const o = await call(`/requests/${r.data.id}/offers`, offerBody(), 'u-min');
  assert.equal(o.status, 201);
  const t = await call(`/offers/${o.data.id}/accept`, { expectedRevision: 2 });
  assert.equal(t.status, 201);
  return t.data;
}
async function createLegacyMatch() {
  const t = await createMatch();
  // Fixture representing a persisted pre-migration, genuinely unpaid match.
  return app.get(Store).transaction((db) => {
    db.requestFundings = db.requestFundings.filter((f) => f.requestId !== t.requestId);
    db.payments = db.payments.filter((p) => p.transactionId !== t.id);
    db.escrows = db.escrows.filter((e) => e.transactionId !== t.id);
    const saved = db.transactions.find((item) => item.id === t.id);
    saved.status = 'MATCHED';
    db.requests.find((r) => r.id === t.requestId).status = 'MATCHED';
    return saved;
  });
}
async function act(t, action, actor, extra = {}, key) {
  const response = await call(
    `/transactions/${t.id}/actions`,
    {
      action,
      expectedRevision: t.revision,
      ...(action === 'PAY' ? { paymentMethod: 'CARD', paymentReference: '카드 끝 4242' } : {}),
      ...extra,
    },
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
  // Increase test travelers' explicit capacity, to isolate independent test scenarios.
  await app.get(Store).transaction((db) => {
    db.trips.find((t) => t.id === 'trip-u-min').maxItems = 20;
    db.trips.find((t) => t.id === 'trip-u-haru').maxItems = 20;
  });
});
after(async () => {
  await app?.close();
  if (temp) await rm(temp, { recursive: true, force: true });
});
test('unauthenticated clients cannot read private snapshots', async () => {
  assert.equal((await call('/snapshot', undefined, 'anonymous')).status, 401);
});
test('traveler identity verification stores only the result and gates offer creation', async () => {
  const before = await app.get(Store).read((db) => db.verifications.some((item) => item.userId === 'u-me' && item.kind === 'IDENTITY'));
  assert.equal(before, false);
  const request = (await fundedRequest(requestBody(), 'u-sora')).data;
  const blocked = await call(`/requests/${request.id}/offers`, offerBody({ tripId: 'trip-u-me' }), 'u-me');
  assert.equal(blocked.status, 409);
  assert.match(blocked.data.message, /본인인증/);
  const verified = await call('/auth/identity/verify', {
    name: '인증테스트', phone: '01099998888', birthDate: '950101', consent: true,
  });
  assert.equal(verified.status, 201);
  assert.equal(verified.data.maskedPhone, '010-****-8888');
  const snapshot = (await call('/snapshot')).data;
  assert.ok(snapshot.me.verificationLabels.includes('본인 인증'));
  const raw = await readFile(path.join(temp, 'state.json'), 'utf8');
  assert.ok(!raw.includes('인증테스트'));
  assert.ok(!raw.includes('01099998888'));
  assert.ok(!raw.includes('950101'));
  assert.equal((await call(`/requests/${request.id}/offers`, offerBody({ tripId: 'trip-u-me' }), 'u-me')).status, 201);
});
test('Codespaces web origin can preflight the demo login endpoint', async () => {
  const origin = 'https://glowing-space-garbanzo-g4q9g5qqvwrgfv6w6-8081.app.github.dev';
  const response = await fetch(url + '/api/auth/demo', {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Idempotency-Key',
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});
test('cancelled request retry notifies previous other travelers once, without reusing old offers', async () => {
  const r = (await fundedRequest(requestBody())).data;
  const first = await call(`/requests/${r.id}/offers`, offerBody(), 'u-min');
  const second = await call(`/requests/${r.id}/offers`, offerBody({ tripId: 'trip-u-haru' }), 'u-haru');
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  let t = (await call(`/offers/${first.data.id}/accept`, { expectedRevision: 3 })).data;
  t = await act(t, 'CANCEL', 'u-me');
  assert.equal(t.status, 'CANCELLED');
  const body = requestBody({ retryOfRequestId: r.id });
  const key = randomUUID();
  const retry = await fundedRequest(body, 'u-me', key);
  assert.equal(retry.status, 201);
  const again = await fundedRequest(body, 'u-me', key);
  assert.equal(again.data.id, retry.data.id);
  assert.notEqual((await fundedRequest(body)).status, 201);
  assert.notEqual((await fundedRequest(body, 'u-joon')).status, 201);
  const state = await app.get(Store).read((db) => db);
  const notices = state.notifications.filter((n) => n.requestId === retry.data.id);
  assert.deepEqual(notices.map((n) => n.userId), ['u-haru']);
  assert.equal(state.transactions.find((item) => item.id === t.id).status, 'CANCELLED');
  assert.equal(state.offers.filter((o) => o.requestId === retry.data.id).length, 0);
  assert.equal((await call(`/requests/${retry.data.id}/offers`, offerBody({ tripId: 'trip-u-haru' }), 'u-haru')).status, 201);
});
test('meetup coordinates and detail persist privately; invalid coordinates are rejected', async () => {
  const point = { name: '직거래 테스트 역', address: '서울 중구', latitude: 37.555, longitude: 126.97, detail: '1번 출구 편의점 앞' };
  const body = requestBody({ transport: 'MEETUP', meetupLocation: point.name, meetupPoint: point });
  const r = await fundedRequest(body);
  assert.equal(r.status, 201); assert.deepEqual(r.data.meetupPoint, point);
  const other = (await call('/snapshot', undefined, 'u-joon')).data.requests.find((v) => v.id === r.data.id);
  assert.equal(other.meetupPoint, undefined); assert.equal(other.meetupLocation, undefined);
  const o = (await call(`/requests/${r.data.id}/offers`, offerBody({ transport: 'MEETUP' }), 'u-min')).data;
  assert.equal((await call(`/offers/${o.id}/accept`, { expectedRevision: 2 })).status, 201);
  const partner = (await call('/snapshot', undefined, 'u-min')).data.requests.find((v) => v.id === r.data.id);
  assert.deepEqual(partner.meetupPoint, point);
  assert.equal((await fundedRequest({ ...body, meetupPoint: { ...point, latitude: 91 } })).status, 400);
});
test('place search never returns fake results when the provider is not configured', async () => {
  const original = process.env.KAKAO_REST_API_KEY;
  delete process.env.KAKAO_REST_API_KEY;
  try {
    assert.equal((await call('/meetup/search?q=' + encodeURIComponent('서울역'))).status, 503);
    assert.equal((await call('/meetup/search?q=a')).status, 400);
  } finally { if (original) process.env.KAKAO_REST_API_KEY = original; }
});
test('Asian cities, local currencies, decimal prices and multiple Japanese cities work', async () => {
  const { DESTINATIONS, quote } = require('@moa/domain');
  const state = (await call('/snapshot')).data;
  for (const [country, entry] of Object.entries(DESTINATIONS)) for (const city of entry.cities)
    assert.ok(state.places.some((p) => p.country === country && p.city === city), country + city);
  const r = await fundedRequest(requestBody({ placeId: 'p-singapore-haji', localPrice: 12.75 }));
  assert.equal(r.status, 201); assert.equal(r.data.currency, 'SGD');
  assert.equal(quote(r.data, 0, 'MEETUP').productPrice, 12750);
  const tripBody = { departureCountry: 'KR', departureCity: '서울', destinationCountry: 'TW', destinationCity: '타이베이', startDate: future(2), endDate: future(8), placeIds: ['p-taipei-ximen'], maxItems: 5 };
  assert.equal((await call('/trips', tripBody, 'u-joon')).status, 201);
  assert.notEqual((await call('/trips', { ...tripBody, destinationCity: '도쿄' }, 'u-joon')).status, 201);
  const sapporo = state.places.find((p) => p.city === '삿포로');
  assert.equal((await call('/trips', { ...tripBody, destinationCountry: 'JP', destinationCity: '도쿄', placeIds: ['p-station', sapporo.id] }, 'u-joon')).status, 201);
  const islandTrip = await call('/trips', {
    ...tripBody,
    destinationCountry: 'JP', destinationCity: '이시가키섬', placeIds: [],
    customStops: ['이시가키섬 · 유글레나 몰'],
  }, 'u-joon');
  assert.equal(islandTrip.status, 201);
  assert.deepEqual(islandTrip.data.customStops, ['이시가키섬 · 유글레나 몰']);
  assert.notEqual((await call('/trips', {
    ...tripBody,
    destinationCountry: 'JP', destinationCity: '이시가키섬', placeIds: ['p-station'],
    customStops: ['이시가키섬'],
  }, 'u-joon')).status, 201);
  const mixedRoute = await call('/trips', {
    ...tripBody,
    destinationCountry: 'JP', destinationCity: '도쿄', destinationAreas: ['도쿄', '이시가키섬'],
    placeIds: ['p-station'], customStops: ['이시가키섬 · 유글레나 몰'],
  }, 'u-joon');
  assert.equal(mixedRoute.status, 201);
  assert.deepEqual(mixedRoute.data.destinationAreas, ['도쿄', '이시가키섬']);
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
    assert.equal((await fundedRequest(body)).status, 400);
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
  const edited = await call('/addresses', {
    id: added.data.id, label: '회사', recipient: '테스트 구매자', phone: '010-9999-8888', postalCode: '06236',
    address1: '서울 강남구 테헤란로 1', address2: '11층', isDefault: false,
  });
  assert.equal(edited.status, 201);
  assert.equal(edited.data.isDefault, true, 'editing a default with false cannot remove the only default');
  const updated = (await call('/snapshot')).data;
  assert.equal(updated.addresses.filter((item) => item.isDefault).length, 1);
  assert.equal(updated.addresses.find((item) => item.isDefault).id, added.data.id);
  assert.equal(updated.addresses.find((item) => item.isDefault).address2, '11층');
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
  const r = (await fundedRequest(requestBody())).data;
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
    409, // New real trips now require flight verification before any acceptance.
  );
});
test('mixed-place bundle rollback leaves zero partial offers', async () => {
  const a = (await fundedRequest(requestBody())).data,
    b = (await fundedRequest(requestBody({ placeId: 'p-shibuya' }))).data;
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
  const a = (await fundedRequest(requestBody())).data,
    b = (await fundedRequest(requestBody({ desiredDate: future(6) }))).data;
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
  const a = (await fundedRequest(requestBody())).data,
    b = (await fundedRequest(requestBody())).data;
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
  assert.equal(result.data.totalReward, 14000);
});
test('legacy claim is only an application and cannot bypass buyer selection', async () => {
  const request = (await fundedRequest(requestBody())).data;
  const result = await call(`/requests/${request.id}/claim`, offerBody(), 'u-min');
  assert.equal(result.status, 201);
  assert.equal(result.data.status, 'PENDING');
  assert.equal(result.data.reward, 7000);
  const snapshot = (await call('/snapshot', undefined, 'u-min')).data;
  assert.equal(snapshot.transactions.some((t) => t.requestId === request.id), false);
  assert.equal(snapshot.rooms.some((room) => room.transactionId === result.data.id), false);
});
test('concurrent offer selection creates exactly one transaction', async () => {
  const r = (await fundedRequest(requestBody())).data;
  const o1 = (await call(`/requests/${r.id}/offers`, offerBody(), 'u-min')).data;
  const o2 = (
    await call(`/requests/${r.id}/offers`, offerBody({ tripId: 'trip-u-joon' }), 'u-joon')
  ).data;
  const results = await Promise.all([
    call(`/offers/${o1.id}/accept`, { expectedRevision: 3 }),
    call(`/offers/${o2.id}/accept`, { expectedRevision: 3 }),
  ]);
  assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
  const snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.transactions.filter((t) => t.requestId === r.id).length, 1);
});
test('buyer-prepaid rewards survive selection and file reload', async () => {
  const r = (await fundedRequest(requestBody({ quantity: 2, requestedReward: 150005 }))).data;
  const key = randomUUID();
  const body = offerBody({ reward: 150005, tripId: 'trip-u-haru' });
  const offer = await call(`/requests/${r.id}/offers`, body, 'u-haru', key);
  assert.equal(offer.status, 201);
  assert.equal(offer.data.reward, 150005);
  assert.equal((await call(`/requests/${r.id}/offers`, body, 'u-haru', key)).data.id, offer.data.id);
  let t = (await call(`/offers/${offer.data.id}/accept`, { expectedRevision: 2 })).data;
  assert.equal(t.travelerReward, 150005);
  assert.equal(t.totalPrice, 199001);
  assert.equal(t.status, 'PAYMENT_HELD');
  const reloaded = new Store();
  assert.equal(await reloaded.read((db) => db.offers.find((o) => o.id === offer.data.id).reward), 150005);
  assert.equal(await reloaded.read((db) => db.payments.find((p) => p.transactionId === t.id).amount), 199001);
});
test('purchase proof accepts either a product photo or receipt while preserving the missing attachment', async () => {
  let t = await createMatch();
  t = await act(t, 'PURCHASE', 'u-min', {
    productImage: '', receiptImage: png, storeName: '예시 매장', purchasedAt: future(5),
    localAmount: 2420, locationNote: '도쿄역 매장',
  });
  assert.equal(t.status, 'PURCHASED');
  const receipt = await app.get(Store).read((db) => db.receipts.find((item) => item.transactionId === t.id));
  assert.equal(receipt.outcome, 'PURCHASED');
  assert.equal(receipt.productImage, '');
  assert.equal(receipt.receiptImage, png);

  let missing = await createMatch();
  assert.equal((await act(missing, 'PURCHASE', 'u-min', {
    productImage: '', receiptImage: '', storeName: '예시 매장', purchasedAt: future(5),
    localAmount: 2420, locationNote: '도쿄역 매장',
  })).status, 409);
});
test('out-of-stock evidence cancels the trade, refunds escrow and keeps a retryable visit record', async () => {
  let t = await createMatch();
  const key = randomUUID();
  const evidence = {
    evidenceImage: png, storeName: '도쿄역 예시 매장', checkedAt: future(5),
    locationNote: '도쿄역 지하 1층', reason: 'OUT_OF_STOCK', note: '직원이 재입고 일정을 모른다고 안내했어요.',
  };
  const cancelled = await act(t, 'OUT_OF_STOCK', 'u-min', evidence, key);
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal((await act(t, 'OUT_OF_STOCK', 'u-min', evidence, key)).status, 'CANCELLED');
  const snapshot = (await call('/snapshot')).data;
  const request = snapshot.requests.find((item) => item.id === t.requestId);
  const report = snapshot.receipts.find((item) => item.transactionId === t.id);
  assert.equal(request.status, 'CANCELLED');
  assert.equal(request.inventoryStatus, 'OUT_OF_STOCK');
  assert.equal(report.outcome, 'OUT_OF_STOCK');
  assert.equal(report.unavailableReason, 'OUT_OF_STOCK');
  assert.equal(snapshot.payments.find((item) => item.transactionId === t.id).status, 'REFUNDED');
  assert.equal(snapshot.escrows.find((item) => item.transactionId === t.id).status, 'REFUNDED');
  assert.equal(snapshot.offers.find((item) => item.id === t.offerId).status, 'CANCELLED');
  assert.ok(snapshot.notifications.some((item) => item.transactionId === t.id && item.title.includes('품절')));
  assert.equal((await fundedRequest(requestBody({ retryOfRequestId: t.requestId }))).status, 201);
});
test('both bundle paths retain different prepaid buyer rewards and reject incomplete maps atomically', async () => {
  const trip = { id: 'trip-u-haru' };
  for (const endpoint of ['/bundles/offers', '/bundles/claim']) {
    const a = (await fundedRequest(requestBody({ requestedReward: 1005 }))).data;
    const b = (await fundedRequest(requestBody({ quantity: 2, requestedReward: 0 }))).data;
    const common = { ...offerBody({ tripId: trip.id }), requestIds: [b.id, a.id] };
    for (const rewards of [{ [a.id]: 1005 }, { [a.id]: 1005, [b.id]: 0, unrelated: 5000 }]) {
      assert.equal((await call(endpoint, { ...common, rewards }, 'u-haru')).status, 400);
    }
    assert.equal(await app.get(Store).read((db) => db.offers.filter((o) => [a.id, b.id].includes(o.requestId)).length), 0);
    const body = { ...common, rewards: { [a.id]: 1005, [b.id]: 0 } };
    const key = randomUUID();
    const result = await call(endpoint, body, 'u-haru', key);
    assert.equal(result.status, 201);
    assert.equal(result.data.totalReward, 1005);
    const snapshot = (await call('/snapshot', undefined, 'u-haru')).data;
    assert.equal(snapshot.offers.find((o) => o.requestId === a.id).reward, 1005);
    assert.equal(snapshot.offers.find((o) => o.requestId === b.id).reward, 0);
    assert.equal(snapshot.transactions.some((t) => [a.id, b.id].includes(t.requestId)), false);
    assert.equal((await call(endpoint, body, 'u-haru', key)).data.id, result.data.id);
    assert.equal((await call(endpoint, { ...body, rewards: { [a.id]: 1006, [b.id]: 0 } }, 'u-haru', key)).status, 409);
  }
});
test('rewards require explicit whole-won values within the demo amount range', async () => {
  const r = (await fundedRequest(requestBody())).data;
  for (const reward of [-1, 12.5, '5000', null, undefined, 2000001]) {
    assert.equal((await call(`/requests/${r.id}/offers`, offerBody({ reward }), 'u-min')).status, 400);
  }
  assert.equal(await app.get(Store).read((db) => db.offers.filter((o) => o.requestId === r.id).length), 0);
});
test('legacy mock payment failure has no ledger write, duplicate success is idempotent', async () => {
  let t = await createLegacyMatch();
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
    { action: 'PAY', expectedRevision: 99, paymentMethod: 'CARD', paymentReference: '카드 끝 4242' },
    'u-me',
    k,
  );
  assert.equal(mismatch.status, 409);
});
test('wallet payment debits once and cancellation restores the exact balance', async () => {
  const before = (await call('/snapshot')).data;
  const wallet = before.wallets[0];
  const method = before.paymentMethods.find((item) => item.type === 'WALLET');
  let t = await createLegacyMatch();
  const key = randomUUID();
  const paid = await call(`/transactions/${t.id}/actions`, {
    action: 'PAY', expectedRevision: t.revision, paymentMethodId: method.id,
  }, 'u-me', key);
  assert.equal(paid.status, 201);
  t = paid.data;
  let snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.wallets[0].availableBalance, wallet.availableBalance - t.totalPrice);
  assert.equal(snapshot.walletTransactions.filter((entry) => entry.transactionId === t.id && entry.type === 'PAYMENT').length, 1);
  assert.equal((await call(`/transactions/${t.id}/actions`, {
    action: 'PAY', expectedRevision: 0, paymentMethodId: method.id,
  }, 'u-me', key)).data.id, t.id);
  t = await act(t, 'CANCEL', 'u-me');
  assert.equal(t.status, 'CANCELLED');
  snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.wallets[0].availableBalance, wallet.availableBalance);
  assert.equal(snapshot.walletTransactions.filter((entry) => entry.transactionId === t.id && entry.type === 'REFUND').length, 1);
});
test('identity, top-up, payout account and withdrawal use isolated idempotent demo ledgers', async () => {
  let snapshot = (await call('/snapshot', undefined, 'u-sora')).data;
  assert.equal(snapshot.authIdentities, undefined);
  assert.equal(snapshot.verifications, undefined);
  assert.equal(snapshot.verificationSummary.identity, false);
  assert.equal((await call('/wallet/payout-account', {
    bankName: '테스트은행', accountLast4: '1234', holderName: '민트로드',
  }, 'u-sora')).status, 409);
  assert.equal((await call('/identity/verify', { method: 'PASS' }, 'u-sora')).status, 201);
  const account = await call('/wallet/payout-account', {
    bankName: '테스트은행', accountLast4: '1234', holderName: '민트로드',
  }, 'u-sora');
  assert.equal(account.status, 201);
  snapshot = (await call('/snapshot', undefined, 'u-sora')).data;
  const card = snapshot.paymentMethods.find((item) => item.type === 'CARD');
  const topupKey = randomUUID();
  const topup = await call('/wallet/top-up', { amount: 30000, paymentMethodId: card.id }, 'u-sora', topupKey);
  assert.equal(topup.status, 201);
  assert.equal((await call('/wallet/top-up', { amount: 30000, paymentMethodId: card.id }, 'u-sora', topupKey)).data.id, topup.data.id);
  assert.equal((await call('/wallet/withdrawals', {
    amount: 30001, payoutAccountId: account.data.id, simulateProcessing: false,
  }, 'u-sora')).status, 409);
  const withdrawKey = randomUUID();
  const withdrawal = await call('/wallet/withdrawals', {
    amount: 5000, payoutAccountId: account.data.id, simulateProcessing: false,
  }, 'u-sora', withdrawKey);
  assert.equal(withdrawal.status, 201);
  assert.equal(withdrawal.data.status, 'MOCK_COMPLETED');
  assert.equal((await call('/wallet/withdrawals', {
    amount: 5000, payoutAccountId: account.data.id, simulateProcessing: false,
  }, 'u-sora', withdrawKey)).data.id, withdrawal.data.id);
  const pending = await call('/wallet/withdrawals', {
    amount: 1000, payoutAccountId: account.data.id, simulateProcessing: true,
  }, 'u-sora');
  assert.equal(pending.data.status, 'PROCESSING');
  assert.equal((await call('/wallet/withdrawals', {
    amount: 1000, payoutAccountId: account.data.id, simulateProcessing: false,
  }, 'u-sora')).status, 409);
});
test('full buyer/traveler flow settles once and separates reimbursement from reward', async () => {
  const walletBefore = (await call('/snapshot', undefined, 'u-min')).data.wallets[0].availableBalance;
  let t = await createMatch();
  assert.equal(t.travelerReward, 7000);
  assert.equal(t.totalPrice, 33248);
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
  t = await act(t, 'RECEIVE_AND_CONFIRM', 'u-me');
  assert.equal(t.status, 'CONFIRMED');
  assert.equal(
    await app.get(Store).read((db) => db.shipments.find((s) => s.transactionId === t.id).status),
    'DELIVERED',
  );
  const key = randomUUID(),
    before = t;
  t = await act(t, 'SETTLE', 'u-min', {}, key);
  assert.equal(t.status, 'SETTLED');
  assert.equal((await act(before, 'SETTLE', 'u-min', {}, key)).status, 'SETTLED');
  const snap = (await call('/snapshot', undefined, 'u-min')).data,
    p = snap.payouts.find((p) => p.transactionId === t.id);
  assert.equal(p.reward, 7000);
  assert.equal(p.platformCommission, 700);
  assert.equal(p.netReward, 6300);
  assert.equal(p.reimbursement, 22748);
  assert.equal(p.amount, 32548);
  assert.equal(snap.walletTransactions.filter((entry) => entry.payoutId === p.id).length, 1);
  assert.equal(snap.wallets[0].availableBalance, walletBefore + p.amount);
  assert.equal(snap.payouts.filter((p) => p.transactionId === t.id).length, 1);
  assert.ok(snap.notifications.some((notification) => notification.title.includes('포인트 보관함')));
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
  t = await act(t, 'DISPUTE', 'u-me', { reason: '상품 구매 진행에 문제가 있어요.' });
  assert.equal(t.status, 'DISPUTED');
  assert.equal((await act(t, 'SETTLE', 'u-min')).status, 409);
  const snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.escrows.find((e) => e.transactionId === t.id).status, 'FROZEN');
});
test('pre-purchase cancellation refunds the mock ledger completely', async () => {
  let t = await createMatch();
  t = await act(t, 'CANCEL', 'u-me');
  assert.equal(t.status, 'CANCELLED');
  const snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.escrows.find((e) => e.transactionId === t.id).status, 'REFUNDED');
  assert.equal(snapshot.payments.find((e) => e.transactionId === t.id).status, 'REFUNDED');
});
test('international shipping is rejected for new requests and direct acceptance', async () => {
  const invalidRequest = await fundedRequest(requestBody({ transport: 'INTERNATIONAL_SHIPPING' }));
  assert.equal(invalidRequest.status, 400);
  assert.match(invalidRequest.data.message, /국내 택배 또는 직거래/);
  const request = await fundedRequest(requestBody());
  const claim = await call(`/requests/${request.data.id}/claim`, offerBody({ transport: 'INTERNATIONAL_SHIPPING' }), 'u-min');
  assert.equal(claim.status, 400);
});
test('file repository survives a new instance and failed mutations roll back', async () => {
  const store = app.get(Store);
  const before = await store.read((db) => db.requests.length);
  await store.read((db) => { db.requests = []; });
  assert.equal(await store.read((db) => db.requests.length), before);
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
    await db.exec(await readFile(path.resolve('../../database/002_asia_currency.sql'), 'utf8'));
    await db.exec(await readFile(path.resolve('../../database/003_auth_wallet.sql'), 'utf8'));
    await db.exec(await readFile(path.resolve('../../database/004_request_prepayment.sql'), 'utf8'));
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
    const decimalRequest = { ...data.requests[0], id: 'asia-decimal', currency: 'SGD', localPrice: 12.75 };
    await db.query('INSERT INTO moa.requests(id,payload) VALUES($1,$2)', [decimalRequest.id, JSON.stringify(decimalRequest)]);
    assert.equal(Number((await db.query("SELECT local_price FROM moa.requests WHERE id='asia-decimal'")).rows[0].local_price), 12.75);
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
test('prices that round to zero are rejected without a server error or payment ledger entry', async () => {
  const tiny = await call('/requests', requestBody({ localPrice: 0.01, requestedReward: 0, transport: 'MEETUP', meetupLocation: '서울역 1번 출구' }));
  assert.equal(tiny.status, 409);
  assert.match(tiny.data.message, /1원 이상/);
  const draft = await call('/requests', requestBody({ requestedReward: 0, transport: 'MEETUP', meetupLocation: '서울역 1번 출구' }));
  assert.equal(draft.status, 201);
  // A previously saved tiny-price draft must also fail safely before the provider.
  await app.get(Store).transaction((db) => { db.requests.find((r) => r.id === draft.data.id).localPrice = 0.01; });
  const payment = await call(`/requests/${draft.data.id}/pay`, { expectedRevision: 0, paymentMethod: 'CARD', paymentReference: '체험 카드 4242' });
  assert.equal(payment.status, 409);
  assert.match(payment.data.message, /1원 이상/);
  const snapshot = (await call('/snapshot')).data;
  assert.ok(!snapshot.requestFundings.some((f) => f.requestId === draft.data.id));
  assert.equal(snapshot.requests.find((r) => r.id === draft.data.id).status, 'PAYMENT_PENDING');
});

test('unpaid requests are private; failed prepayment, duplicate payment, multiple applicants and selection are safe', async () => {
  const draft = (await call('/requests', requestBody({ requestedReward: 4321 }))).data;
  assert.equal(draft.status, 'PAYMENT_PENDING');
  assert.equal((await call('/snapshot', undefined, 'u-min')).data.requests.some((r) => r.id === draft.id), false);
  assert.equal((await call(`/requests/${draft.id}/offers`, offerBody(), 'u-min')).status, 409);
  const body = { expectedRevision: 0, paymentMethod: 'CARD', paymentReference: '체험 카드 4242' };
  assert.equal((await call(`/requests/${draft.id}/pay`, body, 'u-min')).status, 409);
  assert.equal((await call(`/requests/${draft.id}/pay`, { ...body, simulateFailure: true })).status, 409);
  assert.equal((await call('/snapshot')).data.requestFundings.some((f) => f.requestId === draft.id), false);
  const key = randomUUID();
  const paid = await Promise.all([call(`/requests/${draft.id}/pay`, body, 'u-me', key), call(`/requests/${draft.id}/pay`, body, 'u-me', key)]);
  assert.ok(paid.every((p) => p.status === 201));
  assert.equal((await call(`/requests/${draft.id}/pay`, body)).status, 409);
  const before = (await call('/snapshot')).data.requestFundings.filter((f) => f.requestId === draft.id);
  assert.equal(before.length, 1);
  for (const actor of ['u-min', 'u-haru', 'u-joon']) {
    const result = await call(`/requests/${draft.id}/offers`, offerBody({ tripId: `trip-${actor}`, reward: 999999 }), actor);
    assert.equal(result.status, 201);
    assert.equal(result.data.reward, 4321, 'Traveler cannot alter prepaid buyer reward');
  }
  let snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.transactions.some((t) => t.requestId === draft.id), false);
  assert.equal(snapshot.offers.filter((o) => o.requestId === draft.id && o.status === 'PENDING').length, 3);
  const candidates = snapshot.offers.filter((o) => o.requestId === draft.id);
  const revision = snapshot.requests.find((r) => r.id === draft.id).revision;
  const results = await Promise.all(candidates.slice(0, 2).map((o) => call(`/offers/${o.id}/accept`, { expectedRevision: revision })));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const selected = results.find((r) => r.status === 201).data;
  assert.equal(selected.status, 'PAYMENT_HELD');
  assert.equal((await act(selected, 'PAY', 'u-me')).status, 409, 'No second charge after selection');
  snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.payments.find((p) => p.transactionId === selected.id).providerRef, before[0].providerRef);
  assert.equal(snapshot.offers.filter((o) => o.requestId === draft.id && o.status === 'REJECTED').length, 2);
  assert.equal(snapshot.rooms.filter((r) => r.transactionId === selected.id).length, 1);
  const room = snapshot.rooms.find((r) => r.transactionId === selected.id);
  assert.equal((await call(`/rooms/${room.id}/replies`, undefined, 'u-sora')).status, 403);
  const replies = await call(`/rooms/${room.id}/replies`, undefined, selected.travelerId);
  assert.equal(replies.status, 200);
  assert.equal(replies.data.source, 'BASIC');
  assert.equal(replies.data.suggestions.some((s) => s.includes('구매 완료')), false);
  assert.equal((await call(`/rooms/${room.id}/replies`, { useAI: false })).status, 400);
  await act(selected, 'CANCEL', 'u-me');
});
test('cancellation before selection refunds exactly once and hides unselected private data', async () => {
  const request = (await fundedRequest(requestBody())).data;
  const applicant = await call(`/requests/${request.id}/offers`, offerBody(), 'u-joon');
  // A trip owned by someone else must not submit an application.
  assert.equal(applicant.status, 409);
  const snapshot = (await call('/snapshot')).data;
  const current = snapshot.requests.find((r) => r.id === request.id);
  const key = randomUUID(), body = { expectedRevision: current.revision };
  const results = await Promise.all([call(`/requests/${request.id}/cancel`, body, 'u-me', key), call(`/requests/${request.id}/cancel`, body, 'u-me', key)]);
  assert.ok(results.every((r) => r.status === 201));
  assert.equal((await call('/snapshot')).data.requestFundings.find((f) => f.requestId === request.id).status, 'REFUNDED');
  const bundles = (await call('/trips/trip-u-min/bundles', undefined, 'u-min')).data;
  for (const r of bundles.flatMap((b) => b.requests)) {
    assert.equal(r.deliveryAddress1, undefined); assert.equal(r.deliveryPhone, undefined); assert.equal(r.meetupPoint, undefined);
  }
  assert.equal((await call('/snapshot', undefined, 'u-min')).data.requestFundings.some((f) => f.requestId === request.id), false);
});
test('an explicit fresh demo login resets completed prototype data without affecting role switches', async () => {
  const before = await app.get(Store).read((db) => db.transactions.length);
  assert.ok(before > 0);
  const reset = await call('/auth/demo', { userId: 'u-me', provider: 'DEMO', reset: true }, 'anonymous');
  assert.equal(reset.status, 201);
  tokens['u-me'] = reset.data.token;
  const snapshot = (await call('/snapshot')).data;
  assert.equal(snapshot.transactions.length, 0);
  assert.equal(snapshot.requests[0].status, seedDatabase().requests[0].status);
  const created = await fundedRequest(requestBody({ productName: '역할 전환 유지 확인' }));
  assert.equal(created.status, 201);
  const switched = await call('/auth/demo', { userId: 'u-min', provider: 'DEMO' }, 'anonymous');
  assert.equal(switched.status, 201);
  tokens['u-min'] = switched.data.token;
  assert.ok((await call('/snapshot', undefined, 'u-min')).data.requests.some((item) => item.id === created.data.id));
});

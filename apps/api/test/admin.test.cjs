const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { randomBytes, scryptSync, createHmac } = require('node:crypto');
const { Store } = require('../dist/infrastructure/store');
const { quote } = require('@moa/domain');

let app, url, temp;
const password = 'Only-for-admin-tests-2026!';
const secret = randomBytes(20).toString('hex');
function code() {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', Buffer.from(secret, 'hex')).update(counter).digest();
  return String((digest.readUInt32BE(digest[digest.length - 1] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}
async function call(route, { method = 'GET', body, cookie, origin, bearer } = {}) {
  const response = await fetch(url + '/api/admin' + route, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}), ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function login(role) {
  process.env.ADMIN_ROLE = role;
  const response = await call('/login', { method: 'POST', origin: url, body: { email: 'admin@moa.test', password, code: code() } });
  assert.equal(response.status, 201);
  assert.ok(response.cookie?.startsWith('moa_admin='));
  return response.cookie;
}
before(async () => {
  temp = await mkdtemp(path.join(tmpdir(), 'moa-admin-test-'));
  process.env.DATA_FILE = path.join(temp, 'state.json');
  process.env.PORT = '0';
  process.env.QUIET = '1';
  process.env.ADMIN_EMAIL = 'admin@moa.test';
  process.env.ADMIN_TOTP_SECRET = secret;
  process.env.ADMIN_ROLE = 'CUSTOMER_SUPPORT';
  const salt = randomBytes(16).toString('hex');
  process.env.ADMIN_PASSWORD_SCRYPT = `${salt}:${scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex')}`;
  delete process.env.DATABASE_URL;
  const { bootstrap } = require('../dist/main');
  app = await bootstrap();
  url = (await app.getUrl()).replace('[::1]', '127.0.0.1').replace('0.0.0.0', '127.0.0.1');
  const past = (days) => new Date(Date.now() - days * 86400000).toISOString();
  await app.get(Store).transaction((db) => {
    const request = db.requests.find((r) => r.id === 'r-1');
    const offer = db.offers.find((o) => o.id === 'offer-1');
    request.createdAt = past(13);
    db.trips.find((trip) => trip.id === offer.tripId).endDate = past(9).slice(0, 10);
    db.transactions.push({ id: 'tx-shipping-case', createdAt: past(12), ...quote(request, offer.reward, 'DOMESTIC_PARCEL'), requestId: request.id, offerId: offer.id, buyerId: 'u-me', travelerId: 'u-min', status: 'SHIPPED', revision: 4, transport: 'DOMESTIC_PARCEL', estimatedDeliveryDate: past(7).slice(0, 10) });
    db.payments.push({ id: 'pay-shipping-case', createdAt: past(11), transactionId: 'tx-shipping-case', buyerId: 'u-me', amount: 33248, provider: 'MOCK_CARD', paymentMethodId: 'payment-u-me-card', status: 'HELD', providerRef: 'mock-payment' });
    db.escrows.push({ id: 'esc-shipping-case', createdAt: past(11), transactionId: 'tx-shipping-case', amount: 33248, holder: 'MOCK_LEDGER', status: 'HELD' });
    db.receipts.push({ id: 'receipt-shipping-case', createdAt: past(10), transactionId: 'tx-shipping-case', travelerId: 'u-min', outcome: 'PURCHASED', productImage: '', receiptImage: '', storeName: '도쿄역 캐릭터 스트리트', purchasedAt: past(10).slice(0, 10), localAmount: 2420, currency: 'JPY', locationNote: '매장에서 구매' });
    db.shipments.push({ id: 'shipment-shipping-case', createdAt: past(8), transactionId: 'tx-shipping-case', transport: 'DOMESTIC_PARCEL', carrier: '테스트 택배', trackingNumber: 'TRACK-123-456', status: 'SHIPPED' });
    db.rooms.push({ id: 'room-shipping-case', createdAt: past(12), transactionId: 'tx-shipping-case', buyerId: 'u-me', travelerId: 'u-min' });
    db.messages.push({ id: 'msg-shipping-case', createdAt: past(7), roomId: 'room-shipping-case', senderId: 'u-me', text: '일주일째 배송이 안 와요.', system: false });
    for (const [index, status, days] of [['MATCHED', 12], ['PAYMENT_HELD', 11], ['PURCHASED', 10], ['TRAVELING', 9], ['SHIPPED', 8]].map(([s, d], i) => [i, s, d])) {
      db.events.push({ id: `event-${index}`, createdAt: past(days), actorId: status === 'MATCHED' || status === 'PAYMENT_HELD' ? 'u-me' : 'u-min', transactionId: 'tx-shipping-case', type: status, to: status, note: `${status} 기록` });
    }
  });
});
after(async () => { await app?.close(); if (temp) await rm(temp, { recursive: true, force: true }); });

test('user token and missing admin session cannot access admin records', async () => {
  const user = await fetch(url + '/api/auth/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: 'u-me' }) }).then((response) => response.json());
  assert.equal((await call('/transactions', { bearer: user.token })).status, 401);
  assert.equal((await call('/transactions/tx-shipping-case')).status, 401);
});
test('login requires same origin and a valid TOTP', async () => {
  assert.equal((await call('/login', { method: 'POST', body: { email: 'admin@moa.test', password, code: code() } })).status, 403);
  assert.equal((await call('/login', { method: 'POST', origin: url, body: { email: 'admin@moa.test', password, code: '000000' } })).status, 401);
});
test('fixed code is available only in local development mode', async () => {
  const originalSecret = process.env.ADMIN_TOTP_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.ADMIN_DEV_CODE = '123456';
  delete process.env.ADMIN_TOTP_SECRET;
  try {
    assert.equal((await call('/login', { method: 'POST', origin: url, body: { email: 'admin@moa.test', password, code: '123456' } })).status, 201);
    process.env.NODE_ENV = 'production';
    assert.equal((await call('/login', { method: 'POST', origin: url, body: { email: 'admin@moa.test', password, code: '123456' } })).status, 503);
  } finally {
    process.env.ADMIN_TOTP_SECRET = originalSecret;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    delete process.env.ADMIN_DEV_CODE;
  }
});
test('shipping inquiry finds the transaction and its evidence without exposing money to CS', async () => {
  const cookie = await login('CUSTOMER_SUPPORT');
  const list = await call('/transactions?q=TRACK-123-456&issue=SHIPPING_DELAY', { cookie });
  assert.equal(list.status, 200);
  assert.equal(list.data.total, 1);
  assert.equal(list.data.rows[0].id, 'tx-shipping-case');
  assert.equal(list.data.rows[0].amounts, null);
  const outside = await call('/transactions?from=2099-01-01', { cookie });
  assert.equal(outside.status, 200);
  assert.equal(outside.data.total, 0);
  const invalidRange = await call('/transactions?from=2026-12-31&to=2026-01-01', { cookie });
  assert.equal(invalidRange.status, 400);
  const detail = await call('/transactions/tx-shipping-case', { cookie });
  assert.equal(detail.status, 200);
  assert.equal(detail.data.receipt.outcome, 'PURCHASED');
  assert.equal(detail.data.shipment.trackingNumber, 'TRACK-123-456');
  assert.equal(detail.data.trip.id, 'trip-u-min');
  assert.equal(detail.data.chat[0].text, '일주일째 배송이 안 와요.');
  assert.equal(detail.data.timeline.at(-1).to, 'SHIPPED');
  assert.equal(detail.data.payout, null);
  assert.equal(detail.data.adminActions.length, 0);
});
test('finance sees amounts but not chat or tracking number', async () => {
  const cookie = await login('FINANCE');
  const detail = await call('/transactions/tx-shipping-case', { cookie });
  assert.equal(detail.status, 200);
  assert.equal(typeof detail.data.amounts.totalPrice, 'number');
  assert.equal(detail.data.chat, null);
  assert.equal(detail.data.shipment.trackingNumber, null);
  const dashboard = await call('/dashboard', { cookie });
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.data.alerts.find((a) => a.key === 'SHIPPING_DELAY').count, 1);
  const sorted = await call('/transactions?sort=amount_desc&page=1&size=1', { cookie });
  assert.equal(sorted.status, 200);
  assert.equal(sorted.data.rows.length, 1);
});

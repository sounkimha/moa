const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Store } = require('../dist/infrastructure/store');
const { FxService } = require('../dist/fx/fx');

let app, url, temp, token, travelerToken;
let providerRate = 9.11;
let providerAvailable = true;
const originalFetch = global.fetch;
const future = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function call(route, body, authToken = token) {
  const response = await fetch(url + '/api' + route, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: 'Bearer ' + authToken } : {}),
      'Idempotency-Key': randomUUID(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

before(async () => {
  temp = await mkdtemp(path.join(tmpdir(), 'moa-fx-test-'));
  process.env.DATA_FILE = path.join(temp, 'state.json');
  process.env.PORT = '0';
  process.env.QUIET = '1';
  delete process.env.DATABASE_URL;
  delete process.env.CURRENCYAPI_KEY;
  global.fetch = async (input, init) => {
    const requestUrl = String(input);
    if (requestUrl.startsWith('https://api.frankfurter.dev/v2/rate/')) {
      if (!providerAvailable) throw new Error('Provider unavailable');
      const base = requestUrl.split('/').at(-2).toUpperCase();
      return new Response(JSON.stringify({ date: new Date().toISOString().slice(0, 10), base, quote: 'KRW', rate: providerRate }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };
  const { bootstrap } = require('../dist/main');
  delete process.env.CURRENCYAPI_KEY;
  app = await bootstrap();
  url = (await app.getUrl()).replace('[::1]', '127.0.0.1').replace('0.0.0.0', '127.0.0.1');
  token = (await call('/auth/demo', { userId: 'u-me', provider: 'DEMO' }, null)).data.token;
  travelerToken = (await call('/auth/demo', { userId: 'u-min', provider: 'DEMO' }, null)).data.token;
});

after(async () => {
  global.fetch = originalFetch;
  await app?.close();
  if (temp) await rm(temp, { recursive: true, force: true });
});

test('latest reference rate is shown, checked at payment, and locked through matching', async () => {
  const rate = await call('/fx/JPY');
  assert.equal(rate.status, 200);
  assert.equal(rate.data.krwPerUnit, 9.11);
  assert.equal(rate.data.source, 'DAILY_REFERENCE');
  assert.equal((await call('/fx/not-a-currency')).status, 400);
  assert.deepEqual((await call('/fx/KRW')).data, { currency: 'KRW', krwPerUnit: 1, source: 'KRW_PARITY' });

  const created = await call('/requests', {
    productName: '테스트 한정 키링', productUrl: '', productImage: '', art: 'keyring',
    placeId: 'p-station', localPrice: 2420, quantity: 1, requestedReward: 7000,
    desiredDate: future(20), category: 'CHARACTER', option: '기본',
    transport: 'DOMESTIC_PARCEL', deliveryRecipient: '테스트 구매자',
    deliveryPhone: '010-1234-5678', deliveryPostalCode: '04524',
    deliveryAddress1: '서울 중구 세종대로 110', deliveryAddress2: '테스트 주소',
  });
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal((await call(`/requests/${id}/quote`, undefined, travelerToken)).status, 409);
  const preview = await call(`/requests/${id}/quote`);
  assert.equal(preview.status, 200);
  assert.equal(preview.data.productPrice, Math.round(2420 * 9.11));
  assert.equal(preview.data.priceSource, 'DAILY_REFERENCE');

  const payment = { expectedRevision: 0, paymentMethod: 'CARD', paymentReference: '체험 카드 4242',
    expectedFxRate: preview.data.fxRate, expectedTotal: preview.data.totalPrice };
  assert.equal((await call(`/requests/${id}/pay`, { ...payment, expectedTotal: payment.expectedTotal + 1 })).status, 409);
  assert.equal((await call(`/requests/${id}/pay`, payment)).status, 201);
  const funding = await app.get(Store).read((db) => db.requestFundings.find((f) => f.requestId === id));
  assert.equal(funding.fxRate, 9.11);
  assert.equal(funding.totalPrice, preview.data.totalPrice);
  assert.equal(funding.priceSource, 'DAILY_REFERENCE');

  providerRate = 10.24;
  app.get(FxService).cache.clear();
  assert.equal((await call('/fx/JPY')).data.krwPerUnit, 10.24);
  const offered = await call(`/requests/${id}/offers`, {
    tripId: 'trip-u-min', reward: 7000, estimatedPurchaseDate: future(5),
    estimatedDeliveryDate: future(14), message: '방문 예정이에요.', transport: 'DOMESTIC_PARCEL',
  }, travelerToken);
  assert.equal(offered.status, 201);
  const accepted = await call(`/offers/${offered.data.id}/accept`, { expectedRevision: 2 });
  assert.equal(accepted.status, 201);
  assert.equal(accepted.data.fxRate, 9.11);
  assert.equal(accepted.data.totalPrice, preview.data.totalPrice);
});

test('provider failure is clearly identified as a demo fixed-rate fallback', async () => {
  providerAvailable = false;
  app.get(FxService).cache.clear();
  const fallback = await call('/fx/JPY');
  assert.equal(fallback.status, 200);
  assert.equal(fallback.data.source, 'DEMO_FIXED');
  assert.equal(fallback.data.asOf, undefined);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, readdir, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { quote, TRANSPORT_LABEL } = require('@moa/domain');
const { seedDatabase } = require('@moa/domain/dist/seed');
const { migrateLegacyDelivery } = require('../dist/infrastructure/delivery-migration');
const { Store } = require('../dist/infrastructure/store');

test('only return-home delivery is offered; the 12,000 shipping estimate cannot recur', () => {
  assert.deepEqual(Object.keys(TRANSPORT_LABEL).sort(), ['DOMESTIC_PARCEL', 'MEETUP']);
  const request = { localPrice: 2420, quantity: 1, currency: 'JPY' };
  const reward = 7105;
  assert.equal(quote(request, reward, 'DOMESTIC_PARCEL').totalPrice, 33353);
  assert.equal(quote(request, reward, 'MEETUP').totalPrice, 29853);
  // Even an old client cache must not resurrect the removed 12,000 fee.
  assert.equal(quote(request, reward, 'INTERNATIONAL_SHIPPING').shippingFee, 3500);
});

function legacyDatabase() {
  const db = seedDatabase();
  const r = db.requests[0];
  r.transport = 'INTERNATIONAL_SHIPPING';
  const offer = db.offers.find((o) => o.requestId === r.id);
  offer.transport = 'INTERNATIONAL_SHIPPING';
  offer.reward = 7105;
  const t = {
    id: 'legacy-unpaid', createdAt: new Date().toISOString(),
    requestId: r.id, offerId: offer.id, buyerId: r.requesterId,
    travelerId: offer.travelerId, status: 'MATCHED', revision: 0,
    transport: 'INTERNATIONAL_SHIPPING', estimatedDeliveryDate: r.desiredDate,
    ...quote(r, offer.reward, 'DOMESTIC_PARCEL'),
  };
  t.totalPrice += 8500;
  t.shippingFee = 12000;
  db.transactions.push(t);
  db.transactions.push({ ...t, id: 'legacy-paid', status: 'PAYMENT_HELD' });
  db.payments.push({ id: 'legacy-payment', transactionId: 'legacy-paid', amount: t.totalPrice, provider: 'MOCK', status: 'HELD' });
  db.receipts.push({
    id: 'legacy-receipt', createdAt: new Date().toISOString(),
    transactionId: 'legacy-paid', travelerId: offer.travelerId,
    productImage: 'data:image/png;base64,legacy', receiptImage: '',
    storeName: '기존 매장', purchasedAt: r.desiredDate, localAmount: r.localPrice,
    currency: r.currency, locationNote: '기존 방문 기록',
  });
  return db;
}

test('legacy migration updates unpaid quotes, preserves paid ledgers and runs only once', () => {
  const db = legacyDatabase();
  const ledger = JSON.stringify(db.payments);
  const paidTotal = db.transactions.find((t) => t.id === 'legacy-paid').totalPrice;
  assert.equal(migrateLegacyDelivery(db), true);
  for (const rows of [db.requests, db.offers, db.transactions, db.shipments])
    assert.ok(rows.every((r) => r.transport !== 'INTERNATIONAL_SHIPPING'));
  assert.equal(db.transactions.find((t) => t.id === 'legacy-unpaid').shippingFee, 3500);
  assert.equal(db.transactions.find((t) => t.id === 'legacy-unpaid').travelerReward, 7105);
  assert.equal(db.offers.find((o) => o.requestId === db.requests[0].id).reward, 7105);
  assert.equal(db.transactions.find((t) => t.id === 'legacy-paid').totalPrice, paidTotal);
  assert.equal(JSON.stringify(db.payments), ledger);
  assert.equal(db.receipts[0].outcome, 'PURCHASED');
  const once = JSON.stringify(db);
  assert.equal(migrateLegacyDelivery(db), false);
  assert.equal(JSON.stringify(db), once);
});

test('old saved data is backed up and the corrected delivery survives restart', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'moa-delivery-'));
  const filename = path.join(dir, 'state.json');
  const previousFile = process.env.DATA_FILE;
  const previousPg = process.env.DATABASE_URL;
  process.env.DATA_FILE = filename;
  delete process.env.DATABASE_URL;
  try {
    const original = JSON.stringify(legacyDatabase());
    await writeFile(filename, original);
    const store = new Store();
    await store.read((db) => db.requests.length);
    const backup = (await readdir(dir)).find((f) => f.endsWith('.bak'));
    assert.ok(backup);
    assert.equal(await readFile(path.join(dir, backup), 'utf8'), original);
    const second = new Store();
    assert.equal(await second.read((db) => db.requests[0].transport), 'DOMESTIC_PARCEL');
    assert.equal((await readdir(dir)).filter((f) => f.endsWith('.bak')).length, 1);
  } finally {
    if (previousFile === undefined) delete process.env.DATA_FILE;
    else process.env.DATA_FILE = previousFile;
    if (previousPg === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousPg;
    await rm(dir, { recursive: true, force: true });
  }
});

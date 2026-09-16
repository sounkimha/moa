const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise the same dependency-free TypeScript utilities Metro bundles.
function load(file) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/state', file), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  new Function('exports', 'module', outputText)(module.exports, module);
  return module.exports;
}
const { routeHash, parseRoute } = load('navigation.ts');
const { readDraft, writeDraft, clearDraft } = load('draft-session.ts');
const { readTripDraft, writeTripDraft, clearTripDraft } = load('trip-draft-session.ts');
const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
};
const draft = () => ({ step: 2, method: 'photo', url: '', name: '치이카와 키링', image: 'data:image/png;base64,sample',
  art: 'keyring', price: '2420', requestedReward: '5000', quantity: 1, desired: '2026-10-02', placeId: 'p-station', category: 'CHARACTER',
  storeName: '도쿄역', option: '파랑', metadataMessage: '', aiFilled: true, editingDetails: false,
  transport: 'MEETUP', deliveryCountry: 'KR', deliveryCity: '서울', deliveryAddressId: '', deliveryRecipient: '예시',
  deliveryPhone: '01000000000', deliveryPostalCode: '', deliveryAddress1: '', deliveryAddress2: '',
  meetupLocation: '서울역', inventoryStatus: 'CHECK_REQUIRED', meetupPoint: { name: '서울역', address: '서울', detail: '1번 출구', latitude: 37.55, longitude: 126.97 },
  originalText: { productName: 'ちいかわ', storeName: '', purchaseLocation: '', option: '' },
});
const tripDraft = () => ({ departureCountry: 'KR', departureCity: '서울', destinationCountry: 'JP',
  cities: ['도쿄', '오사카'], startDate: '2026-10-02', endDate: '2026-10-08',
  placeIds: ['p-shibuya', 'p-osaka'], capacity: '8' });
test('navigation survives refresh and browser history, including bundle IDs and photo mode', () => {
  for (const route of [ { name: 'offer-form', placeId: 'p-station', tripId: 'trip-u-me', requestIds: ['r-1', 'r-2'] },
    { name: 'request-form', id: '요청/2', method: 'photo', placeId: 'p-station' }, { name: 'home' } ])
    assert.deepEqual(parseRoute(routeHash(route)), route);
  assert.deepEqual(parseRoute('#request/%E0%A4%A'), { name: 'home' });
  assert.deepEqual(parseRoute('#unknown'), { name: 'home' });
  assert.deepEqual(parseRoute('#request-form?method=invalid&deliveryPhone=private'), { name: 'request-form' });
  assert.deepEqual(parseRoute('#bundle?requestId=r-1&requestId=r-1').requestIds, ['r-1']);
});
test('draft resumes product, original text, photo, meetup and step only for its owner', () => {
  const store = storage(), expected = draft();
  assert.equal(writeDraft(store, 'buyer', expected), true);
  assert.deepEqual(readDraft(store, 'buyer'), expected);
  assert.equal(readDraft(store, 'other'), null);
  assert.equal(readDraft(store, 'buyer'), null, 'account mismatch clears private data');
  writeDraft(store, 'buyer', expected); clearDraft(store);
  assert.equal(readDraft(store, 'buyer'), null);
});
test('corrupt, oversized or quota-denied draft does not crash or restore stale data', () => {
  const store = storage();
  store.setItem('moa-request-draft-v1', '{broken');
  assert.equal(readDraft(store, 'buyer'), null);
  writeDraft(store, 'buyer', { ...draft(), quantity: -1 });
  assert.equal(readDraft(store, 'buyer'), null);
  writeDraft(store, 'buyer', { ...draft(), requestedReward: { amount: 5000 } });
  assert.equal(readDraft(store, 'buyer'), null, 'malformed reward cannot become a text input value');
  writeDraft(store, 'buyer', draft());
  assert.equal(writeDraft(store, 'buyer', { ...draft(), image: 'x'.repeat(4_000_001) }), false);
  assert.equal(readDraft(store, 'buyer'), null);
  assert.equal(writeDraft({ ...store, setItem: () => { throw new Error('quota'); } }, 'buyer', draft()), false);
  store.setItem('moa-request-draft-v1', 'x'.repeat(4_000_001));
  assert.equal(readDraft(store, 'buyer'), null);
  assert.equal(store.getItem('moa-request-draft-v1'), null, 'oversized private drafts are removed');
  assert.equal(writeDraft({ ...store, removeItem() { throw new Error('denied'); } }, 'buyer', null), false, 'failed deletion must not report success');
  writeDraft(store, 'buyer', { ...draft(), sampleFilled: 'false' });
  assert.equal(readDraft(store, 'buyer').sampleFilled, undefined, 'untrusted truthy text cannot activate sample mode');
});
test('trip draft restores route choices only for its owner and supports incomplete fields', () => {
  const store = storage(), expected = tripDraft();
  assert.equal(writeTripDraft(store, 'traveler', expected), true);
  assert.deepEqual(readTripDraft(store, 'traveler'), expected);
  assert.equal(readTripDraft(store, 'buyer'), null);
  assert.equal(readTripDraft(store, 'traveler'), null, 'account mismatch clears the trip draft');
  const partial = { ...expected, departureCity: '', cities: [], placeIds: [], capacity: '' };
  writeTripDraft(store, 'traveler', partial);
  assert.deepEqual(readTripDraft(store, 'traveler'), partial);
  clearTripDraft(store);
  assert.equal(readTripDraft(store, 'traveler'), null);
});
test('invalid trip drafts are discarded without affecting other session data', () => {
  for (const invalid of [
    { ...tripDraft(), departureCountry: 'US' },
    { ...tripDraft(), cities: ['도쿄', '도쿄'] },
    { ...tripDraft(), startDate: 'tomorrow' },
    { ...tripDraft(), capacity: '200' },
  ]) {
    const store = storage();
    writeTripDraft(store, 'traveler', invalid);
    assert.equal(readTripDraft(store, 'traveler'), null);
  }
});

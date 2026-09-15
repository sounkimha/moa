const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(store) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/state/trip-draft.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  const imports = (name) => {
    if (name === 'react-native') return { Platform: { OS: 'web' } };
    if (name === './form-validation') {
      const validation = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/state/form-validation.ts'), 'utf8');
      const compiled = ts.transpileModule(validation, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      const loaded = { exports: {} }; new Function('exports', 'module', compiled)(loaded.exports, loaded); return loaded.exports;
    }
    return require(name);
  };
  new Function('exports', 'module', 'require', 'window', outputText)(module.exports, module, imports, { sessionStorage: store });
  return module.exports;
}
function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
const draft = () => ({ departure: '서울', depCountry: 'KR', originSource: 'address', country: 'JP',
  areas: ['도쿄', '이시가키섬'], places: ['p-station', 'p-shibuya'], customStops: ['이시가키섬 · 유글레나 몰'], start: '2026-10-01', end: '2026-10-08' });

test('trip draft survives reload with multiple places, island, dates and owner isolation', () => {
  const store = storage(), { writeTripDraft } = load(store), expected = draft();
  assert.equal(writeTripDraft('traveler-a', expected), true);
  const reloaded = load(store);
  assert.deepEqual(reloaded.readTripDraft('traveler-a'), expected);
  assert.equal(reloaded.readTripDraft('traveler-b'), null);
  assert.deepEqual(reloaded.readTripDraft('traveler-a'), expected);
  reloaded.writeTripDraft('traveler-a', null);
  assert.equal(reloaded.readTripDraft('traveler-a'), null);
});

test('trip drafts reject invalid dates and field types without crashing calendar rendering', () => {
  const store = storage(), { readTripDraft } = load(store);
  for (const changed of [
    { start: '2026-02-30' }, { start: '2026-99-01' }, { start: 'broken' }, { end: '2026-09-01' },
    { start: null }, { end: 42 }, { country: 'XX' }, { depCountry: null }, { departure: [] },
    { originSource: 'invented' }, { areas: null }, { areas: [1] }, { places: [null] }, { customStops: [false] },
    { areas: Array(9).fill('도쿄') }, { places: Array(13).fill('p-station') }, { customStops: Array(9).fill('도쿄 · 시부야') },
  ]) {
    store.setItem('moa-trip-draft:a', JSON.stringify({ ...draft(), ...changed }));
    assert.equal(readTripDraft('a'), null, JSON.stringify(changed));
    assert.equal(store.getItem('moa-trip-draft:a'), null);
  }
  for (const raw of ['{broken', '"value"', 'null', 'x'.repeat(20_001)]) {
    store.setItem('moa-trip-draft:a', raw);
    assert.equal(readTripDraft('a'), null);
  }
});

test('country-only trip keeps no accidental visits and unavailable stops are removed', () => {
  const store = storage(), { readTripDraft, writeTripDraft } = load(store);
  writeTripDraft('a', { ...draft(), areas: [] });
  assert.deepEqual(readTripDraft('a'), { ...draft(), areas: [], places: [], customStops: [] });
  writeTripDraft('a', { ...draft(), areas: ['도쿄', '도쿄', '없는 도시'], customStops: ['도쿄 · 시부야', '발리 · 우붓'] });
  assert.deepEqual(readTripDraft('a').areas, ['도쿄']);
  assert.deepEqual(readTripDraft('a').customStops, ['도쿄 · 시부야']);
});

test('quota-denied trip draft clears an older value instead of restoring stale changes', () => {
  const store = storage();
  store.setItem('moa-trip-draft:a', JSON.stringify(draft()));
  const { writeTripDraft, readTripDraft } = load({ ...store, setItem: () => { throw new Error('quota'); } });
  assert.equal(writeTripDraft('a', { ...draft(), departure: '부산' }), false);
  assert.equal(readTripDraft('a'), null);
});

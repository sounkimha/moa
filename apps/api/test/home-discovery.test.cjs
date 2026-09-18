const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relative, imports = require, dev = false) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/lib', relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'module', 'require', '__DEV__', compiled)(module.exports, module, imports, dev);
  return module.exports;
}
const { tripsToCity, uniqueTravelerCount } = load('home-discovery.ts');
const places = [{ id: 'shibuya', country: 'JP', city: '도쿄' }, { id: 'osaka', country: 'JP', city: '오사카' }];
const trip = { travelerId: 'one', destinationCountry: 'JP', destinationCity: '도쿄', endDate: '2026-09-25', placeIds: [] };

test('hero counts unique current travelers, not schedules or expired trips', () => {
  const trips = [trip, { ...trip, id: 'another' }, { ...trip, travelerId: 'two', endDate: '2026-09-01' }];
  assert.equal(uniqueTravelerCount(tripsToCity(trips, places, 'JP', '도쿄', '2026-09-18')), 1);
});
test('multi-city and visited-place trips appear in the same city discovery', () => {
  const trips = [trip, { ...trip, travelerId: 'two', destinationCity: '오사카', destinationAreas: ['도쿄', '오사카'] }, { ...trip, travelerId: 'three', destinationCity: '오사카', placeIds: ['shibuya'] }];
  assert.equal(uniqueTravelerCount(tripsToCity(trips, places, 'JP', '도쿄', '2026-09-18')), 3);
  assert.equal(tripsToCity(trips, places, 'US', '도쿄', '2026-09-18').length, 0);
  assert.equal(tripsToCity([], places, 'JP', '도쿄', '2026-09-18').length, 0);
});
test('production and web never access native developer tools', () => {
  for (const [dev, os] of [[false, 'ios'], [true, 'web']]) {
    const lib = load('dev-menu.ts', (name) => name === 'expo' ? { requireOptionalNativeModule() { throw new Error('Must not access native module'); } } : { Platform: { OS: os } }, dev);
    assert.equal(lib.openDevMenu(), false);
    assert.equal(lib.setDevToolsButtonVisible(false), false);
  }
});
test('supported Expo tools hide/restore without deleting the menu entry', () => {
  const calls = [];
  const lib = load('dev-menu.ts', (name) => name === 'expo' ? { requireOptionalNativeModule: () => ({ openMenu: () => calls.push('open'), setToolsButtonVisible: (visible) => calls.push(visible) }) } : { Platform: { OS: 'ios' } }, true);
  assert.equal(lib.setDevToolsButtonVisible(false), true);
  assert.equal(lib.openDevMenu(), true);
  assert.equal(lib.setDevToolsButtonVisible(true), true);
  assert.deepEqual(calls, [false, 'open', true]);
});
test('older and unavailable Expo modules safely keep the existing floating menu', () => {
  for (const native of [null, { openMenu() {} }]) {
    const lib = load('dev-menu.ts', (name) => name === 'expo' ? { requireOptionalNativeModule: () => native } : { Platform: { OS: 'android' } }, true);
    assert.equal(lib.setDevToolsButtonVisible(false), false);
  }
});

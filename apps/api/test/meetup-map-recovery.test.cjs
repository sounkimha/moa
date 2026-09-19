const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = readFileSync(join(__dirname, '../../mobile/src/components/meetup-map-html.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const mod = { exports: {} };
new Function('exports', 'module', 'require', outputText)(mod.exports, mod, () => ({ mapCspNonce: () => '' }));
function createMap(withKakao = true) {
  const messages = [], events = {}, windowEvents = {}, elements = { map: {}, pin: { style: {} }, error: { style: {} } };
  let timeout, point = { getLat: () => 37.55, getLng: () => 126.97 };
  const map = { getCenter() { return point; }, panTo(value) { point = value; } };
  const maps = {
    LatLng: function LatLng(latitude, longitude) { return { getLat: () => latitude, getLng: () => longitude }; },
    Map: function Map() { return map; },
    services: { Geocoder: function Geocoder() { return { coord2Address(_longitude, _latitude, callback) { callback([], 'ZERO_RESULT'); } }; } },
    event: { addListener(_map, name, callback) { events[name] = callback; } },
    load(callback) { callback(); },
  };
  const kakao = { maps };
  const scope = {
    kakao: withKakao ? kakao : undefined,
    window: { kakao: withKakao ? kakao : undefined, addEventListener(name, callback) { windowEvents[name] = callback; }, parent: { postMessage: (value) => messages.push(JSON.parse(value)) } },
    document: { getElementById(id) { return elements[id]; } }, setTimeout(callback) { timeout = callback; return 1; }, clearTimeout() {},
  };
  const html = mod.exports.meetupMapHtml(37.55, 126.97, 18, 'test-channel', 'test-key');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  vm.runInNewContext(scripts.find((script) => script.includes('function initKakaoMap')), scope);
  return { scope, messages, events, elements, windowEvents, expire: () => timeout() };
}
test('meetup map reports a blocked Kakao SDK instead of claiming ready', () => {
  const fixture = createMap(false); fixture.scope.initKakaoMap();
  assert.deepEqual(fixture.messages, [{ channel: 'test-channel', error: true }]);
  assert.ok(!fixture.messages.some((message) => message.ready));
});
test('meetup coordinates are sent only after the Kakao map is visible and longitude is wrapped', () => {
  const fixture = createMap(); fixture.scope.initKakaoMap();
  assert.equal(fixture.messages.length, 0, 'A blank map must not select its default coordinates');
  fixture.events.idle();
  assert.equal(fixture.messages.at(-1).ready, true);
  fixture.events.click({ latLng: { getLat: () => 35.68, getLng: () => 499.76 } });
  assert.equal(fixture.messages.at(-1).latitude, 35.68);
  assert.ok(Math.abs(fixture.messages.at(-1).longitude - 139.76) < 0.00001);
});

test('a failed meetup SDK never sends stale coordinates or revives after late idle', () => {
  const fixture = createMap(); fixture.scope.initKakaoMap();
  let cancelled = false;
  fixture.windowEvents.unhandledrejection({ reason: new Error('Kakao SDK failed.'), preventDefault() { cancelled = true; } });
  assert.ok(cancelled);
  assert.equal(fixture.elements.pin.style.display, 'none');
  assert.equal(fixture.elements.error.style.display, 'grid');
  fixture.events.idle();
  fixture.events.click({ latLng: { getLat: () => 35.68, getLng: () => 139.76 } });
  fixture.events.dragend();
  fixture.expire();
  assert.deepEqual(fixture.messages, [{ channel: 'test-channel', error: true }]);
});

test('an iframe runtime failure after readiness revokes coordinate selection', () => {
  const fixture = createMap(); fixture.scope.initKakaoMap(); fixture.events.idle();
  fixture.windowEvents.error({ message: 'Kakao runtime failed', preventDefault() {} });
  fixture.events.dragend(); fixture.events.idle();
  fixture.events.click({ latLng: { getLat: () => 35.68, getLng: () => 139.76 } });
  assert.deepEqual(fixture.messages, [{ channel: 'test-channel', ready: true }, { channel: 'test-channel', error: true }]);
});

test('the domestic meetup picker loads Kakao services explicitly', () => {
  const html = mod.exports.meetupMapHtml(37.55, 126.97, 18, 'test-channel', 'test-key');
  assert.match(html, /dapi\.kakao\.com\/v2\/maps\/sdk\.js\?appkey=test-key&libraries=services&autoload=false/);
  assert.match(html, /window\.kakao\.maps\.load\(initKakaoMap\)/);
});

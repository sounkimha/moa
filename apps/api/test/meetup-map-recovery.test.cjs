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
function createMap(withGoogle = true) {
  const messages = [], events = {}, windowEvents = {}, elements = { map: {}, pin: { style: {} }, error: { style: {} } };
  let timeout, point = { lat: () => 37.55, lng: () => 126.97 };
  const map = { getCenter() { return point; }, addListener(name, callback) { events[name] = callback; }, panTo(value) { point = value; } };
  const google = { maps: { Map: function Map() { return map; }, event: { addListenerOnce(_map, name, callback) { events[name] = callback; } } } };
  const scope = { google: withGoogle ? google : undefined, window: { google: withGoogle ? google : undefined, addEventListener(name, callback) { windowEvents[name] = callback; }, parent: { postMessage: (value) => messages.push(JSON.parse(value)) } }, document: { getElementById(id) { return elements[id]; } }, setTimeout(callback) { timeout = callback; return 1; }, clearTimeout() {} };
  const html = mod.exports.meetupMapHtml(37.55, 126.97, 18, 'test-channel', 'test-key');
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], scope);
  return { scope, messages, events, elements, windowEvents, expire: () => timeout() };
}
test('meetup map reports a blocked Google library instead of claiming ready', () => {
  const fixture = createMap(false); fixture.scope.initMeetupMap();
  assert.deepEqual(fixture.messages, [{ channel: 'test-channel', error: true }]);
  assert.ok(!fixture.messages.some((message) => message.ready));
});
test('meetup coordinates are sent only after the Google map is visible and longitude is wrapped', () => {
  const fixture = createMap(); fixture.scope.initMeetupMap();
  assert.equal(fixture.messages.length, 0, 'A blank map must not select its default coordinates');
  fixture.events.idle();
  assert.equal(fixture.messages.at(-1).ready, true);
  fixture.events.click({ latLng: { lat: () => 35.68, lng: () => 499.76 } });
  assert.equal(fixture.messages.at(-1).latitude, 35.68);
  assert.ok(Math.abs(fixture.messages.at(-1).longitude - 139.76) < 0.00001);
});

test('a failed meetup SDK never sends stale coordinates or revives after late idle', () => {
  const fixture = createMap(); fixture.scope.initMeetupMap();
  let cancelled = false;
  fixture.windowEvents.unhandledrejection({ reason: new Error('Could not load "util".'), preventDefault() { cancelled = true; } });
  assert.ok(cancelled);
  assert.equal(fixture.elements.pin.style.display, 'none');
  assert.equal(fixture.elements.error.style.display, 'grid');
  fixture.events.idle();
  fixture.events.click({ latLng: { lat: () => 35.68, lng: () => 139.76 } });
  fixture.events.dragend();
  fixture.expire();
  assert.deepEqual(fixture.messages, [{ channel: 'test-channel', error: true }]);
});

test('an iframe runtime failure after readiness revokes coordinate selection', () => {
  const fixture = createMap(); fixture.scope.initMeetupMap(); fixture.events.idle();
  fixture.windowEvents.error({ message: 'Google utility failed', preventDefault() {} });
  fixture.events.dragend(); fixture.events.idle();
  fixture.events.click({ latLng: { lat: () => 35.68, lng: () => 139.76 } });
  assert.deepEqual(fixture.messages, [{ channel: 'test-channel', ready: true }, { channel: 'test-channel', error: true }]);
});

test('opaque meetup iframe can observe bootstrap promise rejections through anonymous CORS', () => {
  const html = mod.exports.meetupMapHtml(37.55, 126.97, 18, 'test-channel', 'test-key');
  const bootstrap = html.match(/<script\b[^>]*\bsrc="https:\/\/maps\.googleapis\.com[^>]+>/)[0];
  assert.match(bootstrap, /crossorigin="anonymous"/, 'The sandbox cannot report cross-origin bootstrap failures without CORS');
});

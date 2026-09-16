const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = readFileSync(join(__dirname, '../../mobile/src/components/google-route-map-html.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const mod = { exports: {} };
new Function('exports', 'module', outputText)(mod.exports, mod);
const { googleRouteMapHtml, googlePlaceUrl } = mod.exports;
const place = { id: 'p-shibuya', name: '시부야 PARCO', region: '시부야', latitude: 35.6618, longitude: 139.6987, visitors: 18, requestCount: 12 };

function mapDocument() {
  const messages = [], elements = { loading: { style: {} }, error: { style: {} }, map: {} };
  const mapEvents = {}, windowEvents = {}, markerEvents = [];
  const map = { fitBounds() {}, getZoom() { return 13; }, setZoom() {} };
  const google = { maps: {
    Map: function Map() { return map; },
    LatLngBounds: function LatLngBounds() { return { extend() {} }; },
    InfoWindow: function InfoWindow() { return { setContent() {}, open() {} }; },
    Marker: function Marker() { return { getPosition() { return {}; }, addListener(_name, callback) { markerEvents.push(callback); } }; },
    SymbolPath: { CIRCLE: 'circle' },
    event: { addListenerOnce(_map, name, callback) { mapEvents[name] = callback; } },
  } };
  let timeout;
  const sandbox = { google, document: { getElementById: (id) => elements[id] }, window: { addEventListener(name, callback) { windowEvents[name] = callback; }, parent: { postMessage: (value) => messages.push(JSON.parse(value)) } }, setTimeout: (callback, delay) => { assert.equal(delay, 12000); timeout = callback; return 1; }, clearTimeout() {} };
  const html = googleRouteMapHtml([place], place.id, 'example-key', 'test-channel');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, sandbox);
  return { messages, elements, sandbox, mapEvents, windowEvents, markerEvents, expire: () => timeout() };
}

test('a blocked Google script becomes a recoverable map error instead of an endless spinner', () => {
  const document = mapDocument();
  document.expire();
  assert.equal(document.elements.loading.style.display, 'none');
  assert.equal(document.elements.error.style.display, 'grid');
  assert.deepEqual(document.messages, [{ channel: 'test-channel', error: true }]);
  document.sandbox.initMap();
  assert.ok(!document.messages.some((message) => message.ready), 'late script completion must not erase a failed state');
});

test('authentication failure is sent to the parent and the external fallback uses actual coordinates', () => {
  const document = mapDocument();
  document.sandbox.window.gm_authFailure();
  assert.equal(document.messages[0].error, true);
  const url = new URL(googlePlaceUrl(place));
  assert.equal(url.hostname, 'www.google.com');
  assert.equal(url.searchParams.get('query'), '35.6618,139.6987');
});

test('asynchronous Google SDK rejection fails visibly and late tiles cannot restore readiness', () => {
  const fixture = mapDocument(); fixture.sandbox.initMap();
  assert.equal(fixture.messages.length, 0, 'Map construction is not proof that map tiles loaded');
  let cancelled = false;
  fixture.windowEvents.unhandledrejection({ reason: new Error('Could not load "util".'), preventDefault() { cancelled = true; } });
  assert.ok(cancelled, 'The isolated iframe converts its SDK rejection into an explicit parent error');
  assert.equal(fixture.elements.error.style.display, 'grid');
  fixture.mapEvents.tilesloaded();
  fixture.markerEvents[0]();
  fixture.expire();
  assert.deepEqual(fixture.messages, [{ channel: 'test-channel', error: true }]);
});

test('runtime failure after ready stops further selections from the embedded map', () => {
  const fixture = mapDocument(); fixture.sandbox.initMap(); fixture.mapEvents.tilesloaded();
  assert.equal(fixture.messages.at(-1).ready, true);
  fixture.windowEvents.error({ message: 'Google utility failed', preventDefault() {} });
  fixture.markerEvents[0](); fixture.mapEvents.tilesloaded();
  assert.deepEqual(fixture.messages, [{ channel: 'test-channel', ready: true }, { channel: 'test-channel', error: true }]);
});

test('SDK bootstrap opts into CORS so its asynchronous failures are observable inside the map frame', () => {
  const html = googleRouteMapHtml([place], place.id, 'example-key', 'test-channel');
  const bootstrap = html.match(/<script\b[^>]*\bsrc="https:\/\/maps\.googleapis\.com[^>]+>/)[0];
  assert.match(bootstrap, /crossorigin="anonymous"/, 'Cross-origin promise rejections are otherwise hidden from unhandledrejection listeners');
});

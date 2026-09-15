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
  const messages = [], elements = { loading: { style: {} }, error: { style: {} } };
  let timeout;
  const sandbox = { document: { getElementById: (id) => elements[id] }, window: { parent: { postMessage: (value) => messages.push(JSON.parse(value)) } }, setTimeout: (callback, delay) => { assert.equal(delay, 12000); timeout = callback; return 1; }, clearTimeout() {} };
  const html = googleRouteMapHtml([place], place.id, 'example-key', 'test-channel');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, sandbox);
  return { messages, elements, sandbox, expire: () => timeout() };
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

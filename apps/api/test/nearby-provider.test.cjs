const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');
const { seedDatabase } = require('@moa/domain/dist/seed');
function load(file, imports = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/nearby', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'module', 'require', '__DEV__', compiled)(module.exports, module, (id) => id in imports ? imports[id] : require(id), true);
  return module.exports;
}
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
async function harness(options = {}) {
  const dom = new JSDOM('<div id="root"></div>');
  const before = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  const model = load('model.ts'), lifecycle = load('lifecycle.ts');
  const saved = new Map();
  const storage = load('storage.ts', { './model': model, '@react-native-async-storage/async-storage': {
    getItem: async (k) => saved.get(k) || null, setItem: async (k, v) => { saved.set(k, v); }, removeItem: async (k) => { saved.delete(k); },
  } });
  const data = seedDatabase(new Date(Date.now() - 4 * 86400000)); data.me = data.users.find((u) => u.id === 'u-min'); data.offers = [];
  if (options.future) data.trips.forEach((t) => { t.startDate = '2099-01-01'; t.endDate = '2099-01-05'; });
  if (options.enabled) await storage.writePreferences(data.me.id, { ...model.DEFAULT_PREFERENCES, nearbyEnabled: true });
  let value, onTap, onLocation, appStateListener;
  let permission = { location: true, notifications: true, background: false };
  const calls = { permissionRequests: 0, permissions: 0, watch: 0, remove: 0, send: 0, nav: [], notices: [], clearTap: 0, bgPermission: 0 };
  const app = { data: options.loggedOut ? null : data, role: options.role || 'traveler', loading: false,
    refresh: async () => {}, nav: (name, params) => calls.nav.push({ name, ...params }), notify: (message) => calls.notices.push(message) };
  const native = {
    supported: true, backgroundSupported: true,
    permissions: async () => { calls.permissions++; return permission; },
    requestPermissions: async (allowed) => { calls.permissionRequests++; if (options.permissionDeferred) await options.permissionDeferred.promise; return allowed() ? permission : { location: false, notifications: false, background: false }; },
    requestBackground: async () => { calls.bgPermission++; return true; },
    watchPosition: async (fn) => { onLocation = fn; calls.watch++; return { remove: () => calls.remove++ }; },
    listenToTaps: (fn) => { onTap = fn; return () => {}; }, clearLastTap: async () => calls.clearTap++,
  };
  const runtime = {
    bindNearbyOwner() {}, stopBackground: async () => {}, configureBackground: async () => {},
    sendNearby: async (d, p, allowed) => { if (allowed()) calls.send++; return '알림 전송'; },
  };
  const module = load('NearbyProvider.tsx', { './model': model, './storage': storage, './lifecycle': lifecycle, './platform': native, './runtime': runtime,
    '../state/AppContext': { useApp: () => app }, '../lib/api': { api: async () => app.data }, '../lib/auth-storage': { backgroundLoginToken: async () => 'session' },
    'react-native': { AppState: { currentState: 'active', addEventListener: (_, fn) => { appStateListener = fn; return { remove() {} }; } } },
  });
  function Probe() { value = module.useNearby(); return null; }
  const root = createRoot(dom.window.document.getElementById('root'));
  const render = () => root.render(React.createElement(module.NearbyProvider, null, React.createElement(Probe)));
  await act(async () => { render(); });
  return { get state() { return value; }, calls, app, data, model, lifecycle, storage,
    run: async (operation) => { let result; await act(async () => { result = await operation(value); }); return result; },
    start: async (operation) => { let pending; await act(async () => { pending = operation(value); await Promise.resolve(); }); return { pending }; },
    rerender: async () => { await act(async () => { render(); }); },
    tap: async (payload, id = 'notice') => { await act(async () => { onTap(payload, id); }); },
    emitLocation: async () => { const p = data.places.find((p) => p.id === 'p-shibuya'); await act(async () => { onLocation?.({ latitude: p.latitude, longitude: p.longitude, timestamp: Date.now(), accuracy: 10 }); }); },
    setPermission: (p) => { permission = { ...permission, ...p }; },
    wake: async () => { await act(async () => { appStateListener('active'); }); },
    close: async () => { await act(async () => root.unmount()); dom.window.close(); global.window = before.window; global.document = before.document; global.IS_REACT_ACT_ENVIRONMENT = before.act; },
  };
}
test('mount is OFF and makes no permission request or location subscription; consent starts it', async () => {
  const h = await harness();
  try {
    assert.equal(h.calls.permissionRequests, 0); assert.equal(h.calls.permissions, 0); assert.equal(h.calls.watch, 0);
    assert.equal(await h.run((n) => n.enable()), true);
    assert.equal(h.calls.permissionRequests, 1); assert.equal(h.calls.watch, 1);
    assert.equal(h.state.preferences.nearbyEnabled, true);
    await h.emitLocation(); assert.equal(h.calls.send, 1); assert.ok(h.state.candidates.length > 0);
    await h.run((n) => n.update({ nearbyEnabled: false }));
    assert.equal(h.state.candidates.length, 0); assert.equal(h.state.point, null); assert.ok(h.calls.remove > 0);
  } finally { await h.close(); }
});
test('permission rejection remains OFF and exposes recovery, not a broken application', async () => {
  const h = await harness();
  try {
    h.setPermission({ notifications: false });
    assert.equal(await h.run((n) => n.enable()), false);
    assert.equal(h.state.preferences.nearbyEnabled, false); assert.equal(h.calls.watch, 0); assert.match(h.state.error, /권한/);
  } finally { await h.close(); }
});
test('closing explanation or logging out during permission prompt does not enable the feature later', async () => {
  for (const logout of [false, true]) {
    const permissionDeferred = deferred(), h = await harness({ permissionDeferred });
    try {
      const work = await h.start((n) => n.enable());
      await h.run((n) => { if (logout) { h.lifecycle.interruptNearby(); h.app.data = null; } else n.cancelConsent(); });
      await h.rerender();
      await h.run(async () => { permissionDeferred.resolve(); await work.pending; });
      assert.equal((await h.storage.readPreferences('u-min')).nearbyEnabled, false);
      assert.equal(h.calls.watch, 0);
    } finally { await h.close(); }
  }
});
test('future trip, buyer mode and revoked notification permission stop location watching', async () => {
  for (const options of [{ future: true }, { role: 'buyer' }]) {
    const h = await harness({ enabled: true, ...options });
    try { assert.equal(h.calls.watch, 0); assert.equal(h.calls.send, 0); } finally { await h.close(); }
  }
  const h = await harness({ enabled: true });
  try {
    assert.equal(h.calls.watch, 1); h.setPermission({ notifications: false }); await h.wake();
    assert.ok(h.calls.remove > 0); assert.equal(h.state.candidates.length, 0);
  } finally { await h.close(); }
});
test('single/group taps reuse detail/list routes; duplicate, malformed and wrong-account taps ignored', async () => {
  const h = await harness();
  try {
    const payload = { version: 1, ownerId: 'u-min', type: 'NEARBY_REQUEST', requestId: 'r-2', requestIds: ['r-2'], placeId: 'p-shibuya' };
    await h.tap(payload); assert.deepEqual(h.calls.nav.at(-1), { name: 'request', id: 'r-2' });
    await h.tap(payload); assert.equal(h.calls.nav.length, 1);
    await h.tap({ ...payload, ownerId: 'u-haru' }, 'other'); assert.equal(h.calls.nav.length, 1);
    await h.tap({ ...payload, type: 'ACCEPT' }, 'malformed'); assert.equal(h.calls.nav.length, 1);
    await h.tap({ ...payload, type: 'NEARBY_REQUEST_GROUP', requestIds: ['r-2', 'r-3'] }, 'group');
    assert.deepEqual(h.calls.nav.at(-1), { name: 'nearby', placeId: 'p-shibuya', requestIds: ['r-2', 'r-3'] });
    assert.equal(h.calls.send, 0); assert.equal(h.calls.watch, 0);
  } finally { await h.close(); }
});
test('cold-start tap waits for the correct login and stale request tap has a safe fallback', async () => {
  const h = await harness({ loggedOut: true });
  try {
    const payload = { version: 1, ownerId: 'u-min', type: 'NEARBY_REQUEST', requestId: 'r-2', requestIds: ['r-2'], placeId: 'p-shibuya' };
    await h.tap(payload); assert.equal(h.calls.nav.length, 0);
    h.app.data = h.data; await h.rerender(); assert.deepEqual(h.calls.nav.at(-1), { name: 'request', id: 'r-2' });
    h.data.requests.find((r) => r.id === 'r-2').status = 'MATCHED';
    await h.tap(payload, 'stale'); assert.deepEqual(h.calls.nav.at(-1), { name: 'nearby' }); assert.match(h.calls.notices.at(-1), /마감/);
  } finally { await h.close(); }
});

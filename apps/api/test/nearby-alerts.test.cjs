const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { seedDatabase } = require('@moa/domain/dist/seed');
function load(name, imports = {}, dev = true) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/nearby', name), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'module', 'require', '__DEV__', compiled)(module.exports, module, (id) => id in imports ? imports[id] : require(id), dev);
  return module.exports;
}
const model = load('model.ts');
const now = new Date('2026-09-22T12:00:00').getTime();
const preferences = { ...model.DEFAULT_PREFERENCES, nearbyEnabled: true };
function fixture() {
  const d = seedDatabase(new Date('2026-09-18T00:00:00Z'));
  d.me = d.users.find((u) => u.id === 'u-min');
  d.offers = []; d.transactions = [];
  return d;
}
function point(d, time = now) {
  const p = d.places.find((p) => p.id === 'p-shibuya');
  return { latitude: p.latitude + 0.001, longitude: p.longitude, timestamp: time, accuracy: 10 };
}
const candidates = (d = fixture(), p = preferences) => model.findNearby(d, point(d), p, 'traveler', now);
test('OFF by default, 500m, three per day, no background consent', () => {
  assert.deepEqual(model.DEFAULT_PREFERENCES, { notificationsEnabled: true, nearbyEnabled: false, radius: 500, dailyLimit: 3, backgroundEnabled: false });
  assert.equal(candidates(fixture(), model.DEFAULT_PREFERENCES).length, 0);
  assert.equal(candidates(fixture(), { ...preferences, notificationsEnabled: false }).length, 0);
  assert.deepEqual(model.normalizePreferences({ radius: 9999, dailyLimit: 99, nearbyEnabled: 'yes' }), model.DEFAULT_PREFERENCES);
});
test('Haversine distances and 300/500/1000m thresholds', () => {
  const a = { latitude: 35, longitude: 139 };
  assert.equal(model.distanceMeters(a, a), 0);
  assert.ok(Math.abs(model.distanceMeters(a, { ...a, latitude: 35.001 }) - 111.195) < 0.01);
  assert.equal(model.distanceMeters(a, { latitude: 100, longitude: 139 }), Infinity);
  const d = fixture(), location = point(d); location.latitude += 0.003;
  assert.equal(model.findNearby(d, location, { ...preferences, radius: 300 }, 'traveler', now).length, 0);
  assert.ok(model.findNearby(d, location, { ...preferences, radius: 500 }, 'traveler', now).length > 0);
});
test('no buyer, inaccurate/stale coordinates, future/ended trips or foreign destination candidates', () => {
  const d = fixture(), p = point(d);
  assert.equal(model.findNearby(d, p, preferences, 'buyer', now).length, 0);
  for (const patch of [{ timestamp: now - 120001 }, { accuracy: 151 }, { accuracy: null }, { latitude: NaN }]) {
    assert.equal(model.findNearby(d, { ...p, ...patch }, preferences, 'traveler', now).length, 0);
  }
  for (const time of [now - 5 * 86400000, now + 8 * 86400000]) {
    assert.equal(model.findNearby(d, { ...p, timestamp: time }, preferences, 'traveler', time).length, 0);
  }
  d.trips.forEach((t) => { t.destinationCountry = 'ID'; });
  assert.equal(candidates(d).length, 0);
});
test('open, unmatched, tradable, other-user requests only; existing offer eligibility preserved', () => {
  const baseline = fixture();
  const sample = candidates(baseline)[0].request;
  const exclude = [
    { status: 'MATCHED' }, { status: 'PAYMENT_PENDING' }, { status: 'CANCELLED' },
    { inventoryStatus: 'OUT_OF_STOCK' }, { inventoryStatus: 'PREORDER' },
    { requesterId: baseline.me.id }, { country: 'ID' }, { city: '발리' },
    { desiredDate: '2026-09-21' }, { deliveryCountry: 'US' },
    { transport: 'MEETUP', deliveryCity: '부산' },
  ];
  for (const patch of exclude) {
    const d = fixture(); d.requests = [{ ...sample, ...patch }];
    assert.equal(candidates(d).length, 0, JSON.stringify(patch));
  }
  for (const status of ['PENDING', 'ACCEPTED']) {
    const d = fixture(); d.requests = [sample]; d.offers = [{ requestId: sample.id, travelerId: d.me.id, status }];
    assert.equal(candidates(d).length, 0);
  }
  const d = fixture(); d.requests = [sample]; d.transactions = [{ requestId: sample.id, status: 'PAYMENT_HELD' }];
  assert.equal(candidates(d).length, 0);
  d.transactions = []; d.trips.forEach((t) => { t.placeIds = []; });
  assert.equal(candidates(d).length, 0);
});
test('six requests at the same store become one payload with real identifiers, no location leak', () => {
  const d = fixture(), r = candidates(d)[0].request;
  d.requests = Array.from({ length: 6 }, (_, i) => ({ ...r, id: `test-${i}`, requestedReward: 5000 }));
  const group = model.nextNotification(candidates(d), model.emptyLedger(), preferences, now);
  const content = model.notificationContent(group, d.me.id);
  assert.equal(group.items.length, 6);
  assert.equal(content.data.type, 'NEARBY_REQUEST_GROUP');
  assert.equal(content.data.requestIds.length, 6);
  assert.match(content.body, /30,000/);
  assert.doesNotMatch(JSON.stringify(content.data), /latitude|longitude|token|address/i);
  assert.deepEqual(model.parsePayload(content.data), content.data);
  const single = model.notificationContent({ ...group, items: [group.items[0]] }, d.me.id);
  assert.equal(single.data.type, 'NEARBY_REQUEST');
  assert.equal(single.data.requestId, r.id === 'test-0' ? r.id : 'test-0');
});
test('24h request dedup, 1h place cooldown, daily cap and a global 1min throttle', () => {
  const items = candidates(), first = model.nextNotification(items, model.emptyLedger(), preferences, now);
  const ledger = model.reserveNotification(model.emptyLedger(), first, now);
  assert.equal(model.nextNotification(items, ledger, preferences, now + 2 * 3600000), null);
  assert.ok(model.nextNotification(items, ledger, preferences, now + 24 * 3600000));
  const newItem = [{ ...items[0], request: { ...items[0].request, id: 'new-request' } }];
  assert.equal(model.nextNotification(newItem, ledger, preferences, now + 3599999), null);
  assert.ok(model.nextNotification(newItem, ledger, preferences, now + 3600000));
  const elsewhere = [{ ...newItem[0], place: { ...newItem[0].place, id: 'new-place' } }];
  assert.equal(model.nextNotification(elsewhere, ledger, preferences, now + 59999), null);
  assert.ok(model.nextNotification(elsewhere, ledger, preferences, now + 60000));
  const capped = { ...model.emptyLedger(), sent: [now - 3600000, now - 1800000, now - 120000] };
  assert.equal(model.nextNotification(items, capped, preferences, now), null);
  assert.ok(model.nextNotification(items, capped, { ...preferences, dailyLimit: 5 }, now));
  assert.ok(model.nextNotification(items, capped, { ...preferences, dailyLimit: null }, now));
  assert.equal(model.nextNotification(items, { ...capped, sent: [now + 1000] }, preferences, now), null);
});
test('malformed notification links rejected; no arbitrary navigation or auto-accept action', () => {
  const group = model.nextNotification(candidates(), model.emptyLedger(), preferences, now);
  const data = model.notificationContent(group, 'u-min').data;
  for (const patch of [{ type: 'ACCEPT' }, { ownerId: '' }, { requestIds: ['../../auth'] }, { placeId: 'x\nfoo' }, { requestIds: Array(51).fill('r-1') }]) {
    assert.equal(model.parsePayload({ ...data, ...patch }), null);
  }
});

test('adjacent stores within 50m are grouped, each keeps its name, identifiers and cooldown', () => {
  const d = fixture(), base = candidates(d)[0];
  const adjacent = { ...base.place, id: 'adjacent', name: '옆 매장', latitude: base.place.latitude + 0.0001 };
  const far = { ...base.place, id: 'far', latitude: base.place.latitude + 0.001 };
  const nearbyRequest = { ...base.request, id: 'adjacent-request', placeId: adjacent.id };
  d.places.push(adjacent, far); d.requests.push(nearbyRequest);
  const items = [base, { ...base, place: adjacent, request: nearbyRequest }, { ...base, place: far, request: { ...base.request, id: 'far-request' } }];
  const groups = model.groupNearby(items); assert.equal(groups.length, 2); assert.equal(groups[0].items.length, 2);
  const ledger = model.reserveNotification(model.emptyLedger(), groups[0], now);
  assert.equal(ledger.places.adjacent, now); assert.equal(ledger.places[base.place.id], now);
  const payload = model.notificationContent(groups[0], d.me.id);
  assert.match(payload.body, /근처 2곳/);
  assert.deepEqual(model.requestsFromAlert(d, payload.data).map((r) => r.id), [base.request.id, nearbyRequest.id]);
});

test('capacity limit and cancelled reservations follow the existing application rules', () => {
  const d = fixture(), base = candidates(d)[0];
  const trip = d.trips.find((t) => t.id === base.trip.id);
  trip.maxItems = 1;
  d.offers.push({ id: 'reserved', tripId: trip.id, travelerId: d.me.id, requestId: 'r-6', status: 'PENDING' });
  assert.equal(candidates(d).length, 0);
  d.transactions.push({ offerId: 'reserved', requestId: 'r-6', status: 'CANCELLED' });
  assert.ok(candidates(d).length > 0);
});

function runtimeHarness(options = {}) {
  const map = new Map(), calls = { delivered: [], reads: 0, watches: 0, start: [], stop: 0, current: 0, dismissed: 0 };
  let permission = { location: true, notifications: true, background: true }, token = 'test-session';
  const lifecycle = load('lifecycle.ts');
  const storage = load('storage.ts', { './model': model, '@react-native-async-storage/async-storage': {
    getItem: async (key) => map.get(key) || null,
    setItem: async (key, value) => { if (options.write) await options.write(key, value); map.set(key, value); },
    removeItem: async (key) => { map.delete(key); },
  } });
  const platform = {
    backgroundSupported: true,
    permissions: async () => { calls.reads++; return permission; },
    deliver: async (content) => { calls.delivered.push(content); },
    installPresentationGuard: (handler) => { calls.guard = handler; },
    dismissNearby: async () => { calls.dismissed++; },
    stopRegions: async () => { calls.stop++; },
    startRegions: async (regions) => { calls.start.push(regions); if (options.start) await options.start(); },
    currentPoint: async () => { calls.current++; return point(fixture(), Date.now()); },
  };
  const runtime = load('runtime.ts', { './model': model, './lifecycle': lifecycle, './storage': storage, './platform': platform,
    '../lib/api': { API_URL: 'https://example.invalid' }, '../lib/auth-storage': { backgroundLoginToken: async () => token } });
  runtime.bindNearbyOwner('u-min');
  return { runtime, storage, lifecycle, map, calls, setPermission: (p) => { permission = { ...permission, ...p }; }, setToken: (v) => { token = v; } };
}
async function atFixedTime(work) {
  const original = Date.now; Date.now = () => now;
  try { await work(); } finally { Date.now = original; }
}
test('concurrent foreground/headless requests reserve first and send only one grouped notification', () => atFixedTime(async () => {
  const h = runtimeHarness(), d = fixture(); await h.storage.writePreferences('u-min', preferences);
  await Promise.all(Array.from({ length: 6 }, () => h.runtime.sendNearby(d, point(d), () => true)));
  assert.equal(h.calls.delivered.length, 1);
  assert.ok(h.calls.delivered[0].data.requestIds.length > 1);
  const ledger = await h.storage.readLedger('u-min'); assert.equal(ledger.sent.length, 1);
  assert.doesNotMatch([...h.map.values()].join(''), /latitude|longitude|test-session/);
}));
test('OFF and revoked permissions suppress delivery; test does not bypass consent', () => atFixedTime(async () => {
  const h = runtimeHarness(), d = fixture();
  await h.runtime.sendNearby(d, point(d), () => true, now);
  assert.equal(h.calls.reads, 0); assert.equal(h.calls.delivered.length, 0);
  await h.storage.writePreferences('u-min', preferences);
  h.setPermission({ location: false }); await h.runtime.sendNearby(d, point(d), () => true);
  h.setPermission({ location: true, notifications: false }); await h.runtime.sendNearby(d, point(d), () => true);
  assert.equal(h.calls.delivered.length, 0);
}));
test('logout or OFF during ledger write cancels delivery, retaining reservation', () => atFixedTime(async () => {
  let h;
  h = runtimeHarness({ write: async (key) => { if (key.endsWith(':ledger')) h.lifecycle.interruptNearby(); } });
  const d = fixture(); await h.storage.writePreferences('u-min', preferences);
  await h.runtime.sendNearby(d, point(d), () => true);
  assert.equal(h.calls.delivered.length, 0);
  assert.equal((await h.storage.readLedger('u-min')).sent.length, 1);
  await h.runtime.stopBackground(); assert.equal(await h.storage.readBackgroundSession(), null);
}));
test('storage failure fails closed instead of silently clearing notification history', () => atFixedTime(async () => {
  const h = runtimeHarness({ write: async (key) => { if (key.endsWith(':ledger')) throw new Error('disk full'); } });
  const d = fixture(); await h.storage.writePreferences('u-min', preferences);
  await assert.rejects(h.runtime.sendNearby(d, point(d), () => true), /disk full/);
  assert.equal(h.calls.delivered.length, 0);
  h.map.set('moa-nearby-v1:u-min:ledger', '{"sent":[],"requests":{"r":"broken"},"places":{}}');
  await assert.rejects(h.storage.readLedger('u-min'), /알림 기록/);
}));
test('background only with active trip, all permissions and ordinary auto-login; stable regions do not re-register', () => atFixedTime(async () => {
  const h = runtimeHarness(), d = fixture();
  await h.storage.writePreferences('u-min', { ...preferences, backgroundEnabled: true });
  h.setToken(null); await h.runtime.configureBackground(d, true); assert.equal(h.calls.start.length, 0);
  h.setToken('test-session'); await h.runtime.configureBackground(d, false); assert.equal(h.calls.start.length, 0);
  h.setPermission({ background: false }); await h.runtime.configureBackground(d, true); assert.equal(h.calls.start.length, 0);
  h.setPermission({ background: true });
  await h.runtime.configureBackground(d, true); await h.runtime.configureBackground(d, true);
  assert.equal(h.calls.start.length, 1); assert.ok(h.calls.start[0].length <= 20);
  assert.equal(h.calls.start[0][0].radius, 500);
  d.trips.forEach((t) => { t.endDate = '2026-09-21'; });
  await h.runtime.configureBackground(d, true); assert.equal(await h.storage.readBackgroundSession(), null);
}));
test('logout while OS region registration is pending tears down the late registration', () => atFixedTime(async () => {
  let h;
  h = runtimeHarness({ start: async () => { h.lifecycle.interruptNearby(); } });
  await h.storage.writePreferences('u-min', { ...preferences, backgroundEnabled: true });
  await h.runtime.configureBackground(fixture(), true); await h.runtime.stopBackground();
  assert.equal(await h.storage.readBackgroundSession(), null); assert.ok(h.calls.stop > 0);
}));
test('test ledger is isolated from real sends and other users cannot see foreground notifications', () => atFixedTime(async () => {
  const h = runtimeHarness(), d = fixture(); await h.storage.writePreferences('u-min', preferences);
  await h.runtime.sendNearby(d, point(d), () => true, now);
  assert.equal((await h.storage.readLedger('u-min')).sent.length, 0);
  assert.equal((await h.storage.readLedger('u-min', true)).sent.length, 1);
  const payload = h.calls.delivered[0].data;
  assert.equal(await h.calls.guard(payload), true);
  h.runtime.bindNearbyOwner('u-haru'); assert.equal(await h.calls.guard(payload), false);
}));

test('headless entry fetches the authenticated current snapshot without sending traveler coordinates', () => atFixedTime(async () => {
  const h = runtimeHarness(), d = fixture(), originalFetch = global.fetch, requests = [];
  global.fetch = async (url, options) => { requests.push([url, options]); return { ok: true, json: async () => d }; };
  try {
    await h.storage.writePreferences('u-min', { ...preferences, backgroundEnabled: true });
    await h.storage.writeBackgroundSession({ ownerId: 'u-min', expiresAt: now + 86400000 });
    await h.runtime.onPlaceEntry();
    assert.equal(h.calls.current, 1); assert.equal(h.calls.delivered.length, 1);
    assert.equal(requests[0][0], 'https://example.invalid/api/snapshot');
    assert.equal(requests[0][1].headers.Authorization, 'Bearer test-session');
    assert.equal(requests[0][1].body, undefined);
    assert.doesNotMatch(JSON.stringify(requests), /latitude|longitude/);
    await h.runtime.onPlaceEntry(); assert.equal(h.calls.delivered.length, 1);
  } finally { global.fetch = originalFetch; }
}));

test('OFF, expired travel and invalid server sessions stop headless work before reading location', () => atFixedTime(async () => {
  const originalFetch = global.fetch;
  try {
    for (const mode of ['off', 'expired', 'unauthorized', 'other-account']) {
      const h = runtimeHarness();
      await h.storage.writePreferences('u-min', { ...preferences, nearbyEnabled: mode !== 'off', backgroundEnabled: true });
      await h.storage.writeBackgroundSession({ ownerId: 'u-min', expiresAt: mode === 'expired' ? now - 1 : now + 86400000 });
      const d = fixture(); d.me = { ...d.me, id: 'u-haru' };
      global.fetch = async () => ({ ok: mode !== 'unauthorized', status: 401, json: async () => d });
      await h.runtime.onPlaceEntry();
      assert.equal(h.calls.current, 0, mode); assert.equal(h.calls.delivered.length, 0, mode);
      assert.equal(await h.storage.readBackgroundSession(), null, mode);
    }
  } finally { global.fetch = originalFetch; }
}));

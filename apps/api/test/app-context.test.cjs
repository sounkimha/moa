const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { act } = React;
const { JSDOM } = require('jsdom');
const { createRoot } = require('react-dom/client');

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function load(file, imports, browser) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src', file), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const module = { exports: {} };
  new Function('exports', 'module', 'require', 'window', 'document', outputText)(module.exports, module, (name) => name in imports ? imports[name] : require(name), browser, browser.document);
  return module.exports;
}

async function harness(options = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:8081/#home' });
  const previous = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (options.storageDenied) Object.defineProperty(dom.window, 'sessionStorage', { get() { throw new Error('storage denied'); } });
  let token = '', value, intercept = options.intercept;
  const clearedTrips = [];
  class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
  const api = async (url, body) => {
    const intercepted = intercept?.(url, body, token);
    if (intercepted !== undefined) return await intercepted;
    if (url === '/auth/oauth/status') return { GOOGLE: true, KAKAO: false, NAVER: false };
    if (url === '/auth/demo') return { token: `token-${body.userId}` };
    if (url === '/snapshot') return { me: { id: token.replace('token-', '') }, mode: 'demo' };
    if (url.endsWith('/start?returnUrl=http%3A%2F%2Flocalhost%3A8081')) return { authorizationUrl: 'https://provider.example/authorize' };
    return {};
  };
  const imports = {
    'react-native': { Platform: { OS: options.platform || 'web' }, AppState: { currentState: 'active' }, BackHandler: { addEventListener: () => ({ remove() {} }) } },
    'expo-secure-store': { getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {}, ...options.secureStore },
    'expo-web-browser': { maybeCompleteAuthSession() {}, openAuthSessionAsync: async () => ({ type: 'success', url: 'http://localhost:8081/?oauth_code=once' }) },
    '../lib/api': { api, ApiError, setToken: (next) => { token = next; } },
    './navigation': load('state/navigation.ts', {}, dom.window),
    './draft-session': load('state/draft-session.ts', {}, dom.window),
    './trip-draft-session': {
      clearTripDraft: () => { clearedTrips.push('cleared'); },
      readTripDraft: () => null,
      writeTripDraft: () => true,
    },
  };
  const context = load('state/AppContext.tsx', imports, dom.window);
  function Probe() { value = context.useApp(); return null; }
  const root = createRoot(dom.window.document.getElementById('root'));
  await act(async () => { root.render(React.createElement(context.AppProvider, null, React.createElement(Probe))); });
  return {
    get current() { return value; }, get token() { return token; }, dom, ApiError, clearedTrips,
    intercept: (next) => { intercept = next; },
    run: async (operation) => { let result; await act(async () => { result = await operation(value); }); return result; },
    start: async (operation) => { let pending; await act(async () => { pending = operation(value); await Promise.resolve(); }); return { pending }; },
    async close() {
      await act(async () => { root.unmount(); });
      dom.window.close();
      global.window = previous.window; global.document = previous.document; global.IS_REACT_ACT_ENVIRONMENT = previous.act;
    },
  };
}

test('denied session storage still allows an in-memory login and immediate logout', async () => {
  const app = await harness({ storageDenied: true });
  try {
    assert.equal(await app.run((a) => a.login()), true);
    assert.equal(app.current.data.me.id, 'u-me');
    assert.equal(app.current.error, '');
    assert.match(app.current.toast, /새로고침하면 다시 로그인/);
    assert.equal(app.current.busy, false);
    await app.run((a) => a.logout());
    assert.equal(app.current.data, null);
    assert.equal(app.token, '');
  } finally { await app.close(); }
});

test('a late previous-account snapshot cannot replace the new actor and trip drafts are cleared', async () => {
  const app = await harness();
  try {
    await app.run((a) => a.login());
    const oldSnapshot = deferred();
    let delayed = false;
    app.intercept((url) => { if (url === '/snapshot' && !delayed) { delayed = true; return oldSnapshot.promise; } });
    const { pending } = await app.start((a) => a.refresh());
    assert.equal(await app.run((a) => a.switchActor('u-min')), true);
    await app.run(async () => { oldSnapshot.resolve({ me: { id: 'u-me' }, mode: 'demo' }); await pending; });
    assert.equal(app.current.data.me.id, 'u-min');
    assert.equal(app.current.role, 'traveler');
    assert.ok(app.clearedTrips.includes('cleared'));
  } finally { await app.close(); }
});

test('logout cancels an in-flight account switch instead of restoring its new token', async () => {
  const app = await harness();
  try {
    await app.run((a) => a.login());
    const login = deferred();
    app.intercept((url) => url === '/auth/demo' ? login.promise : undefined);
    const { pending } = await app.start((a) => a.switchActor('u-min'));
    await app.run((a) => a.logout());
    let result;
    await app.run(async () => { login.resolve({ token: 'token-u-min' }); result = await pending; });
    assert.equal(result, false);
    assert.equal(app.current.data, null);
    assert.equal(app.current.busy, false);
    assert.equal(app.current.role, 'buyer');
    assert.equal(app.token, '');
    assert.equal(app.dom.window.sessionStorage.getItem('moa-token'), null);
  } finally { await app.close(); }
});

test('logout during OAuth code exchange cannot resurrect the account', async () => {
  const app = await harness();
  try {
    await app.run((a) => a.login());
    const exchange = deferred();
    app.intercept((url) => url === '/auth/oauth/exchange' ? exchange.promise : undefined);
    const { pending } = await app.start((a) => a.socialLogin('GOOGLE'));
    await app.run((a) => a.logout());
    let result;
    await app.run(async () => { exchange.resolve({ token: 'token-u-min', provider: 'GOOGLE' }); result = await pending; });
    assert.equal(result, false);
    assert.equal(app.current.data, null);
    assert.equal(app.token, '');
    assert.equal(app.current.busy, false);
  } finally { await app.close(); }
});

test('a successful mutation followed by an expired-session refresh does not return a navigation result', async () => {
  const app = await harness();
  try {
    await app.run((a) => a.login());
    app.intercept((url) => url === '/snapshot' ? Promise.reject(new app.ApiError('로그인이 만료됐어요.', 401)) : undefined);
    assert.equal(await app.run((a) => a.mutate('/requests', {}, '등록 완료')), undefined);
    assert.equal(app.current.data, null);
    assert.equal(app.token, '');
    assert.equal(app.current.busy, false);
    assert.doesNotMatch(app.current.toast, /처리는 완료|등록 완료/);
    assert.match(app.current.error, /로그인이 만료/);
  } finally { await app.close(); }
});

test('a late mutation from a logged-out account cannot clear a new account mutation lock', async () => {
  const app = await harness();
  try {
    await app.run((a) => a.login());
    const oldMutation = deferred(), newMutation = deferred();
    app.intercept((url) => url === '/old' ? oldMutation.promise : url === '/new' ? newMutation.promise : undefined);
    const old = await app.start((a) => a.mutate('/old', {}));
    await app.run((a) => a.logout());
    assert.equal(await app.run((a) => a.login('DEMO', 'u-min')), true);
    const next = await app.start((a) => a.mutate('/new', {}));
    await app.run(async () => { oldMutation.resolve({ id: 'old' }); assert.equal(await old.pending, undefined); });
    assert.equal(app.current.busy, true);
    await app.run(async () => { newMutation.resolve({ id: 'new' }); assert.deepEqual(await next.pending, { id: 'new' }); });
    assert.equal(app.current.busy, false);
    assert.equal(app.current.data.me.id, 'u-min');
  } finally { await app.close(); }
});

test('direct unauthorized mutations clear private data instead of leaving a stale authenticated screen', async () => {
  const app = await harness();
  try {
    await app.run((a) => a.login());
    app.intercept((url) => url === '/requests' ? Promise.reject(new app.ApiError('다시 로그인해주세요.', 401)) : undefined);
    assert.equal(await app.run((a) => a.mutate('/requests', {})), undefined);
    assert.equal(app.current.data, null);
    assert.equal(app.token, '');
    assert.match(app.current.error, /다시 로그인/);
  } finally { await app.close(); }
});

test('late native token and role restoration cannot undo logout or a newer mode choice', async () => {
  const restoredToken = deferred(), restoredRole = deferred();
  const app = await harness({ platform: 'ios', secureStore: { getItemAsync: (key) => key === 'moa-token' ? restoredToken.promise : restoredRole.promise } });
  try {
    await app.run((a) => a.setRole('buyer'));
    await app.run((a) => a.logout());
    await app.run(async () => { restoredToken.resolve('token-u-min'); restoredRole.resolve('traveler'); });
    assert.equal(app.current.role, 'buyer');
    assert.equal(app.current.data, null);
    assert.equal(app.current.loading, false);
    assert.equal(app.token, '');
  } finally { await app.close(); }
});

test('native token persistence finishing after logout is followed by deletion, not a restored login', async () => {
  const persisted = new Map(), savingToken = deferred();
  const app = await harness({ platform: 'ios', secureStore: {
    async setItemAsync(key, value) { if (key === 'moa-token') await savingToken.promise; persisted.set(key, value); },
    async deleteItemAsync(key) { persisted.delete(key); },
  } });
  try {
    const login = await app.start((a) => a.login());
    const logout = await app.start((a) => a.logout());
    await app.run(async () => { savingToken.resolve(); assert.equal(await login.pending, false); await logout.pending; });
    assert.equal(persisted.has('moa-token'), false);
    assert.equal(app.current.data, null);
    assert.equal(app.token, '');
    assert.equal(app.current.busy, false);
  } finally { await app.close(); }
});

test('address validation rejects blank names, invalid phone numbers and incomplete addresses', () => {
  const { addressFormErrors } = load('screens/Account.tsx', {
    'react-native': {}, 'lucide-react-native': {}, '../state/AppContext': {}, '../theme/tokens': { colors: {} }, '../components/ui': {}, '../components/visuals': {},
  }, { document: {} });
  const valid = { id: '', label: '집', recipient: '김소운', phone: '010-1234-5678', postalCode: '04323', address1: '서울시 용산구 한강대로 1', address2: '', isDefault: true };
  assert.deepEqual(addressFormErrors(valid), {});
  assert.ok(addressFormErrors({ ...valid, label: '  ' }).label);
  assert.ok(addressFormErrors({ ...valid, recipient: '   ' }).recipient);
  assert.ok(addressFormErrors({ ...valid, phone: 'abcdefghijk' }).phone);
  assert.ok(addressFormErrors({ ...valid, postalCode: '1' }).postalCode);
  assert.ok(addressFormErrors({ ...valid, address1: '집' }).address1);
});

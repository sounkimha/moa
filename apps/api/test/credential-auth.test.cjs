const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { AuthController, Sessions } = require('../dist/auth/auth');
const { hashPassword, verifyPassword } = require('../dist/auth/credentials');
const { Store } = require('../dist/infrastructure/store');

async function isolated(run) {
  const directory = await mkdtemp(path.join(tmpdir(), 'moa-credentials-'));
  const keys = ['DATA_FILE', 'DATABASE_URL', 'MOA_TEST_USERNAME', 'MOA_TEST_PASSWORD_SHA256', 'MOA_TRAVELER_TEST_PASSWORD_SHA256', 'PORT', 'QUIET', 'MOA_SERVE_WEB'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  process.env.DATA_FILE = path.join(directory, 'accounts.json');
  process.env.PORT = '0'; process.env.QUIET = '1';
  try { await run(); } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
}
const demoPassword = 'h112828!';
const signup = { username: 'new_traveler', nickname: '새 여행자', password: 'Travel123!' };

test('six fixed test accounts open clean buyer/traveler identities without resetting another session', () => isolated(async () => {
  const store = new Store(), sessions = new Sessions(), auth = new AuthController(sessions, store);
  await store.resetCleanTestData();
  const before = await store.read((db) => ({ trips: db.trips, requests: db.requests }));
  const clean = await store.read((db) => ({ users: db.users, places: db.places.length, requests: db.requests.length, trips: db.trips.length, transactions: db.transactions.length, messages: db.messages.length }));
  assert.equal(clean.users.length, 6);
  assert.deepEqual(clean.users.map((user) => user.id), ['u-buyer-01', 'u-buyer-02', 'u-buyer-03', 'u-traveler-01', 'u-traveler-02', 'u-traveler-03']);
  assert.ok(clean.places > 0);
  assert.deepEqual({ requests: clean.requests, trips: clean.trips, transactions: clean.transactions, messages: clean.messages }, { requests: 0, trips: 0, transactions: 0, messages: 0 });
  const buyer = await auth.test({ username: 'buyer01', password: demoPassword });
  assert.equal(buyer.defaultRole, 'buyer');
  assert.equal(sessions.resolve(buyer.token), 'u-buyer-01');
  for (const [username, id, nickname] of [['traveler01', 'u-traveler-01', '여행자 01'], ['traveler02', 'u-traveler-02', '여행자 02'], ['traveler03', 'u-traveler-03', '여행자 03']]) {
    const result = await auth.test({ username, password: demoPassword, reset: true });
    assert.equal(result.resetApplied, false);
    assert.equal(result.defaultRole, 'traveler');
    assert.equal(sessions.resolve(result.token), id);
    assert.equal(await store.read((db) => db.users.find((user) => user.id === id).nickname), nickname);
    assert.equal(sessions.resolve(buyer.token), 'u-buyer-01');
  }
  assert.deepEqual(await store.read((db) => ({ trips: db.trips, requests: db.requests })), before);
  assert.equal(sessions.resolve((await auth.login({ username: ' TRAVELER01 ', password: demoPassword })).token), 'u-traveler-01');
  for (const username of ['traveler01', 'traveler03', 'unknown'])
    await assert.rejects(auth.login({ username, password: 'WrongPass1!' }), (error) => error.getStatus() === 401);
}));

test('registration persists a salted credential, re-login survives a new Store, and invalid/duplicate input is rejected', () => isolated(async () => {
  const store = new Store(), sessions = new Sessions(), auth = new AuthController(sessions, store);
  const registered = await auth.register(signup), userId = sessions.resolve(registered.token);
  assert.equal(registered.provider, 'PASSWORD');
  const saved = await store.read((db) => ({
    user: db.users.find((item) => item.id === userId), identity: db.authIdentities.find((item) => item.userId === userId),
    wallet: db.wallets.find((item) => item.userId === userId),
  }));
  assert.equal(saved.user.nickname, signup.nickname);
  assert.deepEqual(saved.user.verificationLabels, []);
  assert.equal(saved.wallet.availableBalance, 0);
  assert.match(saved.identity.passwordHash, /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.equal(await verifyPassword(signup.password, saved.identity.passwordHash), true);
  assert.equal(await verifyPassword('Different123!', saved.identity.passwordHash), false);
  assert.notEqual(await hashPassword(signup.password), saved.identity.passwordHash);
  assert.equal(await verifyPassword(signup.password, 'bad-hash'), false);
  assert.equal((await readFile(process.env.DATA_FILE, 'utf8')).includes(signup.password), false);
  const freshSessions = new Sessions(), freshAuth = new AuthController(freshSessions, new Store());
  const returning = await freshAuth.login({ username: ' NEW_TRAVELER ', password: signup.password });
  assert.equal(freshSessions.resolve(returning.token), userId);
  for (const username of ['NEW_TRAVELER', 'buyer01', 'buyer02', 'buyer03', 'traveler01', 'traveler02', 'traveler03'])
    await assert.rejects(auth.register({ ...signup, username }), (error) => error.getStatus() === 409);
  for (const input of [{ username: 'ab' }, { username: 'bad id' }, { nickname: '나' }, { password: 'short1!' }, { password: '12345678!' }, { password: 'Abcdefgh!' }, { password: 'Abcdefg1 ' }, { role: 'admin' }])
    await assert.rejects(auth.register({ ...signup, ...input }), (error) => error.getStatus() === 400);
  // Unupdated clients cannot wipe a new member by requesting a demo reset.
  assert.equal((await auth.demo({ reset: true })).resetApplied, false);
  assert.equal(sessions.resolve((await auth.login(signupCredentials())).token), userId);
  await store.transaction((db) => { db.authIdentities.find((item) => item.id === saved.identity.id).status = 'DISABLED'; });
  await assert.rejects(auth.login(signupCredentials()), (error) => error.getStatus() === 401);
}));
function signupCredentials() { return { username: signup.username, password: signup.password }; }

test('concurrent case-insensitive signup creates exactly one member', () => isolated(async () => {
  const store = new Store(), auth = new AuthController(new Sessions(), store);
  const results = await Promise.allSettled([auth.register(signup), auth.register({ ...signup, username: signup.username.toUpperCase() })]);
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal(results.find((item) => item.status === 'rejected').reason.getStatus(), 409);
  assert.equal(await store.read((db) => db.authIdentities.filter((item) => item.provider === 'PASSWORD').length), 1);
}));

test('HTTP signup/login/snapshot/logout connect end to end without exposing credentials', () => isolated(async () => {
  const { bootstrap } = require('../dist/main');
  const app = await bootstrap();
  await app.get(Store).resetCleanTestData();
  const origin = `http://127.0.0.1:${app.getHttpServer().address().port}/api`;
  const request = async (route, body, token) => {
    const response = await fetch(origin + route, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  try {
    const created = await request('/auth/register', signup);
    assert.equal(created.status, 201);
    const snapshot = await request('/snapshot', undefined, created.body.token);
    assert.equal(snapshot.status, 200);
    assert.equal(snapshot.body.me.nickname, signup.nickname);
    assert.equal(snapshot.body.authIdentities, undefined);
    assert.doesNotMatch(JSON.stringify(snapshot.body), /passwordHash|scrypt-v1|Travel123!/);
    await request('/auth/logout', {}, created.body.token);
    assert.equal((await request('/snapshot', undefined, created.body.token)).status, 401);
    for (const endpoint of ['/auth/test', '/auth/login']) {
      const login = await request(endpoint, signupCredentials());
      assert.equal(login.status, 201);
      assert.equal((await request('/snapshot', undefined, login.body.token)).body.me.id, snapshot.body.me.id);
    }
    const traveler = await request('/auth/test', { username: 'traveler01', password: demoPassword });
    const trip = await request('/snapshot', undefined, traveler.body.token);
    assert.equal(trip.body.me.id, 'u-traveler-01');
    assert.equal(trip.body.trips.length, 0);
    assert.equal((await request('/auth/register', signup)).status, 409);
  } finally { await app.close(); }
}));

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

test('traveler passwords open the existing accounts and never reset another account or its session', () => isolated(async () => {
  const store = new Store(), sessions = new Sessions(), auth = new AuthController(sessions, store);
  const before = await store.read((db) => ({ trips: db.trips, requests: db.requests }));
  const buyer = await auth.test({ username: 'wasabi', password: demoPassword });
  for (const [username, id, nickname] of [['mintroad', 'u-min', '민트로드'], ['haru', 'u-haru', '하루'], ['joon', 'u-joon', '준의 여행']]) {
    const result = await auth.test({ username, password: demoPassword, reset: true });
    assert.equal(result.resetApplied, false);
    assert.equal(result.defaultRole, 'traveler');
    assert.equal(sessions.resolve(result.token), id);
    assert.equal(await store.read((db) => db.users.find((user) => user.id === id).nickname), nickname);
    assert.equal(sessions.resolve(buyer.token), 'u-me');
  }
  assert.deepEqual(await store.read((db) => ({ trips: db.trips, requests: db.requests })), before);
  assert.equal(sessions.resolve((await auth.login({ username: ' MINTROAD ', password: demoPassword })).token), 'u-min');
  for (const username of ['mintroad', 'joon', 'unknown'])
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
  for (const username of ['NEW_TRAVELER', 'wasabi', 'mintroad', 'haru', 'joon'])
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
    const traveler = await request('/auth/test', { username: 'haru', password: demoPassword });
    const trip = await request('/snapshot', undefined, traveler.body.token);
    assert.equal(trip.body.me.id, 'u-haru');
    assert.ok(trip.body.trips.some((item) => item.travelerId === 'u-haru'));
    assert.equal((await request('/auth/register', signup)).status, 409);
  } finally { await app.close(); }
}));

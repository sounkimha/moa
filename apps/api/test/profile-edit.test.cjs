const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

test('a user can edit only their own public profile and the update persists', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'moa-profile-'));
  const dataFile = path.join(temp, 'state.json');
  const previous = { DATA_FILE: process.env.DATA_FILE, PORT: process.env.PORT, QUIET: process.env.QUIET, DATABASE_URL: process.env.DATABASE_URL };
  process.env.DATA_FILE = dataFile;
  process.env.PORT = '0';
  process.env.QUIET = '1';
  delete process.env.DATABASE_URL;
  let app;
  try {
    const { bootstrap } = require('../dist/main');
    app = await bootstrap();
    const url = (await app.getUrl()).replace('[::1]', '127.0.0.1').replace('0.0.0.0', '127.0.0.1');
    const call = async (route, body, token) => {
      const response = await fetch(`${url}/api${route}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    };
    const login = await call('/auth/demo', { userId: 'u-me', provider: 'DEMO' });
    assert.equal(login.status, 201);
    const token = login.data.token;
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
    const profile = { nickname: '새로운 소운', bio: '가는 길의 작은 발견을 좋아해요.', avatarColor: '#D9EAF5', avatarImage: tinyPng };
    assert.equal((await call('/profile', profile)).status, 401);
    assert.equal((await call('/profile', { ...profile, id: 'u-min' }, token)).status, 400);
    assert.equal((await call('/profile', { ...profile, avatarColor: '#000000' }, token)).status, 400);
    assert.equal((await call('/profile', { ...profile, avatarImage: 'data:image/jpeg;base64,' + tinyPng.split(',')[1] }, token)).status, 400);
    assert.equal((await call('/profile', { ...profile, avatarImage: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }, token)).status, 400);
    assert.equal((await call('/profile', { ...profile, nickname: 'a' }, token)).status, 400);
    const saved = await call('/profile', profile, token);
    assert.equal(saved.status, 201);
    assert.equal(saved.data.nickname, profile.nickname);
    assert.equal(saved.data.initials, '새');
    assert.equal(saved.data.avatarImage, tinyPng);
    assert.equal(saved.data.profileCompleted, true);
    const snapshot = await call('/snapshot', undefined, token);
    assert.equal(snapshot.data.me.bio, profile.bio);
    assert.equal(snapshot.data.me.avatarColor, profile.avatarColor);
    assert.equal(snapshot.data.users.find((user) => user.id === 'u-min').nickname, '민트로드');
    const persisted = JSON.parse(await readFile(dataFile, 'utf8'));
    assert.equal(persisted.users.find((user) => user.id === 'u-me').nickname, profile.nickname);
    assert.equal(persisted.users.find((user) => user.id === 'u-me').avatarImage, tinyPng);
    const removed = await call('/profile', { ...profile, avatarImage: null }, token);
    assert.equal(removed.status, 201);
    assert.equal(removed.data.avatarImage, undefined);
  } finally {
    await app?.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(temp, { recursive: true, force: true });
  }
});

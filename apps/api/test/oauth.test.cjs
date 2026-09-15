const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { OAuthService } = require('../dist/auth/oauth');
const { AuthController, Sessions } = require('../dist/auth/auth');
const { Store } = require('../dist/infrastructure/store');

test('OAuth uses allowlisted returns, one-time state/code and a server-side provider exchange', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'moa-oauth-'));
  const original = {
    DATA_FILE: process.env.DATA_FILE,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    KAKAO_LOGIN_REST_API_KEY: process.env.KAKAO_LOGIN_REST_API_KEY,
    NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID,
    NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET,
    fetch: global.fetch,
  };
  process.env.DATA_FILE = path.join(temp, 'state.json');
  process.env.GOOGLE_CLIENT_ID = 'google-client';
  process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
  process.env.KAKAO_LOGIN_REST_API_KEY = 'kakao-client';
  process.env.NAVER_CLIENT_ID = 'naver-client';
  process.env.NAVER_CLIENT_SECRET = 'naver-secret';
  const store = new Store();
  const sessions = new Sessions();
  const oauth = new OAuthService(store, sessions);
  const request = { protocol: 'http', headers: {}, get: () => 'localhost:4000' };
  try {
    assert.deepEqual(oauth.status(), { GOOGLE: true, KAKAO: true, NAVER: true });
    const demo = await new AuthController(sessions, store).demo({ userId: 'u-me', provider: 'DEMO', reset: true });
    assert.equal(demo.resetApplied, false);
    assert.equal(sessions.resolve(demo.token), 'u-me');
    assert.throws(
      () => oauth.start('google', { returnUrl: 'https://attacker.example' }, request),
      /허용되지 않은/,
    );
    const started = oauth.start('google', { returnUrl: 'http://localhost:8081' }, request);
    const authorization = new URL(started.authorizationUrl);
    assert.equal(authorization.origin, 'https://accounts.google.com');
    assert.equal(authorization.searchParams.get('client_id'), 'google-client');
    assert.equal(
      authorization.searchParams.get('redirect_uri'),
      'http://localhost:4000/api/auth/oauth/google/callback',
    );
    const state = authorization.searchParams.get('state');
    global.fetch = async (input, init = {}) => {
      const url = String(input);
      if (url === 'https://oauth2.googleapis.com/token') {
        assert.equal(init.method, 'POST');
        assert.match(String(init.body), /client_secret=google-secret/);
        return new Response(JSON.stringify({ access_token: 'provider-access-token' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
        assert.equal(init.headers.Authorization, 'Bearer provider-access-token');
        return new Response(JSON.stringify({ sub: 'provider-user-123', name: '구글 여행자', email: 'hidden@example.com' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url === 'https://nid.naver.com/oauth2.0/token') {
        assert.match(String(init.body), /state=/);
        assert.doesNotMatch(String(init.body), /redirect_uri=/);
        return new Response(JSON.stringify({ access_token: 'naver-access-token' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url === 'https://openapi.naver.com/v1/nid/me') {
        assert.equal(init.headers.Authorization, 'Bearer naver-access-token');
        return new Response(JSON.stringify({ response: { id: 'naver-user-123', nickname: '네이버 여행자' } }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };
    const completed = await oauth.complete('google', state, 'authorization-code');
    assert.ok(completed.loginCode);
    assert.equal(completed.provider, 'GOOGLE');
    assert.match(oauth.redirectUrl(completed), /^http:\/\/localhost:8081\/?\?oauth_code=/);
    await assert.rejects(() => oauth.complete('google', state, 'authorization-code'), /만료/);
    const login = oauth.exchange({ code: completed.loginCode });
    assert.equal(login.mode, 'oauth');
    assert.equal(login.provider, 'GOOGLE');
    const userId = sessions.resolve(login.token);
    const user = await store.read((db) => db.users.find((item) => item.id === userId));
    assert.equal(user.nickname, '구글 여행자');
    assert.deepEqual(user.verificationLabels, ['Google 계정']);
    assert.equal(JSON.stringify(user).includes('provider-user-123'), false);
    assert.equal(JSON.stringify(user).includes('hidden@example.com'), false);
    assert.throws(() => oauth.exchange({ code: completed.loginCode }), /만료/);

    const naverStart = oauth.start('naver', { returnUrl: 'http://localhost:8081' }, request);
    const naverAuthorization = new URL(naverStart.authorizationUrl);
    const naverState = naverAuthorization.searchParams.get('state');
    assert.equal(naverAuthorization.origin, 'https://nid.naver.com');
    const naverCompleted = await oauth.complete('naver', naverState, 'naver-authorization-code');
    const naverLogin = oauth.exchange({ code: naverCompleted.loginCode });
    assert.equal(naverLogin.provider, 'NAVER');

    const kakaoStart = oauth.start('kakao', { returnUrl: 'moa://oauth' }, request);
    const kakaoAuthorization = new URL(kakaoStart.authorizationUrl);
    assert.equal(kakaoAuthorization.origin, 'https://kauth.kakao.com');
    assert.equal(kakaoAuthorization.searchParams.has('scope'), false);
    const cancelled = await oauth.complete('kakao', kakaoAuthorization.searchParams.get('state'), undefined, 'access_denied');
    assert.match(oauth.redirectUrl(cancelled), /^moa:\/\/oauth\?oauth_error=/);
  } finally {
    global.fetch = original.fetch;
    for (const [key, value] of Object.entries(original)) {
      if (key === 'fetch') continue;
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await store.onModuleDestroy();
    await rm(temp, { recursive: true, force: true });
  }
});

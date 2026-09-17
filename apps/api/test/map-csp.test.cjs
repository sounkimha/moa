const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

test('map-compatible CSP uses a fresh nonce without globally allowing inline scripts', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'moa-map-csp-'));
  const previous = { DATA_FILE: process.env.DATA_FILE, PORT: process.env.PORT, QUIET: process.env.QUIET, DATABASE_URL: process.env.DATABASE_URL };
  process.env.DATA_FILE = join(temp, 'state.json');
  process.env.PORT = '0';
  process.env.QUIET = '1';
  delete process.env.DATABASE_URL;
  let app;
  try {
    const { bootstrap } = require('../dist/main');
    app = await bootstrap();
    const url = (await app.getUrl()).replace('[::1]', '127.0.0.1').replace('0.0.0.0', '127.0.0.1');
    const first = await fetch(`${url}/health`);
    const second = await fetch(`${url}/health`);
    const firstCsp = first.headers.get('content-security-policy') || '';
    const secondCsp = second.headers.get('content-security-policy') || '';
    assert.match(firstCsp, /script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);
    assert.match(firstCsp, /https:\/\/\*\.googleapis\.com/);
    assert.doesNotMatch(firstCsp, /script-src[^;]*'unsafe-inline'/);
    assert.notEqual(firstCsp, secondCsp);
    assert.equal(first.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  } finally {
    await app?.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(temp, { recursive: true, force: true });
  }
});

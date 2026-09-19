const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const root = resolve(__dirname, '../../..');
const mobile = resolve(root, 'apps/mobile');

function pngSize(file) {
  const data = readFileSync(file);
  assert.equal(data.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

test('MOA web config uses a short standalone PWA identity', () => {
  const app = JSON.parse(readFileSync(resolve(mobile, 'app.json'), 'utf8')).expo;
  const manifest = JSON.parse(readFileSync(resolve(mobile, 'public/manifest.webmanifest'), 'utf8'));

  assert.equal(app.web.name, 'MOA');
  assert.equal(app.web.shortName, 'MOA');
  assert.equal(manifest.name, 'MOA');
  assert.equal(manifest.short_name, 'MOA');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');

  const expectedIcons = [
    ['icons/moa-180.png', 180],
    ['icons/moa-192.png', 192],
    ['icons/moa-512.png', 512],
  ];
  for (const [relativePath, size] of expectedIcons) {
    const file = resolve(mobile, 'public', relativePath);
    assert.ok(existsSync(file), `${relativePath} must be exported`);
    assert.deepEqual(pngSize(file), { width: size, height: size });
  }

  const head = readFileSync(resolve(mobile, 'scripts/post-export-pwa.mjs'), 'utf8');
  assert.match(head, /apple-touch-icon/);
  assert.match(head, /apple-mobile-web-app-title/);
  assert.match(head, /manifest\.webmanifest/);
});

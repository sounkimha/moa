const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { imageSize } = require('image-size');
const { seedDatabase } = require('@moa/domain/dist/seed');

const directory = path.resolve(__dirname, '../../mobile/src/lib');
const source = fs.readFileSync(path.join(directory, 'sample-product-photos.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, (relative) => path.resolve(directory, relative));
const { getSampleProductPhoto } = loaded.exports;
const requests = seedDatabase().requests;

test('only the three existing demo products receive the correct real reference photos', () => {
  const expected = {
    'r-5': 'sample-hachiware-pouch.jpg',
    'r-6': 'sample-tokyo-keyring.jpg',
    'r-15': 'sample-molang-plush.jpg',
  };
  for (const request of requests) {
    const photo = getSampleProductPhoto(request);
    if (!expected[request.id]) assert.equal(photo, undefined);
    else {
      assert.equal(path.basename(photo.source), expected[request.id]);
      assert.match(photo.sourcePage, /^https:\/\//);
      assert.ok(photo.credit && photo.label);
    }
  }
});

test('bundled photos are valid, lightweight JPEGs and work without an external image host', () => {
  for (const request of requests.filter((item) => ['r-5', 'r-6', 'r-15'].includes(item.id))) {
    const bytes = fs.readFileSync(getSampleProductPhoto(request).source);
    const { width, height, type } = imageSize(bytes);
    assert.equal(type, 'jpg');
    assert.ok(width >= 600 && height >= 600);
    assert.ok(bytes.length < 100_000);
  }
});

test('a real uploaded image always takes priority, even on the original demo fixture', () => {
  const request = requests.find((item) => item.id === 'r-5');
  for (const productImage of ['https://uploads.example.com/pouch.jpg', 'file:///photos/pouch.jpg', 'data:image/jpeg;base64,abc']) {
    assert.equal(getSampleProductPhoto({ ...request, productImage }), undefined);
  }
});

test('similar names, edited demo products, and arbitrary IDs never acquire unrelated photos', () => {
  const request = requests.find((item) => item.id === 'r-5');
  assert.equal(getSampleProductPhoto(), undefined);
  assert.equal(getSampleProductPhoto({ ...request, productUrl: 'https://shop.example.com/pouch' }), undefined);
  assert.equal(getSampleProductPhoto({ ...request, productName: '사용자가 바꾼 파우치' }), undefined);
  assert.equal(getSampleProductPhoto({ ...request, productUrl: '' }), undefined);
  const before = JSON.stringify(request);
  getSampleProductPhoto(request);
  assert.equal(JSON.stringify(request), before, 'Do not change seeded prices, names, places or payloads');
});

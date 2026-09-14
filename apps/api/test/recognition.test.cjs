const { test } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns/promises');
const { seedDatabase } = require('@moa/domain/dist/seed');
const { CatalogService } = require('../dist/catalog/catalog');

const catalog = () => {
  const db = seedDatabase();
  return new CatalogService({ read: async (fn) => fn(db) }, { get: async () => null, set: async () => {} });
};
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/CXkAAAAASUVORK5CYII=';

test('sample works without a key; real photos explicitly report unavailable AI', async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const sample = await catalog().recognize(undefined, 'chiikawa');
    assert.equal(sample.product.id, 'product-1');
    assert.equal(sample.source, 'DEMO_SAMPLE');
    assert.match(sample.notice, /실제 업로드 사진을 분석한 결과는 아니에요/);
    const upload = await catalog().recognize(png);
    assert.equal(upload.status, 'VISION_NOT_CONFIGURED');
    assert.equal(upload.product, null);
    assert.match(upload.notice, /자동 분석할 수 없어요/);
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
  }
});

test('metadata survives malformed image URLs and distinguishes blocked sellers from missing products', async () => {
  const originalFetch = global.fetch, originalLookup = dns.lookup;
  dns.lookup = async () => [{ address: '93.184.216.34', family: 4 }];
  try {
    global.fetch = async () => new Response('<title>Demo pouch</title><script type="application/ld+json">{"@type":"Product","name":"Demo pouch","image":"http://[invalid","offers":{"price":1800,"priceCurrency":"JPY"}}</script>');
    const result = await catalog().metadata('https://example.com/product');
    assert.equal(result.status, 'LINK_IDENTIFIED');
    assert.equal(result.suggestion.localPrice, 1800);
    assert.equal(result.suggestion.imageUrl, '');
    global.fetch = async () => new Response('<title>Access denied</title>', { status: 403 });
    assert.equal((await catalog().metadata('https://example.com/product')).status, 'LINK_BLOCKED');
  } finally {
    global.fetch = originalFetch;
    dns.lookup = originalLookup;
  }
});

test('vision response handling preserves uncertain products rather than inventing an exact catalog match', async () => {
  const originalFetch = global.fetch, oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key-not-a-real-secret';
  try {
    const signals = { extractedText: ['KEYRING'], character: '', productName: '이름을 알 수 없는 키링', productType: 'keyring', category: 'CHARACTER', art: 'keyring', storeName: '', purchaseLocation: '', priceAmount: null, currency: null, colors: [] };
    global.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      assert.equal(url, 'https://api.openai.com/v1/responses');
      assert.equal(body.store, false);
      assert.equal(body.input[0].content[1].image_url, png);
      return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(signals) }] }] });
    };
    const result = await catalog().recognize(png);
    assert.equal(result.source, 'OPENAI_VISION');
    assert.equal(result.product, null);
    assert.equal(result.suggestion.localPrice, null);
    assert.equal(result.suggestion.productName, signals.productName);
  } finally {
    global.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
  }
});

test('Chiikawa link preview requests JPY instead of silently treating localized KRW as yen', async () => {
  const originalFetch = global.fetch, originalLookup = dns.lookup;
  dns.lookup = async () => [{ address: '93.184.216.34', family: 4 }];
  try {
    global.fetch = async (url) => {
      assert.equal(new URL(url).searchParams.get('currency'), 'JPY');
      return new Response('<title>ちいかわ</title><script type="application/ld+json">{"@type":"Product","name":"ちいかわ","offers":{"price":1430,"priceCurrency":"JPY"}}</script>');
    };
    const result = await catalog().metadata('https://chiikawamarket.jp/products/4970093800138');
    assert.equal(result.suggestion.currency, 'JPY');
    assert.equal(result.suggestion.localPrice, 1430);
  } finally {
    global.fetch = originalFetch;
    dns.lookup = originalLookup;
  }
});

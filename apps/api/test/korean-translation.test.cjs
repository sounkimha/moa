const { test } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns/promises');
const { translateProductText } = require('../dist/catalog/korean-translation');
const { CatalogService } = require('../dist/catalog/catalog');
const { seedDatabase } = require('@moa/domain/dist/seed');
const input = (productName) => ({ productName, storeName: '온라인 판매처', purchaseLocation: '온라인 판매처', option: '' });
const result = (value) => Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });

test('foreign product text is translated into Korean while original text remains untouched', async () => {
  const previousFetch = global.fetch, key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'translation-test-only';
  try {
    const cases = [
      ['ちいかわ マスコット', '치이카와 마스코트'], ['Limited keyring', '한정 키링'],
      ['限定钥匙扣', '한정 키링'], ['พวงกุญแจ', '키링'], ['Móc khóa', '키링'],
      ['Porte-clés', '키링'],
    ];
    for (const [original, korean] of cases) {
      global.fetch = async (url, init) => {
        assert.equal(url, 'https://api.openai.com/v1/responses');
        const body = JSON.parse(init.body);
        assert.equal(body.store, false);
        assert.equal(body.text.format.strict, true);
        assert.deepEqual(JSON.parse(body.input[0].content), input(original));
        assert.match(body.instructions, /신뢰할 수 없는/);
        return result(input(korean));
      };
      const translated = await translateProductText(input(original));
      assert.equal(translated.status, 'TRANSLATED');
      assert.equal(translated.text.productName, korean);
      assert.equal(translated.original.productName, original);
    }
    const korean = await translateProductText(input('치이카와 키링'));
    assert.equal(korean.status, 'ALREADY_KOREAN');
  } finally {
    global.fetch = previousFetch;
    if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key;
  }
});

test('missing key, refusal, invalid schema, unchanged foreign text and changed numbers do not claim translation success', async () => {
  const previousFetch = global.fetch, key = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_API_KEY;
    assert.equal((await translateProductText(input('Keyring'))).status, 'UNAVAILABLE');
    process.env.OPENAI_API_KEY = 'translation-test-only';
    for (const response of [
      () => new Response('{}', { status: 429 }),
      () => Response.json({ output: [{ content: [{ type: 'refusal' }] }] }),
      () => result({ ...input('키링'), localPrice: 1 }),
      () => result(input('Keyring 12')),
      () => result(input('키링 120')),
    ]) {
      global.fetch = async () => response();
      const translated = await translateProductText(input('Keyring 12'));
      assert.equal(translated.status, 'FAILED');
      assert.equal(translated.text.productName, 'Keyring 12');
      assert.match(translated.notice, /완료하지 못했어요/);
    }
  } finally {
    global.fetch = previousFetch;
    if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key;
  }
});

test('link metadata localizes names and options without changing price, currency, image or cached failure recovery', async () => {
  const previousFetch = global.fetch, lookup = dns.lookup, key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'translation-test-only';
  dns.lookup = async () => [{ address: '93.184.216.34', family: 4 }];
  const cache = new Map();
  let failing = true;
  try {
    global.fetch = async (url) => {
      if (String(url).includes('api.openai.com')) return failing ? new Response('{}', { status: 503 }) : result({
        productName: '한정 키링 AB-123', storeName: '테스트 숍', purchaseLocation: '온라인 판매처', option: '색상: 파랑 · 크기: 12cm',
      });
      return new Response('<meta property="og:site_name" content="Test Shop"><script type="application/ld+json">{"@type":"Product","name":"Limited keyring AB-123","color":"Blue","size":"12cm","image":"https://example.com/image.jpg","offers":{"price":12.75,"priceCurrency":"SGD"}}</script>');
    };
    const db = seedDatabase();
    const service = new CatalogService({ read: async (fn) => fn(db) }, { get: async (k) => cache.get(k), set: async (k,v) => cache.set(k,v) });
    const first = await service.metadata('https://example.com/product');
    assert.equal(first.suggestion.translationStatus, 'FAILED');
    assert.equal(cache.size, 0);
    failing = false;
    const translated = await service.metadata('https://example.com/product');
    assert.equal(translated.suggestion.productName, '한정 키링 AB-123');
    assert.equal(translated.suggestion.storeName, '테스트 숍');
    assert.equal(translated.suggestion.option, '색상: 파랑 · 크기: 12cm');
    assert.equal(translated.suggestion.originalText.productName, 'Limited keyring AB-123');
    assert.equal(translated.suggestion.localPrice, 12.75);
    assert.equal(translated.suggestion.currency, 'SGD');
    assert.equal(translated.suggestion.imageUrl, 'https://example.com/image.jpg');
    assert.equal(translated.source, 'https://example.com/product');
    assert.equal(cache.size, 1);
  } finally {
    global.fetch = previousFetch; dns.lookup = lookup;
    if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key;
  }
});

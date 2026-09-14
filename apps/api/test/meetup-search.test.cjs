const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MeetupController } = require('../dist/meetup/meetup');

test('place provider response maps longitude/latitude correctly and handles upstream failure', async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.KAKAO_REST_API_KEY;
  process.env.KAKAO_REST_API_KEY = 'test-only-not-a-real-key';
  try {
    global.fetch = async (url, options) => {
      assert.equal(url.hostname, 'dapi.kakao.com');
      assert.equal(url.searchParams.get('query'), '서울역');
      assert.equal(options.headers.Authorization, 'KakaoAK test-only-not-a-real-key');
      return new Response(JSON.stringify({ documents: [
        { id: 'test', place_name: '서울역 테스트', address_name: '지번 주소', road_address_name: '도로명 주소', x: '126.97', y: '37.55' },
        { id: 'bad', place_name: '잘못된 좌표', address_name: '', road_address_name: '', x: 'invalid', y: '37.55' },
      ] }), { status: 200 });
    };
    const controller = new MeetupController();
    const response = await controller.search({ q: '서울역' });
    assert.deepEqual(response.results, [{ providerId: 'test', name: '서울역 테스트', address: '도로명 주소', latitude: 37.55, longitude: 126.97, detail: '' }]);
    global.fetch = async () => new Response('{}', { status: 429 });
    await assert.rejects(controller.search({ q: '서울역' }), /잠시 후 다시 검색/);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.KAKAO_REST_API_KEY;
    else process.env.KAKAO_REST_API_KEY = previousKey;
  }
});

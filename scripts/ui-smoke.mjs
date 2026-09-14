/** Execute the actual exported React Native Web bundle against a real Nest API
 * in jsdom. This checks DOM interaction, not browser layout or native rendering. */
import { JSDOM, VirtualConsole } from 'jsdom';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url),
  temp = await mkdtemp(path.join(tmpdir(), 'moa-ui-'));
process.env.DATA_FILE = path.join(temp, 'state.json');
process.env.PORT = '0';
process.env.QUIET = '1';
delete process.env.DATABASE_URL;
const { bootstrap } = require('../apps/api/dist/main.js');
const app = await bootstrap();
const apiRoot = (await app.getUrl()).replace('0.0.0.0', '127.0.0.1').replace('[::1]', '127.0.0.1');
const html = await readFile('apps/mobile/dist/index.html', 'utf8');
const bundleMatch = html.match(/src="([^\"]+\.js)"/);
assert.ok(bundleMatch, 'Exported JS bundle must exist.');
const bundle = await readFile(
  path.join('apps/mobile/dist', bundleMatch[1].replace(/^\//, '')),
  'utf8',
);
const errors = [],
  vc = new VirtualConsole();
vc.on('jsdomError', (error) => errors.push(error.message));
vc.on('error', (...args) => {
  if (!args.join(' ').includes('deprecated')) errors.push(args.join(' '));
});
const dom = new JSDOM(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''), {
  url: 'http://localhost:8081',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(w) {
    Object.defineProperty(w, 'innerWidth', { value: 390, configurable: true });
    Object.defineProperty(w, 'innerHeight', { value: 844, configurable: true });
    w.matchMedia = () => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    });
    w.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    w.fetch = (input, init) =>
      fetch(apiRoot + new URL(input, 'http://localhost:8081').pathname, {
        ...init,
        signal: undefined,
      }).catch((e) => {
        console.error('DOM test fetch:', e.message);
        throw e;
      });
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
  },
});
const document = dom.window.document;
const wait = async (fn, label) => {
  for (let i = 0; i < 80; i++) {
    const result = fn();
    if (result) return result;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(
    'UI wait failed: ' +
      label +
      '\n' +
      document.body.textContent.slice(-1800) +
      '\n' +
      errors.join('\n'),
  );
};
const find = (label, role = 'button') =>
  [...document.querySelectorAll(`[role="${role}"]`)].find(
    (e) => (e.getAttribute('aria-label') || e.textContent).trim() === label,
  );
const click = async (label, role = 'button') => {
  const element = await wait(() => find(label, role), label);
  assert.notEqual(element.getAttribute('aria-disabled'), 'true', label + ' must be enabled');
  element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 70));
};
const expectText = async (text) => wait(() => document.body.textContent.includes(text), text);
try {
  dom.window.eval(bundle);
  await click('사고 싶어요');
  await click('가입 없이 체험 시작');
  await expectText('찾으시는 물건을');
  await click('찾아보기', 'tab');
  await expectText('어디로 가볼까요?');
  for (const label of [
    '도쿄 · 시부야 교차로',
    '도쿄 · 도쿄역',
    '도쿄 근교 · 디즈니씨',
    '오사카 · 도톤보리',
    '후쿠오카 · 하카타역',
    '삿포로 · 오도리공원',
  ]) {
    assert.ok(document.querySelector(`[aria-label="${label} 대표 풍경 사진"]`), label + ' photo');
  }
  await click('이전으로');
  await expectText('찾으시는 물건을');
  assert.equal(dom.window.location.hash, '#home', 'Back without history must sync the URL');
  console.log('PASS: city-specific photos → previous button → synchronized home URL');
  await click('사진으로 찾기');
  await click('치이카와 샘플로 인식 체험');
  await expectText('인식 신뢰도');
  await expectText('예시 상품을 채웠어요');
  await expectText('도쿄역 캐릭터 스트리트');
  await expectText('캐릭터');
  await click('수정');
  const recognizedName = await wait(
    () => document.querySelector('[aria-label="상품명"]'),
    'recognized product name',
  );
  assert.equal(recognizedName.value, '치이카와 도쿄역 한정 키링');
  await click('홈', 'tab');
  await expectText('지금, 이곳으로 가요');
  await click('링크 붙여넣기');
  await click('예시 링크로 빠르게 채우기');
  await expectText('예시 정보예요.');
  await click('수령 방법 정하기');
  await expectText('한국 도착 후 어떻게 받을까요?');
  await click('희망 수령일 달력 열기');
  await expectText('월');
  await click('희망 수령일 달력 열기');
  await click('직접 전달 · 무료');
  const mapFrame = await wait(() => document.querySelector('iframe[title="직거래 위치 지도"]'), 'meetup map');
  const channel = mapFrame.srcdoc.match(/channel:"([^"]+)"/)[1];
  dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
    source: mapFrame.contentWindow,
    data: JSON.stringify({ channel, latitude: 37.555, longitude: 126.97 }),
  }));
  await click('이 위치에서 만날게요');
  await expectText('국내 전달비');
  await expectText('여행자 보상 · 상품가 10%');
  await expectText('받는 방법별 금액 비교');
  await click('뒤로');
  await expectText('예시 상품을 채웠어요');
  await click('수령 방법 정하기');
  await wait(() => {
    const label = [...document.querySelectorAll('*')].find((e) => e.textContent === '국내 전달비');
    return label?.parentElement?.textContent.includes('₩0');
  }, 'preserved free meetup fee');
  await expectText('직거래 위치가 저장됐어요');
  await click('부탁 등록하기');
  await expectText('여행자의 수락을 기다려요');
  console.log('PASS: onboarding → real API login → link metadata → request creation');
  await click('홈', 'tab');
  await click('가져올게요');
  await expectText('가는 김에, 묶어서');
  // The location bundle is a pressable containing the place name and reward.
  const bundleCard = await wait(
    () =>
      [...document.querySelectorAll('[role="button"]')].find(
        (e) => e.textContent.includes('시부야 PARCO') && e.textContent.includes('건 묶음'),
      ),
    'Shibuya bundle card',
  );
  bundleCard.click();
  await expectText('한 번 가서, 함께 가져와요');
  const proposal = await wait(
    () =>
      [...document.querySelectorAll('[role="button"]')].find((e) =>
        /건 한 번에 수락하기/.test(e.getAttribute('aria-label') || ''),
      ),
    'bundle offer CTA',
  );
  proposal.click();
  await expectText('묶음 부탁 수락하기');
  await click('상품대금을 먼저 지출하고 구매 확정 후 상환받는다는 점을 확인했어요.', 'checkbox');
  const send = await wait(
    () =>
      [...document.querySelectorAll('[role="button"]')].find((e) =>
        /건 부탁 수락하기/.test(e.getAttribute('aria-label') || ''),
      ),
    'send offers',
  );
  send.click();
  await expectText('나의 거래');
  console.log('PASS: traveler home → bundle selection → bulk offer submission');
  await click('홈', 'tab');
  await click('사고 싶어요');
  await click('거래', 'tab');
  await click('내 요청');
  await click('치이카와 도쿄역 한정 키링');
  const offers = await wait(
    () =>
      [...document.querySelectorAll('[role="button"]')].find((e) =>
        (e.getAttribute('aria-label') || '').includes('수락한 여행자 보기 · 3명'),
      ),
    'seed offers',
  );
  offers.click();
  await click('민트로드님과 함께하기');
  await expectText('안전하게 부탁해요');
  await click('모의 결제와 금액 확인', 'checkbox');
  const pay = await wait(
    () =>
      [...document.querySelectorAll('[role="button"]')].find((e) =>
        (e.getAttribute('aria-label') || '').includes('모의 결제하기'),
      ),
    'mock payment',
  );
  pay.click();
  await expectText('안전결제 모의 보관 중');
  await click('민트로드님 계정으로 바꾸기');
  await click('상품 구매 인증하기');
  await click('체험용 샘플 사진 채우기');
  await click('구매 인증 보내기');
  await expectText('구매를 마쳤어요');
  await click('전달 준비 시작하기');
  await click('운송장 등록하기');
  await click('등록하고 알리기');
  await expectText('배송 중이에요');
  await click('소운님 계정으로 바꾸기');
  await click('상품을 받았어요');
  for (const label of [
    '요청한 상품과 옵션이 맞아요.',
    '수량과 상품 상태를 확인했어요.',
    '실제로 상품을 전달받았어요.',
  ])
    await click(label, 'checkbox');
  await click('받았어요 · 수령 기록');
  await click('상품 확인하고 구매 확정');
  for (const label of [
    '요청한 상품과 옵션이 맞아요.',
    '수량과 상품 상태를 확인했어요.',
    '실제로 상품을 전달받았어요.',
  ])
    await click(label, 'checkbox');
  await click('확인했어요 · 구매 확정');
  await click('민트로드님 계정으로 바꾸기');
  await click('보상 정산 체험하기');
  await expectText('모의 정산 완료');
  dom.window.history.replaceState({}, '', '#request-form');
  dom.window.dispatchEvent(new dom.window.PopStateEvent('popstate', { state: null }));
  await expectText('링크나 사진을 보내주세요');
  assert.equal(dom.window.location.hash, '#request-form');
  console.log('PASS: direct #request-form URL restores the request form');
  console.log(
    'PASS: offer selection → payment → purchase proof → shipping → receipt → confirmation → payout',
  );
  const unexpected = errors.filter(
    (e) =>
      !e.includes('Not implemented: window.scrollTo') && !e.includes('Not implemented: navigation'),
  );
  assert.deepEqual(unexpected, [], 'No React runtime errors');
  console.log('PASS: no React runtime errors in tested DOM flow');
} finally {
  dom.window.close();
  await app.close();
  await rm(temp, { recursive: true, force: true });
}

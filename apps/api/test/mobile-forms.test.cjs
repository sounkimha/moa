const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

// Run the actual form component state against minimal controls. Map networking
// and native rendering are covered by the full UI suite, not these unit checks.
test('request and trip form state regressions', async (t) => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:8081' });
  const previousWindow = global.window, previousDocument = global.document;
  global.window = dom.window; global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react'), { act } = React, { createRoot } = require('react-dom/client');
  const h = React.createElement;
  const host = document.getElementById('root');
  let root, app, apiCall;
  const shell = ({ children }) => h('div', null, children);
  const button = ({ label, accessibilityLabel, children, onPress, disabled, loading, ...props }) => h('button', { 'aria-label': accessibilityLabel || label, onClick: onPress, disabled: disabled || loading, 'aria-checked': props['aria-checked'], 'aria-selected': props['aria-selected'] }, label || children);
  const ui = {
    Txt: ({ children }) => h('span', null, children), Row: shell, Stack: shell, Card: shell, Badge: shell, Notice: shell,
    Divider: () => null, Section: shell,
    Page: ({ children, footer, onBack }) => h('main', null, onBack && h('button', { 'aria-label': '뒤로', onClick: onBack }, '뒤로'), children, footer),
    Button: button, IconButton: button, Chip: button,
    Field: ({ label, value, onChange }) => h('input', { 'aria-label': label, value, onInput: (event) => onChange(event.target.value), readOnly: !onChange }),
    DateField: ({ label, value, onChange }) => h('input', { 'aria-label': label, value, onInput: (event) => onChange(event.target.value) }),
    SectionTabs: ({ items, onChange }) => h('div', null, items.map((item) => h('button', { key: item, 'aria-label': item, onClick: () => onChange(item) }, item))),
    SearchField: ({ label, value, onChange }) => h('input', { 'aria-label': label, value, onInput: (event) => onChange(event.target.value) }),
    Sheet: ({ visible, title, children, footer, onClose }) => visible ? h('section', { 'aria-label': title }, h('button', { 'aria-label': `${title} 닫기`, onClick: onClose }, '닫기'), children, footer) : null,
    Empty: ({ title }) => h('span', null, title),
  };
  const point = { name: '서울역', address: '서울 중구', latitude: 37.55, longitude: 126.97, detail: '1번 출구' };
  const selectedPoint = { ...point, name: '새 위치', latitude: 37.56 };
  const modules = new Map();
  const mobileRoot = path.resolve(__dirname, '../../mobile/src');
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const source = fs.readFileSync(file, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const module = { exports: {} };
    const imports = (name) => {
      if (name === 'react-native') return { Platform: { OS: 'web' }, View: shell, Image: () => null, ScrollView: shell, Pressable: button, BackHandler: {} };
      if (name === 'expo-location') return {};
      if (name === 'lucide-react-native') return new Proxy({}, { get: () => () => null });
      if (name.endsWith('/ui') || name === './ui') return ui;
      if (name.endsWith('/visuals')) return { ProductArt: () => null, MoneyBreakdown: ({ price }) => h('span', { 'aria-label': 'price' }, String(price.totalPrice)) };
      // Keep visual assets/native animation outside this state harness, just as ProductArt is.
      // The browser suites exercise the actual photo previews and moving route component.
      if (name.endsWith('/travel-route')) return { PlaneRouteAnimation: () => null };
      if (name.endsWith('/place-photos')) return { getPlacePhoto: () => undefined };
      if (name.endsWith('/AppContext')) return { useApp: () => app };
      if (name.endsWith('/api')) return { api: (...args) => apiCall(...args) };
      if (name.endsWith('/images')) return { pickImage: async () => null };
      if (name.endsWith('/ProductOriginal')) return { ProductOriginal: () => null };
      if (name.endsWith('/DestinationPicker')) return { DestinationPicker: () => null };
      if (name.endsWith('/MeetupPicker')) return { MeetupPicker: ({ onChange }) => h('div', null,
        h('button', { 'aria-label': '지도 이동', onClick: () => onChange(undefined) }, '지도 이동'),
        h('button', { 'aria-label': '지도 확정', onClick: () => onChange(selectedPoint) }, '지도 확정')) };
      if (name.startsWith('.')) {
        const base = path.resolve(path.dirname(file), name);
        return load(fs.existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`);
      }
      return require(name);
    };
    new Function('exports', 'module', 'require', compiled)(module.exports, module, imports);
    modules.set(file, module.exports); return module.exports;
  }
  const { RequestForm } = load(path.join(mobileRoot, 'screens/Forms.tsx'));
  const { TripForm } = load(path.join(mobileRoot, 'screens/TripForm.tsx'));
  const { DateRangePicker } = load(path.join(mobileRoot, 'components/DateRangePicker.tsx'));
  const { seedDatabase } = require('../../../packages/domain/dist/seed.js');
  const wait = async (ms = 0) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));
  const click = async (label) => {
    const element = [...host.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === label);
    assert.ok(element, `button ${label}`); assert.equal(element.disabled, false, `enabled ${label}`);
    await act(async () => element.click());
  };
  const input = async (label, value) => {
    const element = [...host.querySelectorAll('input')].find((item) => item.getAttribute('aria-label') === label);
    assert.ok(element, `input ${label}`);
    await act(async () => { element.value = value; element.dispatchEvent(new dom.window.Event('input', { bubbles: true })); });
  };
  const mount = async (Component, draft = null, props) => {
    if (root) await act(async () => root.unmount());
    host.replaceChildren(); window.sessionStorage.clear();
    const db = seedDatabase();
    app = { data: { ...db, me: db.users.find((user) => user.id === 'u-me'), recognition: { image: true } }, route: { name: 'request-form', placeId: 'p-station' },
      requestDraft: draft, setRequestDraft: (next) => { app.requestDraft = next; }, notify() {}, busy: false, setRole() {}, nav() {}, mutate: async (_url, body) => { app.submitted = body; } };
    apiCall = async () => { throw new Error('Unexpected API call'); };
    root = createRoot(host);
    await act(async () => root.render(h(Component, props)));
  };
  const future = (days) => { const date = new Date(); date.setDate(date.getDate() + days); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
  const draft = (transport = 'DOMESTIC_PARCEL') => ({ step: 2, method: 'link', url: '', name: '치이카와 키링', image: '', art: 'keyring', price: '2420', requestedReward: '5000', quantity: 1, desired: future(10), placeId: 'p-station', entryPlaceId: 'p-station', category: 'CHARACTER', storeName: '도쿄역', option: '기본 옵션', metadataMessage: '', aiFilled: true, editingDetails: false, transport, deliveryCountry: 'KR', deliveryCity: '서울', deliveryAddressId: 'address', deliveryRecipient: '소운', deliveryPhone: '01012345678', deliveryPostalCode: '12345', deliveryAddress1: '서울 중구', deliveryAddress2: '1층', meetupLocation: transport === 'MEETUP' ? point.name : '', meetupPoint: transport === 'MEETUP' ? point : undefined, inventoryStatus: 'CHECK_REQUIRED' });

  try {
    await t.test('canceling first meetup selection restores parcel mode without saving an unfinished point', async () => {
      await mount(RequestForm, draft());
      await click('직접 전달 · 무료'); await click('지도 이동');
      assert.equal(app.requestDraft.transport, 'DOMESTIC_PARCEL');
      await click('어디에서 만날까요? 닫기');
      assert.equal(app.requestDraft.transport, 'DOMESTIC_PARCEL');
      await click('결제 금액 확인하기');
      assert.equal(app.submitted.transport, 'DOMESTIC_PARCEL');
    });
    await t.test('canceling an edit restores the existing confirmed meetup, committing replaces it', async () => {
      await mount(RequestForm, draft('MEETUP'));
      await click('직거래 위치 변경'); await click('지도 이동');
      assert.deepEqual(app.requestDraft.meetupPoint, point);
      await click('어디에서 만날까요? 닫기');
      assert.deepEqual(app.requestDraft.meetupPoint, point);
      await click('직거래 위치 변경'); await click('지도 확정');
      assert.deepEqual(app.requestDraft.meetupPoint, selectedPoint);
      await click('결제 금액 확인하기'); assert.deepEqual(app.submitted.meetupPoint, selectedPoint);
    });
    await t.test('canceling country and address editors restores the saved delivery data', async () => {
      await mount(RequestForm, draft('MEETUP'));
      await click('수령 지역 변경'); await click('일본'); await click('어느 지역에서 받으세요? 닫기');
      assert.equal(app.requestDraft.deliveryCountry, 'KR'); assert.deepEqual(app.requestDraft.meetupPoint, point);
      await click('국내 택배 · ₩3,500'); await click('받을 배송지 변경'); await input('주소', '잘못 바꾼 주소');
      assert.equal(app.requestDraft.deliveryAddress1, '서울 중구');
      await click('어디로 보내드릴까요? 닫기'); assert.equal(app.requestDraft.deliveryAddress1, '서울 중구');
    });
    await t.test('metadata interrupted by a method change can resolve the same URL again; stale results cannot win', async () => {
      await mount(RequestForm);
      const pending = [];
      apiCall = () => new Promise((resolve) => pending.push(resolve));
      await input('상품 링크', 'https://shop.example/item'); await wait(680); assert.equal(pending.length, 1);
      await click('사진 올리기'); await click('상품 링크'); await wait(680); assert.equal(pending.length, 2);
      const product = app.data.products.find((item) => item.placeId === 'p-station') || app.data.products[0];
      await act(async () => pending[1]({ status: 'FOUND', notice: '확인했어요', product: { ...product, name: '새 응답 상품', placeId: 'p-station' } }));
      await act(async () => pending[0]({ status: 'FOUND', notice: '확인했어요', product: { ...product, name: '오래된 응답', placeId: 'p-station' } }));
      assert.equal(app.requestDraft.name, '새 응답 상품');
    });
    await t.test('manual editing cancels a pending recognition response without overwriting user input', async () => {
      await mount(RequestForm);
      let resolve;
      apiCall = () => new Promise((complete) => { resolve = complete; });
      await input('상품 링크', 'https://shop.example/manual'); await wait(680);
      await click('사진 없이 직접 입력하기'); await input('상품명', '직접 적은 상품');
      const product = app.data.products[0];
      await act(async () => resolve({ status: 'FOUND', notice: '확인했어요', product: { ...product, name: '늦은 자동 인식 상품' } }));
      assert.equal(app.requestDraft.name, '직접 적은 상품');
    });
    await t.test('unknown purchase location is not silently replaced by a default catalog store', async () => {
      await mount(RequestForm);
      app.route = { name: 'request-form' };
      await act(async () => root.render(h(RequestForm)));
      await click('사진 없이 직접 입력하기'); await input('상품명', '장소 미확인 상품'); await input('현지가 (JPY)', '2000');
      await click('수령 방법 정하기');
      assert.match(host.textContent, /구매 장소를 선택/); assert.equal(app.requestDraft.step, 1); assert.equal(app.requestDraft.placeId, '');
    });
    await t.test('changing the meetup city requires reconfirmation but cancel keeps its original coordinates', async () => {
      await mount(RequestForm, draft('MEETUP'));
      await click('수령 지역 변경'); await input('수령 도시', '부산');
      await click('어느 지역에서 받으세요? 닫기');
      assert.equal(app.requestDraft.deliveryCity, '서울'); assert.deepEqual(app.requestDraft.meetupPoint, point);
      await click('수령 지역 변경'); await input('수령 도시', '부산'); await click('이 지역에서 받을게요');
      assert.equal(app.requestDraft.deliveryCity, '부산'); assert.equal(app.requestDraft.meetupPoint, undefined);
      await click('결제 금액 확인하기'); assert.equal(app.submitted, undefined);
    });
    await t.test('submission revalidates past dates and whitespace addresses before calling API', async () => {
      await mount(RequestForm, draft());
      await input('희망 수령일', '2000-01-01'); await click('결제 금액 확인하기');
      assert.equal(app.submitted, undefined); assert.match(host.textContent, /오늘 이후/);
      await input('희망 수령일', future(10)); await click('받을 배송지 변경'); await input('주소', '   ');
      assert.equal([...host.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === '이 배송지로 받을게요').disabled, true);
    });
    await t.test('canceling the origin editor restores the origin and does not store an unconfirmed country', async () => {
      await mount(TripForm);
      const key = `moa-trip-draft:${app.data.me.id}`;
      const before = JSON.parse(window.sessionStorage.getItem(key));
      await click('출발지 변경'); await click('일본'); await input('출발 도시', '도쿄');
      assert.deepEqual(JSON.parse(window.sessionStorage.getItem(key)), before);
      await click('어디에서 출발하세요? 닫기');
      assert.deepEqual(JSON.parse(window.sessionStorage.getItem(key)), before);
    });
    await t.test('range calendar tolerates invalid input and cancel preserves committed dates', async () => {
      let selection;
      await mount(DateRangePicker, null, { start: '2026-99-01', end: 'bad', min: future(0), onChange: (...dates) => { selection = dates; } });
      assert.doesNotMatch(host.textContent, /NaN|undefined/);
      await click('여행 날짜 선택'); await click(`${future(0)} 선택`); await click('언제 다녀오세요? 닫기');
      assert.equal(selection, undefined);
    });
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.close(); global.window = previousWindow; global.document = previousDocument;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('form validation rejects invalid dates, non-finite prices and missing purchase locations', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/state/form-validation.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} }; new Function('exports', 'module', compiled)(module.exports, module);
  const { validDate, validLocalPrice, validProductUrl, productValidation } = module.exports;
  for (const value of ['2026-02-30', '2026-13-01', null, '', '2026-1-01']) assert.equal(validDate(value), false);
  assert.equal(validDate('2028-02-29'), true);
  for (const value of ['Infinity', '9'.repeat(500), '20000001', '-1', '0', '1.001']) assert.equal(validLocalPrice(value), false);
  assert.equal(validLocalPrice('2420.50'), true);
  assert.equal(validProductUrl('https://'), false); assert.equal(validProductUrl('javascript:alert(1)'), false);
  assert.equal(validProductUrl('https://shop.example/item'), true);
  assert.match(productValidation({ name: '키링', price: '2420', url: '', quantity: 1, storeName: '', option: '', hasPlace: false }), /구매 장소/);
});

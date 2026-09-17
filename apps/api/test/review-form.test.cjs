const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

test('completed trades accept five-stamp reviews with editable example sentences', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:8081' });
  const previousWindow = global.window, previousDocument = global.document;
  global.window = dom.window; global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react'), { act } = React, { createRoot } = require('react-dom/client');
  const h = React.createElement, host = document.getElementById('root');
  const shell = ({ children }) => h('div', null, children);
  const button = ({ children, label, accessibilityLabel, accessibilityState, disabled, onPress }) => h('button', {
    'aria-label': accessibilityLabel || label,
    'aria-selected': accessibilityState?.selected,
    disabled,
    onClick: onPress,
  }, label || children);
  const ui = {
    Txt: shell, Row: shell, Stack: shell, Card: shell, Badge: shell, Notice: shell,
    Page: ({ children, footer }) => h('main', null, children, footer),
    Button: button,
    Field: ({ label, value, onChange }) => h('textarea', { 'aria-label': label, value, onChange: (event) => onChange(event.target.value) }),
    Empty: shell,
  };
  const { seedDatabase } = require('../../../packages/domain/dist/seed.js');
  const db = seedDatabase();
  const request = db.requests[0];
  const trade = { id: 'review-form-trade', requestId: request.id, buyerId: 'u-me', travelerId: 'u-min', status: 'CONFIRMED' };
  let app = {
    data: { ...db, me: db.users.find((user) => user.id === 'u-me'), transactions: [trade], reviews: [] },
    route: { name: 'reviews', id: trade.id }, busy: false,
    mutate: async (url, body) => { app.submitted = { url, body }; return { id: 'saved' }; },
    back: () => { app.wentBack = true; },
  };
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/screens/Account.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  const imports = (name) => {
    if (name === 'react-native') return { View: shell, Pressable: button };
    if (name === 'lucide-react-native') return new Proxy({}, { get: () => () => null });
    if (name.endsWith('/AppContext')) return { useApp: () => app };
    if (name.endsWith('/ui')) return ui;
    if (name.endsWith('/visuals')) return { Avatar: () => null, PlaceCard: () => null };
    if (name.endsWith('/theme/tokens')) return { colors: {}, radius: {}, space: {}, typography: {} };
    return require(name);
  };
  new Function('exports', 'module', 'require', compiled)(module.exports, module, imports);
  const root = createRoot(host);
  const findButton = (label) => [...host.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === label);
  const click = async (label) => { const element = findButton(label); assert.ok(element, label); await act(async () => element.click()); };

  try {
    await act(async () => root.render(h(module.exports.ReviewsScreen)));
    assert.equal(host.querySelectorAll('button[aria-label^="스탬프 "]').length, 5);
    assert.equal(findButton('후기 등록하기').disabled, true);
    assert.match(host.textContent, /이번 거래는 어땠나요/);

    await click('스탬프 1개');
    assert.match(host.textContent, /많이 아쉬웠어요/);
    assert.ok(findButton('연락이 조금 늦었어요. 문장 추가'));
    await click('스탬프 4개');
    assert.match(host.textContent, /4\/5 · 좋았어요/);
    assert.equal(findButton('후기 등록하기').disabled, true);
    await click('진행 상황을 꼼꼼히 알려줬어요. 문장 추가');
    assert.equal(host.querySelector('textarea').value, '진행 상황을 꼼꼼히 알려줬어요.');
    assert.equal(findButton('후기 등록하기').disabled, false);
    await click('진행 상황을 꼼꼼히 알려줬어요. 문장 추가됨');
    assert.equal(host.querySelector('textarea').value, '진행 상황을 꼼꼼히 알려줬어요.');
    await click('약속한 시간에 잘 받았어요. 문장 추가');
    assert.equal(host.querySelector('textarea').value, '진행 상황을 꼼꼼히 알려줬어요.\n약속한 시간에 잘 받았어요.');
    await act(async () => { const input = host.querySelector('textarea'); const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set; setter.call(input, '직접 고쳐 쓴 후기'); input.dispatchEvent(new dom.window.Event('input', { bubbles: true })); });
    assert.equal(host.querySelector('textarea').value, '직접 고쳐 쓴 후기');
    await click('후기 등록하기');
    assert.deepEqual(app.submitted, { url: `/transactions/${trade.id}/reviews`, body: { rating: 4, text: '직접 고쳐 쓴 후기' } });
    assert.equal(app.wentBack, true);

  } finally {
    await act(async () => root.unmount());
    dom.window.close(); global.window = previousWindow; global.document = previousDocument;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const { seedDatabase } = require('@moa/domain/dist/seed');
let context;
const primitive = ({ children, title, body, label, footer }) => React.createElement('div', null, title, body, label, children, footer);
const ui = new Proxy({}, { get: () => primitive });
function load(name) {
  const source = readFileSync(join(__dirname, '../../mobile/src/screens', name), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  const customRequire = (path) => {
    if (path === 'react' || path === '@moa/domain') return require(path);
    if (path === 'react-native') return { Image: primitive, Pressable: primitive, ScrollView: primitive, View: primitive };
    if (path === 'lucide-react-native') return ui;
    if (path.endsWith('AppContext')) return { useApp: () => context };
    if (path.endsWith('tokens')) return { colors: new Proxy({}, { get: () => '#111111' }) };
    if (path.endsWith('demo-images.json')) return {};
    if (path.endsWith('images')) return { pickImage: async () => undefined };
    return ui;
  };
  const module = { exports: {} };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, customRequire);
  return module.exports;
}
const trading = load('Trading.tsx'), matching = load('Matching.tsx');
function fixture() {
  const db = seedDatabase();
  db.me = db.users.find((u) => u.id === 'u-me');
  db.transactions = [{ id: 'guard-trade', requestId: 'r-1', offerId: 'offer-1', buyerId: 'u-me', travelerId: 'u-min', status: 'MATCHED', transport: 'DOMESTIC_PARCEL', revision: 0, estimatedDeliveryDate: '2027-01-10', totalPrice: 30000, travelerReward: 3500 }];
  db.rooms = [{ id: 'guard-room', transactionId: 'guard-trade', buyerId: 'u-me', travelerId: 'u-min' }];
  context = { data: db, role: 'buyer', route: { id: 'guard-trade' }, nav() {}, tab() {}, refresh: async () => {}, notify() {} };
  return db;
}
const render = (component) => renderToStaticMarkup(React.createElement(component));

test('partial trading snapshots render recovery actions instead of dereferencing missing entities', () => {
  for (const [name, remove, expected] of [
    ['PaymentScreen', (db) => { db.requests = []; }, '거래 정보를 다시 확인해주세요'],
    ['PaymentScreen', (db) => { db.users = []; }, '거래 정보를 다시 확인해주세요'],
    ['TransactionScreen', (db) => { db.requests = []; }, '거래 정보를 다시 확인해주세요'],
    ['TransactionScreen', (db) => { db.users = []; }, '거래 정보를 다시 확인해주세요'],
    ['ReceiveScreen', (db) => { db.requests = []; }, '상품 정보를 불러오지 못했어요'],
    ['ChatScreen', (db) => { db.users = []; }, '이 대화를 불러올 수 없어요'],
  ]) {
    const db = fixture(); remove(db);
    assert.match(render(trading[name]), new RegExp(expected), name);
  }
});

test('deep links cannot show actionable purchase or receive forms for the wrong actor or stage', () => {
  fixture();
  assert.match(render(trading.ReceiptScreen), /지금은 구매 인증을 보낼 수 없어요/);
  assert.match(render(trading.ReceiveScreen), /수령 확인 단계가 아니에요/);
  context.data.me = context.data.users.find((u) => u.id === 'u-min');
  assert.match(render(trading.PaymentScreen), /구매자가 결제할 차례예요/);
});

test('missing request place and missing traveler offer data keep the matching screens usable', () => {
  const db = fixture(); context.route.id = 'r-1'; db.places = [];
  assert.match(render(matching.RequestScreen), /구매 장소를 불러오지 못했어요/);
  db.users = [db.me];
  assert.match(render(matching.OffersScreen), /아직 수락한 여행자가 없어요/);
});

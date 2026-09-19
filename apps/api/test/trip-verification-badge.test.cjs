const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { seedDatabase } = require('@moa/domain/dist/seed');

const h = React.createElement;
let app, buttons = [];
const shell = ({ children }) => h('div', null, children);
const pressable = ({ children, onPress, accessibilityLabel, disabled, label }) => {
  buttons.push({ label: accessibilityLabel || label, onPress, disabled });
  return h('button', { 'aria-label': accessibilityLabel, disabled, onClick: onPress }, label, children);
};
const ui = new Proxy({
  Button: pressable,
  Txt: ({ children }) => h('span', null, children),
  Page: ({ title, children, footer }) => h('main', null, h('h1', null, title), children, footer),
  Sheet: ({ visible, title, onClose, children, footer }) => visible
    ? h('section', { role: 'dialog', 'aria-label': title }, h('h2', null, title), children, footer, h('button', { onClick: onClose }, '닫기')) : null,
}, { get: (target, name) => target[name] || shell });
function load(relative, extra = {}) {
  const file = path.resolve(__dirname, '../../mobile/src', relative);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } });
  const module = { exports: {} };
  const imports = (name) => {
    if (extra[name]) return extra[name];
    if (name === 'react-native') return { View: shell, Pressable: pressable };
    if (name === 'lucide-react-native') return new Proxy({}, { get: (_, icon) => () => h('i', { 'data-icon': icon }) });
    if (name.endsWith('/ui')) return ui;
    if (name.endsWith('/tokens')) return { colors: { primaryStrong: '#2563EB', secondary: '#697386' } };
    if (name.endsWith('/AppContext')) return { useApp: () => app };
    if (name.endsWith('/sample-product-photos')) return { getSampleProductPhoto: () => undefined };
    if (name.startsWith('../components/')) return new Proxy({}, { get: () => shell });
    if (name === './Nearby') return { NearbyRequestContext: () => null };
    if (name.endsWith('/images')) return { pickImage: async () => undefined };
    return require(name);
  };
  new Function('exports', 'module', 'require', outputText)(module.exports, module, imports);
  return module.exports;
}
const badge = load('components/TripVerificationBadge.tsx');
const { OffersScreen, ProfileScreen } = load('screens/Matching.tsx', { '../components/TripVerificationBadge': badge });
const render = (Component, props) => { buttons = []; return renderToStaticMarkup(h(Component, props)); };
function fixture() {
  const db = seedDatabase();
  const trip = db.trips.find((trip) => trip.travelerId === 'u-min');
  db.me = db.users.find((user) => user.id === 'u-me');
  app = { data: db, route: { name: 'offers', id: 'r-1' }, nav() {}, busy: false, mutate: async () => ({ id: 'selected-trade' }) };
  return { db, trip };
}

test('eligible demo trip gets a distinct flight confirmation mark', () => {
  const { trip } = fixture();
  const html = render(badge.TripVerificationBadge, { trip, travelerName: '민트로드' });
  assert.match(html, /data-icon="BadgeCheck"/);
  assert.match(html, /항공권 인증/);
  assert.match(html, /aria-label="민트로드 · 항공권 인증 안내"/);
});

test('compact traveler mark shows the flight icon only for the associated active trip', () => {
  const { trip } = fixture();
  const verified = render(badge.FlightVerificationMark, { trip });
  assert.match(verified, /data-icon="Plane"/);
  assert.match(verified, /항공권 인증/);
  assert.doesNotMatch(render(badge.FlightVerificationMark, { trip: { ...trip, verificationStatus: 'PENDING_REVIEW' } }), /항공권 인증/);
});

test('OCR matches, pending review and recheck never earn a completed verification mark', () => {
  const { trip } = fixture();
  for (const [verificationStatus, label] of [
    ['PENDING_REVIEW', '항공권 확인 중'], ['NEEDS_REVIEW', '항공권 재확인 필요'], ['UNVERIFIED', '왕복 항공권 확인 필요'],
  ]) {
    const html = render(badge.TripVerificationBadge, { trip: { ...trip, verificationStatus, flightProof: { itineraryMatches: true } } });
    assert.match(html, new RegExp(label));
    assert.doesNotMatch(html, /BadgeCheck|항공권 인증/);
  }
});

test('missing, expired, unknown and non-fixture trips never get a positive mark', () => {
  const { trip } = fixture();
  for (const candidate of [undefined, { ...trip, endDate: '2000-01-01' }, { ...trip, verificationStatus: 'UNKNOWN' }, { ...trip, id: 'another-trip' }]) {
    assert.doesNotMatch(render(badge.TripVerificationBadge, { trip: candidate }), /BadgeCheck|항공권 인증/);
  }
});

test('offers use the exact associated trip, not another verified trip or user identity labels', () => {
  const { db, trip } = fixture();
  db.offers = db.offers.filter((offer) => offer.travelerId === 'u-min');
  const unverified = { ...trip, id: 'trip-unverified', verificationStatus: 'UNVERIFIED' };
  db.trips.push(unverified);
  db.offers[0].tripId = unverified.id;
  let html = render(OffersScreen);
  assert.doesNotMatch(html, /BadgeCheck/);
  assert.match(html, /왕복 항공권 확인 필요/);
  assert.equal(buttons.find((button) => button.label === '민트로드님과 함께하기').disabled, true);
  db.offers[0].tripId = trip.id;
  html = render(OffersScreen);
  assert.match(html, /BadgeCheck/);
  assert.equal(buttons.find((button) => button.label === '민트로드님과 함께하기').disabled, false);
});

test('an offer cannot borrow another traveler’s verification, and a missing trip stays safe', () => {
  const { db } = fixture();
  db.offers = db.offers.filter((offer) => offer.travelerId === 'u-min');
  for (const tripId of ['trip-u-haru', 'missing-trip']) {
    db.offers[0].tripId = tripId;
    assert.doesNotMatch(render(OffersScreen), /BadgeCheck/);
    assert.equal(buttons.find((button) => button.label === '민트로드님과 함께하기').disabled, true);
  }
});

test('profile navigation, viewing the associated schedule and selecting an offer keep existing handlers', async () => {
  const { db } = fixture();
  db.offers = db.offers.filter((offer) => offer.travelerId === 'u-min');
  const navigations = [], mutations = [];
  app.nav = (...args) => navigations.push(args);
  app.mutate = async (...args) => { mutations.push(args); return { id: 'selected-trade' }; };
  render(OffersScreen);
  buttons.find((button) => button.label === '민트로드 프로필').onPress();
  buttons.find((button) => button.label === '민트로드님의 경로와 일정 보기').onPress();
  await buttons.find((button) => button.label === '민트로드님과 함께하기').onPress();
  assert.deepEqual(navigations, [
    ['profile', { id: 'u-min' }], ['trip-route', { id: 'trip-u-min', placeId: db.requests[0].placeId }],
    ['transaction', { id: 'selected-trade' }],
  ]);
  assert.equal(mutations[0][0], `/offers/${db.offers[0].id}/accept`);
  assert.deepEqual(mutations[0][1], { expectedRevision: db.requests[0].revision });
});

test('profile badges are per public trip; a new unverified trip does not inherit a verified one', () => {
  const { db, trip } = fixture();
  db.trips.push({ ...trip, id: 'trip-new', verificationStatus: 'UNVERIFIED' });
  app.route.id = 'u-min';
  const html = render(ProfileScreen);
  assert.equal((html.match(/data-icon="BadgeCheck"/g) || []).length, 1);
  assert.match(html, /왕복 항공권 확인 필요/);
});

test('tapping the mark explains demo verification without disclosing ticket details or navigating', async () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const previous = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  const { trip } = fixture();
  const privateProof = { itineraryMatches: true, outbound: [{ flightNumber: 'PRIVATE-FLIGHT-123' }], issues: ['PRIVATE-ISSUE'], bookingReference: 'SECRET-BOOKING' };
  try {
    await React.act(async () => root.render(h(badge.TripVerificationBadge, { trip: { ...trip, flightProof: privateProof }, travelerName: '민트로드' })));
    assert.equal(document.querySelector('[role="dialog"]'), null);
    await React.act(async () => document.querySelector('button[aria-label]').click());
    const dialog = document.querySelector('[role="dialog"]');
    assert.match(dialog.textContent, /체험용 마크/);
    assert.match(dialog.textContent, /실제 항공사 발권이나 탑승 여부를 확인한 인증은 아니에요/);
    assert.match(dialog.textContent, /항공권 원본과 예약번호는 다른 사용자에게 공개하지 않아요/);
    assert.doesNotMatch(dialog.textContent, /PRIVATE-|SECRET-/);
    await React.act(async () => [...dialog.querySelectorAll('button')].find((button) => button.textContent === '확인했어요').click());
    assert.equal(document.querySelector('[role="dialog"]'), null);
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
    global.window = previous.window; global.document = previous.document; global.IS_REACT_ACT_ENVIRONMENT = previous.act;
  }
});

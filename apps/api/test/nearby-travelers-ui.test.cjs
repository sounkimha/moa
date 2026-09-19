const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { seedDatabase } = require('@moa/domain/dist/seed');

function load(relative, imports = require) {
  const file = path.resolve(__dirname, '../../mobile/src', relative);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'module', 'require', compiled)(module.exports, module, imports);
  return module.exports;
}
const { colors } = load('theme/tokens.ts');
let onRowPress;
const shell = ({ children, style }) => React.createElement('div', { 'data-style': JSON.stringify(style) }, children);
const content = load('components/HomeContent.tsx', (name) => {
  if (name === 'react-native') return { View: shell, Pressable: ({ children, onPress, accessibilityLabel }) => {
    onRowPress = onPress;
    return React.createElement('button', { 'aria-label': accessibilityLabel }, children);
  } };
  if (name === 'lucide-react-native') return new Proxy({}, { get: (_, icon) => ({ color }) => React.createElement('i', { 'data-icon': icon, 'data-color': color }) });
  if (name === '../theme/tokens') return { colors };
  if (name === './TripVerificationBadge') return {
    FlightVerificationMark: ({ trip }) => trip?.verificationStatus === 'DEMO_VERIFIED'
      ? React.createElement('span', null, React.createElement('i', { 'data-icon': 'Plane' }), '항공권 확인 완료')
      : null,
  };
  if (name === './ui') return { Row: shell, Stack: shell, Txt: ({ children, size, weight, color }) => React.createElement('span', { 'data-size': size, 'data-weight': weight, 'data-color': color }, children) };
  if (name === './visuals') return { Avatar: ({ size, user }) => React.createElement('div', { 'data-avatar-size': size }, user.initials) };
  return require(name);
});
const db = seedDatabase(new Date('2026-09-18T00:00:00Z'));
const base = {
  variant: 'nearby', user: db.users.find((user) => user.id === 'u-min'),
  trip: db.trips.find((trip) => trip.travelerId === 'u-min'), places: db.places,
  distance: 0.2, onPress() {},
};
const render = (props = {}) => renderToStaticMarkup(React.createElement(content.TravelerPreview, { ...base, ...props }));
const text = (html) => html.replace(/<[^>]+>/g, '');

test('nearby travelers prioritize name, route, dates and actual stops above distance', () => {
  const html = render(), value = text(html);
  const labels = ['민트로드', '항공권 확인 완료', '서울', '도쿄', '9.22', '시부야 · 마루노우치 방문 예정', '내 위치에서 0.2km'];
  const positions = labels.map((label) => value.indexOf(label));
  assert.ok(positions.every((position) => position >= 0), value);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(html, /data-avatar-size="50"/);
  assert.match(html, /data-size="18" data-weight="700"[^>]*>민트로드/);
  assert.match(html, /data-size="13"[^>]*>내 위치에서 0.2km/);
  assert.doesNotMatch(value, /0.2km 예시|위치 예시/);
});

test('the nearby route has real dot/line/icon Views with secondary departure and blue destination', () => {
  const html = renderToStaticMarkup(React.createElement(content.TravelRouteLine, { departure: '서울', destination: '도쿄', accented: true }));
  assert.match(html, new RegExp(`data-color="${colors.secondary}"[^>]*>서울`));
  assert.match(html, new RegExp(`data-color="${colors.primaryStrong}"[^>]*>도쿄`));
  assert.match(html, new RegExp(`data-icon="Plane" data-color="${colors.primaryStrong}"`));
  assert.equal((html.match(/&quot;borderRadius&quot;:2/g) || []).length, 2);
  const hero = renderToStaticMarkup(React.createElement(content.TravelRouteLine, { departure: '서울', destination: '도쿄', light: true }));
  assert.equal((hero.match(/data-color="#FFFFFF"/g) || []).length, 3, 'Existing light hero remains unchanged');
});

test('only verified demo trips display a check; pending or unverified trips keep their actual status', () => {
  assert.match(text(render()), /항공권 확인 완료/);
  for (const status of ['UNVERIFIED', 'PENDING_REVIEW', 'NEEDS_REVIEW']) {
    const html = render({ trip: { ...base.trip, verificationStatus: status } });
    assert.doesNotMatch(text(html), /항공권 확인 완료/);
  }
});

test('visit labels reuse existing places/custom stops and safely fall back without changing data', () => {
  const trip = { ...base.trip, placeIds: ['p-shibuya', 'missing', 'p-shibuya'], customStops: ['시부야', '긴 이름의 편집숍'], destinationAreas: ['오사카'] };
  const before = JSON.stringify(trip);
  assert.match(text(render({ trip })), /시부야 · 긴 이름의 편집숍 방문 예정/);
  assert.equal(JSON.stringify(trip), before);
  assert.match(text(render({ trip: { ...trip, placeIds: [], customStops: [] } })), /오사카 방문 예정/);
  assert.match(text(render({ trip: { ...trip, placeIds: [], customStops: [], destinationAreas: [] } })), /도쿄 방문 예정/);
});

test('unknown distance never becomes NaN, Infinity or a misleading distance', () => {
  for (const distance of [undefined, NaN, Infinity, -1]) {
    const value = text(render({ distance }));
    assert.match(value, /거리 확인 전/);
    assert.doesNotMatch(value, /내 위치에서|NaN|Infinity/);
  }
  assert.match(text(render({ distance: 0 })), /내 위치에서 0.0km/);
});

test('both nearby and existing search rows preserve their supplied navigation handler', () => {
  for (const variant of ['nearby', 'plain']) {
    let calls = 0;
    const onPress = () => calls++;
    render({ variant, onPress });
    assert.equal(onRowPress, onPress);
    onRowPress();
    assert.equal(calls, 1);
  }
});

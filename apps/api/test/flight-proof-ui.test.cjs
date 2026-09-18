const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { seedDatabase } = require('@moa/domain/dist/seed');

const h = React.createElement;
const shell = ({ children }) => h('div', null, children);
const ui = {
  Badge: ({ children }) => h('span', null, children),
  Button: ({ label, children }) => h('button', null, label, children),
  Card: shell,
  Empty: shell,
  Notice: shell,
  Page: ({ title, children, footer }) => h('main', null, h('h1', null, title), children, footer),
  Row: shell,
  Stack: shell,
  Txt: ({ children }) => h('span', null, children),
};

function load(app) {
  const file = path.resolve(__dirname, '../../mobile/src/screens/FlightProof.tsx');
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const module = { exports: {} };
  const imports = (name) => {
    if (name === 'react-native') return { Image: shell, Pressable: shell, View: shell };
    if (name === 'lucide-react-native') return new Proxy({}, { get: (_, icon) => () => h('i', { 'data-icon': icon }) });
    if (name.endsWith('/AppContext')) return { useApp: () => app };
    if (name.endsWith('/images')) return { pickImage: async () => undefined };
    if (name.endsWith('/tokens')) return { colors: {
      primaryStrong: '#2563EB', primarySoft: '#EAF3FF', primaryDeep: '#17366F', primaryTint: '#CFE0FF',
      border: '#E7ECF3', secondary: '#697386', warningSoft: '#FFF3D6', warning: '#986316',
      translucentWhite: '#FFFFFF24', navyText: '#D3E1FA', navyTextBright: '#EAF2FF', sky: '#8CC7FF', onPrimary: '#FFFFFF',
    } };
    if (name.endsWith('/ui')) return ui;
    return require(name);
  };
  new Function('exports', 'module', 'require', compiled)(module.exports, module, imports);
  return module.exports;
}

test('flight proof result uses a clear confirmation state and shows planned departure/return dates with a plane route', () => {
  const db = seedDatabase(new Date('2026-09-18T00:00:00Z'));
  const me = db.users.find((user) => user.id === 'u-min');
  const original = db.trips.find((trip) => trip.travelerId === me.id);
  const trip = {
    ...original,
    startDate: '2026-09-22', endDate: '2026-09-27', verificationStatus: 'PENDING_REVIEW',
    flightProof: {
      checkedAt: '2026-09-19T00:00:00.000Z', source: 'OCR', itineraryMatches: true, issues: [],
      outbound: [{ from: 'ICN', to: 'NRT', flightNumber: 'KE701', date: '2026-09-22', dayOfYear: null }],
      inbound: [{ from: 'NRT', to: 'ICN', flightNumber: 'KE702', date: '2026-09-27', dayOfYear: null }],
    },
  };
  const app = { data: { ...db, me, trips: [trip] }, route: { id: trip.id }, nav() {}, mutate: async () => undefined };
  const screen = load(app);
  const html = renderToStaticMarkup(h(screen.FlightProofScreen));
  const text = html.replace(/<[^>]+>/g, '');

  assert.match(text, /항공권 정보를 확인했어요/);
  assert.match(text, /9월 22일/);
  assert.match(text, /9월 27일/);
  assert.match(text, /5박 6일/);
  assert.match(html, /data-icon="Plane"/);
  assert.doesNotMatch(text, /최근 항공권 대조 결과/);
  assert.doesNotMatch(text, /항공권 확인 완료했어요/);
});

test('only the explicit demo fixture uses completion wording; a mismatch asks for a recheck', () => {
  const app = { data: undefined, route: {}, nav() {}, mutate: async () => undefined };
  const screen = load(app);
  assert.equal(screen.flightProofStatusCopy('DEMO_VERIFIED').title, '왕복 항공권 확인 완료했어요');
  assert.equal(screen.flightProofStatusCopy('PENDING_REVIEW').title, '항공권 정보를 확인했어요');
  assert.equal(screen.flightProofStatusCopy('NEEDS_REVIEW').title, '항공권 정보를 다시 확인해주세요');
  assert.equal(screen.formatFlightDate('2026-09-22'), '9월 22일');
  assert.equal(screen.tripDurationLabel('2026-09-22', '2026-09-27'), '5박 6일');
  assert.equal(screen.tripDurationLabel('2026-09-27', '2026-09-22'), null);
});

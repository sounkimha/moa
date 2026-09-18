const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const { seedDatabase } = require('@moa/domain/dist/seed');

test('a buyer can begin a request from a traveler itinerary with one of that itinerary’s places preselected', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  const previousWindow = global.window, previousDocument = global.document, previousAct = global.IS_REACT_ACT_ENVIRONMENT;
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react'), { act } = React, { createRoot } = require('react-dom/client');
  const h = React.createElement, host = document.getElementById('root');
  const shell = ({ children }) => h('div', null, children);
  const pressable = ({ children, accessibilityLabel, accessibilityRole, accessibilityState, onPress, style, ...props }) => h('button', { 'aria-label': accessibilityLabel, onClick: onPress, ...props }, children);
  const ui = {
    Badge: shell, Empty: shell, Row: shell, Stack: shell, Txt: ({ children }) => h('span', null, children),
    Button: ({ label, onPress }) => h('button', { 'aria-label': label, onClick: onPress }, label),
    Page: ({ children, footer }) => h('main', null, children, footer),
    Sheet: ({ visible, title, children }) => visible ? h('section', { role: 'dialog', 'aria-label': title }, children) : null,
  };
  const db = seedDatabase(new Date('2026-09-18T00:00:00Z'));
  const trip = db.trips.find((item) => item.travelerId === 'u-min');
  const app = { data: { ...db, me: db.users.find((user) => user.id === 'u-me') }, role: 'buyer', route: { id: trip.id }, nav: (...args) => { app.navigation = args; } };
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/screens/TripRoute.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const module = { exports: {} };
  const imports = (name) => {
    if (name === 'react-native') return { Pressable: pressable, View: shell };
    if (name === 'lucide-react-native') return new Proxy({}, { get: () => () => null });
    if (name.endsWith('/AppContext')) return { useApp: () => app };
    if (name.endsWith('/travel-route')) return { TravelerScheduleSheet: shell };
    if (name.endsWith('/ui')) return ui;
    if (name.endsWith('/visuals')) return { Avatar: shell };
    if (name.endsWith('/tokens')) return { colors: { primaryStrong: '#2563EB', primarySoft: '#EAF3FF', secondary: '#697386', border: '#E7ECF3', paper: '#FFFFFF' } };
    return require(name);
  };
  new Function('exports', 'module', 'require', compiled)(module.exports, module, imports);
  const root = createRoot(host);
  const find = (label) => [...host.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === label);
  try {
    await act(async () => root.render(h(module.exports.TripRouteScreen)));
    const open = find('민트로드님에게 부탁하기');
    assert.ok(open);
    await act(async () => open.click());
    assert.ok(host.querySelector('[role="dialog"]'));
    const place = db.places.find((item) => item.id === trip.placeIds[0]);
    const choose = find(`${place.name}에서 부탁하기`);
    assert.ok(choose);
    await act(async () => choose.click());
    assert.deepEqual(app.navigation, ['request-form', { placeId: place.id }]);
  } finally {
    await act(async () => root.unmount());
    dom.window.close(); global.window = previousWindow; global.document = previousDocument; global.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
});

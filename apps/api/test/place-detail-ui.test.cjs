const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const { seedDatabase } = require('@moa/domain/dist/seed');

test('place detail saves a favorite on tap and keeps photo attribution as a compact caption below the image', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  const previousWindow = global.window, previousDocument = global.document, previousAct = global.IS_REACT_ACT_ENVIRONMENT;
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react'), { act } = React, { createRoot } = require('react-dom/client');
  const h = React.createElement, host = document.getElementById('root');
  const shell = ({ children, testID }) => h('div', { 'data-testid': testID }, children);
  const pressable = ({ children, accessibilityLabel, accessibilityState, disabled, onPress, ...props }) => h('button', {
    'aria-label': accessibilityLabel, 'aria-pressed': props['aria-pressed'], 'aria-selected': accessibilityState?.selected,
    disabled, onClick: onPress,
  }, children);
  const ui = {
    Badge: shell, Button: ({ label, onPress }) => h('button', { onClick: onPress }, label), Card: shell, Divider: shell,
    Empty: shell, IconButton: ({ label, onPress }) => h('button', { 'aria-label': label, onClick: onPress }, label), Notice: shell,
    Page: ({ children, footer }) => h('main', null, children, footer), Row: shell, Section: shell, SearchField: shell,
    SectionTabs: shell, Sheet: shell, Stack: shell, Txt: ({ children }) => h('span', null, children), Chip: shell,
  };
  const db = seedDatabase(new Date('2026-09-18T00:00:00Z'));
  const place = db.places.find((item) => item.id === 'p-shibuya');
  db.favorites = [];
  const app = {
    data: { ...db, me: db.users.find((user) => user.id === 'u-me') }, role: 'buyer', route: { id: place.id },
    nav() {}, tab() {}, busy: false, setRole() {}, notify() {},
    mutate: async (url, body, success) => { app.saved = { url, body, success }; return { favorite: true }; },
  };
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/screens/Home.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const module = { exports: {} };
  const imports = (name) => {
    if (name === 'react-native') return { Image: shell, Platform: { OS: 'web' }, Pressable: pressable, ScrollView: shell, StyleSheet: { create: (v) => v }, TextInput: shell, useWindowDimensions: () => ({ width: 390 }), View: shell };
    if (name === 'lucide-react-native') return new Proxy({}, { get: () => () => null });
    if (name === 'react-native-svg') return new Proxy({}, { get: () => shell });
    if (name === 'expo' || name === 'expo-location') return {};
    if (name.endsWith('/AppContext')) return { useApp: () => app };
    if (name.endsWith('/tokens')) return { colors: { primary: '#4C86F7', primaryStrong: '#2563EB', primarySoft: '#EAF3FF', ink: '#172033', secondary: '#697386', border: '#E7ECF3', muted: '#8D9AAF', paper: '#FFF', canvas: '#F8FAFD', darkGreen: '#17366F' } };
    if (name.endsWith('/ui')) return ui;
    if (name.endsWith('/visuals')) return { Avatar: shell, AvatarStack: shell, Logo: shell, PlaceCard: shell, PlaceCover: () => h('div', { 'data-place-photo': 'true' }), ProductArt: shell, ProductRow: shell };
    if (name.endsWith('/PhotoCredit')) return { PhotoCredit: ({ compact }) => h('span', { 'data-photo-credit-compact': String(compact) }, '대표 사진 · 사진 정보') };
    if (name === './Nearby' || name.includes('DestinationPicker') || name.includes('travel-route') || name.includes('/motion') || name.includes('RouteMap') || name.includes('HomeContent') || name.includes('MotionHome')) return new Proxy({}, { get: () => shell });
    if (name.includes('auth-storage') || name.includes('dev-menu')) return new Proxy({}, { get: () => async () => false });
    if (name.includes('home-discovery')) return { tripsToCity: () => [], uniqueTravelerCount: () => 0 };
    if (name.includes('nearby/model')) return { distanceMeters: () => 0 };
    return require(name);
  };
  new Function('exports', 'module', 'require', compiled)(module.exports, module, imports);
  const root = createRoot(host);
  try {
    await act(async () => root.render(h(module.exports.PlaceScreen)));
    assert.equal(host.querySelector('[data-photo-credit-compact]').getAttribute('data-photo-credit-compact'), 'true');
    const favorite = [...host.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === '관심 장소 저장');
    assert.ok(favorite, 'favorite toggle is a reachable button');
    await act(async () => favorite.click());
    assert.deepEqual(app.saved, { url: '/favorites/p-shibuya', body: {}, success: '관심 장소에 저장했어요.' });
    assert.equal(host.querySelector('button[aria-label="관심 장소 해제"]').getAttribute('aria-pressed'), 'true');
  } finally {
    await act(async () => root.unmount());
    dom.window.close(); global.window = previousWindow; global.document = previousDocument; global.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const { seedDatabase } = require('@moa/domain/dist/seed');

const mobile = path.resolve(__dirname, '../../mobile');
function compile(relative, imports, runtime = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(mobile, relative), 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  new Function('exports', 'module', 'require', ...Object.keys(runtime), compiled)(module.exports, module, imports, ...Object.values(runtime));
  return module.exports;
}

test('native map coordinates remain public place data and reject invalid points', () => {
  const { mappablePlaces, placeMapRegion } = compile('src/lib/place-map.ts', require);
  const good = { id: 'one', latitude: 35.68, longitude: 139.76 };
  const origin = { ...good, id: 'origin', latitude: 0, longitude: 0 };
  const invalid = [NaN, Infinity, undefined, 91].map((latitude) => ({ ...good, latitude }));
  const places = [good, origin, ...invalid, { ...good, longitude: 181 }];
  const before = JSON.stringify(places);
  assert.deepEqual(mappablePlaces(places), [good, origin]);
  assert.deepEqual(placeMapRegion(good), { latitude: 35.68, longitude: 139.76, latitudeDelta: 0.06, longitudeDelta: 0.06 });
  assert.equal(JSON.stringify(places), before);
});

test('custom builds configure platform-restricted map keys without reusing browser keys', () => {
  const appJson = require('../../mobile/app.json');
  const load = (env) => compile('app.config.ts', (name) => name === './app.json' ? appJson : require(name), { process: { env } }).default;
  const base = { ...appJson.expo, ios: { ...appJson.expo.ios, supportsTablet: false } };
  const config = load({ GOOGLE_MAPS_ANDROID_API_KEY: ' android-sdk-key ', GOOGLE_MAPS_IOS_API_KEY: ' ios-sdk-key ', EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY: 'browser-only-key' })({ config: base });
  const plugin = config.plugins.find((item) => Array.isArray(item) && item[0] === 'react-native-maps');
  assert.deepEqual(plugin[1], { androidGoogleMapsApiKey: 'android-sdk-key', iosGoogleMapsApiKey: 'ios-sdk-key' });
  assert.equal(config.ios.supportsTablet, false);
  assert.equal(config.android.config.googleMaps.apiKey, 'android-sdk-key');
  assert.equal(config.ios.config.googleMapsApiKey, 'ios-sdk-key');
  const noKeys = load({})({ config: base });
  assert.deepEqual(noKeys.plugins.at(-1), ['react-native-maps', {}]);
  const existing = load({})({ config: { ...base, plugins: [...base.plugins, ['react-native-maps', { androidGoogleMapsApiKey: 'existing-key' }]] } });
  assert.equal(existing.plugins.filter((item) => Array.isArray(item) && item[0] === 'react-native-maps').length, 1);
  assert.equal(existing.plugins.at(-1)[1].androidGoogleMapsApiKey, 'existing-key');
});

// Execute the real native component/state against a controlled native SDK seam.
// This does not claim that remote tiles have been rendered on a physical device.
test('native browse map renders without a JS key and keeps map/selection/retry lifecycle connected', async (t) => {
  const previous = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  const dom = new JSDOM('<div id="root"></div>');
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react'), { act } = React, { createRoot } = require('react-dom/client');
  const h = React.createElement, host = document.getElementById('root');
  const fixtures = seedDatabase().places;
  let root, currentPlaces, initialSelected, currentMap, counter = 0, sequence = 0;
  const platform = { OS: 'ios' }, timers = new Map(), markers = new Map(), selections = [], cameras = [], links = [];
  const runtime = {
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const shell = ({ children, accessibilityRole, testID }) => h('div', { role: accessibilityRole, 'data-testid': testID }, children);
  const button = ({ children, label, accessibilityLabel, onPress, ...props }) => h('button', { 'aria-label': accessibilityLabel || label, onClick: onPress, 'aria-pressed': props['aria-pressed'] }, children || label);
  const MapStub = React.forwardRef(function NativeMap(props, ref) {
    const [id] = React.useState(() => ++counter);
    currentMap = { id, props };
    React.useImperativeHandle(ref, () => ({ animateToRegion(region, duration) { cameras.push({ id, region, duration }); } }), [id]);
    return h('div', { 'data-map-instance': id, 'data-provider': props.provider || 'default' }, props.children);
  });
  const MarkerStub = (props) => { markers.set(props.identifier, props); return h('button', { 'data-marker': props.identifier, 'aria-label': props.accessibilityLabel, onClick: props.onPress }, props.children); };
  const loaded = new Map();
  function load(relative) {
    if (loaded.has(relative)) return loaded.get(relative);
    const result = compile(relative, (name) => {
      if (name === 'react-native') return { View: shell, Pressable: button, ScrollView: shell, ActivityIndicator: () => null, Platform: platform, Linking: { openURL(url) { links.push(url); return Promise.resolve(); } } };
      if (name === 'react-native-maps') return { __esModule: true, default: MapStub, Marker: MarkerStub, PROVIDER_GOOGLE: 'google' };
      if (name === 'react-native-webview' || name === 'expo-location') throw new Error('The native place map must not depend on a web SDK or request GPS');
      if (name === 'lucide-react-native') return new Proxy({}, { get: () => () => null });
      if (name === './ui') return { Button: button, Txt: ({ children }) => h('span', null, children), Row: shell, Stack: shell };
      if (name.startsWith('.')) {
        const base = path.join(path.dirname(relative), name);
        return load(fs.existsSync(path.join(mobile, base+'.ts')) ? base+'.ts' : base+'.tsx');
      }
      return require(name);
    }, runtime);
    loaded.set(relative, result);
    return result;
  }
  const RouteMap = load('src/components/RouteMap.tsx').default;
  function Parent() {
    const [selected, setSelected] = React.useState(initialSelected);
    return h(RouteMap, { places: currentPlaces, selected, onSelect(place) { selections.push(place.id); setSelected(place.id); } });
  }
  const mount = async (places = fixtures, selected = fixtures[0].id) => {
    if (root) await act(async () => root.unmount());
    assert.equal(timers.size, 0, 'Unmount cancels all map and marker timers');
    currentPlaces = places; initialSelected = selected;
    markers.clear(); selections.length = 0; cameras.length = 0; links.length = 0;
    root = createRoot(host);
    await act(async () => root.render(h(Parent)));
  };
  const click = async (label) => {
    const control = [...host.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === label);
    assert.ok(control, label);
    await act(async () => control.click());
  };
  const expire = async (delay) => {
    await act(async () => { for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback(); } });
  };
  try {
    await t.test('iPhone displays MapKit with every real place marker, not the unavailable panel', async () => {
      await mount();
      assert.equal(currentMap.props.provider, undefined);
      assert.equal(currentMap.props.showsUserLocation, false);
      assert.equal(currentMap.props.showsMyLocationButton, false);
      assert.equal(currentMap.props.scrollEnabled, true);
      assert.equal(currentMap.props.zoomEnabled, true);
      assert.equal(host.querySelectorAll('[data-marker]').length, fixtures.length);
      assert.doesNotMatch(host.textContent, /앱 안 지도는 연결 준비 중/);
      assert.ok(host.querySelector('[role="progressbar"]'));
      await act(async () => currentMap.props.onMapReady());
      assert.equal(host.querySelector('[role="progressbar"]'), null);
      assert.equal(cameras.at(-1).region.latitude, fixtures[0].latitude);
      await expire(500);
      assert.equal(markers.get(fixtures[0].id).tracksViewChanges, false);
    });
    await t.test('marker taps and region chips select/recenter without remounting the map', async () => {
      const instance = currentMap.id;
      await act(async () => markers.get(fixtures[1].id).onPress());
      assert.equal(selections.at(-1), fixtures[1].id);
      assert.equal(cameras.at(-1).region.longitude, fixtures[1].longitude);
      assert.equal(markers.get(fixtures[1].id).zIndex, 2);
      assert.equal(markers.get(fixtures[1].id).tracksViewChanges, true);
      assert.equal(currentMap.id, instance);
      const distant = fixtures[fixtures.length - 1];
      await click(distant.name+' 지도에서 보기');
      assert.equal(selections.at(-1), distant.id);
      assert.equal(cameras.at(-1).region.latitude, distant.latitude);
      assert.equal(currentMap.id, instance);
      await click('Google 지도에서 열기');
      assert.equal(new URL(links.at(-1)).searchParams.get('query'), `${distant.latitude},${distant.longitude}`);
    });
    await t.test('filtering falls back to a valid point; missing coordinates/empty results never crash', async () => {
      currentPlaces = [{ ...fixtures[0], latitude: NaN }, fixtures[1]];
      await act(async () => root.render(h(Parent)));
      assert.equal(host.querySelectorAll('[data-marker]').length, 1);
      assert.equal(cameras.at(-1).region.latitude, fixtures[1].latitude);
      currentPlaces = [];
      await act(async () => root.render(h(Parent)));
      assert.match(host.textContent, /표시할 장소가 없어요/);
      assert.equal(host.querySelector('[data-map-instance]'), null);
      assert.equal(timers.size, 0);
    });
    await t.test('Android uses the native Google SDK and waits for its tile-loaded callback', async () => {
      platform.OS = 'android'; await mount();
      assert.equal(currentMap.props.provider, 'google');
      await act(async () => currentMap.props.onMapReady());
      assert.ok(host.querySelector('[role="progressbar"]'));
      await act(async () => currentMap.props.onMapLoaded());
      assert.equal(host.querySelector('[role="progressbar"]'), null);
      await expire(12000);
      assert.equal(host.querySelector('[role="alert"]'), null);
    });
    await t.test('a stalled native map offers retry; an old callback cannot complete the new attempt', async () => {
      await mount();
      const previousMap = currentMap;
      await expire(12000);
      assert.ok(host.querySelector('[role="alert"]'));
      await click('지도 다시 불러오기');
      assert.notEqual(currentMap.id, previousMap.id);
      assert.ok(host.querySelector('[role="progressbar"]'));
      await act(async () => previousMap.props.onMapLoaded());
      assert.ok(host.querySelector('[role="progressbar"]'));
      await act(async () => currentMap.props.onMapLoaded());
      assert.equal(host.querySelector('[role="progressbar"]'), null);
    });
  } finally {
    if (root) await act(async () => root.unmount());
    assert.equal(timers.size, 0);
    dom.window.close();
    global.window = previous.window; global.document = previous.document; global.IS_REACT_ACT_ENVIRONMENT = previous.act;
  }
});

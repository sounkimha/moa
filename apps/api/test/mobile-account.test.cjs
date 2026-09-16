const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { seedDatabase } = require('../../../packages/domain/dist/seed.js');

test('MY reflects refreshed identity verification while retaining trusted profile labels', () => {
  const db = seedDatabase();
  const me = { ...db.users.find((user) => user.id === 'u-me'), verificationLabels: [] };
  const app = { data: { ...db, me, verificationSummary: { identity: false } }, role: 'buyer', nav() {}, tab() {} };
  const shell = ({ children }) => React.createElement('div', null, children);
  const ui = new Proxy({}, { get: (_, name) => name === 'Sheet' ? () => null : name === 'Button' ? ({ label }) => React.createElement('button', null, label) : shell });
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/screens/Account.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  const imports = (name) => {
    if (name === 'react-native') return { View: shell, Pressable: shell };
    if (name === 'lucide-react-native') return new Proxy({}, { get: () => () => null });
    if (name.endsWith('/AppContext')) return { useApp: () => app };
    if (name.endsWith('/ui')) return ui;
    if (name.endsWith('/visuals')) return { Avatar: () => null, PlaceCard: () => null };
    if (name.endsWith('/theme/tokens')) return { colors: {}, radius: {}, space: {}, typography: {} };
    return require(name);
  };
  new Function('exports', 'module', 'require', compiled)(module.exports, module, imports);
  const render = () => renderToStaticMarkup(React.createElement(module.exports.MyScreen));

  assert.match(render(), /본인 인증 필요/);
  // The verification endpoint refreshes this summary, not the user's legacy labels.
  app.data.verificationSummary.identity = true;
  assert.match(render(), /본인 확인 완료/);
  assert.doesNotMatch(render(), /본인 인증 필요/);
  app.data.verificationSummary.identity = false;
  me.verificationLabels = ['본인 인증'];
  assert.match(render(), /본인 확인 완료/);
});

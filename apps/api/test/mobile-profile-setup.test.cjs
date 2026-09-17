const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { seedDatabase } = require('../../../packages/domain/dist/seed.js');

test('first social login asks for a public profile and offers an optional photo', () => {
  const db = seedDatabase();
  const me = { ...db.users[0], nickname: '새 회원', bio: '', profileCompleted: false };
  const app = { data: { ...db, me }, busy: false, mutate() {}, logout() {} };
  const h = React.createElement;
  const shell = ({ children }) => h('div', null, children);
  const button = ({ label, children }) => h('button', null, label || children);
  const ui = new Proxy({}, {
    get: (_, name) => name === 'Page'
      ? ({ title, children, footer }) => h('main', null, h('h1', null, title), children, footer)
      : name === 'Button' ? button
      : name === 'Field' ? ({ label }) => h('label', null, label)
      : name === 'Txt' ? ({ children }) => h('span', null, children)
      : shell,
  });
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/screens/Matching.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  const imports = (name) => {
    if (name === 'react-native') return { View: shell, Pressable: button };
    if (name === 'lucide-react-native') return new Proxy({}, { get: () => () => null });
    if (name.endsWith('/AppContext')) return { useApp: () => app };
    if (name.endsWith('/ui')) return ui;
    if (name.endsWith('/visuals')) return { Avatar: () => h('span', null, '프로필 미리보기') };
    if (name.endsWith('/theme/tokens')) return { colors: {} };
    if (name.endsWith('/images')) return { pickImage: async () => undefined };
    if (name.startsWith('../components/')) return new Proxy({}, { get: () => () => null });
    return require(name);
  };
  new Function('exports', 'module', 'require', compiled)(module.exports, module, imports);
  const markup = renderToStaticMarkup(h(module.exports.ProfileSetupScreen));
  assert.match(markup, /프로필 만들기/);
  assert.match(markup, /사진 추가하기/);
  assert.match(markup, /닉네임/);
  assert.match(markup, /한 줄 소개/);
  assert.match(markup, /저장하고 시작하기/);
  assert.match(markup, /본인인증은 실제 인증 서비스가 연결된 뒤/);
  assert.doesNotMatch(markup, /사진 삭제/);
});

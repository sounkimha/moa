const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

test('Expo iPhone HEIC selection sends the converted JPEG to recognition', async () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/lib/images.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const photo = fs.readFileSync(path.resolve(__dirname, '../../mobile/assets/chiikawa-featured.jpg')).toString('base64');
  const module = { exports: {} };
  const imports = (name) => {
    if (name === 'react-native') return { Platform: { OS: 'ios' } };
    if (name === 'expo-image-picker') return {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
      launchImageLibraryAsync: async () => ({
        canceled: false,
        assets: [{ mimeType: 'image/heic', base64: photo }],
      }),
    };
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function('exports', 'module', 'require', compiled)(module.exports, module, imports);
  const result = await module.exports.pickImage();
  assert.equal(result, `data:image/jpeg;base64,${photo}`);
});

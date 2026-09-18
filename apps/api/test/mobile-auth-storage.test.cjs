const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function storageHarness({ platform = 'ios', expoGo = false, enrolled = true, failBiometricSave = false } = {}) {
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/src/lib/auth-storage.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const saved = new Map();
  let cancelled = false;
  const secureStore = {
    canUseBiometricAuthentication: () => enrolled,
    getItemAsync: async (key, options) => {
      if (key === 'moa-biometric-token' && options?.requireAuthentication && cancelled) throw new Error('cancelled');
      return saved.get(key) ?? null;
    },
    setItemAsync: async (key, value) => {
      if (key === 'moa-biometric-token' && failBiometricSave) throw new Error('device rejected enrollment');
      saved.set(key, value);
    },
    deleteItemAsync: async (key) => { saved.delete(key); },
  };
  const module = { exports: {} };
  new Function('exports', 'module', 'require', compiled)(module.exports, module, (name) => {
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === 'expo-secure-store') return secureStore;
    if (name === 'expo') return { isRunningInExpoGo: () => expoGo };
    throw new Error(`Unexpected import: ${name}`);
  });
  return { ...module.exports, saved, cancel: () => { cancelled = true; } };
}

test('biometric login requires device authentication and never falls back to a plain token', async () => {
  const auth = storageHarness();
  assert.equal(await auth.supportsBiometric(), true);
  assert.equal(await auth.authStorage.set('session-token', { remember: true, biometric: true }), true);
  assert.equal(await auth.hasBiometricLogin(), true);
  assert.equal(auth.saved.get('moa-biometric-token'), 'session-token');
  assert.equal(auth.saved.has('moa-token'), false);
  assert.equal(await auth.authStorage.get(), 'session-token');
  auth.saved.set('moa-token', 'old-plain-token');
  auth.cancel();
  assert.equal(await auth.authStorage.get(), null);
  assert.equal(auth.saved.has('moa-token'), false);
  await auth.authStorage.clear();
  assert.equal(await auth.hasBiometricLogin(), false);
});

test('unsupported Expo Go Face ID cannot silently become ordinary auto login', async () => {
  const auth = storageHarness({ expoGo: true });
  assert.equal(await auth.supportsBiometric(), false);
  assert.equal(await auth.authStorage.set('session-token', { remember: true, biometric: true }), false);
  assert.equal(await auth.hasBiometricLogin(), false);
  assert.equal(await auth.authStorage.get(), null);
  assert.equal(auth.saved.has('moa-token'), false);
});

test('failed biometric enrollment does not preserve a previous plain auto-login token', async () => {
  const auth = storageHarness({ failBiometricSave: true });
  auth.saved.set('moa-token', 'old-plain-token');
  assert.equal(await auth.authStorage.set('session-token', { remember: true, biometric: true }), false);
  assert.equal(await auth.authStorage.get(), null);
  assert.equal(auth.saved.has('moa-token'), false);
  assert.equal(await auth.hasBiometricLogin(), false);
});

test('ordinary auto login remains separate from biometric login', async () => {
  const auth = storageHarness({ enrolled: false });
  assert.equal(await auth.supportsBiometric(), false);
  assert.equal(await auth.authStorage.set('session-token', { remember: true, biometric: false }), true);
  assert.equal(await auth.authStorage.get(), 'session-token');
  assert.equal(await auth.hasBiometricLogin(), false);
});

test('changed biometrics invalidate only the protected login and require credentials again', async () => {
  const auth = storageHarness();
  assert.equal(await auth.authStorage.set('session-token', { remember: true, biometric: true }), true);
  auth.saved.delete('moa-biometric-token');
  assert.equal(await auth.authStorage.get(), null);
  assert.equal(await auth.hasBiometricLogin(), false);
  assert.equal(auth.saved.has('moa-token'), false);
});

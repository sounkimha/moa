import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'moa-token';
const AUTO_LOGIN_KEY = 'moa-auto-login';
const BIOMETRIC_KEY = 'moa-biometric-enabled';
const BIOMETRIC_TOKEN_KEY = 'moa-biometric-token';
const WEB_BIOMETRIC_KEY = 'moa-web-biometric';

export type LoginPersistence = {
  remember: boolean;
  biometric: boolean;
};

type WebBiometricRecord = { id: string; token: string };

const toBase64 = (value: ArrayBuffer): string => {
  const bytes = new Uint8Array(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const webBiometricAvailable = () => Platform.OS === 'web'
  && typeof window !== 'undefined'
  && window.isSecureContext
  && typeof window.PublicKeyCredential !== 'undefined'
  && Boolean(navigator.credentials)
  && typeof crypto?.getRandomValues === 'function';

export async function supportsBiometric(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    try { return await SecureStore.isAvailableAsync(); } catch { return false; }
  }
  return webBiometricAvailable();
}

async function enrollWebBiometric(token: string): Promise<boolean> {
  if (!webBiometricAvailable()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'MOA', id: window.location.hostname },
        user: { id: userId, name: 'moa-user', displayName: 'MOA 사용자' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60_000,
        attestation: 'none',
      },
    });
    if (!(credential instanceof PublicKeyCredential)) return false;
    const record: WebBiometricRecord = { id: toBase64(credential.rawId), token };
    window.localStorage.setItem(WEB_BIOMETRIC_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

async function readWebBiometric(): Promise<string | null> {
  if (!webBiometricAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(WEB_BIOMETRIC_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as Partial<WebBiometricRecord>;
    if (!record.id || !record.token) return null;
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: fromBase64(record.id) as unknown as BufferSource, type: 'public-key' }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return assertion ? record.token : null;
  } catch {
    return null;
  }
}

export const authStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        const autoLogin = window.localStorage.getItem(AUTO_LOGIN_KEY) === '1';
        if (autoLogin) {
          const biometricEnabled = window.localStorage.getItem(BIOMETRIC_KEY) === '1';
          if (biometricEnabled) {
            const biometricToken = await readWebBiometric();
            if (biometricToken) return biometricToken;
          }
          return window.localStorage.getItem(TOKEN_KEY);
        }
        return window.sessionStorage.getItem(TOKEN_KEY);
      } catch { return null; }
    }
    try {
      if (await SecureStore.getItemAsync(AUTO_LOGIN_KEY) !== '1') return null;
      if (await SecureStore.getItemAsync(BIOMETRIC_KEY) === '1') {
        try {
          const biometricToken = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY, {
            requireAuthentication: true,
            authenticationPrompt: 'MOA에 다시 로그인하려면 생체 인증을 사용해요.',
          });
          if (biometricToken) return biometricToken;
        } catch { /* Fall back to the remembered session below. */ }
      }
      return SecureStore.getItemAsync(TOKEN_KEY);
    } catch { return null; }
  },
  async set(token: string, persistence: LoginPersistence): Promise<boolean> {
    let saved = false;
    if (Platform.OS === 'web') {
      try {
        window.sessionStorage.setItem(TOKEN_KEY, token);
        if (persistence.remember) {
          window.localStorage.setItem(TOKEN_KEY, token);
          window.localStorage.setItem(AUTO_LOGIN_KEY, '1');
        } else {
          window.localStorage.removeItem(TOKEN_KEY);
          window.localStorage.removeItem(AUTO_LOGIN_KEY);
        }
        window.localStorage.removeItem(BIOMETRIC_KEY);
        if (persistence.biometric && persistence.remember && await enrollWebBiometric(token)) window.localStorage.setItem(BIOMETRIC_KEY, '1');
        saved = true;
      } catch { /* The in-memory session still works. */ }
      return saved;
    }
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(AUTO_LOGIN_KEY, persistence.remember ? '1' : '0');
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
      if (persistence.biometric && persistence.remember) {
        try {
          await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token, {
            requireAuthentication: true,
            authenticationPrompt: '다음부터 생체 인증으로 로그인할까요?',
          });
          await SecureStore.setItemAsync(BIOMETRIC_KEY, '1');
        } catch { /* Remembered login remains available if biometric setup is cancelled. */ }
      }
      saved = true;
    } catch { /* The in-memory session still works. */ }
    return saved;
  },
  async clear() {
    if (Platform.OS === 'web') {
      try {
        window.sessionStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(AUTO_LOGIN_KEY);
        window.localStorage.removeItem(BIOMETRIC_KEY);
        window.localStorage.removeItem(WEB_BIOMETRIC_KEY);
      } catch {}
      return;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(AUTO_LOGIN_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY),
    ]).catch(() => undefined);
  },
};

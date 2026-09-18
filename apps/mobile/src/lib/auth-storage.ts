import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { isRunningInExpoGo } from 'expo';

const TOKEN_KEY = 'moa-token';
const AUTO_LOGIN_KEY = 'moa-auto-login';
const BIOMETRIC_KEY = 'moa-biometric-enabled';
const BIOMETRIC_TOKEN_KEY = 'moa-biometric-token';
const BACKGROUND_READY_KEY = 'moa-background-login-ready';
const WEB_BIOMETRIC_KEY = 'moa-web-biometric';

export type LoginPersistence = {
  remember: boolean;
  biometric: boolean;
};

export async function supportsBiometric(): Promise<boolean> {
  if (Platform.OS === 'web' || (Platform.OS === 'ios' && isRunningInExpoGo())) return false;
  try { return SecureStore.canUseBiometricAuthentication(); } catch { return false; }
}

export async function hasBiometricLogin(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.getItemAsync(AUTO_LOGIN_KEY) === '1'
      && await SecureStore.getItemAsync(BIOMETRIC_KEY) === '1';
  } catch { return false; }
}

// Headless location tasks cannot ask for Face ID. Never copy or bypass a
// biometric-protected credential to enable background alerts.
export async function backgroundLoginToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    if (await SecureStore.getItemAsync(BACKGROUND_READY_KEY) !== '1'
      || await SecureStore.getItemAsync(AUTO_LOGIN_KEY) !== '1'
      || await SecureStore.getItemAsync(BIOMETRIC_KEY) === '1') return null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch { return null; }
}

export const authStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        const autoLogin = window.localStorage.getItem(AUTO_LOGIN_KEY) === '1';
        if (autoLogin) return window.localStorage.getItem(TOKEN_KEY);
        return window.sessionStorage.getItem(TOKEN_KEY);
      } catch { return null; }
    }
    try {
      if (await SecureStore.getItemAsync(AUTO_LOGIN_KEY) !== '1') return null;
      if (await SecureStore.getItemAsync(BIOMETRIC_KEY) === '1') {
        try {
          // Older builds saved an unprotected copy as well. Remove it before
          // unlocking so cancelled authentication can never expose that copy.
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          const protectedToken = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY, {
            requireAuthentication: true,
            authenticationPrompt: 'MOA에 다시 로그인하려면 생체 인증을 사용해요.',
          });
          if (!protectedToken) await SecureStore.deleteItemAsync(BIOMETRIC_KEY).catch(() => {});
          return protectedToken;
        } catch { return null; }
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
        window.localStorage.removeItem(WEB_BIOMETRIC_KEY);
        saved = true;
      } catch { /* The in-memory session still works. */ }
      return saved;
    }
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
      await SecureStore.deleteItemAsync(BACKGROUND_READY_KEY);
      await SecureStore.setItemAsync(AUTO_LOGIN_KEY, persistence.remember ? '1' : '0', {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
      if (!persistence.remember) return true;
      if (persistence.biometric) {
        if (!await supportsBiometric()) return false;
        await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token, {
          requireAuthentication: true,
          authenticationPrompt: '다음부터 생체 인증으로 로그인할까요?',
        });
        await SecureStore.setItemAsync(BIOMETRIC_KEY, '1');
      } else {
        // Ordinary remembered sessions can be used by explicitly consented
        // background tasks after the device's first unlock. Never migrate this
        // credential to another device, and never apply this to Face ID tokens.
        await SecureStore.setItemAsync(TOKEN_KEY, token, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        });
        await SecureStore.setItemAsync(BACKGROUND_READY_KEY, '1', {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        });
      }
      saved = true;
    } catch {
      // A failed biometric setup must never silently leave a plain auto-login token.
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY).catch(() => {});
    }
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
      SecureStore.deleteItemAsync(BACKGROUND_READY_KEY),
    ]).catch(() => undefined);
  },
};

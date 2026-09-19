import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, BackHandler, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Art, Category, Country, Role, Snapshot, Transport, ProductAvailability, ProductStore, RecognizedLocation } from '@moa/domain';
import { api, ApiError, setToken } from '../lib/api';
import { authStorage, hasBiometricLogin, LoginPersistence } from '../lib/auth-storage';
import { interruptNearby } from '../nearby/lifecycle';
import { parseRoute, routeHash, Route, Screen } from './navigation';
import { clearDraft, readDraft, writeDraft } from './draft-session';
import {
  clearTripDraft,
  readTripDraft,
  TripDraft,
  writeTripDraft,
} from './trip-draft-session';
export type { Route, Screen } from './navigation';
export type OAuthProvider = 'GOOGLE' | 'KAKAO' | 'NAVER';
WebBrowser.maybeCompleteAuthSession();
const webRoute = (): Route => Platform.OS === 'web' ? parseRoute(window.location.hash) : { name: 'home' };
export type RequestDraft = {
  sourceRequestId?: string;
  entryPlaceId?: string;
  entryMethod?: 'link' | 'photo';
  originalText?: import('@moa/domain').ProductOriginalText;
  step: number;
  method: 'link' | 'photo';
  url: string;
  name: string;
  image: string;
  art: Art;
  price: string;
  localPriceEstimated?: boolean;
  requestedReward?: string;
  quantity: number;
  desired: string;
  placeId: string;
  category: Category;
  storeName: string;
  brandName?: string;
  recognizedCurrency?: import('@moa/domain').Currency | null;
  availability?: ProductAvailability;
  stores?: ProductStore[];
  recognizedLocation?: RecognizedLocation;
  locationSource?: 'AI_RECOGNIZED' | 'USER_SELECTED';
  locationMismatch?: boolean;
  option: string;
  metadataMessage: string;
  aiFilled: boolean;
  sampleFilled?: boolean;
  editingDetails: boolean;
  transport: Transport;
  deliveryCountry: Country;
  deliveryCity: string;
  deliveryAddressId: string;
  deliveryRecipient: string;
  deliveryPhone: string;
  deliveryPostalCode: string;
  deliveryAddress1: string;
  deliveryAddress2: string;
  meetupLocation: string;
  meetupPoint?: import('@moa/domain').MeetupPoint;
  inventoryStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'CHECK_REQUIRED';
};
export type BrowseState = {
  query: string;
  country: Country | 'ALL';
  cities: string[];
  view: '목록' | '지도';
  selectedPlaceId?: string;
};
const emptyBrowseState: BrowseState = { query: '', country: 'ALL', cities: [], view: '목록' };
type AppValue = {
  data: Snapshot | null;
  role: Role;
  setRole: (r: Role) => void;
  route: Route;
  nav: (name: Screen, params?: Omit<Route, 'name'>) => void;
  back: () => void;
  tab: (name: Screen) => void;
  refresh: () => Promise<void>;
  login: (provider?: string, userId?: string, reset?: boolean, persistence?: LoginPersistence) => Promise<boolean>;
  testLogin: (username: string, password: string, reset?: boolean, persistence?: LoginPersistence) => Promise<boolean>;
  register: (username: string, password: string, nickname: string) => Promise<boolean>;
  biometricLogin: () => Promise<boolean>;
  socialLogin: (provider: OAuthProvider, persistence?: LoginPersistence) => Promise<boolean>;
  oauthProviders: Record<OAuthProvider, boolean>;
  logout: () => Promise<void>;
  switchActor: (id: string) => Promise<boolean>;
  busy: boolean;
  loading: boolean;
  error: string;
  toast: string;
  requestDraft: RequestDraft | null;
  setRequestDraft: (draft: RequestDraft | null) => void;
  tripDraft: TripDraft | null;
  setTripDraft: (draft: TripDraft | null) => void;
  browseState: BrowseState;
  setBrowseState: (state: BrowseState) => void;
  notify: (s: string) => void;
  mutate: <T>(path: string, body: unknown, success?: string) => Promise<T | undefined>;
};
const Context = createContext<AppValue>(null!);
let storageWrites: Promise<unknown> = Promise.resolve();
const writeStorage = (operation: () => void | Promise<void>): Promise<boolean> => {
  const next = storageWrites.then(async () => {
    try { await operation(); return true; } catch { return false; }
  });
  storageWrites = next;
  return next;
};
const savedRole = (): Role => {
  if (Platform.OS !== 'web') return 'buyer';
  try { return window.localStorage.getItem('moa-role') === 'traveler' ? 'traveler' : 'buyer'; } catch { return 'buyer'; }
};
const storage = {
  get: async () => {
    await storageWrites;
    return authStorage.get();
  },
  set: (v: string, persistence: LoginPersistence = { remember: false, biometric: false }) => writeStorage(async () => {
    if (!await authStorage.set(v, persistence)) throw new Error('로그인 저장에 실패했어요.');
  }),
  clear: () => writeStorage(async () => {
    await authStorage.clear();
  }),
};
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null),
    [role, updateRole] = useState<Role>(savedRole),
    [route, setRoute] = useState<Route>(() => webRoute()),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [oauthProviders, setOauthProviders] = useState<Record<OAuthProvider, boolean>>({ GOOGLE: false, KAKAO: false, NAVER: false }),
    [requestDraft, updateRequestDraft] = useState<RequestDraft | null>(null),
    [tripDraft, updateTripDraft] = useState<TripDraft | null>(null),
    [browseState, updateBrowseState] = useState<BrowseState>(emptyBrowseState);
  const history = useRef<Route[]>([]),
    mutationLock = useRef(false);
  const session = useRef(0), actor = useRef<string | null>(null), authLock = useRef(false);
  const authAttempt = useRef(0), roleRevision = useRef(0);
  const refreshSequence = useRef(0);
  const draftStorageWarning = useRef(false);
  const notify = (s: string) => setToast(s);
  const setRole = (next: Role) => {
    if (next !== role) interruptNearby();
    roleRevision.current++;
    updateRole(next);
    if (Platform.OS === 'web') {
      try { window.localStorage.setItem('moa-role', next); } catch {}
    } else SecureStore.setItemAsync('moa-role', next).catch(() => {});
  };
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const revision = roleRevision.current;
    SecureStore.getItemAsync('moa-role').then((value) => {
      if (revision === roleRevision.current && (value === 'buyer' || value === 'traveler')) updateRole(value);
    }).catch(() => {});
  }, []);
  const setRequestDraft = (draft: RequestDraft | null) => {
    // A screen from a previous account must not write into the new account's draft.
    if (authLock.current || !data?.me.id || actor.current !== data.me.id) return;
    updateRequestDraft(draft);
    if (Platform.OS === 'web') {
      let saved = false;
      try { saved = writeDraft(window.sessionStorage, data.me.id, draft); } catch {}
      if (!saved && !draftStorageWarning.current) {
        draftStorageWarning.current = true;
        notify('임시 저장 공간을 사용할 수 없어요. 입력은 유지되지만 새로고침하면 사라질 수 있어요.');
      }
    }
  };
  const setTripDraft = (draft: TripDraft | null) => {
    if (authLock.current || !data?.me.id || actor.current !== data.me.id) return;
    updateTripDraft(draft);
    if (Platform.OS === 'web') {
      let saved = false;
      try { saved = writeTripDraft(window.sessionStorage, data.me.id, draft); } catch {}
      if (!saved && !draftStorageWarning.current) {
        draftStorageWarning.current = true;
        notify('임시 저장 공간을 사용할 수 없어요. 입력은 유지되지만 새로고침하면 사라질 수 있어요.');
      }
    }
  };
  const setBrowseState = (next: BrowseState) => updateBrowseState((current) =>
    current.query === next.query && current.country === next.country && current.view === next.view &&
    current.selectedPlaceId === next.selectedPlaceId && current.cities.length === next.cities.length &&
    current.cities.every((city, index) => city === next.cities[index]) ? current : next,
  );
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const clearSession = async () => {
    interruptNearby();
    const generation = ++session.current;
    actor.current = null;
    setToken('');
    setData(null);
    updateRequestDraft(null);
    updateTripDraft(null);
    updateBrowseState(emptyBrowseState);
    setError('');
    setToast('');
    history.current = [];
    mutationLock.current = false;
    setBusy(false);
    draftStorageWarning.current = false;
    if (Platform.OS === 'web') {
      try {
        clearDraft(window.sessionStorage);
        clearTripDraft(window.sessionStorage);
      } catch {}
    }
    await storage.clear();
    return generation;
  };
  const refresh = async (suppressTransientError = false) => {
    const generation = session.current;
    const sequence = ++refreshSequence.current;
    try {
      const next = await api<Snapshot>('/snapshot');
      if (generation !== session.current || sequence !== refreshSequence.current) return;
      if (actor.current !== next.me.id) {
        let restored: RequestDraft | null = null;
        let restoredTrip: TripDraft | null = null;
        if (Platform.OS === 'web') {
          try {
            restored = readDraft(window.sessionStorage, next.me.id);
            restoredTrip = readTripDraft(window.sessionStorage, next.me.id);
          } catch {}
        }
        updateRequestDraft(restored);
        updateTripDraft(restoredTrip);
        actor.current = next.me.id;
      }
      setData(next);
      setError('');
    } catch (e) {
      if (generation !== session.current || sequence !== refreshSequence.current) return;
      if (e instanceof ApiError && e.status === 401) {
        const cleared = await clearSession();
        if (cleared === session.current) setError(e.message);
      } else if (!(suppressTransientError && e instanceof ApiError && (e.status === 0 || e.status === 408))) {
        setError((e as Error).message);
      }
      throw e;
    }
  };
  const refreshAfterAuth = async () => {
    try { return await refresh(true); }
    catch (e) {
      if (e instanceof ApiError && (e.status === 0 || e.status === 408)) {
        await new Promise((resolve) => setTimeout(resolve, 650));
        return refresh();
      }
      throw e;
    }
  };
  useEffect(() => {
    const generation = session.current;
    let mounted = true;
    (async () => {
      try {
        const t = await storage.get();
        if (!mounted || generation !== session.current) return;
        if (t) {
          setToken(t);
          await refreshAfterAuth();
        } else if (await hasBiometricLogin() && mounted && generation === session.current) {
          // A cancelled biometric prompt should show the credential login,
          // not replay the first-entry guide.
          setRoute({ name: 'login' });
        }
      } catch (e) {
        if (mounted) {
          if (e instanceof ApiError && e.status === 401) {
            setError('');
            setRoute({ name: 'login' });
            notify('로그인 시간이 만료됐어요. 아이디로 다시 로그인해주세요.');
          } else setError((e as Error).message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    let active = true;
    api<Record<OAuthProvider, boolean>>('/auth/oauth/status')
      .then((providers) => { if (active) setOauthProviders(providers); })
      .catch(() => { if (active) setOauthProviders({ GOOGLE: false, KAKAO: false, NAVER: false }); });
    return () => { active = false; };
  }, []);
  const nav = (name: Screen, params: Omit<Route, 'name'> = {}) => {
    if (name === 'login' || name === 'signup') setError('');
    const next = { name, ...params };
    // A double tap should never create an identical screen in the stack.
    if (routeHash(next) === routeHash(route)) return;
    history.current.push(route);
    setRoute(next);
    if (Platform.OS === 'web')
      window.history.pushState(
        next,
        '',
        routeHash(next),
      );
  };
  useEffect(() => {
    if (!data?.me.id) return;
    let running = false;
    const sync = async () => {
      if (running || authLock.current || (Platform.OS === 'web' ? document.visibilityState !== 'visible' : AppState.currentState !== 'active')) return;
      running = true;
      try { await refresh(); } catch {} finally { running = false; }
    };
    const timer = setInterval(sync, 20000);
    return () => clearInterval(timer);
  }, [data?.me.id]);
  const back = () => {
    if (route.name === 'login' || route.name === 'signup') setError('');
    if (Platform.OS === 'web' && history.current.length) {
      window.history.back();
      return;
    }
    const previous = history.current.pop();
    const next = previous || { name: 'home' as const };
    setRoute(next);
    if (Platform.OS === 'web')
      window.history.replaceState(
        next,
        '',
        routeHash(next),
      );
  };
  const tab = (name: Screen) => {
    if (name === 'login' || name === 'signup') setError('');
    history.current = [];
    setRoute({ name });
    if (Platform.OS === 'web') window.history.replaceState({ name }, '', `#${name}`);
  };
  useEffect(() => {
    if (Platform.OS === 'web') {
      const pop = () => {
        setRoute(webRoute());
        history.current.pop();
      };
      const hash = () => setRoute(webRoute());
      window.addEventListener('popstate', pop);
      window.addEventListener('hashchange', hash);
      return () => {
        window.removeEventListener('popstate', pop);
        window.removeEventListener('hashchange', hash);
      };
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (history.current.length) {
        back();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, []);
  const login = async (provider = 'DEMO', userId = 'u-me', reset = false, persistence: LoginPersistence = { remember: false, biometric: false }) => {
    if (authLock.current || mutationLock.current) return false;
    authLock.current = true;
    const attempt = ++authAttempt.current;
    setBusy(true);
    session.current++;
    try {
      const result = await api<{ token: string }>('/auth/demo', { provider, userId, reset });
      if (attempt !== authAttempt.current) return false;
      const generation = await clearSession();
      if (attempt !== authAttempt.current || generation !== session.current) return false;
      setToken(result.token);
      const saved = await storage.set(result.token, persistence);
      if (attempt !== authAttempt.current || generation !== session.current) return false;
      await refreshAfterAuth();
      if (attempt !== authAttempt.current || generation !== session.current || !actor.current) return false;
      if (!saved) notify(persistence.biometric
        ? '로그인했지만 생체 인증 설정을 완료하지 못했어요. 다음에는 비밀번호로 로그인해주세요.'
        : '로그인했어요. 저장 공간을 사용할 수 없어 새로고침하면 다시 로그인해야 해요.');
      return true;
    } catch (e) {
      if (attempt !== authAttempt.current) return false;
      const message = (e as Error).message;
      // Onboarding has no authenticated shell, so a toast alone can make a
      // failed demo login look like an unresponsive button.
      setError(message);
      notify(message);
      return false;
    } finally {
      if (attempt === authAttempt.current) { authLock.current = false; setBusy(false); }
    }
  };
  const credentialAuth = async (path: '/auth/test' | '/auth/register', body: { username: string; password: string; nickname?: string; reset?: boolean }, persistence: LoginPersistence) => {
    if (authLock.current || mutationLock.current) return false;
    authLock.current = true;
    const attempt = ++authAttempt.current;
    setBusy(true);
    setError('');
    session.current++;
    try {
      const result = await api<{ token: string; defaultRole?: Role }>(path, body);
      if (attempt !== authAttempt.current) return false;
      const generation = await clearSession();
      if (attempt !== authAttempt.current || generation !== session.current) return false;
      setToken(result.token);
      const saved = await storage.set(result.token, persistence);
      if (attempt !== authAttempt.current || generation !== session.current) return false;
      await refreshAfterAuth();
      if (attempt !== authAttempt.current || generation !== session.current || !actor.current) return false;
      // Roles belong to one MOA account and are chosen before sign-in. Demo
      // account metadata must not silently undo that choice after login.
      if (!saved) notify(persistence.biometric
        ? '로그인했지만 생체 인증 설정을 완료하지 못했어요. 다음에는 비밀번호로 로그인해주세요.'
        : '로그인했어요. 저장 공간을 사용할 수 없어 새로고침하면 다시 로그인해야 해요.');
      return true;
    } catch (e) {
      if (attempt !== authAttempt.current) return false;
      const message = (e as Error).message;
      setError(message);
      notify(message);
      return false;
    } finally {
      if (attempt === authAttempt.current) { authLock.current = false; setBusy(false); }
    }
  };
  // Preserve the existing method/endpoint for installed clients; login no longer resets data.
  const testLogin = (username: string, password: string, reset = false, persistence: LoginPersistence = { remember: false, biometric: false }) =>
    credentialAuth('/auth/test', { username, password, reset }, persistence);
  const register = (username: string, password: string, nickname: string) =>
    credentialAuth('/auth/register', { username, password, nickname }, { remember: false, biometric: false });
  const biometricLogin = async () => {
    if (authLock.current || mutationLock.current || !await hasBiometricLogin()) return false;
    authLock.current = true;
    const attempt = ++authAttempt.current;
    const generation = ++session.current;
    setBusy(true);
    setError('');
    try {
      const savedToken = await storage.get();
      if (attempt !== authAttempt.current || generation !== session.current) return false;
      if (!savedToken) {
        if (!await hasBiometricLogin()) notify('저장된 생체 인증 정보가 만료됐어요. 아이디로 다시 로그인해주세요.');
        return false;
      }
      setToken(savedToken);
      await refreshAfterAuth();
      return attempt === authAttempt.current && generation === session.current && Boolean(actor.current);
    } catch (e) {
      if (attempt === authAttempt.current) {
        setError('');
        setRoute({ name: 'login' });
        notify(e instanceof ApiError && e.status === 401
          ? '로그인 시간이 만료됐어요. 아이디로 다시 로그인해주세요.'
          : (e as Error).message);
      }
      return false;
    } finally {
      if (attempt === authAttempt.current) { authLock.current = false; setBusy(false); }
    }
  };
  const socialLogin = async (provider: OAuthProvider, persistence: LoginPersistence = { remember: false, biometric: false }) => {
    if (authLock.current || mutationLock.current || !oauthProviders[provider]) return false;
    authLock.current = true;
    const attempt = ++authAttempt.current;
    session.current++;
    setBusy(true);
    try {
      const returnUrl = Platform.OS === 'web' ? window.location.origin : 'moa://oauth';
      const start = await api<{ authorizationUrl: string }>(`/auth/oauth/${provider.toLowerCase()}/start?returnUrl=${encodeURIComponent(returnUrl)}`);
      if (attempt !== authAttempt.current) return false;
      const result = await WebBrowser.openAuthSessionAsync(start.authorizationUrl, returnUrl, { preferEphemeralSession: false });
      if (attempt !== authAttempt.current) return false;
      if (result.type !== 'success') return false;
      const callback = new URL(result.url);
      const code = callback.searchParams.get('oauth_code');
      if (!code) throw new Error('로그인 결과를 확인하지 못했어요.');
      const exchanged = await api<{ token: string }>('/auth/oauth/exchange', { code });
      if (attempt !== authAttempt.current) return false;
      const generation = await clearSession();
      if (attempt !== authAttempt.current || generation !== session.current) return false;
      setToken(exchanged.token);
      const saved = await storage.set(exchanged.token, persistence);
      if (attempt !== authAttempt.current || generation !== session.current) return false;
      await refreshAfterAuth();
      if (attempt !== authAttempt.current || generation !== session.current || !actor.current) return false;
      if (!saved) notify(persistence.biometric
        ? '로그인했지만 생체 인증 설정을 완료하지 못했어요. 다음에는 비밀번호로 로그인해주세요.'
        : '로그인했어요. 저장 공간을 사용할 수 없어 새로고침하면 다시 로그인해야 해요.');
      notify('소셜 계정으로 로그인했어요.');
      return true;
    } catch (e) {
      if (attempt !== authAttempt.current) return false;
      notify((e as Error).message);
      return false;
    } finally { if (attempt === authAttempt.current) { authLock.current = false; setBusy(false); } }
  };
  const logout = async () => {
    const attempt = ++authAttempt.current;
    authLock.current = true;
    // Start revoking the old token, then immediately remove private client state.
    const revocation = api('/auth/logout', {}).catch(() => {});
    await clearSession();
    setRole('buyer');
    tab('home');
    try { await revocation; }
    finally { if (attempt === authAttempt.current) { authLock.current = false; setBusy(false); } }
  };
  const switchActor = async (id: string) => {
    const ok = await login('DEMO', id);
    if (ok) {
      setRole(id === 'u-me' ? 'buyer' : 'traveler');
      notify('체험 계정을 바꿨어요.');
    }
    return ok;
  };
  const mutate = async <T,>(
    path: string,
    body: unknown,
    success?: string,
  ): Promise<T | undefined> => {
    if (mutationLock.current || authLock.current || !actor.current) return;
    const generation = session.current;
    mutationLock.current = true;
    setBusy(true);
    try {
      const result = await api<T>(path, body);
      if (generation !== session.current) return;
      try {
        await refresh();
        if (generation !== session.current) return;
        if (success) notify(success);
      } catch {
        if (generation !== session.current) return;
        notify('처리는 완료됐어요. 새로고침하면 최신 상태를 볼 수 있어요.');
      }
      return result;
    } catch (e) {
      if (generation !== session.current) return;
      notify((e as Error).message);
      if (e instanceof ApiError && e.status === 401) {
        const cleared = await clearSession();
        if (cleared === session.current) setError(e.message);
      }
      if (e instanceof ApiError && e.status === 409) await refresh().catch(() => {});
      return undefined;
    } finally {
      if (generation === session.current) { mutationLock.current = false; setBusy(false); }
    }
  };
  return (
    <Context.Provider
      value={{
        data,
        role,
        setRole,
        route,
        nav,
        back,
        tab,
        refresh,
        login,
        testLogin,
        register,
        biometricLogin,
        socialLogin,
        oauthProviders,
        logout,
        switchActor,
        busy,
        loading,
        error,
        toast,
        requestDraft,
        setRequestDraft,
        tripDraft,
        setTripDraft,
        browseState,
        setBrowseState,
        notify,
        mutate,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);

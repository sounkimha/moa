import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, BackHandler, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Art, Category, Country, Role, Snapshot, Transport, ProductAvailability, ProductStore, RecognizedLocation } from '@moa/domain';
import { api, ApiError, setToken } from '../lib/api';
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
  requestedReward?: string;
  quantity: number;
  desired: string;
  placeId: string;
  category: Category;
  storeName: string;
  brandName?: string;
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
type AppValue = {
  data: Snapshot | null;
  role: Role;
  setRole: (r: Role) => void;
  route: Route;
  nav: (name: Screen, params?: Omit<Route, 'name'>) => void;
  back: () => void;
  tab: (name: Screen) => void;
  refresh: () => Promise<void>;
  login: (provider?: string, userId?: string, reset?: boolean) => Promise<boolean>;
  socialLogin: (provider: OAuthProvider) => Promise<boolean>;
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
    try { return Platform.OS === 'web' ? window.sessionStorage.getItem('moa-token') : await SecureStore.getItemAsync('moa-token'); }
    catch { return null; }
  },
  set: (v: string) => writeStorage(async () => {
    if (Platform.OS === 'web') window.sessionStorage.setItem('moa-token', v);
    else await SecureStore.setItemAsync('moa-token', v);
  }),
  clear: () => writeStorage(async () => {
    if (Platform.OS === 'web') window.sessionStorage.removeItem('moa-token');
    else await SecureStore.deleteItemAsync('moa-token');
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
    [tripDraft, updateTripDraft] = useState<TripDraft | null>(null);
  const history = useRef<Route[]>([]),
    mutationLock = useRef(false);
  const session = useRef(0), actor = useRef<string | null>(null), authLock = useRef(false);
  const authAttempt = useRef(0), roleRevision = useRef(0);
  const refreshSequence = useRef(0);
  const draftStorageWarning = useRef(false);
  const notify = (s: string) => setToast(s);
  const setRole = (next: Role) => {
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
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const clearSession = async () => {
    const generation = ++session.current;
    actor.current = null;
    setToken('');
    setData(null);
    updateRequestDraft(null);
    updateTripDraft(null);
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
  const refresh = async () => {
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
      } else setError((e as Error).message);
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
          await refresh();
        }
      } catch (e) {
        if (mounted) setError((e as Error).message);
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
    const next = { name, ...params };
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
  const login = async (provider = 'DEMO', userId = 'u-me', reset = false) => {
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
      const saved = await storage.set(result.token);
      if (attempt !== authAttempt.current || generation !== session.current) return false;
      await refresh();
      if (attempt !== authAttempt.current || generation !== session.current || !actor.current) return false;
      if (!saved) notify('로그인했어요. 저장 공간을 사용할 수 없어 새로고침하면 다시 로그인해야 해요.');
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
  const socialLogin = async (provider: OAuthProvider) => {
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
      await storage.set(exchanged.token);
      if (attempt !== authAttempt.current || generation !== session.current) return false;
      await refresh();
      if (attempt !== authAttempt.current || generation !== session.current || !actor.current) return false;
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
        notify,
        mutate,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);

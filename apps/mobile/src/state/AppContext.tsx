import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, BackHandler, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Art, Category, Country, Role, Snapshot, Transport } from '@moa/domain';
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
  quantity: number;
  desired: string;
  placeId: string;
  category: Category;
  storeName: string;
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
const storage = {
  get: async () =>
    Platform.OS === 'web'
      ? window.sessionStorage.getItem('moa-token')
      : SecureStore.getItemAsync('moa-token'),
  set: async (v: string) => {
    if (Platform.OS === 'web') window.sessionStorage.setItem('moa-token', v);
    else await SecureStore.setItemAsync('moa-token', v);
  },
  clear: async () => {
    if (Platform.OS === 'web') window.sessionStorage.removeItem('moa-token');
    else await SecureStore.deleteItemAsync('moa-token');
  },
};
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null),
    [role, setRole] = useState<Role>('buyer'),
    [route, setRoute] = useState<Route>(() => webRoute()),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [requestDraft, updateRequestDraft] = useState<RequestDraft | null>(null),
    [tripDraft, updateTripDraft] = useState<TripDraft | null>(null);
  const history = useRef<Route[]>([]),
    mutationLock = useRef(false);
  const session = useRef(0), actor = useRef<string | null>(null), authLock = useRef(false);
  const refreshSequence = useRef(0);
  const draftStorageWarning = useRef(false);
  const notify = (s: string) => setToast(s);
  const setRequestDraft = (draft: RequestDraft | null) => {
    // A screen from a previous account must not write into the new account's draft.
    if (!data?.me.id || actor.current !== data.me.id) return;
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
    if (!data?.me.id || actor.current !== data.me.id) return;
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
    session.current++;
    actor.current = null;
    setToken('');
    setData(null);
    updateRequestDraft(null);
    updateTripDraft(null);
    setError('');
    setToast('');
    history.current = [];
    draftStorageWarning.current = false;
    if (Platform.OS === 'web') {
      try {
        clearDraft(window.sessionStorage);
        clearTripDraft(window.sessionStorage);
      } catch {}
    }
    await storage.clear().catch(() => {});
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
      setError((e as Error).message);
      if (e instanceof ApiError && e.status === 401) await clearSession();
      throw e;
    }
  };
  useEffect(() => {
    (async () => {
      try {
        const t = await storage.get();
        if (t) {
          setToken(t);
          await refresh();
        }
      } catch {
      } finally {
        setLoading(false);
      }
    })();
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
    setBusy(true);
    // Invalidate background reads before changing the bearer token.
    session.current++;
    try {
      const result = await api<{ token: string }>('/auth/demo', { provider, userId, reset });
      await clearSession();
      setToken(result.token);
      await storage.set(result.token);
      await refresh();
      return true;
    } catch (e) {
      const message = (e as Error).message;
      // Onboarding has no authenticated shell, so a toast alone can make a
      // failed demo login look like an unresponsive button.
      setError(message);
      notify(message);
      return false;
    } finally {
      authLock.current = false;
      setBusy(false);
    }
  };
  const logout = async () => {
    if (authLock.current) return;
    authLock.current = true;
    // Start revoking the old token, then immediately remove private client state.
    const revocation = api('/auth/logout', {}).catch(() => {});
    await clearSession();
    setRole('buyer');
    tab('home');
    try {
      await revocation;
    } finally { authLock.current = false; }
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
        notify('처리는 완료됐어요. 새로고침하면 최신 상태를 볼 수 있어요.');
      }
      return result;
    } catch (e) {
      if (generation !== session.current) return;
      notify((e as Error).message);
      if (e instanceof ApiError && e.status === 409) await refresh().catch(() => {});
      return undefined;
    } finally {
      mutationLock.current = false;
      setBusy(false);
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

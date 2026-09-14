import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, BackHandler, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Art, Category, Country, Role, Snapshot, Transport } from '@moa/domain';
import { api, ApiError, setToken } from '../lib/api';
export type Screen =
  | 'home'
  | 'search'
  | 'create'
  | 'trades'
  | 'my'
  | 'place'
  | 'request'
  | 'request-form'
  | 'trip-form'
  | 'offers'
  | 'profile'
  | 'offer-form'
  | 'bundle'
  | 'payment'
  | 'transaction'
  | 'chat'
  | 'receipt'
  | 'receive'
  | 'payouts'
  | 'notifications'
  | 'favorites'
  | 'trips'
  | 'reviews'
  | 'settings'
  | 'addresses'
  | 'help';
export interface Route {
  name: Screen;
  id?: string;
  placeId?: string;
  tripId?: string;
  requestIds?: string[];
  method?: 'link' | 'photo';
}
const screens: Screen[] = [
  'home', 'search', 'create', 'trades', 'my', 'place', 'request', 'request-form',
  'trip-form', 'offers', 'profile', 'offer-form', 'bundle', 'payment', 'transaction',
  'chat', 'receipt', 'receive', 'payouts', 'notifications', 'favorites', 'trips',
  'reviews', 'settings', 'addresses', 'help',
];
const webRoute = (): Route => {
  if (Platform.OS !== 'web') return { name: 'home' };
  const [rawName, rawId] = window.location.hash.replace(/^#\/?/, '').split('/');
  const name = screens.includes(rawName as Screen) ? rawName as Screen : 'home';
  return { name, ...(rawId ? { id: decodeURIComponent(rawId) } : {}) };
};
export type RequestDraft = {
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
  login: (provider?: string, userId?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchActor: (id: string) => Promise<boolean>;
  busy: boolean;
  loading: boolean;
  error: string;
  toast: string;
  requestDraft: RequestDraft | null;
  setRequestDraft: (draft: RequestDraft | null) => void;
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
    [requestDraft, setRequestDraft] = useState<RequestDraft | null>(null);
  const history = useRef<Route[]>([]),
    mutationLock = useRef(false);
  const notify = (s: string) => setToast(s);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const clearSession = async () => {
    setToken('');
    setData(null);
    await storage.clear();
  };
  const refresh = async () => {
    try {
      const next = await api<Snapshot>('/snapshot');
      setData(next);
      setError('');
    } catch (e) {
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
        `#${name}${params.id ? '/' + encodeURIComponent(params.id) : ''}`,
      );
  };
  useEffect(() => {
    if (!data?.me.id) return;
    let running = false;
    const sync = async () => {
      if (running || (Platform.OS === 'web' ? document.visibilityState !== 'visible' : AppState.currentState !== 'active')) return;
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
        `#${next.name}${next.id ? '/' + encodeURIComponent(next.id) : ''}`,
      );
  };
  const tab = (name: Screen) => {
    history.current = [];
    setRoute({ name });
    if (Platform.OS === 'web') window.history.replaceState({ name }, '', `#${name}`);
  };
  useEffect(() => {
    if (Platform.OS === 'web') {
      const pop = (event: PopStateEvent) => {
        setRoute(event.state?.name ? event.state : webRoute());
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
  const login = async (provider = 'DEMO', userId = 'u-me') => {
    setBusy(true);
    try {
      const result = await api<{ token: string }>('/auth/demo', { provider, userId });
      setToken(result.token);
      await storage.set(result.token);
      await refresh();
      return true;
    } catch (e) {
      notify((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    try {
      await api('/auth/logout', {});
    } catch {}
    await clearSession();
    tab('home');
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
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    try {
      const result = await api<T>(path, body);
      try {
        await refresh();
        if (success) notify(success);
      } catch {
        notify('처리는 완료됐어요. 새로고침하면 최신 상태를 볼 수 있어요.');
      }
      return result;
    } catch (e) {
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
        notify,
        mutate,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);

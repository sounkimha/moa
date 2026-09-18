import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Snapshot } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { api } from '../lib/api';
import { backgroundLoginToken } from '../lib/auth-storage';
import { activeTrips, Candidate, DEFAULT_PREFERENCES, findNearby, freshPoint, NearbyPayload, NearbyPreferences, parsePayload, Point, requestsFromAlert } from './model';
import { interruptNearby, nearbyRevision, onNearbyInterrupt } from './lifecycle';
import * as native from './platform';
import { bindNearbyOwner, configureBackground, sendNearby, stopBackground } from './runtime';
import { readPreferences, serial, writePreferences } from './storage';

type NearbyState = {
  preferences: NearbyPreferences;
  ready: boolean;
  busy: boolean;
  error: string;
  status: string;
  permissions: native.Permissions | null;
  candidates: Candidate[];
  point: Point | null;
  activeTripCount: number;
  testMode: boolean;
  update: (p: Partial<NearbyPreferences>) => Promise<void>;
  enable: () => Promise<boolean>;
  enableBackground: () => Promise<boolean>;
  cancelConsent: () => void;
  check: () => Promise<void>;
  test: (placeId: string, notify: boolean) => Promise<void>;
  clearTest: () => void;
};
const Context = createContext<NearbyState | null>(null);
export const useNearby = () => useContext(Context);

export function NearbyProvider({ children }: { children: ReactNode }) {
  const app = useApp();
  const owner = app.data?.me.id || null;
  const live = useRef(app); live.current = app;
  const [preferences, setPreferences] = useState<NearbyPreferences>({ ...DEFAULT_PREFERENCES });
  const prefs = useRef(preferences); prefs.current = preferences;
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [permission, setPermission] = useState<native.Permissions | null>(null);
  const [point, setPoint] = useState<Point | null>(null);
  const [testTripNow, setTestTripNow] = useState<number | undefined>();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [now, setNow] = useState(Date.now());
  const [wake, setWake] = useState(0);
  const [tap, setTap] = useState<NearbyPayload | null>(null);
  const lastTap = useRef('');
  const checking = useRef(false), lastCheck = useRef(0), permissionAttempt = useRef(0);
  const locationGeneration = useRef(0);
  const subscription = useRef<{ remove(): void } | null>(null);
  const ready = !!owner && owner === loadedOwner;
  const enabled = ready && !busy && preferences.notificationsEnabled && preferences.nearbyEnabled && app.role === 'traveler';
  const tripCount = app.data ? activeTrips(app.data, now).length : 0;
  const testMode = __DEV__ && testTripNow !== undefined;

  useEffect(() => onNearbyInterrupt(() => {
    locationGeneration.current++;
    subscription.current?.remove(); subscription.current = null;
    permissionAttempt.current++;
    setPoint(null); setTestTripNow(undefined);
  }), []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const current = state === 'active';
      setActive(current);
      if (current) { setNow(Date.now()); setWake((w) => w + 1); }
      else { locationGeneration.current++; subscription.current?.remove(); subscription.current = null; setPoint(null); setTestTripNow(undefined); }
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoadedOwner(null); setPreferences({ ...DEFAULT_PREFERENCES }); setPermission(null); setPoint(null); setTestTripNow(undefined); setError(''); setStatus('');
    if (!owner) {
      if (!app.loading) { interruptNearby(); void stopBackground().catch(() => undefined); }
      return;
    }
    void readPreferences(owner).then((value) => {
      if (!cancelled) { setPreferences(value); setLoadedOwner(owner); }
    }).catch(() => { if (!cancelled) { interruptNearby(); setError('알림 설정을 읽지 못했어요. 안전을 위해 위치 알림을 멈췄어요.'); } });
    return () => { cancelled = true; };
  }, [owner, app.loading]);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [enabled]);
  // Permission revocation and trip expiry are checked without asking for permission.
  useEffect(() => {
    if (!ready) return;
    if (!busy) bindNearbyOwner(owner, enabled);
    if (!enabled) { subscription.current?.remove(); void stopBackground().catch(() => setError('위치 알림을 중지하지 못했어요. 기기 설정에서 위치 권한을 꺼주세요.')); return; }
    let cancelled = false;
    void native.permissions().then((p) => { if (!cancelled) setPermission(p); }).catch(() => { if (!cancelled) setPermission({ location: false, notifications: false, background: false }); });
    return () => { cancelled = true; };
  }, [ready, owner, enabled, preferences, active, now, wake, busy]);

  const allowed = (id: string, epoch: number) => nearbyRevision() === epoch && live.current.data?.me.id === id
    && live.current.role === 'traveler' && prefs.current.notificationsEnabled && prefs.current.nearbyEnabled;
  const checkPoint = async (location: Point, force = false) => {
    const a = live.current, id = a.data?.me.id, epoch = nearbyRevision();
    const generation = locationGeneration.current;
    const valid = () => !!id && allowed(id, epoch) && generation === locationGeneration.current;
    if (!id || !allowed(id, epoch) || !freshPoint(location, Date.now())) return;
    setPoint(location); setNow(Date.now());
    if (checking.current || (!force && Date.now() - lastCheck.current < 60000)) return;
    checking.current = true; lastCheck.current = Date.now();
    try {
      const permission = await native.permissions();
      if (!valid()) return;
      setPermission(permission);
      if (!permission.location || !permission.notifications) { subscription.current?.remove(); setPoint(null); await stopBackground(); return; }
      const d = await api<Snapshot>('/snapshot');
      if (d.me.id !== id || !valid()) return;
      setStatus(await sendNearby(d, location, valid));
      setError('');
    } catch { if (allowed(id, epoch)) setError('근처 부탁을 확인하지 못했어요. 연결을 확인하고 다시 시도해주세요.'); }
    finally { checking.current = false; }
  };
  const checkRef = useRef(checkPoint); checkRef.current = checkPoint;
  useEffect(() => {
    if (!enabled || !active || !tripCount || testMode || !permission?.location || !permission.notifications || !native.supported) return;
    let cancelled = false;
    const epoch = nearbyRevision();
    void native.watchPosition((p) => {
      if (!cancelled && nearbyRevision() === epoch) void checkRef.current(p);
    }, () => { if (!cancelled) { setPoint(null); setError('현재 위치를 확인하지 못했어요. 위치 서비스와 권한을 확인해주세요.'); } })
      .then((sub) => { if (cancelled || nearbyRevision() !== epoch) sub.remove(); else subscription.current = sub; })
      .catch(() => { if (!cancelled) setError('위치 서비스를 켜고 다시 시도해주세요.'); });
    return () => { cancelled = true; locationGeneration.current++; subscription.current?.remove(); subscription.current = null; };
  }, [enabled, active, tripCount, testMode, permission?.location, permission?.notifications, owner, wake, preferences.radius]);
  // Snapshot refreshes already happen in AppContext; do not create a second API poll.
  useEffect(() => {
    if (!ready || !app.data) return;
    if (testMode) { void stopBackground().catch(() => undefined); return; }
    void configureBackground(app.data, enabled).catch(() => { setError('백그라운드 알림을 시작하지 못했어요. 앱을 열어둔 동안은 계속 확인할 수 있어요.'); });
  }, [ready, owner, enabled, app.data, preferences, tripCount, testMode, permission?.background, permission?.location, permission?.notifications, wake]);

  useEffect(() => native.listenToTaps((raw, id) => {
    const payload = parsePayload(raw);
    if (!payload || id === lastTap.current || (payload.test && !__DEV__)) return;
    lastTap.current = id;
    setTap(payload);
    void native.clearLastTap().catch(() => undefined);
  }), []);
  useEffect(() => {
    if (!tap || !app.data || app.loading) return; // Retain a cold-start tap through login.
    if (tap.ownerId !== owner) { setTap(null); return; }
    let cancelled = false;
    void api<Snapshot>('/snapshot').then(async (current) => {
      if (cancelled || live.current.data?.me.id !== tap.ownerId) return;
      if (current.me.id !== tap.ownerId) { setTap(null); return; }
      if (live.current.role !== 'traveler') {
        live.current.notify('가져올게요 모드에서 근처 부탁을 확인할 수 있어요.'); setTap(null); return;
      }
      await live.current.refresh();
      if (cancelled || live.current.data?.me.id !== tap.ownerId) return;
      const ids = requestsFromAlert(current, tap).map((r) => r.id);
      if (!ids.length) { live.current.notify('이미 마감되었거나 지원할 수 없는 부탁이에요.'); live.current.nav('nearby'); }
      else if (tap.type === 'NEARBY_REQUEST') live.current.nav('request', { id: ids[0] });
      else live.current.nav('nearby', { placeId: tap.placeId, requestIds: ids });
      setTap(null);
    }).catch(() => { if (!cancelled) { live.current.notify('부탁 상태를 확인하지 못했어요. 근처 부탁에서 다시 확인해주세요.'); live.current.nav('nearby'); setTap(null); } });
    return () => { cancelled = true; };
  }, [tap, owner, app.loading]);

  const update = async (patch: Partial<NearbyPreferences>) => {
    if (!owner || !ready) return;
    const id = owner;
    interruptNearby(); // Stop synchronously before saving OFF or changing radius.
    const next = { ...prefs.current, ...patch };
    if (!next.notificationsEnabled || !next.nearbyEnabled) next.backgroundEnabled = false;
    prefs.current = next; setPreferences(next); setBusy(true);
    try {
      await serial(() => writePreferences(id, next));
      if (live.current.data?.me.id === id) { setPreferences({ ...next }); setWake((w) => w + 1); setError(''); }
    } catch {
      interruptNearby(); prefs.current = { ...DEFAULT_PREFERENCES }; setPreferences({ ...DEFAULT_PREFERENCES }); setLoadedOwner(null);
      setError('설정을 저장하지 못해 이번 실행에서는 근처 알림을 멈췄어요. 기기 설정에서 위치 권한을 꺼주세요.');
    } finally { setBusy(false); }
  };
  const enable = async () => {
    if (!native.supported || !owner || !ready || live.current.role !== 'traveler' || !prefs.current.notificationsEnabled) return false;
    const id = owner, attempt = ++permissionAttempt.current, epoch = nearbyRevision();
    const current = () => attempt === permissionAttempt.current && epoch === nearbyRevision() && live.current.data?.me.id === id
      && live.current.role === 'traveler' && prefs.current.notificationsEnabled;
    setBusy(true); setError('');
    try {
      const p = await native.requestPermissions(current);
      if (!current()) return false;
      setPermission(p);
      if (!p.location || !p.notifications) { setError('근처 부탁 알림에는 위치와 알림 권한이 필요해요. 기기 설정에서 허용 후 다시 켜주세요.'); return false; }
      await update({ nearbyEnabled: true });
      return true;
    } catch { if (current()) setError('권한을 확인하지 못했어요. 기기 설정에서 확인해주세요.'); return false; }
    finally { setBusy(false); }
  };
  const enableBackground = async () => {
    if (!native.backgroundSupported || !owner || !enabled) return false;
    const id = owner, epoch = nearbyRevision(), attempt = ++permissionAttempt.current;
    setBusy(true);
    try {
      if (!await backgroundLoginToken()) { setError('백그라운드 확인은 다시 로그인하며 일반 자동 로그인을 선택해주세요. 생체 인증을 유지하면 앱을 열어둔 동안 이용할 수 있어요.'); return false; }
      if (!allowed(id, epoch) || attempt !== permissionAttempt.current) return false;
      const granted = await native.requestBackground();
      if (!allowed(id, epoch) || attempt !== permissionAttempt.current) return false;
      if (!granted) { setError('기기 설정에서 위치 권한을 ‘항상 허용’으로 바꿔주세요. 앱을 열어둔 동안은 사용할 수 있어요.'); return false; }
      setPermission(await native.permissions());
      await update({ backgroundEnabled: true }); return true;
    } catch { setError('백그라운드 위치 권한을 확인하지 못했어요.'); return false; }
    finally { setBusy(false); }
  };
  const test = async (placeId: string, notify: boolean) => {
    if (!__DEV__ || !enabled || !owner || !native.supported) return;
    const id = owner, epoch = nearbyRevision();
    setBusy(true);
    try {
      const p = await native.permissions();
      if (!allowed(id, epoch)) return;
      setPermission(p);
      if (!p.location || !p.notifications) { setError('테스트도 위치·알림 권한을 허용하고 근처 부탁 알림을 켜야 해요.'); return; }
      const d = await api<Snapshot>('/snapshot');
      if (d.me.id !== id || !allowed(id, epoch)) return;
      const trip = d.trips.find((t) => t.travelerId === id && t.placeIds.includes(placeId) && t.endDate >= new Date().toISOString().slice(0, 10));
      const place = d.places.find((p) => p.id === placeId);
      if (!trip || !place) { setError('이 장소를 방문하는 여행 일정을 먼저 등록해주세요.'); return; }
      const at = new Date(`${trip.startDate}T12:00:00`).getTime();
      const location = { latitude: place.latitude + 0.001, longitude: place.longitude, accuracy: 10, timestamp: Date.now() };
      setTestTripNow(at); setPoint(location); setNow(Date.now()); setError('');
      const message = notify ? await sendNearby(d, location, () => allowed(id, epoch), at)
        : `여행 첫날·테스트 위치 기준 부탁 ${findNearby(d, location, prefs.current, 'traveler', Date.now(), at).length}건이에요.`;
      if (allowed(id, epoch)) setStatus(message);
    } catch { setError('테스트 정보를 불러오지 못했어요. 연결을 확인해주세요.'); }
    finally { setBusy(false); }
  };
  const check = async () => {
    if (!enabled) return;
    setError(''); setWake((w) => w + 1);
    if (point && !testMode) await checkPoint(point, true);
    else { setTestTripNow(undefined); await live.current.refresh().catch(() => setError('연결을 확인해주세요.')); }
  };
  const value: NearbyState = {
    preferences, ready, busy, error, status, permissions: permission,
    point: enabled && point && freshPoint(point, now) ? point : null,
    candidates: app.data && enabled && point && permission?.location && permission.notifications
      ? findNearby(app.data, point, preferences, app.role, now, testMode ? testTripNow : now) : [],
    activeTripCount: tripCount, testMode, update, enable, enableBackground, check, test,
    cancelConsent: () => { permissionAttempt.current++; },
    clearTest: () => { setTestTripNow(undefined); setPoint(null); setStatus(''); setWake((w) => w + 1); },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

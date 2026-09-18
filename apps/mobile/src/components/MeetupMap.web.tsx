import React, { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { KAKAO_MAPS_JS_KEY } from '../lib/maps-config';
import type { MeetupMapProps } from './MeetupMap';
import { MeetupMapUnavailable, RouteMapStatus, RouteMapLoadState, ROUTE_MAP_TIMEOUT } from './RouteMapStatus';

type Kakao = any;
let kakaoLoader: Promise<Kakao> | undefined;

function loadKakaoMaps(key: string) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Kakao map needs a browser'));
  const host = window as Window & { kakao?: Kakao };
  if (host.kakao?.maps?.Map) return Promise.resolve(host.kakao);
  if (kakaoLoader) return kakaoLoader;
  // Kakao's JavaScript key validates the document referrer. Railway preview
  // domains are not always registered in the key, so suppress the referrer
  // before the SDK (and the SDK's follow-up asset requests) starts loading.
  if (!document.querySelector('meta[data-moa-kakao-referrer]')) {
    const referrerMeta = document.createElement('meta');
    referrerMeta.dataset.moaKakaoReferrer = 'true';
    referrerMeta.name = 'referrer';
    referrerMeta.content = 'no-referrer';
    document.head.appendChild(referrerMeta);
  }
  const load = new Promise<Kakao>((resolve, reject) => {
    const finish = () => {
      if (!host.kakao?.maps?.load) { reject(new Error('Kakao Maps SDK is unavailable')); return; }
      host.kakao.maps.load(() => resolve(host.kakao));
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-moa-kakao-maps]');
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('Kakao Maps SDK failed to load')), { once: true });
      if (host.kakao?.maps) finish();
      return;
    }
    const script = document.createElement('script');
    script.dataset.moaKakaoMaps = 'true';
    script.async = true;
    // Kakao rejects this public JavaScript key when an unregistered preview
    // domain is sent as Referer. Keep the referrer policy scoped to the SDK
    // request; the rest of MOA keeps the API's normal policy.
    script.referrerPolicy = 'no-referrer';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('Kakao Maps SDK failed to load')), { once: true });
    document.head.appendChild(script);
  });
  kakaoLoader = load.catch((error) => {
    // Allow the retry CTA to create a fresh SDK request after a transient or
    // domain-validation failure instead of reusing a rejected promise.
    kakaoLoader = undefined;
    throw error;
  });
  return kakaoLoader;
}

export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const onMoveRef = useRef(onMove);
  const [status, setStatus] = useState<RouteMapLoadState>('loading');
  const statusRef = useRef<RouteMapLoadState>('loading');
  const [retry, setRetry] = useState(0);
  const tokenRef = useRef(0);
  const apiKey = KAKAO_MAPS_JS_KEY;

  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  const finish = (next: RouteMapLoadState) => {
    if (statusRef.current === 'error' && next === 'ready') return;
    statusRef.current = next;
    setStatus(next);
  };

  useEffect(() => {
    if (!apiKey || !mapElement.current) return;
    let cancelled = false;
    statusRef.current = 'loading';
    setStatus('loading');
    const timer = setTimeout(() => { if (!cancelled && statusRef.current === 'loading') finish('error'); }, ROUTE_MAP_TIMEOUT);
    const choose = (latLng: any) => {
      if (cancelled || !latLng) return;
      const picked = { latitude: latLng.getLat(), longitude: latLng.getLng() };
      const token = ++tokenRef.current;
      onMoveRef.current(picked.latitude, picked.longitude);
      const geocoder = geocoderRef.current;
      if (!geocoder) return;
      geocoder.coord2Address(picked.longitude, picked.latitude, (result: any[], resultStatus: any) => {
        const host = window as Window & { kakao?: Kakao };
        if (cancelled || token !== tokenRef.current || resultStatus !== host.kakao?.maps?.services?.Status?.OK || !result?.length) return;
        const item = result[0] || {};
        const road = item.road_address;
        const address = item.address;
        const name = road?.building_name || road?.address_name || address?.address_name || '';
        const formatted = road?.address_name || address?.address_name || '';
        onMoveRef.current(picked.latitude, picked.longitude, name, formatted);
      });
    };
    void loadKakaoMaps(apiKey).then((host) => {
      if (cancelled || !mapElement.current) return;
      const center = new host.maps.LatLng(latitude, longitude);
      const level = Math.max(1, Math.min(14, Math.round(20 - zoom)));
      const map = new host.maps.Map(mapElement.current, { center, level, draggable: true, scrollwheel: true });
      mapRef.current = map;
      try {
        if (host.maps.services?.Geocoder) geocoderRef.current = new host.maps.services.Geocoder();
      } catch {
        // Address lookup is an enhancement; a usable map should not fail if
        // Kakao's optional services bundle is unavailable.
        geocoderRef.current = null;
      }
      try {
        host.maps.event.addListener(map, 'idle', () => {
          if (cancelled) return;
          if (statusRef.current !== 'ready') { clearTimeout(timer); finish('ready'); }
          choose(map.getCenter());
        });
        host.maps.event.addListener(map, 'dragend', () => choose(map.getCenter()));
        host.maps.event.addListener(map, 'click', (event: any) => { map.panTo(event.latLng); choose(event.latLng); });
      } catch {
        // Older WebViews can expose the map without the event helper. Keep the
        // map interactive where supported and still allow the central pin.
      }
      // Some mobile WebViews do not emit the first `idle` event even though
      // the map instance and tiles are already mounted. The map is usable at
      // this point, so don't let the loading timeout cover a working map.
      clearTimeout(timer);
      finish('ready');
      try { choose(center); } catch { /* keep the mounted map usable */ }
    }).catch(() => { if (!cancelled) finish('error'); });
    return () => { cancelled = true; clearTimeout(timer); mapRef.current = null; geocoderRef.current = null; };
  }, [apiKey, latitude, longitude, zoom, retry]);

  if (!apiKey) return <MeetupMapUnavailable provider="Kakao" onOpen={() => { void Linking.openURL(`https://map.kakao.com/link/map/${encodeURIComponent('만남 위치')},${latitude},${longitude}`).catch(() => {}); }} />;
  return <View style={{ position: 'relative', height: 300 }}>
    <div ref={mapElement} role="application" aria-label="카카오 직거래 위치 지도" style={{ width: '100%', height: 300, background: '#eaf2ff' }} />
    <div aria-hidden="true" style={{ position: 'absolute', zIndex: 20, left: '50%', top: '50%', transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
      <div style={{ padding: '3px 8px', marginBottom: 4, borderRadius: 999, background: '#172033', color: '#fff', fontSize: 11, lineHeight: '16px', fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 2px 6px #17203344' }}>이 핀에서 만나요</div>
      <div style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', background: '#3478f6', border: '3px solid #fff', boxShadow: '0 2px 8px #17203366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
      </div>
      <div style={{ width: 12, height: 12, marginTop: -6, background: '#3478f6', borderRight: '3px solid #fff', borderBottom: '3px solid #fff', transform: 'rotate(45deg)', boxShadow: '2px 2px 4px #17203322' }} />
    </div>
    <RouteMapStatus provider="Kakao" status={status} onRetry={() => setRetry((count) => count + 1)} onOpen={() => { void Linking.openURL(`https://map.kakao.com/link/map/${encodeURIComponent('만남 위치')},${latitude},${longitude}`).catch(() => {}); }} />
  </View>;
}

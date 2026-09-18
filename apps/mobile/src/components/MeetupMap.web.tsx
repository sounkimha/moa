import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { KAKAO_MAPS_JS_KEY } from '../lib/maps-config';
import type { MeetupMapProps } from './MeetupMap';
import { meetupMapHtml } from './meetup-map-html';
import { MeetupMapUnavailable, RouteMapStatus, RouteMapLoadState, ROUTE_MAP_TIMEOUT } from './RouteMapStatus';
export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<RouteMapLoadState>('loading');
  const statusRef = useRef<RouteMapLoadState>('loading');
  const [retry, setRetry] = useState(0);
  const channel = useMemo(() => 'meetup-' + Math.random().toString(36).slice(2), [latitude, longitude, zoom, retry]);
  const apiKey = KAKAO_MAPS_JS_KEY;
  const html = useMemo(() => apiKey ? meetupMapHtml(latitude, longitude, zoom, channel, apiKey) : '', [latitude, longitude, zoom, channel, apiKey]);
  const finish = (next: 'ready' | 'error') => {
    if (statusRef.current === 'error' && next === 'ready') return;
    statusRef.current = next;
    setStatus(next);
  };
  useEffect(() => {
    if (!apiKey) return;
    statusRef.current = 'loading';
    setStatus('loading');
    const timer = setTimeout(() => { if (statusRef.current === 'loading') finish('error'); }, ROUTE_MAP_TIMEOUT);
    return () => clearTimeout(timer);
  }, [html, retry, apiKey]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const p = JSON.parse(event.data);
        if (p.channel !== channel) return;
        if (p.error) { finish('error'); return; }
        if (statusRef.current === 'error') return;
        if (p.ready) { finish('ready'); return; }
        if (statusRef.current === 'ready' && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180) onMove(p.latitude, p.longitude, typeof p.name === 'string' ? p.name : undefined, typeof p.address === 'string' ? p.address : undefined);
      } catch { /* Ignore unrelated iframe messages. */ }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [channel, onMove]);
  if (!apiKey) return <MeetupMapUnavailable provider="Kakao" onOpen={() => { void Linking.openURL(`https://map.kakao.com/link/map/${encodeURIComponent('만남 위치')},${latitude},${longitude}`).catch(() => {}); }} />;
  return <View style={{ position: 'relative', height: 300 }}>
    {/* This srcdoc contains only app-generated coordinates. Kakao Maps JS handles
        the domestic map and reverse geocoding inside the isolated document. */}
    <iframe key={channel} ref={frame} title="직거래 위치 지도" srcDoc={html} onError={() => finish('error')}
      referrerPolicy="strict-origin-when-cross-origin" style={{ width: '100%', height: 300, border: 0, display: 'block' }} />
    <RouteMapStatus provider="Kakao" status={status} onRetry={() => setRetry((count) => count + 1)} onOpen={() => { void Linking.openURL(`https://map.kakao.com/link/map/${encodeURIComponent('만남 위치')},${latitude},${longitude}`).catch(() => {}); }} />
  </View>;
}

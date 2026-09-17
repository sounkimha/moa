import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { GOOGLE_WEB_MAPS_KEY } from '../lib/maps-config';
import type { MeetupMapProps } from './MeetupMap';
import { meetupMapHtml } from './meetup-map-html';
import { MeetupMapUnavailable, RouteMapStatus, RouteMapLoadState, ROUTE_MAP_TIMEOUT } from './RouteMapStatus';
export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<RouteMapLoadState>('loading');
  const statusRef = useRef<RouteMapLoadState>('loading');
  const [retry, setRetry] = useState(0);
  const channel = useMemo(() => 'meetup-' + Math.random().toString(36).slice(2), [latitude, longitude, zoom, retry]);
  const apiKey = GOOGLE_WEB_MAPS_KEY;
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
        if (statusRef.current === 'ready' && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180) onMove(p.latitude, p.longitude);
      } catch { /* Ignore unrelated iframe messages. */ }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [channel, onMove]);
  if (!apiKey) return <MeetupMapUnavailable onOpen={() => { void Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + latitude + ',' + longitude).catch(() => {}); }} />;
  return <View style={{ position: 'relative', height: 300 }}>
    {/* This srcdoc contains only app-generated coordinates. An opaque sandbox origin
        breaks Google Maps even after its script and tiles load. CSP nonces still gate scripts. */}
    <iframe key={channel} ref={frame} title="직거래 위치 지도" srcDoc={html} onError={() => finish('error')}
      referrerPolicy="strict-origin-when-cross-origin" style={{ width: '100%', height: 300, border: 0, display: 'block' }} />
    <RouteMapStatus status={status} onRetry={() => setRetry((count) => count + 1)} onOpen={() => { void Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + latitude + ',' + longitude).catch(() => {}); }} />
  </View>;
}

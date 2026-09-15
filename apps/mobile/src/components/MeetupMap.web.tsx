import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import type { MeetupMapProps } from './MeetupMap';
import { meetupMapHtml } from './meetup-map-html';
import { kakaoMapEmbedUrl } from './google-route-map-html';
import { RouteMapStatus, RouteMapLoadState, ROUTE_MAP_TIMEOUT } from './RouteMapStatus';
export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<RouteMapLoadState>('loading');
  const [retry, setRetry] = useState(0);
  const channel = useRef('meetup-' + Math.random().toString(36).slice(2)).current;
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
  const html = useMemo(() => apiKey ? meetupMapHtml(latitude, longitude, zoom, channel, apiKey) : '', [latitude, longitude, zoom, channel, apiKey]);
  useEffect(() => {
    // An external, zero-key embed does not reliably bubble a load event through
    // react-native-web. Expose the iframe immediately; otherwise our own spinner
    // can permanently cover a map that has already loaded.
    if (!apiKey) { setStatus('ready'); return; }
    setStatus('loading');
    const timer = setTimeout(() => setStatus((current) => current === 'loading' ? 'error' : current), ROUTE_MAP_TIMEOUT);
    return () => clearTimeout(timer);
  }, [html, retry, apiKey]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const p = JSON.parse(event.data);
        if (p.channel !== channel) return;
        if (p.error) setStatus('error');
        else if (p.ready) setStatus('ready');
        if (Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180) onMove(p.latitude, p.longitude);
      } catch { /* Ignore unrelated iframe messages. */ }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [channel, onMove]);
  return <View style={{ position: 'relative', height: 300 }}>
    <iframe key={retry} ref={frame} title="직거래 위치 지도" src={apiKey ? undefined : kakaoMapEmbedUrl({ latitude, longitude })} srcDoc={apiKey ? html : undefined} onError={() => { if (apiKey) setStatus('error'); }} sandbox={apiKey ? 'allow-scripts allow-popups' : undefined}
      referrerPolicy="strict-origin-when-cross-origin" style={{ width: '100%', height: 300, border: 0, display: 'block' }} />
    <RouteMapStatus status={status} onRetry={() => setRetry((count) => count + 1)} onOpen={() => { void Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + latitude + ',' + longitude).catch(() => {}); }} />
  </View>;
}

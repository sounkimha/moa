import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { meetupMapHtml } from './meetup-map-html';
import { MeetupMapUnavailable, RouteMapStatus, RouteMapLoadState, ROUTE_MAP_TIMEOUT } from './RouteMapStatus';
export type MeetupMapProps = {
  latitude: number; longitude: number; zoom: number;
  onMove: (latitude: number, longitude: number) => void;
};
export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const [status, setStatus] = useState<RouteMapLoadState>('loading'), [retry, setRetry] = useState(0);
  const statusRef = useRef<RouteMapLoadState>('loading');
  const channel = useMemo(() => 'meetup-' + Math.random().toString(36).slice(2), [latitude, longitude, zoom, retry]);
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
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
  if (!apiKey) return <MeetupMapUnavailable onOpen={() => { void Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + latitude + ',' + longitude).catch(() => {}); }} />;
  return <View style={{ height: 300 }}><WebView key={channel} source={{ html }} style={{ height: 300 }} userAgent="MoaMeetupMap/0.1"
    originWhitelist={['about:*']}
    onError={() => finish('error')} onHttpError={() => finish('error')}
    onMessage={(event) => { try {
      const p = JSON.parse(event.nativeEvent.data);
      if (p.channel !== channel) return;
      if (p.error) { finish('error'); return; }
      if (statusRef.current === 'error') return;
      if (p.ready) { finish('ready'); return; }
      if (statusRef.current === 'ready' && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180) onMove(p.latitude, p.longitude);
    } catch {} }} />
    <RouteMapStatus status={status} onRetry={() => setRetry((count) => count + 1)} onOpen={() => { void Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + latitude + ',' + longitude).catch(() => {}); }} />
  </View>;
}

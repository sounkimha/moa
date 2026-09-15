import React, { useEffect, useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { meetupMapHtml } from './meetup-map-html';
import { kakaoMapEmbedUrl } from './google-route-map-html';
import { RouteMapStatus, RouteMapLoadState, ROUTE_MAP_TIMEOUT } from './RouteMapStatus';
export type MeetupMapProps = {
  latitude: number; longitude: number; zoom: number;
  onMove: (latitude: number, longitude: number) => void;
};
export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const [status, setStatus] = useState<RouteMapLoadState>('loading'), [retry, setRetry] = useState(0);
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
  const html = useMemo(() => apiKey ? meetupMapHtml(latitude, longitude, zoom, 'meetup', apiKey) : '', [latitude, longitude, zoom, apiKey]);
  useEffect(() => {
    // Native WebView likewise does not give a trustworthy ready signal for a
    // third-party iframe. Keep the official embed visible instead of covering it.
    if (!apiKey) { setStatus('ready'); return; }
    setStatus('loading');
    const timer = setTimeout(() => setStatus((current) => current === 'loading' ? 'error' : current), ROUTE_MAP_TIMEOUT);
    return () => clearTimeout(timer);
  }, [html, retry, apiKey]);
  return <View style={{ height: 300 }}><WebView key={retry} source={apiKey ? { html } : { uri: kakaoMapEmbedUrl({ latitude, longitude }) }} style={{ height: 300 }} userAgent="MoaMeetupMap/0.1"
    originWhitelist={apiKey ? ['about:*'] : ['https://*']}
    onError={() => { if (apiKey) setStatus('error'); }} onHttpError={() => { if (apiKey) setStatus('error'); }}
    onMessage={(event) => { try {
      const p = JSON.parse(event.nativeEvent.data);
      if (p.channel !== 'meetup') return;
      if (p.error) setStatus('error'); else if (p.ready) setStatus('ready');
      if (Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180) onMove(p.latitude, p.longitude);
    } catch {} }} />
    <RouteMapStatus status={status} onRetry={() => setRetry((count) => count + 1)} onOpen={() => { void Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + latitude + ',' + longitude).catch(() => {}); }} />
  </View>;
}

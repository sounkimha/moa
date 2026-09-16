import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { meetupMapHtml } from './meetup-map-html';
export type MeetupMapProps = {
  latitude: number; longitude: number; zoom: number;
  onMove: (latitude: number, longitude: number) => void;
};
export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const appKey = process.env.EXPO_PUBLIC_KAKAO_MAPS_JS_KEY?.trim() || '';
  const html = useMemo(() => meetupMapHtml(latitude, longitude, zoom, 'meetup', appKey), [latitude, longitude, zoom, appKey]);
  return <WebView source={{ html, baseUrl: 'http://localhost:8081' }} style={{ height: 300 }} startInLoadingState userAgent="MoaMeetupMap/0.1"
    nestedScrollEnabled scrollEnabled={false} bounces={false}
    originWhitelist={['https://*', 'http://*', 'about:*']}
    onMessage={(event) => { try {
      const p = JSON.parse(event.nativeEvent.data);
      if (Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180) onMove(p.latitude, p.longitude);
    } catch {} }} />;
}

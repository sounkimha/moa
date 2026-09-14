import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { meetupMapHtml } from './meetup-map-html';
export type MeetupMapProps = {
  latitude: number; longitude: number; zoom: number;
  onMove: (latitude: number, longitude: number) => void;
};
export default function MeetupMap({ latitude, longitude, zoom, onMove }: MeetupMapProps) {
  const html = useMemo(() => meetupMapHtml(latitude, longitude, zoom, 'meetup'), [latitude, longitude, zoom]);
  return <WebView source={{ html }} style={{ height: 300 }} startInLoadingState userAgent="MoaMeetupMap/0.1"
    originWhitelist={['about:*']} onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
    onMessage={(event) => { try {
      const p = JSON.parse(event.nativeEvent.data);
      if (Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180) onMove(p.latitude, p.longitude);
    } catch {} }} />;
}

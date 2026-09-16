import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Place } from '@moa/domain';
import { colors as c } from '../theme/tokens';
import { kakaoMapEmbedUrl, googlePlaceUrl, googleRouteMapHtml } from './google-route-map-html';
import { Button, Txt } from './ui';
import { RouteMapEmpty, RouteMapStatus, RouteMapUnavailable, ROUTE_MAP_TIMEOUT, RouteMapLoadState } from './RouteMapStatus';

export type RouteMapProps = { places: Place[]; selected?: string; onSelect: (place: Place) => void };

export default function RouteMap({ places, selected, onSelect }: RouteMapProps) {
  const [status, setStatus] = useState<RouteMapLoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
  const active = places.find((place) => place.id === selected) || places[0];
  const channel = useRef(`route-${Math.random().toString(36).slice(2)}`).current;
  const html = useMemo(() => apiKey ? googleRouteMapHtml(places, selected, apiKey, channel) : '', [apiKey, channel, places, selected]);
  const finish = (next: 'ready' | 'error') => {
    clearTimeout(timer.current);
    setStatus((current) => next === 'ready' && current === 'error' ? current : next);
  };
  useEffect(() => {
    if (!active || !apiKey) return;
    setStatus('loading');
    timer.current = setTimeout(() => setStatus('error'), ROUTE_MAP_TIMEOUT);
    return () => clearTimeout(timer.current);
  }, [html, active?.id, attempt, apiKey]);
  if (!active) return <RouteMapEmpty />;
  const open = () => void Linking.openURL(googlePlaceUrl(active));
  if (!apiKey) return <RouteMapUnavailable places={places} active={active} onSelect={onSelect} onOpen={open} />;
  return <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.border, backgroundColor: c.paper }}>
    <View style={{ height: 300 }}>
      <WebView key={`${active.id}-${attempt}`} source={apiKey ? { html } : { uri: kakaoMapEmbedUrl(active) }} style={{ height: 300 }}
        javaScriptEnabled domStorageEnabled onLoadEnd={() => { if (!apiKey) finish('ready'); }}
        onError={() => finish('error')} onHttpError={() => finish('error')}
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.channel !== channel) return;
            const place = places.find((item) => item.id === message.placeId);
            if (place) onSelect(place);
            if (message.error) finish('error');
            else if (message.ready) finish('ready');
          } catch {}
        }} />
      <RouteMapStatus status={status} onRetry={() => setAttempt((value) => value + 1)} onOpen={open} />
    </View>
    {places.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10, gap: 8 }}>
      {places.map((place) => <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={place.name + ' 지도에서 보기'} accessibilityState={{ selected: active.id === place.id }} aria-pressed={active.id === place.id} onPress={() => onSelect(place)} style={{ borderRadius: 12, borderWidth: 1, borderColor: active.id === place.id ? c.green : c.border, backgroundColor: active.id === place.id ? c.mint : c.paper, paddingHorizontal: 12, paddingVertical: 9 }}><Txt size={12} weight="700">{place.region}</Txt><Txt size={11} color={c.secondary}>부탁 {place.requestCount}건</Txt></Pressable>)}
    </ScrollView>}
    <View style={{ paddingHorizontal: 14, paddingVertical: 8, gap: 2 }}>
      <Txt size={12} color={c.secondary}>{apiKey ? '지도 위 숫자는 예시 부탁 수예요.' : '선택한 장소를 한 곳씩 보여드려요. 부탁 수는 예시예요.'}</Txt>
      {status !== 'error' && <Button small kind="ghost" label="Google 지도에서 열기" onPress={open} />}
    </View>
  </View>;
}

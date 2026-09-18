import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Place } from '@moa/domain';
import { colors as c } from '../theme/tokens';
import { googlePlaceUrl } from './google-route-map-html';
import { mappablePlaces, placeMapRegion } from '../lib/place-map';
import { Button, Txt } from './ui';
import { RouteMapEmpty, RouteMapStatus, ROUTE_MAP_TIMEOUT, RouteMapLoadState } from './RouteMapStatus';

export type RouteMapProps = { places: Place[]; selected?: string; onSelect: (place: Place) => void };

export default function RouteMap({ places, selected, onSelect }: RouteMapProps) {
  const points = useMemo(() => mappablePlaces(places), [places]);
  const active = points.find((place) => place.id === selected) || points[0];
  const [attempt, setAttempt] = useState(0);
  if (!active) return <RouteMapEmpty />;
  // Expo Go already includes this native map. A browser JavaScript key must not
  // decide whether an iPhone/Android user can see it. Keep web in RouteMap.web.
  return <NativePlaceMap key={attempt} places={points} active={active} onSelect={onSelect} onRetry={() => setAttempt((value) => value + 1)} />;
}

function PlaceMarker({ place, selected, mapReady, onPress }: { place: Place; selected: boolean; mapReady: boolean; onPress: () => void }) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    // Capture the initial badge and selection changes, then stop the continuous
    // Android marker snapshot loop. Restart once the native map is attached.
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 500);
    return () => clearTimeout(timer);
  }, [mapReady, selected, place.requestCount]);
  return <Marker identifier={place.id} coordinate={{ latitude: place.latitude, longitude: place.longitude }}
    title={place.name} description={`${place.region} · 부탁 ${place.requestCount}건 · 예시`}
    accessibilityLabel={`${place.name} · 부탁 ${place.requestCount}건`}
    anchor={{ x: 0.5, y: 0.5 }} zIndex={selected ? 2 : 1} tracksViewChanges={tracking} onPress={onPress}>
    <View collapsable={false} style={{ minWidth: 40, height: 40, paddingHorizontal: 8, borderRadius: 20, borderWidth: 3, borderColor: c.paper, backgroundColor: selected ? c.primaryDeep : c.primaryStrong, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={13} weight="700" color={c.onPrimary}>{place.requestCount}</Txt>
    </View>
  </Marker>;
}

function NativePlaceMap({ places, active, onSelect, onRetry }: { places: Place[]; active: Place; onSelect: (place: Place) => void; onRetry: () => void }) {
  const map = useRef<MapView>(null);
  const [status, setStatus] = useState<RouteMapLoadState>('loading');
  const [mapReady, setMapReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finish = () => {
    clearTimeout(timer.current);
    setMapReady(true);
    setStatus('ready');
  };
  useEffect(() => {
    timer.current = setTimeout(() => setStatus((current) => current === 'ready' ? current : 'error'), ROUTE_MAP_TIMEOUT);
    return () => clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    if (!mapReady) return;
    map.current?.animateToRegion(placeMapRegion(active), 250);
  }, [mapReady, active.id, active.latitude, active.longitude]);
  const open = () => void Linking.openURL(googlePlaceUrl(active));
  return <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.border, backgroundColor: c.paper }}>
    <View style={{ height: 300 }}>
      <MapView ref={map} testID="native-place-map"
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={{ width: '100%', height: '100%' }} initialRegion={placeMapRegion(active)}
        scrollEnabled zoomEnabled zoomControlEnabled pitchEnabled={false} rotateEnabled={false}
        showsUserLocation={false} showsMyLocationButton={false} moveOnMarkerPress={false}
        loadingEnabled loadingBackgroundColor={c.canvas} loadingIndicatorColor={c.primaryStrong}
        onMapReady={() => {
          setMapReady(true);
          // MapKit does not emit onMapLoaded; use its native ready event.
          if (Platform.OS === 'ios') finish();
        }}
        onMapLoaded={finish}>
        {places.map((place) => <PlaceMarker key={place.id} place={place} selected={place.id === active.id} mapReady={mapReady} onPress={() => onSelect(place)} />)}
      </MapView>
      <RouteMapStatus status={status} onRetry={onRetry} onOpen={open} />
    </View>
    {places.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10, gap: 8 }}>
      {places.map((place) => <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={place.name + ' 지도에서 보기'} accessibilityState={{ selected: active.id === place.id }} aria-pressed={active.id === place.id} onPress={() => onSelect(place)} style={{ borderRadius: 12, borderWidth: 1, borderColor: active.id === place.id ? c.green : c.border, backgroundColor: active.id === place.id ? c.mint : c.paper, paddingHorizontal: 12, paddingVertical: 9 }}><Txt size={12} weight="700">{place.region}</Txt><Txt size={11} color={c.secondary}>부탁 {place.requestCount}건</Txt></Pressable>)}
    </ScrollView>}
    <View style={{ paddingHorizontal: 14, paddingVertical: 8, gap: 2 }}>
      <Txt size={12} color={c.secondary}>지도 위 숫자는 예시 부탁 수예요. 핀이나 아래 지역을 눌러보세요.</Txt>
      {status !== 'error' && <Button small kind="ghost" label="Google 지도에서 열기" onPress={open} />}
    </View>
  </View>;
}

import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Place } from '@moa/domain';
import { Badge } from './ui';
import { colors as c } from '../theme/tokens';

export function ItineraryMap({ places, highlightedPlaceId, onSelectPlace }: { places: Place[]; highlightedPlaceId?: string; onSelectPlace?: (place: Place) => void }) {
  const map = useRef<MapView>(null);
  const coordinates = useMemo(() => places.map((place) => ({ latitude: place.latitude, longitude: place.longitude })), [places]);
  useEffect(() => {
    if (!coordinates.length) return;
    const frame = requestAnimationFrame(() => map.current?.fitToCoordinates(coordinates, { edgePadding: { top: 45, right: 45, bottom: 45, left: 45 }, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [coordinates]);
  if (!places.length) return null;
  return (
    <View style={{ height: 240, overflow: 'hidden' }}>
      <MapView ref={map} provider={PROVIDER_GOOGLE} style={{ flex: 1 }} initialRegion={{ ...coordinates[0], latitudeDelta: 0.18, longitudeDelta: 0.18 }}>
        {places.map((place, index) => <Marker key={place.id} coordinate={coordinates[index]} title={`${index + 1}. ${place.name}`} pinColor={place.id === highlightedPlaceId ? c.primaryStrong : c.primary} onPress={() => onSelectPlace?.(place)} />)}
        {coordinates.length > 1 && <Polyline coordinates={coordinates} strokeColor={c.primary} strokeWidth={4} geodesic />}
      </MapView>
      <View style={{ position: 'absolute', left: 10, bottom: 10 }}><Badge bg={c.surface}>Google Maps · 등록된 일정</Badge></View>
    </View>
  );
}

import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { MapPin, ArrowUpRight } from 'lucide-react-native';
import type { Place } from '@moa/domain';
import { colors as c } from '../theme/tokens';
import { Button, Row, Stack, Txt } from './ui';

export type RouteMapLoadState = 'loading' | 'ready' | 'error';
export const ROUTE_MAP_TIMEOUT = 12000;

export function RouteMapStatus({ status, onRetry, onOpen }: { status: RouteMapLoadState; onRetry: () => void; onOpen: () => void }) {
  if (status === 'ready') return null;
  return <View accessibilityRole={status === 'error' ? 'alert' : 'progressbar'} style={{ position: 'absolute', inset: 0, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
    {status === 'loading' ? <><ActivityIndicator color={c.green} /><Txt size={14} color={c.secondary}>지도를 불러오고 있어요</Txt></> : <>
      <MapPin size={28} color={c.muted} /><Txt size={16} weight="600">지도를 불러오지 못했어요</Txt>
      <Txt size={13} color={c.secondary} style={{ textAlign: 'center' }}>다시 시도하거나 Google 지도에서 확인해보세요.</Txt>
      <Button small kind="secondary" label="지도 다시 불러오기" onPress={onRetry} />
      <Button small kind="ghost" label="Google 지도에서 열기" onPress={onOpen} />
    </>}
  </View>;
}

export function RouteMapEmpty() {
  return <View style={{ height: 240, padding: 24, borderRadius: 20, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center', gap: 10 }}><MapPin size={28} color={c.muted} /><Txt weight="600">표시할 장소가 없어요</Txt><Txt size={13} color={c.secondary}>다른 도시나 검색어로 찾아보세요.</Txt></View>;
}

export function MeetupMapUnavailable({ onOpen }: { onOpen: () => void }) {
  return <Stack gap={12} style={{ padding: 20, backgroundColor: c.ultraSoft }}><Row><MapPin size={22} color={c.primaryStrong} /><Txt size={16} weight="700">지도 연결을 준비하고 있어요</Txt></Row><Txt size={13} color={c.secondary}>지금은 장소 검색 결과나 이전 만남 장소를 선택해주세요. 위치는 외부 지도에서 확인할 수 있어요.</Txt><Button small kind="secondary" label="Google 지도에서 열기" icon={ArrowUpRight} onPress={onOpen} /></Stack>;
}

/** No cross-origin iframe masquerading as a working map when the SDK isn't configured. */
export function RouteMapUnavailable({ places, active, onSelect, onOpen }: { places: Place[]; active: Place; onSelect: (place: Place) => void; onOpen: () => void }) {
  return <View style={{ borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, overflow: 'hidden' }}>
    <Stack gap={16} style={{ padding: 20 }}>
      <Row><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><MapPin size={24} color={c.primaryStrong} /></View><Stack gap={4} style={{ flex: 1 }}><Txt size={18} weight="700">{active.name}</Txt><Txt size={13} color={c.secondary}>{active.city} · {active.region}</Txt></Stack></Row>
      <Txt size={13} color={c.secondary}>앱 안 지도는 연결 준비 중이에요. 정확한 위치는 Google 지도에서 확인할 수 있어요.</Txt>
      <Button label="Google 지도에서 열기" kind="secondary" icon={ArrowUpRight} onPress={onOpen} />
    </Stack>
    {places.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 16, paddingTop: 0 }}>{places.map((place) => <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={place.name + ' 지도에서 보기'} accessibilityState={{ selected: place.id === active.id }} onPress={() => onSelect(place)} style={{ minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: place.id === active.id ? c.primarySoft : c.canvas }}><Txt size={13} weight={place.id === active.id ? '700' : '400'} color={place.id === active.id ? c.primaryStrong : c.secondary}>{place.region} · {place.requestCount}</Txt></Pressable>)}</ScrollView>}
  </View>;
}

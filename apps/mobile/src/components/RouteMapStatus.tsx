import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors as c } from '../theme/tokens';
import { Button, Txt } from './ui';

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

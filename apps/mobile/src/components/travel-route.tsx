import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native';
import { ArrowUpRight, CalendarDays, Check, ChevronRight, MapPin, Plane } from 'lucide-react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Place, Trip, TripDestination, shortDate } from '@moa/domain';
import { colors as c } from '../theme/tokens';
import { Badge, Button, Card, Row, Sheet, Stack, Txt } from './ui';
import { ItineraryMap } from './ItineraryMap';
import { PlaceCover } from './visuals';

const cityLabels: Record<string, string> = {
  서울: 'SEOUL', 도쿄: 'TOKYO', 오사카: 'OSAKA', 후쿠오카: 'FUKUOKA', 삿포로: 'SAPPORO',
  제주: 'JEJU', 부산: 'BUSAN', 타이베이: 'TAIPEI', 홍콩: 'HONG KONG', 방콕: 'BANGKOK',
  다낭: 'DA NANG', 싱가포르: 'SINGAPORE', 상하이: 'SHANGHAI', 발리: 'BALI',
};

function useReducedMotion() {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduced(value); }).catch(() => { if (mounted) setReduced(false); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduced;
}

export function PlaneRouteAnimation({ departure, destination, active = true, onArrive, compact = false }: {
  departure: string; destination: string; active?: boolean; onArrive?: () => void; compact?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const arrived = useRef(onArrive);
  arrived.current = onArrive;
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!width || reducedMotion === null) return;
    progress.stopAnimation();
    progress.setValue(reducedMotion || !active ? 1 : 0);
    if (reducedMotion || !active) { arrived.current?.(); return; }
    const animation = Animated.timing(progress, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) arrived.current?.(); });
    return () => animation.stop();
  }, [active, departure, destination, reducedMotion, width, progress]);
  const travel = Math.max(0, width - 72);
  // Sample the same quadratic Bezier as the visible route, rather than a V-shaped motion.
  const samples = Array.from({ length: 21 }, (_, index) => index / 20);
  const path = `M 36 56 Q ${width / 2} -14 ${Math.max(36, width - 36)} 56`;
  return (
    <View testID="plane-route" accessible accessibilityLabel={`${departure}에서 ${destination}으로 이동하는 여행 일정`}
      onLayout={(event) => { const next = Math.round(event.nativeEvent.layout.width); if (next > 0) setWidth(next); }}
      style={{ borderRadius: 20, backgroundColor: c.primaryDeep, overflow: 'hidden' }}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: compact ? 16 : 20, paddingTop: compact ? 14 : 20, alignItems: 'flex-start' }}>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}><Txt size={11} color={c.navyText}>FROM · 출발</Txt><Txt size={compact ? 18 : 24} weight="800" color={c.onPrimary} lines={1}>{compact ? departure : cityLabels[departure] || departure}</Txt>{!compact && <Txt size={13} color={c.navyText}>{departure}</Txt>}</Stack>
        <Stack gap={4} style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}><Txt size={11} color={c.navyText}>TO · 도착</Txt><Txt size={compact ? 18 : 24} weight="800" color={c.onPrimary} lines={1}>{compact ? destination : cityLabels[destination] || destination}</Txt>{!compact && <Txt size={13} color={c.navyText}>{destination}</Txt>}</Stack>
      </Row>
      <View style={{ height: compact ? 76 : 82, marginTop: compact ? 2 : 8 }}>
        {!!width && <Svg width={width} height={80}>
          <Path d={path} fill="none" stroke={c.navyBadge} strokeWidth={2} />
          <Path d={path} fill="none" stroke={c.primaryTint} strokeWidth={1.5} strokeDasharray="4 6" />
          <Circle cx={36} cy={56} r={5} fill={c.primaryTint} />
          <Circle cx={width - 36} cy={56} r={8} fill={c.primaryDeep} stroke={c.primaryTint} strokeWidth={2} />
        </Svg>}
        <Animated.View testID="route-airplane" style={{ position: 'absolute', left: 19, top: 39, opacity: width ? 1 : 0, transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) },
          { translateY: progress.interpolate({ inputRange: samples, outputRange: samples.map((t) => -140 * t * (1 - t)) }) },
          { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-22deg', '22deg'] }) },
        ] }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}><Plane size={20} color={c.primaryStrong} style={{ transform: [{ rotate: '45deg' }] }} /></View>
        </Animated.View>
      </View>
      {!compact && <Row style={{ borderTopWidth: 1, borderTopColor: c.navyDivider, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'space-between' }}>
        <Txt size={11} color={c.navyText}>MOA TRAVEL ROUTE</Txt><Txt size={11} color={c.navyText}>등록된 여행 일정 기준</Txt>
      </Row>}
    </View>
  );
}

function RouteStop({ place, index, last, highlighted, revealed, visit, requestCount, onPress }: {
  place: Place; index: number; last: boolean; highlighted: boolean; revealed: boolean;
  visit?: TripDestination; requestCount?: number; onPress?: () => void;
}) {
  const show = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!revealed || reducedMotion === null) { show.setValue(0); return; }
    if (reducedMotion) { show.setValue(1); return; }
    const animation = Animated.sequence([Animated.delay(index * 120), Animated.timing(show, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true })]);
    animation.start();
    return () => animation.stop();
  }, [revealed, reducedMotion, index, show]);
  return <Animated.View style={{ opacity: show, transform: [{ translateY: show.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
    <Row style={{ alignItems: 'stretch', gap: 12 }}>
      <View style={{ width: 28, alignItems: 'center' }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: highlighted ? c.primaryStrong : c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Txt size={12} weight="700" color={highlighted ? c.onPrimary : c.primaryStrong}>{index + 1}</Txt></View>
        {!last && <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: c.routeSoft }} />}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${place.name} 방문 상세`} onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 14, paddingTop: 10, marginBottom: last ? 0 : 12, borderRadius: 16, backgroundColor: highlighted ? c.primarySoft : c.surface, opacity: pressed ? 0.76 : 1, borderWidth: 1, borderColor: highlighted ? c.primaryTint : c.border })}>
        <Row style={{ alignItems: 'flex-start', gap: 8 }}><Stack gap={5} style={{ flex: 1, minWidth: 0 }}>
          {highlighted && <Txt size={11} weight="700" color={c.primaryStrong}>요청 상품 판매 장소</Txt>}
          <Txt size={16} weight="700">{place.name}</Txt>
          <Txt size={12} color={c.secondary}>{visit ? `${shortDate(visit.visitDate)}${visit.visitTime ? ` · ${visit.visitTime}` : ''}` : '방문 날짜 미정'} · {place.region}</Txt>
          {requestCount !== undefined && <Txt size={12} color={c.primaryStrong}>부탁 {requestCount}건</Txt>}
        </Stack><ChevronRight size={17} color={c.muted} /></Row>
      </Pressable>
    </Row>
  </Animated.View>;
}

export function LocalRoutePath({ places, highlightedPlaceId, destinations = [], revealed = true, requestCounts, onSelectPlace }: {
  places: Place[]; highlightedPlaceId?: string; destinations?: TripDestination[]; revealed?: boolean;
  requestCounts?: Record<string, number>; onSelectPlace?: (place: Place) => void;
}) {
  return <Stack gap={0}>{places.map((place, index) => <RouteStop key={place.id} place={place} index={index} last={index === places.length - 1} highlighted={place.id === highlightedPlaceId} revealed={revealed} visit={destinations.find((stop) => stop.placeId === place.id)} requestCount={requestCounts?.[place.id]} onPress={() => onSelectPlace?.(place)} />)}</Stack>;
}

export function TravelRouteMap({ trip, places, highlightedPlaceId, destinations = [], requestCounts, onSelectPlace }: {
  trip: Trip; places: Place[]; highlightedPlaceId?: string; destinations?: TripDestination[];
  requestCounts?: Record<string, number>; onSelectPlace?: (place: Place) => void;
}) {
  const [arrived, setArrived] = useState(false);
  useEffect(() => setArrived(false), [trip.id]);
  return <Stack gap={20}>
    <PlaneRouteAnimation key={trip.id} departure={trip.departureCity} destination={trip.destinationCity} onArrive={() => setArrived(true)} />
    <Row style={{ justifyContent: 'space-between' }}><Txt size={20} weight="700">여행자의 방문 동선</Txt><Badge>{places.length}곳</Badge></Row>
    {!!places.length && <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.border }}><ItineraryMap places={places} highlightedPlaceId={highlightedPlaceId} onSelectPlace={onSelectPlace} /></View>}
    <LocalRoutePath places={places} highlightedPlaceId={highlightedPlaceId} destinations={destinations} revealed={arrived} requestCounts={requestCounts} onSelectPlace={onSelectPlace} />
    {!places.length && <Card><Txt size={15} color={c.secondary}>도시는 정했어요. 세부 방문 장소는 아직 공개되지 않았어요.</Txt></Card>}
  </Stack>;
}

export function TripTimeline({ trip, destinations, places }: { trip: Trip; destinations: TripDestination[]; places: Place[] }) {
  const stops = destinations.slice().sort((a, b) => a.sequence - b.sequence);
  const rows = [
    { date: trip.startDate, time: '', title: `${trip.departureCity} → ${trip.destinationCity}`, detail: '출발 예정 · 항공편 시간 미등록' },
    ...stops.map((stop) => ({ date: stop.visitDate, time: stop.visitTime, title: places.find((place) => place.id === stop.placeId)?.name || '방문 장소', detail: '방문 예정' })),
    { date: trip.endDate, time: '', title: `${trip.departureCity}으로 돌아와요`, detail: '귀국 예정 · 항공편 시간 미등록' },
  ];
  return <Stack gap={0}>{rows.map((row, index) => <Row key={`${index}-${row.title}`} style={{ alignItems: 'stretch', gap: 12 }}>
    <Stack gap={3} style={{ width: 52 }}><Txt size={12} weight="600" color={c.secondary}>{index === 0 || rows[index - 1].date !== row.date ? shortDate(row.date) : ''}</Txt>{!!row.time && <Txt size={12} weight="700">{row.time}</Txt>}</Stack>
    <View style={{ width: 12, alignItems: 'center' }}><View style={{ width: 8, height: 8, marginTop: 5, borderRadius: 4, backgroundColor: c.primary }} />{index < rows.length - 1 && <View style={{ width: 1, flex: 1, backgroundColor: c.border, minHeight: 48 }} />}</View>
    <Stack gap={4} style={{ flex: 1, minWidth: 0, paddingBottom: index < rows.length - 1 ? 24 : 0 }}><Txt size={15} weight="600">{row.title}</Txt><Txt size={12} color={c.secondary}>{row.detail}</Txt></Stack>
  </Row>)}</Stack>;
}

export function TravelerScheduleSheet({ trip, destinations, places, highlightedPlaceId, requestCounts = {}, onPlacePress }: {
  trip: Trip; destinations: TripDestination[]; places: Place[]; highlightedPlaceId?: string;
  requestCounts?: Record<string, number>; onPlacePress?: (place: Place) => void;
}) {
  const [selected, setSelected] = useState<Place | null>(null);
  const visit = destinations.find((stop) => stop.placeId === selected?.id);
  return <Stack gap={28}>
    <TravelRouteMap trip={trip} places={places} highlightedPlaceId={highlightedPlaceId} destinations={destinations} requestCounts={requestCounts} onSelectPlace={setSelected} />
    {!!trip.customStops?.length && <Stack gap={8}><Txt size={16} weight="700">함께 들를 곳</Txt><Txt size={14} color={c.secondary}>{trip.customStops.join(' · ')}</Txt></Stack>}
    <Card><Stack gap={20}><Row><CalendarDays size={20} color={c.primaryStrong} /><Txt size={19} weight="700">일정 한눈에 보기</Txt></Row><TripTimeline trip={trip} destinations={destinations} places={places} /></Stack></Card>
    <Row style={{ alignItems: 'flex-start', gap: 8 }}><Check size={16} color={c.primaryStrong} /><Txt size={12} color={c.secondary} style={{ flex: 1 }}>여행자가 등록한 계획이에요. 실시간 위치나 방문 완료를 뜻하지 않아요.</Txt></Row>
    <Sheet visible={!!selected} title={selected?.name || '방문 장소'} subtitle={selected ? `${selected.city} · ${selected.region}` : undefined} onClose={() => setSelected(null)} footer={selected && onPlacePress ? <Button label="장소 자세히 보기" icon={ArrowUpRight} onPress={() => { const place = selected; setSelected(null); onPlacePress(place); }} /> : undefined}>
      {selected && <Stack gap={20}>
        <View style={{ borderRadius: 20, overflow: 'hidden' }}><PlaceCover place={selected} /></View>
        {selected.id === highlightedPlaceId && <Badge>요청 상품 판매 장소</Badge>}
        <Row style={{ justifyContent: 'space-between' }}><Stack gap={5}><Txt size={12} color={c.secondary}>방문 예정</Txt><Txt size={20} weight="700">{visit ? `${shortDate(visit.visitDate)}${visit.visitTime ? ` ${visit.visitTime}` : ''}` : '날짜 미정'}</Txt></Stack><Stack gap={5} style={{ alignItems: 'flex-end' }}><Txt size={12} color={c.secondary}>해당 장소 부탁</Txt><Txt size={20} weight="700" color={c.primaryStrong}>{requestCounts[selected.id] ?? 0}건</Txt></Stack></Row>
        <Row style={{ alignItems: 'flex-start', gap: 8 }}><MapPin size={17} color={c.primaryStrong} /><Txt size={14} color={c.secondary} style={{ flex: 1 }}>{selected.description}</Txt></Row>
        <Txt size={12} color={c.secondary}>방문 일정은 여행 중 달라질 수 있어요.</Txt>
      </Stack>}
    </Sheet>
  </Stack>;
}

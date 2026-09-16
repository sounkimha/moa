import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { CalendarDays, Check, MapPin, Plane } from 'lucide-react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Place, Trip, TripDestination, shortDate } from '@moa/domain';
import { colors as c } from '../theme/tokens';
import { Badge, Card, Row, Stack, Txt } from './ui';

export function PlaneRouteAnimation({
  departure,
  destination,
  active = true,
}: {
  departure: string;
  destination: string;
  active?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(reducedMotion || !active ? 1 : 0);
    if (!reducedMotion && active)
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
  }, [active, departure, destination, reducedMotion]);
  const travel = Math.max(0, width - 78);
  return (
    <View
      accessible
      accessibilityLabel={`${departure}에서 ${destination}으로 이동하는 여행 일정`}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ minHeight: 116, borderRadius: 22, backgroundColor: c.primaryDeep, overflow: 'hidden', padding: 18 }}
    >
      <Svg width="100%" height={62} viewBox="0 0 320 62" preserveAspectRatio="none" style={{ position: 'absolute', top: 18, left: 0 }}>
        <Path d="M 28 48 Q 160 -8 292 48" fill="none" stroke={c.primaryTint} strokeWidth={2} strokeDasharray="6 7" opacity={0.72} />
      </Svg>
      <Animated.View
        style={{
          position: 'absolute', left: 25, top: 46,
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) },
            { translateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -29, 0] }) },
            { rotate: progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: ['-9deg', '9deg', '0deg'] }) },
          ],
        }}
      >
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Plane size={19} color={c.primaryStrong} />
        </View>
      </Animated.View>
      <Row style={{ marginTop: 67, justifyContent: 'space-between' }}>
        <Stack gap={1}><Txt size={11} color={c.navyText}>출발</Txt><Txt size={17} weight="800" color={c.onPrimary}>{departure}</Txt></Stack>
        <Stack gap={1} style={{ alignItems: 'flex-end' }}><Txt size={11} color={c.navyText}>도착</Txt><Txt size={17} weight="800" color={c.onPrimary}>{destination}</Txt></Stack>
      </Row>
    </View>
  );
}

function mapPoints(places: Place[]) {
  if (!places.length) return [];
  const latitudes = places.map((place) => place.latitude);
  const longitudes = places.map((place) => place.longitude);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes), maxLng = Math.max(...longitudes);
  return places.map((place, index) => ({
    place,
    x: places.length === 1 ? 150 : 35 + ((place.longitude - minLng) / Math.max(maxLng - minLng, 0.001)) * 230,
    y: places.length === 1 ? 95 : 30 + ((maxLat - place.latitude) / Math.max(maxLat - minLat, 0.001)) * 125 + index * 3,
  }));
}

export function LocalRoutePath({ places, highlightedPlaceId }: { places: Place[]; highlightedPlaceId?: string }) {
  return (
    <Stack gap={0}>
      {places.map((place, index) => {
        const highlighted = place.id === highlightedPlaceId;
        return (
          <Row key={place.id} style={{ alignItems: 'stretch', gap: 12 }}>
            <View style={{ width: 26, alignItems: 'center' }}>
              <View style={{ width: 18, height: 18, marginTop: 3, borderRadius: 9, borderWidth: 4, borderColor: highlighted ? c.primaryStrong : c.primary, backgroundColor: c.surface }} />
              {index < places.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 38, backgroundColor: c.routeSoft }} />}
            </View>
            <Stack gap={2} style={{ flex: 1, paddingBottom: index < places.length - 1 ? 18 : 0 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt weight="700">{place.name}</Txt>
                {highlighted && <Badge>부탁 장소</Badge>}
              </Row>
              <Txt size={12} color={c.secondary}>{place.city} {place.region} · 동선 추가 약 {place.extraMinutes}분</Txt>
            </Stack>
          </Row>
        );
      })}
    </Stack>
  );
}

export function TravelRouteMap({ trip, places, highlightedPlaceId }: { trip: Trip; places: Place[]; highlightedPlaceId?: string }) {
  const points = useMemo(() => mapPoints(places), [places]);
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  return (
    <Stack gap={14}>
      <PlaneRouteAnimation departure={trip.departureCity} destination={trip.destinationCity} />
      <View
        accessible
        accessibilityLabel={`현지 방문 순서: ${places.map((place) => place.name).join(', ')}`}
        style={{ height: 220, borderRadius: 24, overflow: 'hidden', backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.border }}
      >
        <View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, left: -40, top: 45, backgroundColor: c.surface }} />
        <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -35, top: -35, backgroundColor: c.routeSoft }} />
        <Svg width="100%" height="100%" viewBox="0 0 300 200">
          {!!path && <Path d={path} fill="none" stroke={c.primaryStrong} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
          {points.map(({ place, x, y }, index) => (
            <Circle key={place.id} cx={x} cy={y} r={place.id === highlightedPlaceId ? 9 : 7} fill={place.id === highlightedPlaceId ? c.primaryStrong : c.primary} stroke={c.surface} strokeWidth={4} />
          ))}
        </Svg>
        {points.map(({ place, x, y }, index) => (
          <View key={place.id} style={{ position: 'absolute', left: `${Math.min(65, Math.max(4, x / 3 - 6))}%`, top: `${Math.min(66, Math.max(4, y / 2 - 9))}%`, maxWidth: 132, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: c.softOverlay }}>
            <Txt size={10} weight="700" lines={1}>{index + 1}. {place.region}</Txt>
          </View>
        ))}
        <View style={{ position: 'absolute', left: 13, bottom: 12 }}><Badge bg={c.surface}>지도 스타일 일정 · 실제 GPS 아님</Badge></View>
      </View>
      <LocalRoutePath places={places} highlightedPlaceId={highlightedPlaceId} />
    </Stack>
  );
}

export function TripTimeline({ trip, destinations, places }: { trip: Trip; destinations: TripDestination[]; places: Place[] }) {
  const stops = destinations.slice().sort((a, b) => a.sequence - b.sequence);
  const rows = [
    { date: trip.startDate, time: '09:30', title: `${trip.departureCity} 출발`, detail: '국제 이동 · 공개 일정' },
    { date: trip.startDate, time: '12:00', title: `${trip.destinationCity} 도착`, detail: '예정 시간' },
    ...stops.map((stop) => ({
      date: stop.visitDate, time: stop.visitTime,
      title: places.find((place) => place.id === stop.placeId)?.name || '방문 장소',
      detail: places.find((place) => place.id === stop.placeId)?.region || '',
    })),
    { date: trip.endDate, time: '19:00', title: `${trip.destinationCity} 출발`, detail: '귀국 일정' },
    { date: trip.endDate, time: '21:30', title: `${trip.departureCity} 도착`, detail: '예정 시간' },
  ];
  return (
    <Stack gap={18}>
      {rows.map((row, index) => (
        <Row key={`${row.date}-${row.time}-${row.title}`} style={{ alignItems: 'flex-start' }}>
          <View style={{ width: 48 }}><Txt size={12} color={c.secondary}>{index === 0 || rows[index - 1].date !== row.date ? shortDate(row.date) : ''}</Txt><Txt size={14} weight="700">{row.time}</Txt></View>
          <View style={{ width: 28, alignItems: 'center' }}><View style={{ width: 12, height: 12, marginTop: 5, borderRadius: 6, backgroundColor: index <= 1 ? c.primaryStrong : c.primary }} />{index < rows.length - 1 && <View style={{ width: 2, height: 45, backgroundColor: c.routeSoft }} />}</View>
          <Stack gap={2} style={{ flex: 1 }}><Txt weight="700">{row.title}</Txt><Txt size={12} color={c.secondary}>{row.detail}</Txt></Stack>
        </Row>
      ))}
    </Stack>
  );
}

export function TravelerScheduleSheet({ trip, destinations, places, highlightedPlaceId }: { trip: Trip; destinations: TripDestination[]; places: Place[]; highlightedPlaceId?: string }) {
  return (
    <Stack gap={20}>
      <TravelRouteMap trip={trip} places={places} highlightedPlaceId={highlightedPlaceId} />
      <Card>
        <Stack gap={16}>
          <Row><CalendarDays size={21} color={c.primary} /><Txt size={18} weight="800">시간별 공개 일정</Txt></Row>
          <TripTimeline trip={trip} destinations={destinations} places={places} />
        </Stack>
      </Card>
      <Row style={{ alignItems: 'flex-start' }}><Check size={18} color={c.primary} /><Txt size={12} color={c.secondary} style={{ flex: 1 }}>경로와 시간은 여행자가 등록한 계획입니다. 항공편·GPS 실시간 위치나 방문 완료를 의미하지 않아요.</Txt></Row>
    </Stack>
  );
}

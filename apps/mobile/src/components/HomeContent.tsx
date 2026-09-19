import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, Plane } from 'lucide-react-native';
import { canAcceptTrip, Place, shortDate, Trip, TRIP_VERIFICATION_LABEL, User } from '@moa/domain';
import { colors as c } from '../theme/tokens';
import { Row, Stack, Txt } from './ui';
import { Avatar } from './visuals';
import { FlightVerificationMark } from './TripVerificationBadge';

/** A quiet, non-animated route shared by the home hero and traveler previews. */
export function TravelRouteLine({ departure, destination, light = false, accented = false }: {
  departure: string; destination: string; light?: boolean; accented?: boolean;
}) {
  const color = light ? '#FFFFFF' : c.ink;
  const line = light ? '#FFFFFF70' : c.border;
  if (accented) return <Row style={{ gap: 8 }}>
    <Txt size={16} weight="600" color={c.secondary} style={{ flexShrink: 1, maxWidth: '34%' }}>{departure}</Txt>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flex: 1, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.muted }} />
      <View style={{ height: 1, flex: 1, backgroundColor: c.border }} />
      <View style={{ transform: [{ rotate: '45deg' }] }}><Plane size={16} color={c.primaryStrong} /></View>
      <View style={{ height: 1, flex: 1, backgroundColor: c.primaryTint }} />
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.primaryStrong }} />
    </View>
    <Txt size={16} weight="600" color={c.primaryStrong} style={{ flexShrink: 1, maxWidth: '34%' }}>{destination}</Txt>
  </Row>;
  return <Row style={{ gap: 8 }}>
    <Txt size={15} weight="600" color={color} style={{ flexShrink: 1 }}>{departure}</Txt>
    <View style={{ height: 1, flex: 1, minWidth: 12, backgroundColor: line }} />
    <View style={{ transform: [{ rotate: '45deg' }] }}><Plane size={17} color={light ? '#FFFFFF' : c.primaryStrong} /></View>
    <View style={{ height: 1, flex: 1, minWidth: 12, backgroundColor: line }} />
    <Txt size={15} weight="600" color={color} style={{ flexShrink: 1 }}>{destination}</Txt>
  </Row>;
}

export function TravelerPreview({ user, trip, places, distance, onPress, variant = 'plain' }: {
  user: User; trip: Trip; places: Place[]; distance?: number; onPress: () => void; variant?: 'plain' | 'nearby';
}) {
  const stops = [...new Set(trip.placeIds.map((id) => places.find((p) => p.id === id))
    .filter((p): p is Place => Boolean(p)).map((p) => p.region || p.name).concat(trip.customStops || []))];
  const areas = stops.length ? stops : trip.destinationAreas?.length ? trip.destinationAreas : [trip.destinationCity];
  const visitLabel = `${areas.slice(0, 3).join(' · ')}${areas.length > 3 ? ` 외 ${areas.length - 3}곳` : ''} 방문 예정`;
  if (variant === 'nearby') return <Pressable
    testID={`nearby-traveler-${trip.id}`}
    accessibilityRole="button"
    accessibilityLabel={`${user.nickname}님의 여행 보기`}
    accessibilityHint={`${trip.departureCity}에서 ${trip.destinationCity}로, ${shortDate(trip.startDate)}부터 ${shortDate(trip.endDate)}까지. ${visitLabel}. 여행 일정을 열어요.`}
    onPress={onPress}
    style={({ pressed }) => ({ padding: 16, paddingVertical: 20, backgroundColor: pressed ? c.ultraSoft : c.paper })}
  >
    <Row style={{ alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flexShrink: 0 }}><Avatar user={user} size={50} /></View>
      <Stack gap={12} style={{ flex: 1, minWidth: 0 }}>
        <Stack gap={3}>
          <Txt size={18} weight="700">{user.nickname}</Txt>
          {canAcceptTrip(trip)
            ? <FlightVerificationMark trip={trip} />
            : <Txt size={12} color={c.secondary} style={{ flexShrink: 1 }}>{TRIP_VERIFICATION_LABEL[trip.verificationStatus]}</Txt>}
        </Stack>
        <TravelRouteLine accented departure={trip.departureCity} destination={trip.destinationCity} />
        <Stack gap={4}>
          <Txt size={14} weight="500">{shortDate(trip.startDate)} – {shortDate(trip.endDate)}</Txt>
          <Txt size={14} color={c.secondary}>{visitLabel}</Txt>
        </Stack>
        <Row style={{ justifyContent: 'space-between', gap: 8 }}>
          <Txt size={13} color={c.secondary} style={{ flex: 1 }}>{distance !== undefined && Number.isFinite(distance) && distance >= 0 ? `내 위치에서 ${distance.toFixed(1)}km` : '거리 확인 전'}</Txt>
          <ChevronRight size={18} color={c.muted} />
        </Row>
      </Stack>
    </Row>
  </Pressable>;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${user.nickname}님의 여행 보기`} onPress={onPress}
    style={({ pressed }) => ({ paddingVertical: 18, borderBottomWidth: 1, borderColor: c.border, opacity: pressed ? 0.7 : 1 })}>
    <Row style={{ alignItems: 'flex-start', gap: 12 }}>
      <Avatar user={user} size={42} />
      <Stack gap={10} style={{ flex: 1, minWidth: 0 }}>
        <Row style={{ justifyContent: 'space-between', gap: 8 }}><Row style={{ flex: 1, minWidth: 0, flexWrap: 'wrap', gap: 6 }}><Txt size={17} weight="600" style={{ flexShrink: 1 }}>{user.nickname}</Txt><FlightVerificationMark trip={trip} /></Row><ChevronRight size={18} color={c.muted} /></Row>
        <TravelRouteLine departure={trip.departureCity} destination={trip.destinationCity} />
        <Stack gap={3}>
          <Txt size={14} color={c.secondary}>{shortDate(trip.startDate)} – {shortDate(trip.endDate)}</Txt>
          <Txt size={13} color={c.secondary}>{visitLabel}</Txt>
          {distance !== undefined && <Txt size={12} color={c.secondary}>내 위치에서 약 {distance.toFixed(1)}km · 위치 예시</Txt>}
        </Stack>
      </Stack>
    </Row>
  </Pressable>;
}

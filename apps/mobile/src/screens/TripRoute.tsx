import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CalendarDays, ChevronRight, ShieldCheck, ShoppingBag } from 'lucide-react-native';
import { shortDate, TRIP_VERIFICATION_LABEL } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { TravelerScheduleSheet } from '../components/travel-route';
import { Badge, Button, Empty, Page, Row, Sheet, Stack, Txt } from '../components/ui';
import { Avatar } from '../components/visuals';
import { FlightVerificationMark } from '../components/TripVerificationBadge';
import { colors as c } from '../theme/tokens';

export function TripRouteScreen() {
  const a = useApp(), d = a.data!;
  const [requestOpen, setRequestOpen] = useState(false);
  const trip = d.trips.find((item) => item.id === a.route.id);
  if (!trip) return <Page title="여행 일정"><Empty title="일정이 변경되었어요" body="여행자 프로필에서 최신 일정을 확인해주세요." /></Page>;
  const traveler = d.users.find((item) => item.id === trip.travelerId);
  if (!traveler) return <Page title="여행 일정"><Empty title="여행자 정보를 불러오지 못했어요" body="이전 화면에서 다른 일정을 확인해주세요." /></Page>;
  const destinations = d.destinations.filter((item) => item.tripId === trip.id);
  const orderedIds = destinations.slice().sort((x, y) => x.sequence - y.sequence).map((item) => item.placeId);
  const places = [...new Set([...orderedIds, ...trip.placeIds])].map((id) => d.places.find((place) => place.id === id)).filter(Boolean) as typeof d.places;
  const requestCounts = Object.fromEntries(places.map((place) => [place.id, d.requests.filter((request) => request.placeId === place.id && ['REQUESTED', 'OFFER_RECEIVED'].includes(request.status)).length]));
  const canRequest = a.role === 'buyer' && d.me.id !== traveler.id && places.length > 0;
  const startRequest = (placeId: string) => {
    setRequestOpen(false);
    a.nav('request-form', { placeId });
  };
  return <>
    <Page title="이 사람의 일정 보기" footer={canRequest ? <Button icon={ShoppingBag} label={`${traveler.nickname}님에게 부탁하기`} onPress={() => setRequestOpen(true)} /> : undefined}>
      <Stack gap={16}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Stack gap={8} style={{ flex: 1, minWidth: 0 }}><Txt size={12} color={c.primaryStrong} weight="700">MY TRAVEL PLAN</Txt><Txt size={28} weight="800">{traveler.nickname}님의 여행</Txt><FlightVerificationMark trip={trip} /><Row style={{ gap: 6 }}><CalendarDays size={16} color={c.secondary} /><Txt size={15} color={c.secondary}>{shortDate(trip.startDate)} — {shortDate(trip.endDate)}</Txt></Row></Stack>
          <Pressable accessibilityRole="button" accessibilityLabel={`${traveler.nickname} 프로필`} onPress={() => a.nav('profile', { id: traveler.id })}><Avatar user={traveler} size={54} /></Pressable>
        </Row>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}><Badge>{TRIP_VERIFICATION_LABEL[trip.verificationStatus]}</Badge><Txt size={12} color={c.secondary}>공개한 여행 계획</Txt></Row>
      </Stack>
      <TravelerScheduleSheet trip={trip} destinations={destinations} places={places} highlightedPlaceId={a.route.placeId} requestCounts={requestCounts} onPlacePress={(place) => a.nav('place', { id: place.id })} />
      <Pressable accessibilityRole="button" onPress={() => a.nav('profile', { id: traveler.id })} style={({ pressed }) => ({ borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 16, opacity: pressed ? 0.72 : 1 })}>
        <Row><ShieldCheck size={20} color={c.primaryStrong} /><View style={{ flex: 1 }}><Txt size={14} weight="600">{traveler.nickname}님 더 알아보기</Txt><Txt size={12} color={c.secondary}>거래 완료 {traveler.completed}건 · 후기 확인</Txt></View><ChevronRight size={18} color={c.secondary} /></Row>
      </Pressable>
    </Page>
    <Sheet
      visible={requestOpen}
      title={`${traveler.nickname}님에게 부탁하기`}
      subtitle="방문 예정 장소를 골라 상품 요청을 시작하세요."
      onClose={() => setRequestOpen(false)}
    >
      <Txt size={13} color={c.secondary}>{traveler.nickname}님을 포함해 이 장소를 방문하는 여행자가 부탁을 확인할 수 있어요. 수락은 여행자가 직접 결정해요.</Txt>
      <Stack gap={10}>
        {places.map((place) => <Pressable
          key={place.id}
          accessibilityRole="button"
          accessibilityLabel={`${place.name}에서 부탁하기`}
          onPress={() => startRequest(place.id)}
          style={({ pressed }) => ({ minHeight: 76, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: pressed ? c.primarySoft : c.paper, opacity: pressed ? 0.76 : 1 })}
        >
          <Row>
            <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }}><ShoppingBag size={19} color={c.primaryStrong} /></View>
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}><Txt size={16} weight="700" lines={1}>{place.name}</Txt><Txt size={12} color={c.secondary}>{place.city} · 현재 부탁 {requestCounts[place.id] || 0}건</Txt></Stack>
            <ChevronRight size={19} color={c.primaryStrong} />
          </Row>
        </Pressable>)}
      </Stack>
    </Sheet>
  </>;
}

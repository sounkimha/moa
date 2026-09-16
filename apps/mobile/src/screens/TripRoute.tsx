import React from 'react';
import { ShieldCheck } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { TravelerScheduleSheet } from '../components/travel-route';
import { Badge, Card, Empty, Notice, Page, Row, Stack, Txt } from '../components/ui';
import { Avatar } from '../components/visuals';
import { colors as c } from '../theme/tokens';

export function TripRouteScreen() {
  const a = useApp(), d = a.data!;
  const trip = d.trips.find((item) => item.id === a.route.id);
  if (!trip) return <Page title="여행 일정"><Empty title="일정이 변경되었어요" body="여행자 프로필에서 최신 일정을 확인해주세요." /></Page>;
  const traveler = d.users.find((item) => item.id === trip.travelerId)!;
  const destinations = d.destinations.filter((item) => item.tripId === trip.id);
  const orderedIds = destinations.slice().sort((x, y) => x.sequence - y.sequence).map((item) => item.placeId);
  const places = (orderedIds.length ? orderedIds : trip.placeIds).map((id) => d.places.find((place) => place.id === id)).filter(Boolean) as typeof d.places;
  return (
    <Page title="이 사람의 일정 보기" backLabel="여행자 비교로">
      <Stack gap={8}>
        <Badge>공개한 여행 계획</Badge>
        <Txt size={29} weight="800">정말 그곳에 가는지{`\n`}경로와 시간으로 확인해요.</Txt>
        <Txt color={c.secondary}>국제 이동과 현지 방문 동선을 구분해 보여드려요.</Txt>
      </Stack>
      <Card>
        <Row>
          <Avatar user={traveler} size={52} />
          <Stack gap={2} style={{ flex: 1 }}><Txt size={18} weight="800">{traveler.nickname}</Txt><Txt size={12} color={c.secondary}>거래 완료 {traveler.completed}건 · 성공률 {traveler.successRate ?? 0}%</Txt></Stack>
          <ShieldCheck size={22} color={c.primary} />
        </Row>
        <Row style={{ marginTop: 12, flexWrap: 'wrap' }}><Badge>휴대폰 예시 인증</Badge><Badge>일정 예시 인증</Badge></Row>
      </Card>
      <Notice>{trip.startDate} — {trip.endDate} · 여행자가 공개한 계획이며 실제 위치 추적이 아니에요.</Notice>
      <TravelerScheduleSheet trip={trip} destinations={destinations} places={places} highlightedPlaceId={a.route.placeId} />
    </Page>
  );
}

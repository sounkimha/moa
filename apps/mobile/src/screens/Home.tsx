import React, { useState } from 'react';
import * as Location from 'expo-location';
import { Image, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import {
  ArrowRight,
  Bell,
  ChevronRight,
  Heart,
  Link,
  Plane,
  ScanLine,
  ShoppingBag,
} from 'lucide-react-native';
import { groupForTrip, money, Place, shortDate, countryName } from '@moa/domain';
import { DestinationPicker, DestinationCountry } from '../components/DestinationPicker';
import { useApp } from '../state/AppContext';
import { colors as c } from '../theme/tokens';
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  Empty,
  IconButton,
  Notice,
  Page,
  Row,
  Section,
  SearchField,
  SectionTabs,
  Stack,
  Txt,
} from '../components/ui';
import { Avatar, Logo, PlaceCard, PlaceCover, ProductRow } from '../components/visuals';
import RouteMap from '../components/RouteMap';
import { getPlacePhoto } from '../lib/place-photos';
import { PhotoCredit } from '../components/PhotoCredit';

function readRecentPlaces(): string[] {
  try {
    const saved = Platform.OS === 'web' ? JSON.parse(sessionStorage.getItem('moa.recentPlaces') || '[]') : [];
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string').slice(0, 5) : [];
  } catch { return []; }
}
function rememberPlace(id: string) {
  if (Platform.OS !== 'web') return;
  try { sessionStorage.setItem('moa.recentPlaces', JSON.stringify([id, ...readRecentPlaces().filter((value) => value !== id)].slice(0, 5))); } catch { /* Optional session history. */ }
}

const travelerPresence = [
  { userId: 'u-min', latitude: 37.5461, longitude: 127.0548 },
  { userId: 'u-haru', latitude: 37.5389, longitude: 127.0584 },
  { userId: 'u-joon', latitude: 37.5512, longitude: 127.0468 },
];
const kmBetween = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const rad = (value: number) => value * Math.PI / 180, earth = 6371;
  const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export function Onboarding() {
  const a = useApp();
  const [stage, setStage] = useState<'intro' | 'login'>('intro');
  const compact = useWindowDimensions().width < 360;
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
        padding: compact ? 20 : 28,
        paddingTop: compact ? 32 : 44,
        gap: compact ? 20 : 24,
        justifyContent: 'center',
      }}
    >
      <Row style={{ gap: 10 }}>
        <Logo />
        <Txt size={30} weight="800" color={c.green}>
          모아
        </Txt>
        <Badge>체험 모드</Badge>
      </Row>
      {stage === 'intro' ? (
        <>
          <View
            style={{ height: compact ? 205 : 220, borderRadius: 28, overflow: 'hidden', backgroundColor: c.mint }}
          >
            <Image
              source={require('../../assets/japan.jpg')}
              style={{ height: '100%', width: '100%' }}
            />
            <View style={{ position: 'absolute', inset: 0, backgroundColor: '#17366F24' }} />
            <View
              style={{
                position: 'absolute',
                left: 16,
                bottom: 16,
                right: 16,
                padding: 14,
                borderRadius: 16,
                backgroundColor: '#FFFFFFF2',
              }}
            >
              <Row>
                <View style={{ padding: 10, backgroundColor: c.lime, borderRadius: 14 }}>
                  <Plane size={24} color={c.darkGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={12} color={c.secondary}>가는 길에 만난 부탁</Txt>
                  <Txt size={compact ? 15 : 17} weight="700">
                    여행 동선 그대로 가져와요
                  </Txt>
                </View>
                {!compact && <ShoppingBag size={24} color={c.green} />}
              </Row>
            </View>
          </View>
          <Stack gap={8}>
            <Txt size={30} weight="800">가는 김에, 하나 더.</Txt>
            <Txt size={15} color={c.secondary}>그곳에 가는 사람에게, 갖고 싶은 것을 부탁해요.</Txt>
          </Stack>
          <Stack gap={10}>
            <Pressable accessibilityRole="button" accessibilityLabel="사고 싶어요" onPress={() => { a.setRole('buyer'); setStage('login'); }} style={{ padding: 16, borderRadius: 18, backgroundColor: c.paper }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ padding: 9, borderRadius: 13, backgroundColor: c.mint }}>
                  <ShoppingBag size={20} color={c.green} />
                </View>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Txt size={16} weight="700">부탁할게요</Txt>
                  <Txt size={12} color={c.secondary}>원하는 물건을 부탁해요</Txt>
                </Stack>
              </Row>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="가져올게요" onPress={() => { a.setRole('traveler'); setStage('login'); }} style={{ padding: 16, borderRadius: 18, backgroundColor: c.paper }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ padding: 9, borderRadius: 13, backgroundColor: c.lilac }}>
                  <Plane size={20} color={c.darkGreen} />
                </View>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Txt size={16} weight="700">가져올게요</Txt>
                  <Txt size={12} color={c.secondary}>가는 길의 부탁을 받아요</Txt>
                </Stack>
              </Row>
            </Pressable>
            <Button label="모아 시작하기" icon={ArrowRight} onPress={() => setStage('login')} />
            <Txt size={12} color={c.secondary} style={{ textAlign: 'center' }}>
              이용 모드는 설정에서 바꿀 수 있어요.
            </Txt>
          </Stack>
        </>
      ) : (
        <>
          <Stack gap={10}>
            <Txt size={31} weight="800">모아 시작하기</Txt>
            <Txt color={c.secondary}>한 계정으로 부탁과 여행을 이어가요.</Txt>
          </Stack>
          {a.error && (
            <Notice tone="error">
              {a.error}
            </Notice>
          )}
          <Stack gap={12}>
            <Button
              testID="start-demo"
              label="체험 계정으로 로그인"
              loading={a.busy}
              onPress={() => a.login('DEMO', 'u-me', true)}
            />
            <Divider />
            {[
              ['KAKAO', '카카오로 계속하기'],
              ['GOOGLE', 'Google로 계속하기'],
              ['NAVER', '네이버로 계속하기'],
            ].map(([provider, label]) => (
              <Button
                key={provider}
                label={`${label}${a.oauthProviders[provider as 'KAKAO' | 'GOOGLE' | 'NAVER'] ? '' : ' · 설정 필요'}`}
                kind="secondary"
                loading={a.busy}
                disabled={!a.oauthProviders[provider as 'KAKAO' | 'GOOGLE' | 'NAVER']}
                onPress={() => a.socialLogin(provider as 'KAKAO' | 'GOOGLE' | 'NAVER')}
              />
            ))}
            <Txt size={12} color={c.secondary} style={{ textAlign: 'center' }}>
              소셜 로그인은 서비스 연결 후 이용할 수 있어요.
            </Txt>
          </Stack>
          <Button label="처음으로" kind="ghost" onPress={() => setStage('intro')} />
        </>
      )}
    </ScrollView>
  );
}
export function Home() {
  const a = useApp(), d = a.data!;
  const [buyerLocation, setBuyerLocation] = useState({ latitude: 37.5445, longitude: 127.0557 });
  const [locationLabel, setLocationLabel] = useState('성수동');
  const places = d.places.slice().sort((left, right) => right.visitors - left.visitors);
  const cities = [...new Set(places.map((place) => place.city))].slice(0, 8).map((city) => ({
    city,
    place: places.find((place) => place.city === city)!,
    travelers: new Set(d.trips.filter((trip) => trip.endDate >= new Date().toISOString().slice(0, 10) && (trip.destinationAreas?.includes(city) || trip.destinationCity === city || trip.placeIds.some((id) => d.places.find((p) => p.id === id)?.city === city))).map((trip) => trip.travelerId)).size,
  }));
  const trips = d.trips.filter((item) => item.travelerId === d.me.id);
  const trip = trips.find((item) => item.id === a.route.tripId) || trips.at(-1);
  const bundles = trip ? groupForTrip(d, trip) : [];
  const availableRequests = bundles.reduce((sum, bundle) => sum + bundle.requests.length, 0);
  const availableReward = bundles.reduce((sum, bundle) => sum + bundle.requests.reduce((amount, request) => amount + (request.requestedReward || 0), 0), 0);
  const pendingRewards = bundles.some((bundle) => bundle.requests.some((request) => request.requestedReward === undefined));
  const tripCities = trip ? trip.destinationAreas || [...new Set(trip.placeIds.map((id) => d.places.find((place) => place.id === id)?.city).filter(Boolean))] : [];
  const featured = d.requests.find((request) => request.productName.includes('치이카와'));
  const nearbyTravelers = travelerPresence.map((presence) => ({
    ...presence, distance: kmBetween(buyerLocation, presence),
    user: d.users.find((user) => user.id === presence.userId),
    trip: d.trips.find((item) => item.travelerId === presence.userId && item.endDate >= new Date().toISOString().slice(0, 10)),
  })).filter((item) => item.user && item.trip && item.distance <= 2).sort((left, right) => left.distance - right.distance);
  const locate = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return a.notify('위치 권한을 허용하면 가까운 여행을 찾을 수 있어요.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setBuyerLocation(current.coords); setLocationLabel('현재 위치');
    } catch { a.notify('현재 위치를 확인하지 못했어요. 위치 권한을 확인해주세요.'); }
  };
  const recentPlaces = readRecentPlaces().map((id) => d.places.find((place) => place.id === id)).filter((place): place is Place => Boolean(place));
  const openPlace = (place: Place) => { rememberPlace(place.id); a.nav('place', { id: place.id }); };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 28 }}>
    <Row style={{ justifyContent: 'space-between' }}>
      <Row style={{ gap: 8 }}><Logo size={32} /><Txt size={23} weight="800">모아</Txt><Badge bg={c.lilac} color={c.secondary}>체험</Badge></Row>
      <Row style={{ gap: 4 }}><Txt size={12} color={c.secondary}>{a.role === 'buyer' ? '부탁하기 모드' : '여행하기 모드'}</Txt><IconButton icon={Bell} label="알림" onPress={() => a.nav('notifications')} /></Row>
    </Row>
    {a.role === 'buyer' ? <>
      <View style={{ gap: 6 }}><Txt size={28} weight="800">어디에서 가져다드릴까요?</Txt><Txt size={14} color={c.secondary}>그곳에 가는 여행자에게 부탁해보세요.</Txt></View>
      <View>
        <Section title="요즘 떠나는 곳" action="모두 보기" onPress={() => a.tab('search')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {cities.map(({ city, place, travelers }) => {
            const photo = getPlacePhoto(place);
            return <View key={city} style={{ width: 154 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={city + ' 여행 둘러보기'} onPress={() => a.nav('search', { placeId: place.id })} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                <View style={{ height: 132, borderRadius: 18, overflow: 'hidden', backgroundColor: c.mint }}>{photo && <Image source={photo.source} accessibilityLabel={photo.label + ' 대표 풍경 사진'} style={{ width: '100%', height: '100%' }} />}</View>
                <Txt size={18} weight="700" style={{ marginTop: 10 }}>{city}</Txt>
                <Txt size={12} color={c.secondary}>{travelers ? travelers + '명 여행 예정 · 예시' : '장소 둘러보기'}</Txt>
              </Pressable>
              {photo && <PhotoCredit place={place} />}
            </View>;
          })}
        </ScrollView>
      </View>
      <View style={{ padding: 18, gap: 12, borderRadius: 18, backgroundColor: c.paper }}>
        <Row><View style={{ flex: 1 }}><Txt size={17} weight="700">찾는 물건이 있나요?</Txt><Txt size={13} color={c.secondary}>링크나 사진만 보내주세요.</Txt></View><ShoppingBag size={24} color={c.green} /></Row>
        <Row><Button label="링크로 찾기" icon={Link} style={{ flex: 1 }} onPress={() => a.nav('request-form', { method: 'link' })} /><Button label="사진으로 찾기" icon={ScanLine} kind="secondary" style={{ flex: 1 }} onPress={() => a.nav('request-form', { method: 'photo' })} /></Row>
      </View>
      <View>
        <Section title="우리 동네에서 출발해요" subtitle={locationLabel + ' · 반경 2km · 여행자 위치 예시'} action="위치 확인" onPress={() => void locate()} />
        {nearbyTravelers.map(({ user, trip: nearbyTrip, distance }) => user && nearbyTrip && <Pressable key={user.id} accessibilityRole="button" accessibilityLabel={user.nickname + '님의 여행 보기'} onPress={() => a.nav('profile', { id: user.id })} style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: c.border }}>
          <Row><Avatar user={user} size={44} /><View style={{ flex: 1 }}><Txt size={16} weight="600">{user.nickname} · {nearbyTrip.destinationCity}</Txt><Txt size={13} color={c.secondary}>{shortDate(nearbyTrip.startDate)} – {shortDate(nearbyTrip.endDate)} · {distance.toFixed(1)}km 예시</Txt></View><ChevronRight size={18} color={c.muted} /></Row>
        </Pressable>)}
        {!nearbyTravelers.length && <Txt color={c.secondary}>이 위치 근처에는 공개된 예시 여행이 없어요.</Txt>}
      </View>
      <View>
        <Section title="부탁이 모이는 장소" action="모두 보기" onPress={() => a.tab('search')} />
        <Stack gap={12}>{places.slice(0, 3).map((place) => <PlaceCard key={place.id} variant="list" place={place} onPress={() => openPlace(place)} />)}</Stack>
      </View>
      {!!recentPlaces.length && <View><Section title="최근 본 장소" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{recentPlaces.map((place) => <Chip key={place.id} label={place.name} onPress={() => openPlace(place)} />)}</ScrollView></View>}
      {featured && <View><Section title="이런 부탁도 있어요" /><ProductRow request={featured} krw onPress={() => a.nav('request', { id: featured.id })} /></View>}
    </> : trip ? <>
      <View style={{ gap: 6 }}><Txt size={13} color={c.secondary}>{d.me.nickname}님의 이번 여행</Txt><Txt size={28} weight="800">{tripCities.join(' · ') || trip.destinationCity}</Txt><Row><Txt size={14} color={c.secondary}>{shortDate(trip.startDate)} – {shortDate(trip.endDate)}</Txt><Pressable accessibilityRole="button" accessibilityLabel="일정 관리" onPress={() => a.nav('trips')} style={{ padding: 10 }}><Txt size={13} color={c.darkGreen}>일정 관리</Txt></Pressable></Row></View>
      <View style={{ padding: 22, borderRadius: 20, backgroundColor: c.mint, gap: 18 }}>
        <Txt size={14} color={c.darkGreen}>가는 길에 받을 수 있는 보상</Txt>
        <Txt size={30} weight="800">{availableReward ? money(availableReward) : '부탁에서 확인해요'}</Txt>
        <Row style={{ justifyContent: 'space-between' }}><Txt size={14} color={c.secondary}>{bundles.length}곳 · 부탁 {availableRequests}건</Txt><Txt size={12} color={c.secondary}>{pendingRewards ? '보상 미정 부탁 포함' : '등록된 보상 합계'}</Txt></Row>
        <Button label="내 동선의 부탁 보기" onPress={() => bundles[0] ? a.nav('bundle', { placeId: bundles[0].place.id, tripId: trip.id }) : a.tab('search')} />
      </View>
      <View><Section title="한 곳에서 한 번에" action="일정 추가" onPress={() => a.nav('trip-form')} />
        {bundles.map((bundle) => {
          const reward = bundle.requests.reduce((sum, request) => sum + (request.requestedReward || 0), 0);
          return <Pressable key={bundle.place.id} accessibilityRole="button" accessibilityLabel={bundle.place.name + ' 부탁 ' + bundle.requests.length + '건 · 상품 ' + bundle.items + '개 보기'} onPress={() => a.nav('bundle', { placeId: bundle.place.id, tripId: trip.id })} style={({ pressed }) => ({ padding: 18, borderRadius: 18, backgroundColor: c.paper, marginBottom: 12, opacity: pressed ? 0.75 : 1 })}>
            <Row><View style={{ flex: 1, gap: 5 }}><Txt size={17} weight="700">{bundle.place.name}</Txt><Txt size={13} color={c.secondary}>부탁 {bundle.requests.length}건 · 상품 {bundle.items}개</Txt></View><ChevronRight size={18} color={c.muted} /></Row>
            <Row style={{ marginTop: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}><Badge bg={c.lilac} color={c.secondary}>추가 이동 +{bundle.extraMinutes}분 · 예시</Badge><Txt size={16} weight="700" color={c.darkGreen}>{reward ? money(reward) : '보상 확인'}</Txt></Row>
          </Pressable>;
        })}
        {!bundles.length && <Empty title="일정에 맞는 부탁을 기다려요" body="방문 예정지를 더하면 다른 부탁도 찾을 수 있어요." action="여행 일정 보기" onPress={() => a.nav('trips')} />}
      </View>
    </> : <Stack gap={20}><Txt size={28} weight="800">다음 여행은 어디인가요?</Txt><Txt color={c.secondary}>방문할 곳을 알려주면 같은 장소의 부탁을 모아드려요.</Txt><Button label="여행 일정 등록" icon={Plane} onPress={() => a.nav('trip-form')} /></Stack>}
  </ScrollView>;
}

export function SearchScreen() {
  const a = useApp(),
    d = a.data!;
  const initialPlace = d.places.find((place) => place.id === a.route.placeId);
  const [query, setQuery] = useState(''),
    [country, setCountry] = useState<DestinationCountry>(initialPlace?.country || 'ALL'),
    [cities, setCities] = useState<string[]>(initialPlace ? [initialPlace.city] : []),
    [view, setView] = useState('목록'),
    [resultsWidth, setResultsWidth] = useState(0),
    [selected, setSelected] = useState<Place | null>(null);
  const q = query.trim().toLowerCase();
  const match = (text: string) => text.toLowerCase().includes(q);
  const places = d.places.filter(
    (p) =>
      (country === 'ALL' || p.country === country) && (!cities.length || cities.includes(p.city)) &&
      match(`${countryName(p.country)} ${p.name} ${p.englishName} ${p.city} ${p.region} ${p.tags.join(' ')}`),
  );
  const requests = d.requests.filter(
    (r) =>
      (country === 'ALL' || r.country === country) && (!cities.length || cities.includes(r.city)) && match(`${countryName(r.country)} ${r.productName} ${r.city} ${r.storeName}`),
  );
  const trips = d.trips.filter(
    (t) =>
      q &&
      (country === 'ALL' || t.destinationCountry === country) &&
      (!cities.length || t.placeIds.some((id) => cities.includes(d.places.find((p) => p.id === id)?.city || ''))) &&
      match(
        `${t.departureCity} ${t.destinationCity} ${countryName(t.departureCountry)} ${countryName(t.destinationCountry)} ${t.placeIds.map((id) => d.places.find((p) => p.id === id)?.city).join(' ')}`,
      ),
  );
  const select = (p: Place) => {
    if (q) a.mutate('/searches', { query });
    rememberPlace(p.id);
    a.nav('place', { id: p.id });
  };
  return (
    <Page title="둘러보기" backLabel="이전으로">
      <SearchField
        label="장소 또는 상품 검색"
        value={query}
        onChange={setQuery}
        placeholder="도시, 매장, 갖고 싶은 물건"
      />
      <DestinationPicker country={country} cities={cities} allowAll onChange={(next, selectedCities) => { setCountry(next); setCities(selectedCities); setSelected(null); }} />
      {!q && d.searches.length > 0 && (
        <Row style={{ flexWrap: 'wrap' }}>
          <Txt size={12} color={c.secondary}>
            최근 검색
          </Txt>
          {d.searches
            .slice()
            .reverse()
            .map((s) => (
              <Chip key={s.id} label={s.query} onPress={() => setQuery(s.query)} />
            ))}
        </Row>
      )}
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt size={20} weight="700">
          장소 {places.length}곳
        </Txt>
        <SectionTabs items={['목록', '지도']} value={view} onChange={setView} />
      </Row>
      {view === '지도' ? (
        <>
          <RouteMap places={places} selected={(selected || places[0])?.id} onSelect={setSelected} />
          {(selected || places[0]) && <PlaceCard variant="list" place={selected || places[0]} onPress={() => select(selected || places[0])} />}
        </>
      ) : (
        <View
          onLayout={(event) => setResultsWidth(event.nativeEvent.layout.width)}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
        >
          {places.map((p) => (
            <View key={p.id} style={{ width: resultsWidth >= 720 ? (resultsWidth - 12) / 2 : '100%' }}>
              <PlaceCard variant="list" place={p} onPress={() => select(p)} />
            </View>
          ))}
        </View>
      )}
      {!places.length && !requests.length && !trips.length && (
        <Empty
          title="아직 찾는 곳이 없어요"
          body="다른 도시나 상품명으로 검색해보세요."
          action="검색 초기화"
          onPress={() => {
            setQuery('');
            setCountry('ALL');
            setCities([]);
            setSelected(null);
          }}
        />
      )}
      {q.length > 0 && requests.length > 0 && (
        <View>
          <Section title={`상품 요청 ${requests.length}건`} />
          {requests.map((r) => (
            <ProductRow
              key={r.id}
              request={r}
              krw={a.role === 'buyer'}
              onPress={() => a.nav('request', { id: r.id })}
            />
          ))}
        </View>
      )}
      {trips.length > 0 && (
        <View>
          <Section title="이 경로로 가는 여행자" />
          {trips.map((t) => (
            <Card key={t.id} style={{ marginBottom: 10 }}>
              <Stack gap={12}>
                <Txt weight="700">
                  {t.departureCity} → {t.destinationCity}
                </Txt>
                <Txt size={13}>
                  {shortDate(t.startDate)} — {shortDate(t.endDate)}
                </Txt>
                <Button
                  small
                  label="여행자 보기"
                  kind="secondary"
                  onPress={() => a.nav('profile', { id: t.travelerId })}
                />
              </Stack>
            </Card>
          ))}
        </View>
      )}
    </Page>
  );
}
export function PlaceScreen() {
  const a = useApp(), d = a.data!, p = d.places.find((item) => item.id === a.route.id);
  if (!p) return <Page title="장소"><Empty title="이 장소를 찾지 못했어요" action="장소 둘러보기" onPress={() => a.tab('search')} /></Page>;
  const requests = d.requests.filter((request) => request.placeId === p.id);
  const trips = d.trips.filter((trip) => trip.placeIds.includes(p.id) && trip.endDate >= new Date().toISOString().slice(0, 10));
  const myTrip = trips.find((trip) => trip.travelerId === d.me.id);
  const primary = () => a.role === 'buyer' ? a.nav('request-form', { placeId: p.id }) : myTrip ? a.nav('bundle', { placeId: p.id, tripId: myTrip.id }) : a.nav('trip-form', { placeId: p.id });
  return <Page title={p.city + ' · ' + p.region} footer={<Button label={a.role === 'buyer' ? '여기에서 부탁하기' : myTrip ? '이곳의 부탁 가져오기' : '방문 일정 등록하기'} onPress={primary} />}>
    <View style={{ borderRadius: 18, overflow: 'hidden' }}><PlaceCover place={p} /><PhotoCredit place={p} /></View>
    <Stack gap={10}>
      <Row><Txt size={25} weight="800" style={{ flex: 1 }}>{p.name}</Txt><IconButton icon={Heart} label={d.favorites.some((favorite) => favorite.placeId === p.id) ? '관심 장소 해제' : '관심 장소 저장'} onPress={() => a.mutate('/favorites/' + p.id, {})} /></Row>
      <Txt size={14} color={c.secondary}>{p.description}</Txt>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>{p.tags.map((tag) => <Badge key={tag} bg={c.paper} color={c.secondary}>{tag}</Badge>)}</Row>
    </Stack>
    <View style={{ paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border }}>
      <Row style={{ justifyContent: 'space-between' }}>{[['방문 예정', p.visitors + '명'], ['모인 부탁', p.requestCount + '건'], ['평균 보상', money(p.averageReward)]].map(([label, value]) => <View key={label} style={{ gap: 6 }}><Txt size={12} color={c.secondary}>{label}</Txt><Txt size={18} weight="700">{value}</Txt></View>)}</Row>
      <Txt size={11} color={c.muted} style={{ marginTop: 12 }}>체험용 예시 수치예요.</Txt>
    </View>
    {!!trips.length && <View><Section title="이곳에 가는 여행자" /><Stack gap={8}>{trips.slice(0, 3).map((trip) => {
      const user = d.users.find((person) => person.id === trip.travelerId);
      return user ? <Pressable key={trip.id} accessibilityRole="button" accessibilityLabel={user.nickname + '님의 일정 보기'} onPress={() => a.nav('profile', { id: user.id })} style={{ paddingVertical: 10 }}><Row><Avatar user={user} /><View style={{ flex: 1 }}><Txt size={15} weight="600">{user.nickname}</Txt><Txt size={13} color={c.secondary}>{shortDate(trip.startDate)} – {shortDate(trip.endDate)}</Txt></View><Txt size={13} color={c.darkGreen}>일정 보기</Txt></Row></Pressable> : null;
    })}</Stack></View>}
    <View><Section title="한 곳에 모인 부탁" />{requests.map((request) => <ProductRow key={request.id} request={request} krw onPress={() => a.nav('request', { id: request.id })} />)}{!requests.length && <Empty title="아직 이 장소의 부탁이 없어요" body="첫 번째 부탁을 남겨보세요." />}</View>
    <View><Section title="찾아가는 곳" /><RouteMap places={[p]} selected={p.id} onSelect={() => {}} /></View>
    <Txt size={13} color={c.secondary}>재고와 구매 제한은 방문 전 매장에 확인해주세요.</Txt>
  </Page>;
}
export function CreateScreen() {
  const a = useApp();
  return (
    <Page title="무엇을 모아볼까요?" back={false}>
      <Stack gap={10}>
        <Txt size={28} weight="800">
          하나의 계정,{'\n'}두 가지 가능성.
        </Txt>
        <Txt color={c.secondary}>갖고 싶은 마음도, 떠나는 일정도.</Txt>
      </Stack>
      <Card style={{ backgroundColor: c.mint }}>
        <Stack>
          <ShoppingBag size={38} color={c.green} />
          <Txt size={23} weight="700">
            이거 부탁하기
          </Txt>
          <Txt color={c.secondary}>상품 링크 또는 사진 한 장으로 시작해요.</Txt>
          <Button label="구매 요청 등록" onPress={() => a.nav('request-form')} />
        </Stack>
      </Card>
      <Card style={{ backgroundColor: c.lilac }}>
        <Stack>
          <Plane size={38} color="#6B598E" />
          <Txt size={23} weight="700">
            가는 김에 가져올게요
          </Txt>
          <Txt color={c.secondary}>여행과 방문 장소를 알려주세요.</Txt>
          <Button label="여행 일정 등록" kind="secondary" onPress={() => a.nav('trip-form')} />
        </Stack>
      </Card>
    </Page>
  );
}

import React, { useState } from 'react';
import * as Location from 'expo-location';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  Compass,
  Heart,
  Layers,
  Link,
  MapPin,
  Navigation,
  Plane,
  Plus,
  ScanLine,
  ShoppingBag,
  Ticket,
  Wallet,
} from 'lucide-react-native';
import { groupForTrip, money, Place, shortDate, countryName, quote } from '@moa/domain';
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
  Field,
  IconButton,
  Notice,
  Page,
  Row,
  Section,
  Stack,
  Txt,
} from '../components/ui';
import { Avatar, AvatarStack, Logo, PlaceCard, ProductArt, ProductRow, RouteMap } from '../components/visuals';

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
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 28,
        paddingTop: 44,
        gap: 30,
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
            style={{ height: 238, borderRadius: 30, overflow: 'hidden', backgroundColor: c.mint }}
          >
            <Image
              source={require('../../assets/japan.jpg')}
              style={{ height: '100%', width: '100%' }}
            />
            <View style={{ position: 'absolute', inset: 0, backgroundColor: '#17366F24' }} />
            <View
              style={{
                position: 'absolute',
                left: 20,
                bottom: 20,
                right: 20,
                padding: 15,
                borderRadius: 18,
                backgroundColor: c.paper,
              }}
            >
              <Row>
                <View style={{ padding: 10, backgroundColor: c.lime, borderRadius: 14 }}>
                  <Plane size={24} color={c.darkGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={12} color={c.secondary}>
                    내 여행과 누군가의 위시리스트
                  </Txt>
                  <Row style={{ gap: 4 }}>
                    <Txt size={18} weight="700">
                      서울에서, 도쿄로
                    </Txt>
                    <ArrowUpRight size={15} color={c.ink} />
                  </Row>
                </View>
                <ShoppingBag size={24} color={c.green} />
              </Row>
            </View>
          </View>
          <Stack gap={8}>
            <Txt size={39} weight="800" style={{ lineHeight: 49 }}>
              가는 김에,{'\n'}하나 더.
            </Txt>
            <Txt size={16} color={c.secondary}>
              이미 그곳에 가는 사람과{'\n'}꼭 갖고 싶은 마음을 연결해요.
            </Txt>
          </Stack>
          <Stack gap={12}>
            <Button
              label="사고 싶어요"
              icon={ShoppingBag}
              onPress={() => {
                a.setRole('buyer');
                setStage('login');
              }}
            />
            <Button
              label="가져올게요"
              kind="secondary"
              icon={Plane}
              onPress={() => {
                a.setRole('traveler');
                setStage('login');
              }}
            />
            <Txt size={12} color={c.secondary} style={{ textAlign: 'center' }}>
              한 계정으로 언제든 자유롭게 바꿀 수 있어요.
            </Txt>
          </Stack>
        </>
      ) : (
        <>
          <Stack gap={10}>
            <Badge>반가워요, 모아예요</Badge>
            <Txt size={31} weight="800">
              작은 부탁이{'\n'}여행을 만나는 곳.
            </Txt>
            <Txt color={c.secondary}>원하는 방식으로 로그인 흐름을 체험해보세요.</Txt>
          </Stack>
          <Notice>
            지금은 예시 계정으로 시작해요. 실제 휴대폰 인증·소셜 로그인·결제는 발생하지 않아요.
          </Notice>
          <Stack gap={12}>
            <Button
              testID="start-demo"
              label="가입 없이 체험 시작"
              loading={a.busy}
              onPress={() => a.login()}
            />
            <Divider />
            {[
              ['KAKAO', '카카오로 계속하기'],
              ['APPLE', 'Apple로 계속하기'],
              ['GOOGLE', 'Google로 계속하기'],
              ['PHONE', '휴대폰으로 계속하기'],
            ].map(([provider, label]) => (
              <Button
                key={provider}
                label={label}
                kind="secondary"
                loading={a.busy}
                onPress={() => a.login(provider)}
              />
            ))}
          </Stack>
          <Button label="이전으로" kind="ghost" onPress={() => setStage('intro')} />
        </>
      )}
    </ScrollView>
  );
}
export function Home() {
  const a = useApp(),
    d = a.data!;
  const [country, setCountry] = useState<DestinationCountry>('ALL'),
    [cities, setCities] = useState<string[]>([]),
    [nearbyDismissed, setNearbyDismissed] = useState(false),
    [buyerLocation, setBuyerLocation] = useState({ latitude: 37.5445, longitude: 127.0557 }),
    [locationLabel, setLocationLabel] = useState('성수동 예시 위치');
  const wide = useWindowDimensions().width >= 750;
  const places = d.places.filter((p) => (country === 'ALL' || p.country === country) && (!cities.length || cities.includes(p.city)));
  const trips = d.trips.filter((t) => t.travelerId === d.me.id),
    trip = trips.find((t) => t.id === a.route.tripId) || trips.at(-1);
  const bundles = trip ? groupForTrip(d, trip) : [];
  const reward = bundles.reduce((s, b) => s + b.reward, 0);
  const featured =
    d.requests.find((request) => request.productName.includes('치이카와')) || d.requests[0];
  const featuredKrw = featured
    ? quote({ ...featured, quantity: 1 }, 0, featured.transport).productPrice
    : 0;
  const nearby = bundles[0];
  const tripCities = trip ? [...new Set(trip.placeIds.map((id) => d.places.find((place) => place.id === id)?.city).filter(Boolean))] : [];
  const nearbyTravelers = travelerPresence.map((presence) => ({
    ...presence,
    distance: kmBetween(buyerLocation, presence),
    user: d.users.find((user) => user.id === presence.userId),
    trip: d.trips.find((item) => item.travelerId === presence.userId),
  })).filter((item) => item.user && item.trip && item.distance <= 2).sort((x, y) => x.distance - y.distance);
  const locate = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { a.notify('위치 권한을 허용하면 반경 2km의 여행자를 찾아드려요.'); return; }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setBuyerLocation(current.coords);
      setLocationLabel('현재 위치');
    } catch {
      a.notify('현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해주세요.');
    }
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 36, gap: 26 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 9 }}>
          <Logo size={34} />
          <Txt size={28} weight="800" color={c.green}>
            모아
          </Txt>
        </Row>
        <Row style={{ gap: 2 }}>
          <Badge bg={c.paper} color={c.secondary}>
            체험 모드
          </Badge>
          <View>
            <IconButton icon={Bell} label="알림" onPress={() => a.nav('notifications')} />
            {d.notifications.some((n) => !n.read) && (
              <View
                style={{
                  position: 'absolute',
                  right: 11,
                  top: 9,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: c.green,
                }}
              />
            )}
          </View>
        </Row>
      </Row>
      <Row style={{ backgroundColor: c.mint, padding: 5, borderRadius: 18, gap: 5 }}>
        {[
          ['buyer', '사고 싶어요', ShoppingBag],
          ['traveler', '가져올게요', Plane],
        ].map(([role, label, Icon]) => {
          const I = Icon as typeof Plane;
          return (
            <Pressable
              key={role as string}
              accessibilityRole="button"
              accessibilityState={{ selected: a.role === role }}
              onPress={() => a.setRole(role as 'buyer' | 'traveler')}
              style={{
                flex: 1,
                minHeight: 45,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 14,
                backgroundColor: a.role === role ? c.paper : 'transparent',
              }}
            >
              <Row style={{ gap: 8 }}>
                <I size={17} color={a.role === role ? c.green : c.secondary} />
                <Txt size={15} weight="700" color={a.role === role ? c.ink : c.secondary}>
                  {label as string}
                </Txt>
              </Row>
            </Pressable>
          );
        })}
      </Row>
      {a.role === 'buyer' ? (
        <>
          <View
            style={{
              backgroundColor: c.paper,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 26,
              padding: 22,
              gap: 16,
            }}
          >
            <Stack gap={6}>
              <Badge>AI 상품 찾기</Badge>
              <Txt size={27} weight="800" style={{ lineHeight: 36 }}>
                찾으시는 물건을{`\n`}바로 보내주세요
              </Txt>
              <Txt size={14} color={c.secondary}>
                링크를 붙여넣거나 사진을 보내면 글자와 상품을 함께 인식해 찾아드려요.
              </Txt>
            </Stack>
            <Row style={{ gap: 10 }}>
              <Button
                small
                label="링크 붙여넣기"
                icon={Link}
                style={{ flex: 1 }}
                onPress={() => a.nav('request-form', { method: 'link' })}
              />
              <Button
                small
                kind="secondary"
                label="사진으로 찾기"
                icon={ScanLine}
                style={{ flex: 1 }}
                onPress={() => a.nav('request-form', { method: 'photo' })}
              />
            </Row>
          </View>
          <Card style={{ backgroundColor: c.mint }}>
            <Stack gap={14}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}><Badge>내 주변 2km · {locationLabel}</Badge><Txt size={21} weight="800" style={{ marginTop: 8 }}>근처에 이런 여행을 가는 사람이 있어요</Txt></View>
                <Navigation size={27} color={c.green} />
              </Row>
              {nearbyTravelers.slice(0, 2).map(({ user, trip: nearbyTrip, distance }) => user && nearbyTrip && (
                <View key={user.id} style={{ backgroundColor: c.paper, borderRadius: 16, padding: 14, gap: 11 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${user.nickname} 여행자 보기`} onPress={() => a.nav('profile', { id: user.id })}>
                    <Row><Avatar user={user} size={44} /><View style={{ flex: 1 }}><Txt weight="700">{user.nickname} · {distance.toFixed(1)}km</Txt><Txt size={13} color={c.secondary}>{[...new Set(nearbyTrip.placeIds.map((id) => d.places.find((place) => place.id === id)?.city).filter(Boolean))].join(' · ')} 여행 예정</Txt></View><ChevronRight size={18} color={c.muted} /></Row>
                  </Pressable>
                  <Button small kind="secondary" label="이 여행에 부탁하기" onPress={() => a.nav('request-form', { method: 'link', placeId: nearbyTrip.placeIds[0] })} />
                </View>
              ))}
              {!nearbyTravelers.length && <Txt size={13} color={c.secondary}>반경 2km 안에서 공개된 여행 일정을 찾지 못했어요.</Txt>}
              <Button small kind="secondary" label="현재 위치로 다시 찾기" icon={Navigation} onPress={() => void locate()} />
              <Txt size={11} color={c.secondary}>여행자가 주변 공개를 선택한 경우에만 보여요. 예시 위치는 실제 위치가 아니에요.</Txt>
            </Stack>
          </Card>
          <Stack
            gap={18}
            style={{
              backgroundColor: c.darkGreen,
              borderRadius: 28,
              padding: 22,
              overflow: 'hidden',
            }}
          >
            <Row style={{ alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Badge bg="#2E5798" color="#EAF2FF">
                  인기 많은 상품을 보여드릴게요
                </Badge>
                <Txt size={26} weight="800" color="white" style={{ lineHeight: 34 }}>
                  {featured?.productName || '도쿄 한정 캐릭터 키링'}
                </Txt>
                <Txt size={20} weight="800" color={c.lime}>
                  약 {money(featuredKrw)}
                </Txt>
                <Txt size={12} color="#C9D9F7">
                  원화 환산 상품가 · 데모 환율 기준
                </Txt>
              </View>
              <ProductArt art="keyring" featured size={112} />
            </Row>
            <Button
              small
              kind="lime"
              label="이 상품 부탁하기"
              icon={ShoppingBag}
              onPress={() =>
                a.nav('request-form', { id: featured?.id, placeId: featured?.placeId })
              }
            />
          </Stack>
          <View>
            <Section
              title="지금, 이곳으로 가요"
              subtitle="당신의 위시리스트와 여행이 만나는 곳"
              action="전체 보기"
              onPress={() => a.tab('search')}
            />
            <View style={{ paddingBottom: 16 }}>
              <DestinationPicker country={country} cities={cities} allowAll onChange={(next, selectedCities) => { setCountry(next); setCities(selectedCities); }} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 14, paddingBottom: 3 }}
            >
              {places.map((p) => (
                <View key={p.id} style={{ width: wide ? 280 : 260 }}>
                  <PlaceCard
                    place={p}
                    onPress={() => a.nav('place', { id: p.id })}
                    favorite={d.favorites.some((f) => f.placeId === p.id)}
                    onFavorite={() => a.mutate(`/favorites/${p.id}`, {})}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={{ backgroundColor: c.lilac, padding: 21, borderRadius: 22 }}>
            <Row style={{ alignItems: 'flex-start' }}>
              <Layers size={26} color={c.green} />
              <Stack gap={6} style={{ flex: 1 }}>
                <Txt size={18} weight="700">
                  한 번의 방문, 여러 개의 부탁.
                </Txt>
                <Txt size={13} color={c.secondary}>
                  같은 장소의 요청을 모으면{'\n'}여행자도, 부탁한 사람도 더 가벼워져요.
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => a.setRole('traveler')}
                  style={{ paddingTop: 7 }}
                >
                  <Row style={{ gap: 4 }}>
                    <Txt size={13} weight="700">
                      내 여행으로 얼마나 벌 수 있을까?
                    </Txt>
                    <ArrowRight size={14} />
                  </Row>
                </Pressable>
              </Stack>
            </Row>
          </View>
          <View>
            <Section title="요즘 모이는 부탁" subtitle="일반 상품 목록 대신, 가는 곳과 함께 봐요" />
            {d.requests
              .filter((r) => ['REQUESTED', 'OFFER_RECEIVED'].includes(r.status))
              .slice(0, 4)
              .map((r) => (
                <ProductRow
                  key={r.id}
                  request={r}
                  krw
                  onPress={() => a.nav('request', { id: r.id })}
                />
              ))}
          </View>
        </>
      ) : (
        <>
          {trip && nearby && !nearbyDismissed && (
            <View
              accessibilityRole="alert"
              style={{
                backgroundColor: c.green,
                borderRadius: 28,
                padding: 22,
                gap: 18,
                shadowColor: c.green,
                shadowOpacity: 0.24,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 4,
              }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge bg="#FFFFFF24" color="white">
                  근처 심부름 알림 · 동선 +{nearby.extraMinutes}분
                </Badge>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="근처 심부름 알림 나중에 보기"
                  onPress={() => setNearbyDismissed(true)}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Txt size={13} color="#DCE8FF">
                    나중에
                  </Txt>
                </Pressable>
              </Row>
              <Row style={{ alignItems: 'flex-start', gap: 14 }}>
                <View style={{ backgroundColor: 'white', borderRadius: 18, padding: 13 }}>
                  <Navigation size={27} color={c.green} fill={c.mint} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Txt size={23} weight="800" color="white">
                    {nearby.place.name} 근처를 지나가요
                  </Txt>
                  <Txt size={15} color="#EAF2FF">
                    여기서 심부름 {nearby.requests.length}건을 하면 {money(nearby.reward)}을 받을 수
                    있어요. 수락하시겠어요?
                  </Txt>
                </View>
              </Row>
              <Button
                kind="lime"
                label="네, 심부름을 확인할게요"
                onPress={() =>
                  a.nav('bundle', { placeId: nearby.place.id, tripId: trip.id })
                }
              />
              <Txt size={11} color="#DCE8FF" style={{ textAlign: 'center' }}>
                현재 위치 기반 알림은 체험용 예시예요.
              </Txt>
            </View>
          )}
          <Stack gap={8}>
            <Txt size={30} weight="800">
              내가 가는 길에서,{'\n'}여행비를 가볍게.
            </Txt>
            <Txt color={c.secondary}>원래 가는 곳의 부탁을 한 번에 모아보세요.</Txt>
          </Stack>
          {trip ? (
            <>
              <View
                style={{ backgroundColor: c.darkGreen, borderRadius: 26, padding: 24, gap: 20 }}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Badge bg="#2E5798" color="#EAF2FF">
                    나의 여행
                  </Badge>
                  <Pressable accessibilityRole="button" onPress={() => a.nav('trips')}>
                    <Txt size={13} color="#D7E4FF">
                      일정 보기 ›
                    </Txt>
                  </Pressable>
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt size={23} weight="700" color="white">
                    {trip.departureCity}
                  </Txt>
                  <Plane color={c.lime} size={24} />
                  <Txt size={18} weight="700" color="white" style={{ textAlign: 'right', flex: 1 }}>
                    {tripCities.join(' · ') || trip.destinationCity}
                  </Txt>
                </Row>
                <Txt size={13} color="#C9D9F7">
                  {shortDate(trip.startDate)} — {shortDate(trip.endDate)} · {trip.placeIds.length}곳
                  방문 예정
                </Txt>
                <View style={{ height: 1, backgroundColor: '#31558D' }} />
                <Stack gap={5}>
                  <Txt size={13} color="#D7E4FF">
                    동선에서 찾은 예상 보상
                  </Txt>
                  <Txt size={40} weight="800" color={c.lime}>
                    {money(reward)}
                  </Txt>
                  <Txt size={12} color="#C9D9F7">
                    후보 요청 합계 · 수락·구매 확정 전 수익은 미확정
                  </Txt>
                </Stack>
              </View>
              <View>
                <Section
                  title="가는 김에, 묶어서"
                  subtitle="같은 장소에서 여러 부탁을 한 번에"
                  action="일정 추가"
                  onPress={() => a.nav('trip-form')}
                />
                {bundles.length ? (
                  bundles.map((b) => (
                    <Pressable
                      key={b.place.id}
                      accessibilityRole="button"
                      onPress={() => a.nav('bundle', { placeId: b.place.id, tripId: trip.id })}
                      style={{
                        backgroundColor: c.paper,
                        borderRadius: 21,
                        borderWidth: 1,
                        borderColor: c.border,
                        padding: 20,
                        marginBottom: 13,
                      }}
                    >
                      <Stack gap={15}>
                        <Row>
                          <View style={{ backgroundColor: c.mint, padding: 10, borderRadius: 13 }}>
                            <MapPin size={22} color={c.green} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Txt size={17} weight="700">
                              {b.place.name}
                            </Txt>
                            <Txt size={12} color={c.secondary}>
                              동선 추가 +{b.extraMinutes}분 · 예시 추정
                            </Txt>
                          </View>
                          <ChevronRight size={20} color={c.muted} />
                        </Row>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <Row>
                            <Badge>{b.requests.length}건 묶음</Badge>
                            <Txt size={12} color={c.secondary}>
                              {b.items}개 상품
                            </Txt>
                          </Row>
                          <Txt size={21} weight="800" color={c.green}>
                            {money(b.reward)}
                          </Txt>
                        </Row>
                        <Txt size={12} color={c.secondary}>
                          상품 선지출 {money(b.advance)} · 최대 {trip.maxItems}개 선택 가능
                        </Txt>
                      </Stack>
                    </Pressable>
                  ))
                ) : (
                  <Empty
                    title="새로운 요청을 기다려요"
                    body="이미 수락한 부탁은 중복 추천하지 않아요."
                    action="수락한 부탁 보기"
                    onPress={() => a.tab('trades')}
                  />
                )}
              </View>
              <RouteMap
                places={bundles.map((b) => b.place)}
                onSelect={(p) => a.nav('place', { id: p.id })}
              />
            </>
          ) : (
            <Empty
              title="어디로 떠나세요?"
              body="도시와 날짜를 알려주면 동선의 부탁을 모아드려요."
              action="여행 일정 등록"
              onPress={() => a.nav('trip-form')}
            />
          )}
          <Notice>
            상품가격은 먼저 지출하고 구매 확정 뒤 돌려받아요. 보상과 선지출 금액을 함께
            확인해주세요.
          </Notice>
        </>
      )}
      <Txt size={11} color={c.secondary} style={{ textAlign: 'center' }}>
        방문 인원·가격·거래 건수는 모두 예시 데이터예요.
      </Txt>
    </ScrollView>
  );
}
export function SearchScreen() {
  const a = useApp(),
    d = a.data!;
  const [query, setQuery] = useState(''),
    [country, setCountry] = useState<DestinationCountry>('ALL'),
    [cities, setCities] = useState<string[]>([]),
    [view, setView] = useState('목록'),
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
    a.nav('place', { id: p.id });
  };
  return (
    <Page title="어디로 가볼까요?" backLabel="이전으로">
      <Field
        label="상품·도시·매장·여행 경로"
        value={query}
        onChange={setQuery}
        placeholder="일본, 타이베이, 방콕, 키링..."
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
        <Row>
          {['목록', '지도'].map((v) => (
            <Chip key={v} label={v} selected={view === v} onPress={() => setView(v)} />
          ))}
        </Row>
      </Row>
      {view === '지도' ? (
        <>
          <RouteMap places={places} selected={selected?.id} onSelect={setSelected} />
          {selected && <PlaceCard place={selected} onPress={() => select(selected)} />}
        </>
      ) : (
        <View style={{ gap: 16 }}>
          {places.map((p) => (
            <PlaceCard key={p.id} place={p} onPress={() => select(p)} />
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
  const a = useApp(),
    d = a.data!,
    p = d.places.find((x) => x.id === a.route.id);
  if (!p)
    return (
      <Page title="장소">
        <Empty />
      </Page>
    );
  return (
    <Page
      title={p.name}
      footer={
        <Button
          label="여기에서 부탁하기"
          icon={Plus}
          onPress={() => a.nav('request-form', { placeId: p.id })}
        />
      }
    >
      <PlaceCard
        place={p}
        onPress={() => a.nav('request-form', { placeId: p.id })}
        favorite={d.favorites.some((f) => f.placeId === p.id)}
        onFavorite={() => a.mutate(`/favorites/${p.id}`, {})}
      />
      <Stack gap={12}>
        <Txt size={27} weight="800">
          {p.name}
        </Txt>
        <Txt color={c.secondary}>{p.description}</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {p.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </Row>
      </Stack>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          {[
            ['방문 예정', `${p.visitors}명`],
            ['최근 7일 거래', `${p.recentTrades}건`],
            ['평균 보상', money(p.averageReward)],
          ].map(([k, v]) => (
            <Stack key={k} gap={5} style={{ alignItems: 'center' }}>
              <Txt size={12} color={c.secondary}>
                {k}
              </Txt>
              <Txt size={20} weight="700">
                {v}
              </Txt>
            </Stack>
          ))}
        </Row>
        <Txt size={11} color={c.secondary} style={{ marginTop: 12 }}>
          위 수치는 서비스 흐름을 보여주기 위한 예시예요.
        </Txt>
      </Card>
      <RouteMap
        places={[p]}
        selected={p.id}
        onSelect={() => a.notify('실제 지도는 아직 연결되지 않았어요. 위치 미리보기예요.')}
      />
      <View>
        <Section title="이곳에 모인 부탁" />
        {d.requests
          .filter((r) => r.placeId === p.id)
          .map((r) => (
            <ProductRow
              key={r.id}
              request={r}
              krw={a.role === 'buyer'}
              onPress={() => a.nav('request', { id: r.id })}
            />
          ))}
      </View>
      <Notice tone="warning">
        현장 재고·매장 구매 제한은 방문 전에 확인해요. 표시된 장소가 상품 판매나 재고를 보증하지
        않아요.
      </Notice>
    </Page>
  );
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

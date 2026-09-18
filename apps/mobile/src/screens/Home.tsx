import React, { useState } from 'react';
import * as Location from 'expo-location';
import { Image, Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import {
  ArrowRight,
  Bell,
  ChevronRight,
  Heart,
  Link,
  Plane,
  ScanLine,
  ShoppingBag,
  Search,
  MapPin,
  Check,
  ShieldCheck,
  PackageCheck,
  Wallet,
} from 'lucide-react-native';
import Svg, { Circle, Path } from 'react-native-svg';
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
import { Avatar, AvatarStack, Logo, PlaceCard, PlaceCover, ProductArt, ProductRow } from '../components/visuals';
import { PlaneRouteAnimation } from '../components/travel-route';
import { PageTransition } from '../components/motion';
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
  const [otherLogins, setOtherLogins] = useState(false);
  const [loginFormOpen, setLoginFormOpen] = useState(false);
  const [testUsername, setTestUsername] = useState('wasabi');
  const [testPassword, setTestPassword] = useState('h112828!');
  const [testError, setTestError] = useState('');
  const kakaoReady = a.oauthProviders.KAKAO;
  const submitTestLogin = async () => {
    if (testPassword.length < 8 || !/[A-Za-z]/.test(testPassword) || !/[0-9]/.test(testPassword) || !/[^A-Za-z0-9]/.test(testPassword)) {
      setTestError('비밀번호는 8자 이상이며 영문·숫자·특수문자를 포함해야 해요.');
      return;
    }
    setTestError('');
    const ok = await a.testLogin(testUsername, testPassword, true);
    if (!ok) setTestError('아이디 또는 비밀번호를 확인해주세요.');
  };
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 48, paddingBottom: 32, gap: 28, justifyContent: 'center' }}>
      <Logo size={46} />
      <Stack gap={10}><Txt size={30} weight="800">여행에 취향을 싣다.</Txt><Txt size={15} color={c.secondary}>갖고 싶은 마음과 떠나는 여행이 만나요.</Txt></Stack>
      <Stack gap={12}>
        <Txt size={15} weight="600">어떻게 시작할까요?</Txt>
        {([{ role: 'buyer', label: '부탁할게요', detail: '그곳에 가는 사람에게 물건 부탁하기', icon: ShoppingBag }, { role: 'traveler', label: '가져올게요', detail: '내가 가는 길에서 보상받기', icon: Plane }] as const).map(({ role, label, detail, icon: Icon }) => (
          <Pressable key={role} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: a.role === role }} onPress={() => a.setRole(role)} style={{ minHeight: 88, padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: a.role === role ? c.primary : c.border, backgroundColor: c.paper }}>
            <Row><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Icon size={22} color={c.primaryStrong} /></View><Stack gap={3} style={{ flex: 1 }}><Txt size={17} weight="700">{label}</Txt><Txt size={12} color={c.secondary}>{detail}</Txt></Stack>{a.role === role && <Check size={20} color={c.primaryStrong} />}</Row>
          </Pressable>
        ))}
        <Txt size={12} color={c.secondary}>한 계정으로 둘 다 가능해요. 모드는 설정에서 바꿔요.</Txt>
      </Stack>
      {a.error && <Notice tone="error">{a.error}</Notice>}
      <Stack gap={10}>
        {kakaoReady && <Button label="카카오로 계속하기" loading={a.busy} onPress={() => a.socialLogin('KAKAO')} style={{ backgroundColor: '#FEE500' }} kind="secondary" />}
        {!loginFormOpen ? <Button testID="start-demo" label="체험 계정으로 로그인" kind={kakaoReady ? 'secondary' : 'primary'} onPress={() => { setLoginFormOpen(true); setTestError(''); }} /> : <Stack gap={10}>
          <Row style={{ justifyContent: 'space-between' }}><Txt size={20} weight="700">체험 계정 로그인</Txt><Pressable accessibilityRole="button" accessibilityLabel="로그인 입력 닫기" onPress={() => { setLoginFormOpen(false); setTestError(''); }}><Txt size={13} weight="600" color={c.primaryStrong}>뒤로</Txt></Pressable></Row>
          <TextInput value={testUsername} onChangeText={setTestUsername} autoCapitalize="none" autoCorrect={false} placeholder="아이디" placeholderTextColor={c.muted} style={{ minHeight: 52, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, color: c.ink, fontSize: 15 }} />
          <TextInput value={testPassword} onChangeText={setTestPassword} autoCapitalize="none" autoCorrect={false} secureTextEntry placeholder="비밀번호" placeholderTextColor={c.muted} style={{ minHeight: 52, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, color: c.ink, fontSize: 15 }} />
          {testError && <Notice tone="error">{testError}</Notice>}
          <Button label="로그인하기" loading={a.busy} onPress={submitTestLogin} />
          <Txt size={12} color={c.secondary}>비밀번호는 8자 이상 · 영문·숫자·특수문자를 포함해요.</Txt>
        </Stack>}
        <Button label={otherLogins ? '로그인 방법 접기' : '다른 방법으로 계속하기'} kind="ghost" onPress={() => setOtherLogins(!otherLogins)} />
        {otherLogins && <Stack gap={8}>{(['GOOGLE', 'NAVER'] as const).filter((provider) => a.oauthProviders[provider]).map((provider) => <Button key={provider} label={provider === 'GOOGLE' ? 'Google로 계속하기' : '네이버로 계속하기'} kind="secondary" loading={a.busy} onPress={() => a.socialLogin(provider)} />)}{!a.oauthProviders.GOOGLE && !a.oauthProviders.NAVER && <Notice>소셜 로그인은 연결 준비 중이에요. 지금은 체험 계정으로 둘러보세요.</Notice>}</Stack>}
        <Txt size={12} color={c.secondary} style={{ textAlign: 'center' }}>체험에서는 실제 결제나 정산이 발생하지 않아요.</Txt>
      </Stack>
    </ScrollView>
  );
}

const guideSlides = [
  {
    eyebrow: '01 · 부탁하기',
    title: '갖고 싶은 게\n멀리 있나요?',
    body: '링크나 사진 하나로, 그곳에 가는 사람에게 부탁해요.',
    icon: Link,
  },
  {
    eyebrow: '02 · 가는 길에 묶기',
    title: '어차피 가는 여행,\n보상이 따라와요.',
    body: '같은 장소의 부탁을 모아, 원래 가던 길에서 가져와요.',
    icon: Plane,
  },
  {
    eyebrow: '03 · 국내에서 전달',
    title: '잘 받은 뒤,\n안전하게 정산해요.',
    body: '돌아와서 국내 배송이나 직거래로 전달해요.',
    icon: ShoppingBag,
  },
] as const;

/** The first-entry walkthrough also remains available once a member has joined. */
export function GuideScreen({ onComplete }: { onComplete?: () => void }) {
  const a = useApp();
  const [index, setIndex] = useState(0);
  const slide = guideSlides[index];
  const last = index === guideSlides.length - 1;
  const firstEntry = !a.data;
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <Row style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, justifyContent: 'space-between' }}><Logo size={34} /><Txt size={12} color={c.secondary}>여행에 취향을 싣다.</Txt></Row>
      <PageTransition routeKey={`guide-${index}`}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }}>
        <Stack gap={10}><Txt size={12} weight="700" color={c.primaryStrong}>{slide.eyebrow}</Txt><Txt size={32} weight="800">{slide.title}</Txt><Txt size={15} color={c.secondary} style={{ maxWidth: 320 }}>{slide.body}</Txt></Stack>
        <View style={{ minHeight: 280, justifyContent: 'center', paddingVertical: 16 }}>
          {index === 0 ? <View style={{ height: 280, borderRadius: 24, backgroundColor: c.ultraSoft, overflow: 'hidden', alignItems: 'center' }}>
            <Svg width="100%" height="100%" viewBox="0 0 320 280" style={{ position: 'absolute' }}><Path d="M20 220 C160 290 335 140 272 68 C228 16 149 34 141 79" stroke={c.primaryTint} strokeWidth={2} strokeDasharray="4 6" fill="none" /><Circle cx="20" cy="220" r="5" fill={c.primary} /><Circle cx="141" cy="79" r="5" fill={c.primary} /></Svg>
            <View style={{ marginTop: 22, transform: [{ rotate: '-7deg' }], padding: 8, backgroundColor: c.paper, borderRadius: 24 }}><ProductArt featured size={150} /></View>
            <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, padding: 16, borderRadius: 18, backgroundColor: c.paper, borderWidth: 1, borderColor: c.border }}><Row><MapPin size={20} color={c.primaryStrong} /><View style={{ flex: 1 }}><Txt size={12} color={c.secondary}>도쿄역에 가는 사람에게</Txt><Txt size={16} weight="700">이 키링, 부탁해요</Txt></View><ArrowRight size={20} color={c.primaryStrong} /></Row></View>
          </View> : index === 1 ? <Stack gap={12}><PlaneRouteAnimation departure="서울" destination="도쿄" /><Row style={{ backgroundColor: c.primarySoft, padding: 16, borderRadius: 16 }}><ShoppingBag size={24} color={c.primaryStrong} /><View style={{ flex: 1 }}><Txt size={13} color={c.secondary}>시부야에 들르는 김에</Txt><Txt weight="700">한 곳의 부탁을 한 번에</Txt></View><Check size={20} color={c.primaryStrong} /></Row></Stack> : <View style={{ backgroundColor: c.ultraSoft, borderRadius: 24, padding: 24, gap: 24 }}>
            <View style={{ width: 68, height: 68, borderRadius: 22, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}><PackageCheck size={34} color={c.primaryStrong} /></View>
            <Stack gap={6} style={{ alignItems: 'center' }}><Txt size={22} weight="800">잘 받았어요!</Txt><Txt size={13} color={c.secondary}>수령 확인 후 여행자에게 정산돼요.</Txt></Stack>
            <Row style={{ justifyContent: 'space-between' }}>{[{ label: '결제 보관', icon: Wallet }, { label: '여행·전달', icon: ShoppingBag }, { label: '수령 확인', icon: ShieldCheck }].map(({ label, icon: Icon }, i) => <React.Fragment key={label}>{i > 0 && <View style={{ flex: 1, height: 1, backgroundColor: c.primaryTint, marginBottom: 22 }} />}<Stack gap={8} style={{ alignItems: 'center' }}><Icon size={24} color={c.primaryStrong} /><Txt size={11} weight="600">{label}</Txt></Stack></React.Fragment>)}</Row>
          </View>}
        </View>
      </ScrollView></PageTransition>
      <Stack gap={20} style={{ padding: 24, paddingTop: 12 }}><Row style={{ justifyContent: 'center', gap: 7 }}>{guideSlides.map((item, dot) => <View key={item.eyebrow} style={{ width: dot === index ? 24 : 6, height: 6, borderRadius: 4, backgroundColor: dot === index ? c.primaryStrong : c.border }} />)}</Row><Button label={last ? (firstEntry ? '모아 시작하기' : '홈으로 가기') : '다음'} icon={ArrowRight} onPress={() => last ? (onComplete ? onComplete() : a.tab('home')) : setIndex((current) => current + 1)} />{index > 0 && <Button small label="이전" kind="ghost" onPress={() => setIndex(index - 1)} />}</Stack>
    </View>
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
  const hero = cities.slice().sort((left, right) => right.travelers - left.travelers)[0];
  const heroTravelers = hero ? d.users.filter((user) => d.trips.some((item) => item.travelerId === user.id && item.destinationCity === hero.city)) : [];
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 28 }}>
    <Row style={{ justifyContent: 'space-between' }}>
      <Row style={{ gap: 4 }}><Logo size={34} /><Txt size={10} color={c.secondary}>체험</Txt></Row>
      <Row style={{ gap: 2 }}><Pressable accessibilityRole="button" accessibilityLabel="이용 모드 설정" onPress={() => a.nav('settings')} style={{ minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}><Row style={{ gap: 4 }}><Txt size={12} weight="600" color={c.secondary}>{a.role === 'buyer' ? '부탁하기 모드' : '여행하기 모드'}</Txt><ChevronRight size={12} color={c.secondary} /></Row></Pressable><IconButton icon={Bell} label="알림" onPress={() => a.nav('notifications')} /></Row>
    </Row>
    {a.role === 'buyer' ? <>
      <Stack gap={14}>
        <Stack gap={2}><Txt size={30} weight="900">좋은 하루예요,</Txt><Txt size={30} weight="900">{d.me.nickname}님 👋</Txt><Txt size={15} color={c.secondary}>지금 누군가는 그곳으로 가고 있어요.</Txt></Stack>
        <Pressable accessibilityRole="button" accessibilityLabel="도시와 장소 검색" onPress={() => a.tab('search')} style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, paddingHorizontal: 16, backgroundColor: pressed ? c.primarySoft : c.paper, borderWidth: 1, borderColor: c.border, flexDirection: 'row', gap: 10, alignItems: 'center' })}><Search size={21} color={c.primaryStrong} /><Txt size={15} color={c.secondary}>도시, 매장, 갖고 싶은 물건</Txt></Pressable>
      </Stack>
      {hero && <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: c.primaryDeep }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${hero.city}에서 부탁하기`} onPress={() => a.nav('search', { placeId: hero.place.id })} style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}>
          <View style={{ height: 228, overflow: 'hidden' }}><View style={{ position: 'absolute', inset: 0 }}><PlaceCover place={hero.place} thumbnail /></View><View style={{ position: 'absolute', inset: 0, backgroundColor: '#10244375' }} /><View style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 17, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }}><MapPin size={17} color={c.ink} /></View>
            <Stack gap={10} style={{ flex: 1, minWidth: 0, width: '100%', padding: 22, justifyContent: 'flex-end' }}><Txt size={12} weight="600" color={c.navyTextBright} style={{ flexShrink: 1 }}>{countryName(hero.place.country)} · {hero.city}</Txt><Txt size={26} weight="800" color="white" style={{ flexShrink: 1, maxWidth: '100%' }}>{hero.travelers ? `${hero.travelers}명의 여행자가\n${hero.city}로 떠나요.` : `${hero.city}의 발견,\n누군가의 여행으로.`}</Txt><Row style={{ justifyContent: 'space-between', marginTop: 6, minWidth: 0 }}><Row style={{ gap: 8, minWidth: 0, flexShrink: 1 }}><AvatarStack users={heroTravelers} /><Txt size={12} color="white" style={{ flexShrink: 1 }}>{hero.travelers ? '여행 일정 둘러보기' : '장소 둘러보기'}</Txt></Row><View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.paper, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}><ArrowRight size={19} color={c.primaryStrong} /></View></Row></Stack>
          </View>
        </Pressable>
        <PhotoCredit place={hero.place} />
        <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}><Txt size={11} color={c.navyText}>공개된 체험 일정 기준 · 실제 모집 인원이 아니에요.</Txt></View>
      </View>}
      <View>
        <Section title="요즘 떠나는 곳" action="모두 보기" onPress={() => a.tab('search')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {cities.map(({ city, place, travelers }) => {
            const photo = getPlacePhoto(place);
            return <View key={city} style={{ width: 138 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={city + ' 여행 둘러보기'} onPress={() => a.nav('search', { placeId: place.id })} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: c.mint }}><PlaceCover place={place} thumbnail /></View>
                <Row style={{ justifyContent: 'space-between', marginTop: 10 }}><Txt size={17} weight="700">{city}</Txt><ArrowRight size={15} color={c.muted} /></Row>
                <Txt size={12} color={c.secondary}>{travelers ? travelers + '명 여행 예정 · 예시' : '장소 둘러보기'}</Txt>
              </Pressable>
              {photo && <PhotoCredit place={place} />}
            </View>;
          })}
        </ScrollView>
      </View>
      <View style={{ padding: 20, gap: 16, borderRadius: 20, backgroundColor: c.primarySoft }}>
        <Row><View style={{ flex: 1 }}><Txt size={17} weight="700">찾는 물건이 있나요?</Txt><Txt size={13} color={c.secondary}>링크나 사진만 보내주세요.</Txt></View><ShoppingBag size={24} color={c.green} /></Row>
        <Row style={{ gap: 8 }}>
          <Button label="링크로 찾기" icon={Link} small singleLine style={{ flex: 1, minHeight: 54, paddingHorizontal: 10, gap: 6 }} onPress={() => a.nav('request-form', { method: 'link' })} />
          <Button label="사진으로 찾기" icon={ScanLine} kind="secondary" small singleLine style={{ flex: 1, minHeight: 54, paddingHorizontal: 10, gap: 6, backgroundColor: c.paper }} onPress={() => a.nav('request-form', { method: 'photo' })} />
        </Row>
      </View>
      <View>
        <Section title="우리 동네에서 출발해요" subtitle={locationLabel + ' · 반경 2km · 여행자 위치 예시'} action="위치 확인" onPress={() => void locate()} />
        <View style={{ backgroundColor: c.paper, borderWidth: 1, borderColor: '#DCE5F2', borderRadius: 20, overflow: 'hidden' }}>
          {nearbyTravelers.map(({ user, trip: nearbyTrip, distance }, index) => user && nearbyTrip && <Pressable key={user.id} accessibilityRole="button" accessibilityLabel={user.nickname + '님의 여행 보기'} onPress={() => a.nav('profile', { id: user.id })} style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 14, minHeight: 76, borderBottomWidth: index < nearbyTravelers.length - 1 ? 1 : 0, borderColor: c.border, opacity: pressed ? 0.7 : 1 })}>
            <Row><Avatar user={user} size={44} /><View style={{ flex: 1 }}><Txt size={16} weight="600">{user.nickname} · {nearbyTrip.destinationCity}</Txt><Txt size={13} color={c.secondary}>{shortDate(nearbyTrip.startDate)} – {shortDate(nearbyTrip.endDate)} · {distance.toFixed(1)}km 예시</Txt></View><ChevronRight size={18} color={c.muted} /></Row>
          </Pressable>)}
          {!nearbyTravelers.length && <Txt color={c.secondary} style={{ padding: 16 }}>이 위치 근처에는 공개된 예시 여행이 없어요.</Txt>}
        </View>
      </View>
      <View>
        <Section title="부탁이 많은 장소" action="모두 보기" onPress={() => a.tab('search')} />
        <Stack gap={12}>{places.slice(0, 3).map((place, index) => <PlaceCard key={place.id} variant={index === 0 ? 'card' : 'list'} countType="trades" place={place} onPress={() => openPlace(place)} />)}</Stack>
      </View>
      {!!recentPlaces.length && <View><Section title="최근 본 장소" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{recentPlaces.map((place) => <Chip key={place.id} label={place.name} onPress={() => openPlace(place)} />)}</ScrollView></View>}
      {featured && <View><Section title="이런 부탁도 있어요" /><ProductRow request={featured} krw onPress={() => a.nav('request', { id: featured.id })} /></View>}
    </> : trip ? <>
      <Stack gap={16}><View style={{ gap: 6 }}><Txt size={26} weight="900">{d.me.nickname}님, 반가워요</Txt><Txt size={30} weight="800">이번 여행,{ '\n' }보상까지 챙겨요.</Txt></View><View><PlaneRouteAnimation departure={trip.departureCity} destination={tripCities.join(' · ') || trip.destinationCity} /><Row style={{ paddingHorizontal: 4, paddingTop: 8, justifyContent: 'space-between' }}><Txt size={14} color={c.secondary}>{shortDate(trip.startDate)} – {shortDate(trip.endDate)}</Txt><Pressable accessibilityRole="button" accessibilityLabel="일정 관리" onPress={() => a.nav('trips')} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }}><Txt size={13} color={c.darkGreen}>일정 관리 →</Txt></Pressable></Row></View></Stack>
      <View style={{ padding: 22, borderRadius: 20, backgroundColor: c.paper, gap: 14, borderWidth: 1, borderColor: c.border }}>
        <Txt size={14} color={c.secondary}>가는 길에 받을 수 있는 보상</Txt>
        <Txt size={availableReward ? 36 : 24} weight="800" color={c.primaryStrong}>{availableReward ? money(availableReward) : '부탁에서 확인해요'}</Txt>
        <Row style={{ justifyContent: 'space-between' }}><Txt size={14} color={c.secondary}>{bundles.length}곳 · 부탁 {availableRequests}건</Txt><Txt size={12} color={c.secondary}>{pendingRewards ? '보상 미정 부탁 포함' : '등록된 보상 합계'}</Txt></Row>
        <Button label="내 동선의 부탁 보기" onPress={() => bundles[0] ? a.nav('bundle', { placeId: bundles[0].place.id, tripId: trip.id }) : a.tab('search')} />
      </View>
      <View><Section title="한 곳에서 한 번에" action="일정 추가" onPress={() => a.nav('trip-form')} />
        {bundles.map((bundle) => {
          const reward = bundle.requests.reduce((sum, request) => sum + (request.requestedReward || 0), 0);
          return <Pressable key={bundle.place.id} accessibilityRole="button" accessibilityLabel={bundle.place.name + ' 부탁 ' + bundle.requests.length + '건 · 상품 ' + bundle.items + '개 보기'} onPress={() => a.nav('bundle', { placeId: bundle.place.id, tripId: trip.id })} style={({ pressed }) => ({ padding: 18, borderRadius: 18, backgroundColor: c.paper, marginBottom: 12, opacity: pressed ? 0.75 : 1 })}>
            <Row><View style={{ width: 76, borderRadius: 12, overflow: 'hidden' }}><PlaceCover place={bundle.place} thumbnail /></View><View style={{ flex: 1, gap: 5 }}><Txt size={17} weight="700">{bundle.place.name}</Txt><Txt size={13} color={c.secondary}>부탁 {bundle.requests.length}건 · 상품 {bundle.items}개</Txt></View><ChevronRight size={18} color={c.muted} /></Row>
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
  const normalizeSearch = (value: string) => value.toLowerCase().replace(/라스베가스/g, '라스베이거스');
  const q = normalizeSearch(query.trim());
  const match = (text: string) => normalizeSearch(text).includes(q);
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
    <Page title="둘러보기">
      <SearchField
        label="장소 또는 상품 검색"
        value={query}
        onChange={setQuery}
        placeholder="도시, 매장, 갖고 싶은 물건"
      />
      <DestinationPicker country={country} cities={cities} allowAll searchable allowCountryOnly onChange={(next, selectedCities) => { setCountry(next); setCities(selectedCities); setSelected(null); }} />
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
            <View key={p.id} style={{ width: resultsWidth >= 540 ? (resultsWidth - 12) / 2 : '100%' }}>
              <PlaceCard variant={resultsWidth >= 540 ? 'card' : 'list'} place={p} onPress={() => select(p)} />
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
  return <Page title="무엇을 할까요?" back={false}><CreateActions /></Page>;
}
export function CreateActions({ onChoose }: { onChoose?: () => void }) {
  const a = useApp();
  return <Stack gap={12}>
    {([{ title: '이거 부탁하기', body: '상품 링크나 사진 한 장이면 충분해요.', label: '구매 요청 등록', screen: 'request-form', icon: ShoppingBag, bg: c.primarySoft }, { title: '가는 김에 가져올게요', body: '내가 들르는 곳의 부탁을 만나보세요.', label: '여행 일정 등록', screen: 'trip-form', icon: Plane, bg: c.ultraSoft }] as const).map(({ title, body, label, screen, icon: Icon, bg }) => <Pressable key={screen} accessibilityRole="button" accessibilityLabel={label} onPress={() => { onChoose?.(); a.nav(screen); }} style={({ pressed }) => ({ minHeight: 122, padding: 20, borderRadius: 20, backgroundColor: bg, opacity: pressed ? 0.8 : 1 })}>
      <Row style={{ alignItems: 'flex-start' }}><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.paper, justifyContent: 'center', alignItems: 'center' }}><Icon size={24} color={c.primaryStrong} /></View><Stack gap={6} style={{ flex: 1 }}><Txt size={19} weight="700">{title}</Txt><Txt size={13} color={c.secondary}>{body}</Txt></Stack><ChevronRight size={18} color={c.primaryStrong} /></Row>
    </Pressable>)}
  </Stack>;
}

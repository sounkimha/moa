import React, { useEffect, useState } from 'react';
import { NearbyHomeEntry } from './Nearby';
import { distanceMeters } from '../nearby/model';
import { isRunningInExpoGo } from 'expo';
import * as Location from 'expo-location';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import {
  ArrowRight,
  ArrowLeft,
  Bell,
  ChevronRight,
  ChevronDown,
  Settings,
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
  Fingerprint,
} from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { groupForTrip, money, Place, shortDate, countryName } from '@moa/domain';
import { DestinationPicker, DestinationCountry } from '../components/DestinationPicker';
import { useApp } from '../state/AppContext';
import { colors as c } from '../theme/tokens';
import {
  Badge,
  Button,
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
  Sheet,
  Stack,
  Txt,
} from '../components/ui';
import { Avatar, AvatarStack, Logo, PlaceCard, PlaceCover, ProductArt, ProductRow } from '../components/visuals';
import { PlaneRouteAnimation } from '../components/travel-route';
import { PageTransition } from '../components/motion';
import RouteMap from '../components/RouteMap';
import { PhotoCredit } from '../components/PhotoCredit';
import { hasBiometricLogin, supportsBiometric } from '../lib/auth-storage';
import { TravelerPreview, TravelRouteLine } from '../components/HomeContent';
import { tripsToCity, uniqueTravelerCount } from '../lib/home-discovery';
import { openDevMenu, setDevToolsButtonVisible } from '../lib/dev-menu';

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
  return distanceMeters(a, b) / 1000;
};

export function Onboarding() {
  const a = useApp();
  const kakaoReady = a.oauthProviders.KAKAO;
  const [biometricReady, setBiometricReady] = useState(false);
  useEffect(() => {
    Promise.all([supportsBiometric(), hasBiometricLogin()]).then(([supported, saved]) => setBiometricReady(supported && saved));
  }, []);
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        // Keep the entry rhythm consistent with the guide screen: start below the
        // safe area instead of vertically centering the entire sign-in flow.
        paddingTop: 48,
        paddingBottom: 32,
        gap: 28,
      }}
    >
      <Logo size={46} />
      <Stack gap={10}><Txt size={30} weight="800">여행에 취향을 싣다.</Txt><Txt size={15} color={c.secondary}>갖고 싶은 마음과 떠나는 여행이 만나요.</Txt></Stack>
      <Stack gap={12}>
        <Txt size={15} weight="600">어떻게 시작할까요?</Txt>
        {([{ role: 'buyer', label: '사고 싶어요', detail: '그곳에 가는 사람에게 원하는 물건을 부탁해요', icon: ShoppingBag }, { role: 'traveler', label: '가져올게요', detail: '여행 가는 김에 부탁을 받아요', icon: Plane }] as const).map(({ role, label, detail, icon: Icon }) => (
          <Pressable key={role} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: a.role === role }} onPress={() => a.setRole(role)} style={{ minHeight: 88, padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: a.role === role ? c.primary : c.border, backgroundColor: c.paper }}>
            <Row><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Icon size={22} color={c.primaryStrong} /></View><Stack gap={3} style={{ flex: 1 }}><Txt size={17} weight="700">{label}</Txt><Txt size={12} color={c.secondary}>{detail}</Txt></Stack>{a.role === role && <Check size={20} color={c.primaryStrong} />}</Row>
          </Pressable>
        ))}
        <Txt size={12} color={c.secondary}>한 계정으로 둘 다 가능해요. 모드는 설정에서 바꿔요.</Txt>
      </Stack>
      {a.error && <Notice tone="error">{a.error}</Notice>}
      <Stack gap={10}>
        {biometricReady && <Button label="생체 인증으로 로그인" kind="secondary" icon={Fingerprint} loading={a.busy} onPress={async () => { if (await a.biometricLogin()) a.tab('home'); }} />}
        <Button testID="start-demo" label="체험 계정으로 로그인" kind={kakaoReady ? 'secondary' : 'primary'} onPress={() => a.nav('login')} />
        {kakaoReady && <Button label="카카오로 계속하기" loading={a.busy} onPress={() => a.socialLogin('KAKAO')} style={{ backgroundColor: '#FEE500' }} kind="secondary" />}
        <Txt size={12} color={c.secondary} style={{ textAlign: 'center' }}>체험에서는 실제 결제나 정산이 발생하지 않아요.</Txt>
      </Stack>
    </ScrollView>
  );
}

function LoginOption({ selected, disabled, label, detail, icon: Icon, onPress }: { selected: boolean; disabled?: boolean; label: string; detail: string; icon: typeof Fingerprint; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: disabled ? 0.45 : 1 }}>
    <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primary : c.paper, alignItems: 'center', justifyContent: 'center' }}>{selected && <Check size={15} color="white" />}</View>
    <Icon size={20} color={selected ? c.primaryStrong : c.secondary} />
    <Stack gap={2} style={{ flex: 1 }}><Txt size={14} weight="600">{label}</Txt><Txt size={12} color={c.secondary}>{detail}</Txt></Stack>
  </Pressable>;
}

/** Credential login lives on its own screen so the onboarding page stays short and calm. */
export function LoginScreen() {
  const a = useApp();
  const [username, setUsername] = useState('wasabi');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([supportsBiometric(), hasBiometricLogin()]).then(([supported, saved]) => {
      setBiometricAvailable(supported);
      setBiometricReady(supported && saved);
    });
  }, []);
  const persistence = { remember, biometric: biometric && biometricAvailable };
  const submit = async () => {
    if (!/^[A-Za-z0-9._-]{3,32}$/.test(username.trim())) {
      setError('아이디는 3~32자의 영문·숫자·점·밑줄·하이픈으로 입력해주세요.');
      return;
    }
    if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) {
      setError('비밀번호는 8자 이상이며 영문·숫자·특수문자를 포함해야 해요.');
      return;
    }
    setError('');
    const ok = await a.testLogin(username.trim(), password, false, persistence);
    if (ok) a.tab('home');
  };
  const social = async (provider: 'GOOGLE' | 'KAKAO' | 'NAVER') => {
    const ok = await a.socialLogin(provider, persistence);
    if (ok) a.tab('home');
  };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 28, paddingBottom: 40, gap: 24 }}>
    <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}><Pressable accessibilityRole="button" accessibilityLabel="로그인 닫기" onPress={() => a.back()} style={{ width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}><ArrowLeft size={24} color={c.ink} /></Pressable><Logo size={32} /><View style={{ width: 44 }} /></Row>
    <Stack gap={8}><Txt size={28} weight="800">로그인하기</Txt><Txt size={15} color={c.secondary}>MOA에서 여행과 부탁을 이어가요.</Txt></Stack>
    <Stack gap={12}>
      {biometricReady && <Button label="생체 인증으로 로그인" kind="secondary" icon={Fingerprint} loading={a.busy} onPress={async () => { if (await a.biometricLogin()) a.tab('home'); }} />}
      <Txt size={14} weight="700">아이디로 로그인</Txt>
      <TextInput accessibilityLabel="아이디" value={username} onChangeText={setUsername} editable={!a.busy} maxLength={32} autoComplete="username" textContentType="username" autoCapitalize="none" autoCorrect={false} placeholder="아이디" placeholderTextColor={c.muted} style={{ minHeight: 54, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, color: c.ink, fontSize: 16 }} />
      <TextInput accessibilityLabel="비밀번호" value={password} onChangeText={setPassword} editable={!a.busy} maxLength={128} autoComplete="current-password" textContentType="password" autoCapitalize="none" autoCorrect={false} secureTextEntry returnKeyType="go" onSubmitEditing={() => { if (!a.busy) void submit(); }} placeholder="비밀번호" placeholderTextColor={c.muted} style={{ minHeight: 54, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, color: c.ink, fontSize: 16 }} />
      <Txt size={12} color={c.secondary}>비밀번호는 8자 이상 · 영문·숫자·특수문자를 포함해요.</Txt>
      {(error || a.error) && <Notice tone="error">{error || a.error}</Notice>}
      <Button label="로그인하기" loading={a.busy} onPress={submit} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 8 }}><Txt size={13} color={c.secondary}>아직 MOA 계정이 없나요?</Txt><Button label="회원가입" small kind="ghost" disabled={a.busy} onPress={() => a.nav('signup')} /></View>
    </Stack>
    <Stack gap={2}>
      <LoginOption selected={remember} label="자동 로그인" detail={biometric ? '앱을 다시 열면 생체 인증 후 로그인해요.' : '다음부터 이 기기에서 바로 로그인해요.'} icon={Check} onPress={() => { setRemember(!remember); if (remember) setBiometric(false); }} />
      <LoginOption selected={biometric} disabled={!biometricAvailable || !remember} label="생체 인증으로 빠르게 로그인" detail={biometricAvailable ? '다음 실행부터 Face ID 또는 지문으로 확인해요.' : Platform.OS === 'ios' && isRunningInExpoGo() ? 'Face ID는 Expo Go 대신 MOA 개발 빌드에서 사용할 수 있어요.' : Platform.OS === 'web' ? '웹에서는 아직 생체 인증을 사용할 수 없어요.' : '이 기기에서는 생체 인증을 사용할 수 없어요.'} icon={Fingerprint} onPress={() => setBiometric(!biometric)} />
    </Stack>
    {(a.oauthProviders.KAKAO || a.oauthProviders.GOOGLE || a.oauthProviders.NAVER) && <Stack gap={8}><Txt size={14} weight="700">다른 방법으로 로그인</Txt>{a.oauthProviders.KAKAO && <Button label="카카오로 계속하기" loading={a.busy} onPress={() => social('KAKAO')} style={{ backgroundColor: '#FEE500' }} kind="secondary" />}{a.oauthProviders.GOOGLE && <Button label="Google로 계속하기" loading={a.busy} onPress={() => social('GOOGLE')} kind="secondary" />}{a.oauthProviders.NAVER && <Button label="네이버로 계속하기" loading={a.busy} onPress={() => social('NAVER')} kind="secondary" />}</Stack>}
    <Txt size={12} color={c.secondary} style={{ textAlign: 'center' }}>체험 계정에서는 실제 결제나 정산이 발생하지 않아요.</Txt>
  </ScrollView>;
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
      <PageTransition routeKey={`guide-${index}`}><ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }}>
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
      <Stack gap={20} style={{ padding: 24, paddingTop: 12 }}>
        <Row style={{ justifyContent: 'center', gap: 7 }}>{guideSlides.map((item, dot) => <View key={item.eyebrow} style={{ width: dot === index ? 24 : 6, height: 6, borderRadius: 4, backgroundColor: dot === index ? c.primaryStrong : c.border }} />)}</Row>
        <Button label={last ? (firstEntry ? '모아 시작하기' : '홈으로 가기') : '다음'} icon={ArrowRight} onPress={() => last ? (onComplete ? onComplete() : a.tab('home')) : setIndex((current) => current + 1)} />
        <View style={{ minHeight: 44, justifyContent: 'center' }}>{index > 0 && <Button small label="이전" kind="ghost" onPress={() => setIndex(index - 1)} />}</View>
      </Stack>
    </View>
  );
}
export function Home() {
  const a = useApp(), d = a.data!;
  const { width } = useWindowDimensions();
  const [homeWidth, setHomeWidth] = useState(Math.min(width, 640) - 40);
  const [modeOpen, setModeOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [buyerLocation, setBuyerLocation] = useState({ latitude: 37.5445, longitude: 127.0557 });
  const [locationLabel, setLocationLabel] = useState('성수동');
  useEffect(() => {
    const hidden = setDevToolsButtonVisible(false);
    // Keep Expo's entry available on screens that don't have our header shortcut.
    return () => { if (hidden) setDevToolsButtonVisible(true); };
  }, []);
  const places = d.places.slice().sort((left, right) => right.visitors - left.visitors);
  const cityPlaces = places.filter((place, index) => places.findIndex((other) => other.country === place.country && other.city === place.city) === index).slice(0, 8);
  const cities = cityPlaces.map((place) => ({
    city: place.city,
    place,
    travelers: uniqueTravelerCount(tripsToCity(d.trips, d.places, place.country, place.city)),
  }));
  const cityWidth = Math.min(340, Math.max(200, (homeWidth - 12) / 1.18));
  const trips = d.trips.filter((item) => item.travelerId === d.me.id);
  const trip = trips.find((item) => item.id === a.route.tripId) || trips.at(-1);
  const bundles = trip ? groupForTrip(d, trip) : [];
  const availableRequests = bundles.reduce((sum, bundle) => sum + bundle.requests.length, 0);
  const availableReward = bundles.reduce((sum, bundle) => sum + bundle.requests.reduce((amount, request) => amount + (request.requestedReward || 0), 0), 0);
  const pendingRewards = bundles.some((bundle) => bundle.requests.some((request) => request.requestedReward === undefined));
  const tripCities = trip ? trip.destinationAreas || [...new Set(trip.placeIds.map((id) => d.places.find((place) => place.id === id)?.city).filter(Boolean))] : [];
  const featuredRequests = d.requests.filter((request) => ['REQUESTED', 'OFFER_RECEIVED'].includes(request.status)).slice(0, 3);
  const nearbyTravelers = travelerPresence.map((presence) => ({
    ...presence, distance: kmBetween(buyerLocation, presence),
    user: d.users.find((user) => user.id === presence.userId),
    trip: d.trips.find((item) => item.travelerId === presence.userId && item.endDate >= new Date().toISOString().slice(0, 10)),
  })).filter((item) => item.user && item.trip && item.distance <= 2).sort((left, right) => left.distance - right.distance);
  const locate = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return a.notify('위치 권한을 허용하면 가까운 여행을 찾을 수 있어요.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setBuyerLocation(current.coords); setLocationLabel('현재 위치');
    } catch { a.notify('현재 위치를 확인하지 못했어요. 위치 권한을 확인해주세요.'); }
    finally { setLocating(false); }
  };
  const openPlace = (place: Place) => { rememberPlace(place.id); a.nav('place', { id: place.id }); };
  const hero = cities.slice().sort((left, right) => right.travelers - left.travelers)[0];
  const heroTrips = hero ? tripsToCity(d.trips, d.places, hero.place.country, hero.city) : [];
  const heroTravelers = d.users.filter((user) => heroTrips.some((item) => item.travelerId === user.id));
  const heroDepartures = [...new Set(heroTrips.map((item) => item.departureCity))];
  return <>
  <ScrollView testID="home-scroll" keyboardShouldPersistTaps="handled" onLayout={(event) => setHomeWidth(event.nativeEvent.layout.width - 40)} contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 24 }}>
    <Row style={{ justifyContent: 'space-between', gap: 8 }}>
      <Row style={{ gap: 3 }}><Logo size={width < 360 && __DEV__ ? 26 : 32} /><Txt size={10} color={c.secondary}>체험</Txt></Row>
      <Row style={{ gap: 0, flexShrink: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="이용 모드 설정" accessibilityState={{ expanded: modeOpen }} onPress={() => setModeOpen(true)} style={{ minHeight: 44, justifyContent: 'center', flexShrink: 1 }}><Row style={{ gap: 3 }}><Txt size={13} weight="600" style={{ flexShrink: 1 }}>{a.role === 'buyer' ? '사고 싶어요' : '가져올게요'}</Txt><ChevronDown size={14} color={c.secondary} /></Row></Pressable>
        <IconButton icon={Bell} label="알림" onPress={() => a.nav('notifications')} />
        {__DEV__ && <IconButton icon={Settings} color={c.secondary} label="테스트 설정" onPress={() => setDevOpen(true)} />}
      </Row>
    </Row>
    {a.role === 'buyer' ? <Stack gap={40}>
      <Stack gap={24}>
        <Stack gap={16}>
          <Stack gap={8}><Txt size={28} weight="700">좋은 하루예요, {d.me.nickname}님 👋</Txt><Txt size={15} color={c.secondary}>어디에서 뭘 사고 싶어요?</Txt></Stack>
          <Pressable accessibilityRole="button" accessibilityLabel="도시와 장소 검색" accessibilityHint="상품 찾기에서 도시 검색, 링크 붙여넣기, 사진 찾기를 할 수 있어요" onPress={() => a.tab('search')} style={({ pressed }) => ({ minHeight: 58, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: pressed ? c.primarySoft : c.paper, borderWidth: 1, borderColor: c.primaryTint, flexDirection: 'row', gap: 10, alignItems: 'center' })}><Search size={22} color={c.primaryStrong} /><Txt size={16} color={c.secondary} style={{ flex: 1 }}>어디에서 뭘 사고 싶어요?</Txt></Pressable>
        </Stack>
        {hero && <Stack gap={4}>
          <Pressable testID="home-hero" accessibilityRole="button" accessibilityLabel={`${hero.city} ${hero.travelers ? '여행자 일정 보기' : '장소 둘러보기'}`} onPress={() => a.nav('search', { placeId: hero.place.id })} style={({ pressed }) => ({ borderRadius: 24, overflow: 'hidden', backgroundColor: c.primaryDeep, opacity: pressed ? 0.86 : 1 })}>
            <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}><PlaceCover place={hero.place} thumbnail fill /></View>
            <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}><Svg width="100%" height="100%"><Defs><LinearGradient id="home-hero-shade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#0C1D35" stopOpacity={0.35} /><Stop offset="1" stopColor="#0C1D35" stopOpacity={0.9} /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#home-hero-shade)" /></Svg></View>
            <Stack gap={18} style={{ minHeight: 284, padding: 20, justifyContent: 'space-between' }}>
              <Stack gap={10}><Txt size={13} weight="500" color="white">{countryName(hero.place.country)} · {hero.city}</Txt><Txt size={26} weight="700" color="white">{hero.travelers ? `${hero.travelers}명의 여행자가\n${hero.city}로 떠나요.` : `${hero.city}의 발견,\n누군가의 여행으로.`}</Txt></Stack>
              {!!heroTrips.length && <TravelRouteLine light departure={heroDepartures.length === 1 ? heroDepartures[0] : '여러 출발지'} destination={hero.city} />}
              <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <Row style={{ gap: 5 }}><AvatarStack users={heroTravelers} />{hero.travelers > 3 && <Txt size={12} color="white">+{hero.travelers - 3}</Txt>}</Row>
                <Row style={{ minHeight: 40, gap: 8 }}><Txt size={14} weight="600" color="white">{hero.travelers ? '여행자 일정 보기' : '장소 둘러보기'}</Txt><View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: c.paper, justifyContent: 'center', alignItems: 'center' }}><ArrowRight size={18} color={c.primaryStrong} /></View></Row>
              </Row>
            </Stack>
          </Pressable>
          <Row style={{ justifyContent: 'space-between' }}><Txt size={11} color={c.secondary}>체험 데이터</Txt><Pressable accessibilityRole="button" accessibilityLabel={`${hero.city} 사진·장소 정보`} onPress={() => openPlace(hero.place)} style={{ minHeight: 32, justifyContent: 'center' }}><Txt size={11} color={c.secondary}>사진·장소 정보</Txt></Pressable></Row>
        </Stack>}
      </Stack>
      <View>
        <Section title="요즘 떠나는 곳" titleSize={22} action="모두 보기" onPress={() => a.tab('search')} />
        <ScrollView testID="home-cities" horizontal showsHorizontalScrollIndicator={false} snapToInterval={cityWidth + 12} decelerationRate="fast" contentContainerStyle={{ gap: 12 }}>
          {cities.map(({ city, place, travelers }) => {
            return <View key={`${place.country}-${city}`} style={{ width: cityWidth }}>
              <Pressable accessibilityRole="button" accessibilityLabel={city + ' 여행 둘러보기'} onPress={() => a.nav('search', { placeId: place.id })} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: c.mint }}><PlaceCover place={place} thumbnail /></View>
                <Row style={{ justifyContent: 'space-between', marginTop: 12 }}><Txt size={18} weight="600">{city}</Txt><ArrowRight size={16} color={c.muted} /></Row>
                <Txt size={13} color={c.secondary} style={{ marginTop: 4 }}>{travelers ? travelers + '명 여행 예정 · 예시' : '여행자를 기다리고 있어요'}</Txt>
              </Pressable>
            </View>;
          })}
        </ScrollView>
      </View>
      <View testID="home-nearby">
        <Section title={homeWidth < 320 ? '내 주변에서\n떠나는 여행자' : '내 주변에서 떠나는 여행자'} titleSize={22} action={locating ? '위치 확인 중' : '위치 확인'} onPress={() => void locate()} />
        <Stack gap={4} style={{ marginTop: -8, marginBottom: 16 }}>
          <Txt size={14} color={c.secondary}>{locationLabel} 근처에서 출발하는 여행자예요</Txt>
          <Txt size={12} color={c.secondary}>{locationLabel} · 반경 2km · 테스트 데이터</Txt>
        </Stack>
        {!!nearbyTravelers.length && <View testID="home-nearby-list" style={{ backgroundColor: c.paper, borderRadius: 20, borderWidth: 1, borderColor: `${c.border}99`, overflow: 'hidden' }}>
          {nearbyTravelers.map(({ user, trip: nearbyTrip, distance }, index) => user && nearbyTrip && <React.Fragment key={user.id}>
            {index > 0 && <View testID="nearby-traveler-divider" style={{ height: StyleSheet.hairlineWidth, marginLeft: 78, marginRight: 16, backgroundColor: c.border }} />}
            <TravelerPreview variant="nearby" user={user} trip={nearbyTrip} places={d.places} distance={distance} onPress={() => a.nav('trip-route', { id: nearbyTrip.id })} />
          </React.Fragment>)}
        </View>}
        {!nearbyTravelers.length && <Empty title="근처에서 떠나는 여행자를 기다려요" body="여행자 위치는 예시예요. 다른 도시의 공개 일정도 둘러보세요." action="다른 여행지 보기" onPress={() => a.tab('search')} />}
      </View>
      <View>
        <Section title="부탁이 많은 장소" titleSize={22} action="모두 보기" onPress={() => a.tab('search')} />
        {places[0] && <PlaceCard countType="trades" showPhotoCredit={false} place={places[0]} onPress={() => openPlace(places[0])} />}
        {places.length > 1 && <Stack gap={12} style={{ marginTop: 24 }}><Txt size={16} weight="600" color={c.secondary}>인기 장소</Txt>{places.slice(1, 3).map((place) => <PlaceCard key={place.id} variant="list" titleSize={18} countType="trades" showPhotoCredit={false} place={place} onPress={() => openPlace(place)} />)}</Stack>}
      </View>
      <View><Section title="이런 부탁도 있어요" titleSize={22} />{featuredRequests.map((request) => {
        const travelers = uniqueTravelerCount(d.trips.filter((item) => item.travelerId !== request.requesterId && item.endDate >= new Date().toISOString().slice(0, 10) && item.placeIds.includes(request.placeId)));
        return <ProductRow key={request.id} request={request} krw travelerNote={travelers ? `부탁 가능한 여행자 예시 ${travelers}명` : '이곳에 갈 여행자를 기다려요'} onPress={() => a.nav('request', { id: request.id })} />;
      })}{!featuredRequests.length && <Empty title="아직 공개된 부탁이 없어요" body="원하는 장소에서 첫 부탁을 남겨보세요." action="상품 찾기" onPress={() => a.tab('search')} />}</View>
    </Stack> : trip ? <>
      <Stack gap={16}><View style={{ gap: 6 }}><Txt size={26} weight="900">{d.me.nickname}님, 반가워요</Txt><Txt size={30} weight="800">이번 여행,{ '\n' }보상까지 챙겨요.</Txt></View><View><PlaneRouteAnimation departure={trip.departureCity} destination={tripCities.join(' · ') || trip.destinationCity} /><Row style={{ paddingHorizontal: 4, paddingTop: 8, justifyContent: 'space-between' }}><Txt size={14} color={c.secondary}>{shortDate(trip.startDate)} – {shortDate(trip.endDate)}</Txt><Pressable accessibilityRole="button" accessibilityLabel="일정 관리" onPress={() => a.nav('trips')} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }}><Txt size={13} color={c.darkGreen}>일정 관리 →</Txt></Pressable></Row></View></Stack>
      <NearbyHomeEntry />
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
    </> : <Stack gap={20}><Txt size={28} weight="800">다음 여행은 어디인가요?</Txt><Txt color={c.secondary}>방문할 곳을 알려주면 같은 장소의 부탁을 모아드려요.</Txt><Button label="여행 일정 등록" icon={Plane} onPress={() => a.nav('trip-form')} /><NearbyHomeEntry /></Stack>}
  </ScrollView>
  <Sheet visible={modeOpen} title="어떻게 이용할까요?" subtitle="한 계정으로 언제든 바꿀 수 있어요." onClose={() => setModeOpen(false)}>
    {([{ role: 'buyer', title: '사고 싶어요', body: '원하는 상품을 여행자에게 부탁해요', icon: ShoppingBag }, { role: 'traveler', title: '가져올게요', body: '여행 가는 김에 부탁을 받아요', icon: Plane }] as const).map(({ role, title, body, icon: Icon }) => <Pressable key={role} accessibilityRole="radio" accessibilityLabel={title} accessibilityState={{ checked: a.role === role }} onPress={() => { a.setRole(role); setModeOpen(false); }} style={({ pressed }) => ({ padding: 16, borderRadius: 18, backgroundColor: a.role === role ? c.primarySoft : c.paper, opacity: pressed ? 0.7 : 1 })}><Row><Icon size={24} color={c.primaryStrong} /><Stack gap={4} style={{ flex: 1 }}><Txt size={18} weight="600">{title}</Txt><Txt size={13} color={c.secondary}>{body}</Txt></Stack>{a.role === role && <Check size={21} color={c.primaryStrong} />}</Row></Pressable>)}
  </Sheet>
  {__DEV__ && <Sheet visible={devOpen} title="테스트 설정" onClose={() => setDevOpen(false)}>
    {a.role === 'traveler' && <Button label="근처 부탁 알림 테스트" kind="secondary" onPress={() => { setDevOpen(false); a.nav('nearby-test'); }} />}
    <Button label="앱 설정 · 체험 계정 전환" kind="secondary" onPress={() => { setDevOpen(false); a.nav('settings'); }} />
    {Platform.OS !== 'web' && <Button label="Expo 개발 메뉴" kind="ghost" onPress={() => { setDevOpen(false); if (!openDevMenu()) a.notify('기기를 흔들거나 세 손가락으로 길게 눌러 Expo 개발 메뉴를 열어주세요.'); }} />}
    <Txt size={13} color={c.secondary}>개발 모드에서만 보여요. 이전 Expo Go에서 톱니바퀴가 남아 있으면 개발 메뉴의 Tools button 표시를 꺼주세요.</Txt>
  </Sheet>}
  </>;
}

export function SearchScreen() {
  const a = useApp(),
    d = a.data!;
  const initialPlace = d.places.find((place) => place.id === a.route.placeId);
  // Opening a place from the home hero intentionally starts a location-focused
  // search. Returning from a detail screen keeps the user's current filters.
  const initialBrowse = initialPlace
    ? { ...a.browseState, query: '', country: initialPlace.country, cities: [initialPlace.city] }
    : a.browseState;
  const [query, setQuery] = useState(initialBrowse.query),
    [country, setCountry] = useState<DestinationCountry>(initialBrowse.country),
    [cities, setCities] = useState<string[]>(initialBrowse.cities),
    [view, setView] = useState<'목록' | '지도'>(initialBrowse.view),
    [resultsWidth, setResultsWidth] = useState(0),
    [selected, setSelected] = useState<Place | null>(() => d.places.find((place) => place.id === initialBrowse.selectedPlaceId) || null);
  const normalizeSearch = (value: string) => value.toLowerCase().replace(/라스베가스/g, '라스베이거스');
  const q = normalizeSearch(query.trim());
  const match = (text: string) => normalizeSearch(text).includes(q);
  const places = d.places.filter(
    (p) =>
      (country === 'ALL' || p.country === country) && (!cities.length || cities.includes(p.city)) &&
      match(`${countryName(p.country)} ${p.name} ${p.englishName} ${p.city} ${p.region} ${p.tags.join(' ')}`),
  );
  const selectedPlace = selected && places.some((place) => place.id === selected.id) ? selected : null;
  useEffect(() => {
    a.setBrowseState({ query, country, cities, view, selectedPlaceId: selectedPlace?.id });
  }, [a, cities, country, query, selectedPlace?.id, view]);
  const requests = d.requests.filter(
    (r) =>
      (country === 'ALL' || r.country === country) && (!cities.length || cities.includes(r.city)) && match(`${countryName(r.country)} ${r.productName} ${r.city} ${r.storeName}`),
  );
  const trips = d.trips.filter(
    (t) =>
      (q || cities.length > 0) && t.endDate >= new Date().toISOString().slice(0, 10) &&
      (country === 'ALL' || t.destinationCountry === country) &&
      (!cities.length || cities.some((city) => tripsToCity([t], d.places, country === 'ALL' ? t.destinationCountry : country, city).length > 0)) &&
      match(
        `${t.departureCity} ${t.destinationCity} ${(t.destinationAreas || []).join(' ')} ${countryName(t.departureCountry)} ${countryName(t.destinationCountry)} ${t.placeIds.map((id) => { const p = d.places.find((p) => p.id === id); return p ? `${p.city} ${p.region} ${p.name}` : ''; }).join(' ')}`,
      ),
  );
  const recentPlaces = readRecentPlaces().map((id) => d.places.find((place) => place.id === id)).filter((place): place is Place => Boolean(place));
  const select = (p: Place) => {
    if (q) a.mutate('/searches', { query });
    rememberPlace(p.id);
    a.nav('place', { id: p.id });
  };
  return (
    <Page title="둘러보기">
      <Txt size={22} weight="700">상품 찾기</Txt>
      <SearchField
        label="장소 또는 상품 검색"
        value={query}
        onChange={setQuery}
        placeholder="도시 · 매장 · 상품명을 검색하세요"
      />
      <Row style={{ alignItems: 'stretch', gap: 12 }}>
        {([{ method: 'link', title: '링크 붙여넣기', body: '상품 URL로 찾아보기', icon: Link }, { method: 'photo', title: '사진으로 찾기', body: '상품 사진으로 찾아보기', icon: ScanLine }] as const).map(({ method, title, body, icon: Icon }) => <Pressable key={method} accessibilityRole="button" accessibilityLabel={title} onPress={() => a.nav('request-form', { method })} style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 14, borderRadius: 16, backgroundColor: pressed ? c.primarySoft : c.paper, borderWidth: 1, borderColor: c.border, gap: 8 })}><Icon size={21} color={c.primaryStrong} /><Txt size={15} weight="600">{title}</Txt><Txt size={12} color={c.secondary}>{body}</Txt></Pressable>)}
      </Row>
      <DestinationPicker country={country} cities={cities} allowAll searchable allowCountryOnly onChange={(next, selectedCities) => { setCountry(next); setCities(selectedCities); setSelected(null); }} />
      {!q && !cities.length && !!recentPlaces.length && <View><Section title="최근 본 장소" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{recentPlaces.map((place) => <Chip key={place.id} label={place.name} onPress={() => select(place)} />)}</ScrollView></View>}
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
      {(trips.length > 0 || (cities.length > 0 && !q)) && <View>
        <Section title="이 경로로 가는 여행자" subtitle="공개된 체험 일정이에요." />
        {!!trips.length && <View
          style={{
            overflow: 'hidden',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.paper,
            paddingHorizontal: 16,
          }}
        >
          {trips.map((t) => {
            const user = d.users.find((person) => person.id === t.travelerId);
            return user ? <TravelerPreview key={t.id} user={user} trip={t} places={d.places} onPress={() => a.nav('trip-route', { id: t.id, placeId: initialPlace?.id })} /> : null;
          })}
        </View>}
        {!trips.length && <Txt size={14} color={c.secondary}>아직 이곳으로 가는 공개 일정이 없어요. 아래 장소에서 부탁을 남길 수 있어요.</Txt>}
      </View>}
      <View testID="search-results-toolbar" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt size={20} weight="700" style={{ flex: 1, minWidth: 0 }}>
          장소 {places.length}곳
        </Txt>
        {/* Bound the segmented control before its equal-width tabs flex in native Yoga. */}
        <View testID="search-view-toggle" style={{ width: 144, maxWidth: '55%', flexShrink: 0 }}>
          <SectionTabs items={['목록', '지도']} value={view} onChange={(next) => setView(next === '지도' ? '지도' : '목록')} />
        </View>
      </View>
      {view === '지도' ? (
        <>
          <RouteMap places={places} selected={(selectedPlace || places[0])?.id} onSelect={setSelected} />
          {(selectedPlace || places[0]) && <PlaceCard variant="list" place={selectedPlace || places[0]} onPress={() => select(selectedPlace || places[0])} />}
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
    </Page>
  );
}
export function PlaceScreen() {
  const a = useApp(), d = a.data!, p = d.places.find((item) => item.id === a.route.id);
  const savedInSnapshot = Boolean(p && d.favorites.some((favorite) => favorite.placeId === p.id));
  const [favorite, setFavorite] = useState(savedInSnapshot), [favoriteBusy, setFavoriteBusy] = useState(false);
  useEffect(() => { setFavorite(savedInSnapshot); }, [p?.id, savedInSnapshot]);
  if (!p) return <Page title="장소"><Empty title="이 장소를 찾지 못했어요" action="장소 둘러보기" onPress={() => a.tab('search')} /></Page>;
  const requests = d.requests.filter((request) => request.placeId === p.id);
  const trips = d.trips.filter((trip) => trip.placeIds.includes(p.id) && trip.endDate >= new Date().toISOString().slice(0, 10));
  const myTrip = trips.find((trip) => trip.travelerId === d.me.id);
  const primary = () => a.role === 'buyer' ? a.nav('request-form', { placeId: p.id }) : myTrip ? a.nav('bundle', { placeId: p.id, tripId: myTrip.id }) : a.nav('trip-form', { placeId: p.id });
  const toggleFavorite = async () => {
    if (favoriteBusy) return;
    const previous = favorite;
    setFavorite(!previous);
    setFavoriteBusy(true);
    const result = await a.mutate<{ favorite: boolean }>('/favorites/' + p.id, {}, previous ? '관심 장소에서 뺐어요.' : '관심 장소에 저장했어요.');
    setFavorite(result?.favorite ?? previous);
    setFavoriteBusy(false);
  };
  return <Page title={p.city + ' · ' + p.region} footer={<Button label={a.role === 'buyer' ? '여기에서 부탁하기' : myTrip ? '이곳의 부탁 가져오기' : '방문 일정 등록하기'} onPress={primary} />}>
    <View style={{ borderRadius: 18, overflow: 'hidden' }}><PlaceCover place={p} /></View>
    <PhotoCredit place={p} compact />
    <Stack gap={10}>
      <Row><Txt size={25} weight="800" style={{ flex: 1 }}>{p.name}</Txt><Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? '관심 장소 해제' : '관심 장소 저장'}
        accessibilityState={{ selected: favorite, disabled: favoriteBusy }}
        aria-pressed={favorite}
        disabled={favoriteBusy}
        onPress={toggleFavorite}
        hitSlop={8}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: favorite ? c.primarySoft : 'transparent', opacity: pressed || favoriteBusy ? 0.62 : 1 })}
      ><Heart size={27} color={favorite ? c.primaryStrong : c.ink} fill={favorite ? c.primaryStrong : 'none'} /></Pressable></Row>
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
  return <Page title={a.role === 'buyer' ? '부탁 등록' : '여행 등록'} back={false}><CreateActions /></Page>;
}
export function CreateActions({ onChoose }: { onChoose?: () => void }) {
  const a = useApp();
  const action = a.role === 'buyer'
    ? { title: '부탁 등록', body: '사고 싶은 상품을 부탁해요', label: '구매 요청 등록', screen: 'request-form' as const, icon: ShoppingBag, bg: c.primarySoft }
    : { title: '여행 등록', body: '가는 김에 부탁을 받아요', label: '여행 일정 등록', screen: 'trip-form' as const, icon: Plane, bg: c.ultraSoft };
  const Icon = action.icon;
  return <Stack gap={12}>
    <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={() => { onChoose?.(); a.nav(action.screen); }} style={({ pressed }) => ({ minHeight: 98, padding: 18, borderRadius: 18, backgroundColor: action.bg, opacity: pressed ? 0.8 : 1 })}>
      <Row style={{ alignItems: 'flex-start' }}><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.paper, justifyContent: 'center', alignItems: 'center' }}><Icon size={24} color={c.primaryStrong} /></View><Stack gap={6} style={{ flex: 1 }}><Txt size={19} weight="700">{action.title}</Txt><Txt size={13} color={c.secondary}>{action.body}</Txt></Stack><ChevronRight size={18} color={c.primaryStrong} /></Row>
    </Pressable>
  </Stack>;
}

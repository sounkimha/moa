import React, { useEffect, useState } from 'react';
import { NearbyHomeEntry } from './Nearby';
import { isRunningInExpoGo } from 'expo';
import * as Location from 'expo-location';
import { Image, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import {
  ArrowRight,
  ArrowLeft,
  Bell,
  ChevronRight,
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
import { Avatar, Logo, PlaceCard, PlaceCover, ProductArt, ProductRow } from '../components/visuals';
import { HomeRoleCards, TokyoMotionHero } from '../components/MotionHome';
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
      <Stack gap={10}><Txt size={12} weight="600" color={c.primaryStrong} style={{ letterSpacing: 2 }}>MOVE. ORDER. ARRIVE.</Txt><Txt size={30} weight="700">가는 김에, 하나 더.</Txt><Txt size={15} color={c.secondary}>그곳에 가는 사람과 갖고 싶은 마음을 연결해요.</Txt></Stack>
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
  const [username, setUsername] = useState('buyer01');
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
  const [devOpen, setDevOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState('성수동');
  useEffect(() => {
    const hidden = setDevToolsButtonVisible(false);
    // Keep Expo's entry available on screens that don't have our header shortcut.
    return () => { if (hidden) setDevToolsButtonVisible(true); };
  }, []);
  const places = d.places.slice().sort((left, right) => right.visitors - left.visitors);
  const cityOrder = ['도쿄', '오사카', '후쿠오카', '서울'];
  const cityPriority = (city: string) => cityOrder.includes(city) ? cityOrder.indexOf(city) : cityOrder.length;
  const cityPlaces = places.slice().sort((left, right) => cityPriority(left.city) - cityPriority(right.city)).filter((place, index, all) => all.findIndex((other) => other.country === place.country && other.city === place.city) === index).slice(0, 8);
  const cities = cityPlaces.map((place) => ({
    city: place.city,
    place,
    travelers: uniqueTravelerCount(tripsToCity(d.trips, d.places, place.country, place.city)),
  }));
  const trips = d.trips.filter((item) => item.travelerId === d.me.id);
  const trip = trips.find((item) => item.id === a.route.tripId) || trips.at(-1);
  const bundles = trip ? groupForTrip(d, trip) : [];
  const availableRequests = bundles.reduce((sum, bundle) => sum + bundle.requests.length, 0);
  const availableReward = bundles.reduce((sum, bundle) => sum + bundle.requests.reduce((amount, request) => amount + (request.requestedReward || 0), 0), 0);
  const featuredRequests = d.requests.filter((request) => ['REQUESTED', 'OFFER_RECEIVED'].includes(request.status)).slice(0, 3);
  const locate = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return a.notify('위치 권한을 허용하면 가까운 여행을 찾을 수 있어요.');
      // Coordinates stay on-device. This only confirms the local context for this screen.
      await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationLabel('현재 위치');
    } catch { a.notify('현재 위치를 확인하지 못했어요. 위치 권한을 확인해주세요.'); }
    finally { setLocating(false); }
  };
  const openPlace = (place: Place) => { rememberPlace(place.id); a.nav('place', { id: place.id }); };
  const hero = cities.find((city) => city.city === '도쿄');
  const citySchedule = cities.filter((city) => city.travelers > 0).map((city) => {
    const scheduled = tripsToCity(d.trips, d.places, city.place.country, city.city).sort((left, right) => left.startDate.localeCompare(right.startDate));
    return { ...city, nextDate: scheduled[0]?.startDate };
  });
  const switchRole = (role: 'buyer' | 'traveler') => {
    if (role !== a.role) a.setRole(role);
  };
  return <>
  <ScrollView testID="home-scroll" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 14, paddingBottom: 36, gap: 24 }}>
    <Row style={{ justifyContent: 'space-between', gap: 8 }}>
      <Stack gap={1}><Logo size={34} /><Txt size={9} color={c.secondary} style={{ letterSpacing: 1.5 }}>MOVE. ORDER. ARRIVE.</Txt></Stack>
      <Row style={{ gap: 4 }}><Txt size={10} color={c.muted}>체험</Txt><IconButton icon={Bell} label="알림" onPress={() => a.nav('notifications')} /><Pressable accessibilityRole="button" accessibilityLabel="내 프로필" onPress={() => a.tab('my')} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Avatar user={d.me} size={34} /></Pressable>{__DEV__ && <IconButton icon={Settings} color={c.secondary} label="테스트 설정" onPress={() => setDevOpen(true)} />}</Row>
    </Row>
    <Stack gap={12}>
      <TokyoMotionHero travelers={hero?.city === '도쿄' ? hero.travelers : 0} onPress={() => hero ? a.nav('search', { placeId: hero.place.id }) : a.tab('search')} />
      <Pressable accessibilityRole="button" accessibilityLabel="상품 매장 지역 검색" accessibilityHint="상품, 매장, 지역을 검색할 수 있어요" onPress={() => a.tab('search')} style={({ pressed }) => ({ minHeight: 54, borderRadius: 16, paddingHorizontal: 16, backgroundColor: pressed ? c.primarySoft : c.paper, borderWidth: 1, borderColor: c.border, flexDirection: 'row', gap: 10, alignItems: 'center' })}><Search size={21} color={c.primaryStrong} /><Txt size={14} color={c.secondary} style={{ flex: 1 }}>어디서 무엇을 찾고 계신가요?</Txt></Pressable>
      <HomeRoleCards value={a.role} onChange={switchRole} />
    </Stack>
    {a.role === 'buyer' ? <Stack gap={32}>
      <View>
        <Section title="이번 여행, 어디로 가나요?" action="모두 보기" onPress={() => a.tab('search')} />
        <ScrollView testID="home-cities" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {cities.slice(0, 6).map(({ city, place, travelers }) => <Pressable key={place.country + city} accessibilityRole="button" accessibilityLabel={city + ' 여행 둘러보기'} onPress={() => a.nav('search', { placeId: place.id })} style={({ pressed }) => ({ width: 142, borderRadius: 18, backgroundColor: c.paper, overflow: 'hidden', borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.76 : 1 })}><View style={{ height: 116, backgroundColor: c.primarySoft }}><PlaceCover place={place} thumbnail fill /></View><Stack gap={4} style={{ padding: 12 }}><Txt size={16} weight="700" lines={1}>{city}</Txt><Row style={{ gap: 4 }}><Plane size={12} color={c.primaryStrong} /><Txt size={12} color={c.secondary}>{travelers ? travelers + '명 여행 예정' : '장소 둘러보기'}</Txt></Row></Stack></Pressable>)}
        </ScrollView>
        <Txt size={11} color={c.muted} style={{ marginTop: 8 }}>공개된 체험 일정 기준</Txt>
      </View>
      <View testID="home-nearby">
        <Section title="여행자의 길과 연결해요" subtitle="목적지를 고르고, 가는 사람을 만나보세요." action={locating ? '확인 중' : '위치 확인'} onPress={() => void locate()} />
        {!!citySchedule.length ? <View testID="home-nearby-list" style={{ borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, overflow: 'hidden' }}>
          {citySchedule.slice(0, 3).map((city, index) => <Pressable key={city.place.country + city.city} accessibilityRole="button" accessibilityLabel={city.city + ' 여행자 보기'} onPress={() => a.nav('search', { placeId: city.place.id })} style={({ pressed }) => ({ padding: 16, borderBottomWidth: index === Math.min(citySchedule.length, 3) - 1 ? 0 : 1, borderColor: c.border, opacity: pressed ? 0.72 : 1 })}><Row><View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><MapPin size={19} color={c.primaryStrong} /></View><Stack gap={3} style={{ flex: 1, minWidth: 0 }}><Txt size={16} weight="600">{city.city}로 가요</Txt><Txt size={12} color={c.secondary}>{city.nextDate ? shortDate(city.nextDate) + '부터 · 공개 일정' : '공개 일정'}</Txt></Stack><Txt size={18} weight="700" color={c.primaryStrong}>{city.travelers}<Txt size={12} color={c.secondary}>명</Txt></Txt><ChevronRight size={17} color={c.muted} /></Row></Pressable>)}
        </View> : <Empty title="새로운 여행을 기다리고 있어요" body="먼저 장소를 찾아 부탁을 남겨보세요." action="장소 찾기" onPress={() => a.tab('search')} />}
        {locationLabel === '현재 위치' && <Txt size={11} color={c.muted} style={{ marginTop: 8 }}>위치를 확인했어요. 정확한 위치는 다른 사람에게 공개하지 않아요.</Txt>}
      </View>
      <View><Section title="지금 주목할 만한 장소" action="더 보기" onPress={() => a.tab('search')} /><Stack gap={12}>{places.slice(0, 3).map((place, index) => <PlaceCard key={place.id} variant={index ? 'list' : 'card'} countType="trades" showPhotoCredit={false} place={place} onPress={() => openPlace(place)} />)}</Stack></View>
      <View><Section title="가는 김에, 이런 부탁" action="부탁하기" onPress={() => a.nav('request-form')} />{featuredRequests.map((request) => { const travelers = uniqueTravelerCount(d.trips.filter((item) => item.travelerId !== request.requesterId && item.endDate >= new Date().toISOString().slice(0, 10) && item.placeIds.includes(request.placeId))); return <ProductRow key={request.id} request={request} krw travelerNote={travelers ? '방문 예정 여행자 ' + travelers + '명' : '여행 일정을 기다리고 있어요'} onPress={() => a.nav('request', { id: request.id })} />; })}{!featuredRequests.length && <Empty title="아직 공개된 부탁이 없어요" body="원하는 장소의 첫 부탁을 남겨보세요." action="상품 찾기" onPress={() => a.tab('search')} />}</View>
    </Stack> : trip ? <Stack gap={28}>
      <View style={{ borderRadius: 20, backgroundColor: c.paper, borderWidth: 1, borderColor: c.primaryTint, overflow: 'hidden' }}>
        <Stack gap={14} style={{ padding: 20 }}>
          <Row style={{ justifyContent: 'space-between' }}><Txt size={11} color={c.primaryStrong} weight="700" style={{ letterSpacing: 1.4 }}>MY TRAVEL PLAN</Txt><Plane size={19} color={c.primaryStrong} /></Row>
          <TravelRouteLine accented departure={trip.departureCity} destination={trip.destinationCity} />
          <Row style={{ justifyContent: 'space-between' }}><Txt size={13} color={c.secondary}>{shortDate(trip.startDate)} – {shortDate(trip.endDate)}</Txt><Button small kind="ghost" label="일정 보기" onPress={() => a.nav('trips')} /></Row>
        </Stack>
        <Stack gap={6} style={{ padding: 20, backgroundColor: c.primarySoft, borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.primaryTint }}><Txt size={13} color={c.secondary}>이번 여행, 가는 김에 받을 수 있는 보상</Txt><Txt size={availableReward ? 32 : 21} weight="700" color={c.primaryStrong}>{availableReward ? money(availableReward) : '동선의 부탁을 기다려요'}</Txt><Txt size={12} color={c.secondary}>{bundles.length}곳 · 부탁 {availableRequests}건 · 등록 보상 합계</Txt></Stack>
      </View>
      <NearbyHomeEntry />
      <View><Section title="한 곳에서, 여러 부탁" subtitle="내 여행 동선에서 함께 가져올 수 있어요." action="전체 보기" onPress={() => bundles[0] ? a.nav('bundle', { placeId: bundles[0].place.id, tripId: trip.id }) : a.tab('search')} />
        {bundles.slice(0, 3).map((bundle) => { const reward = bundle.requests.reduce((sum, request) => sum + (request.requestedReward || 0), 0); return <Pressable key={bundle.place.id} accessibilityRole="button" accessibilityLabel={bundle.place.name + ' 요청 ' + bundle.requests.length + '건 묶어서 보기'} onPress={() => a.nav('bundle', { placeId: bundle.place.id, tripId: trip.id })} style={({ pressed }) => ({ borderRadius: 20, overflow: 'hidden', backgroundColor: pressed ? c.primarySoft : c.paper, borderWidth: 1, borderColor: c.border, marginBottom: 14, opacity: pressed ? 0.74 : 1 })}>
          <Row style={{ padding: 16, alignItems: 'flex-start' }}><View style={{ width: 66, height: 66, borderRadius: 14, overflow: 'hidden', backgroundColor: c.primarySoft }}><PlaceCover place={bundle.place} thumbnail fill /></View><Stack gap={4} style={{ flex: 1, minWidth: 0 }}><Txt size={11} weight="600" color={c.primaryStrong}>같은 장소의 부탁</Txt><Txt size={17} weight="700" lines={2}>{bundle.place.name}</Txt><Txt size={12} color={c.secondary}>부탁 {bundle.requests.length}건 · 상품 {bundle.items}개</Txt></Stack></Row>
          <Row style={{ padding: 16, borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.border, gap: 8 }}><Stack gap={2} style={{ flex: 1 }}><Txt size={11} color={c.secondary}>추가 이동 · 체험 추정</Txt><Txt size={20} weight="700">+{bundle.extraMinutes}분</Txt></Stack><ArrowRight size={18} color={c.primary} /><Stack gap={2} style={{ flex: 1, alignItems: 'flex-end' }}><Txt size={11} color={c.secondary}>총 예상 보상</Txt><Txt size={22} weight="700" color={c.primaryStrong}>{reward ? money(reward) : '보상 확인'}</Txt></Stack></Row>
          <Row style={{ justifyContent: 'center', backgroundColor: c.primarySoft, padding: 12, gap: 6 }}><Txt size={13} weight="600" color={c.primaryStrong}>{bundle.requests.length}건 묶어서 보기</Txt><ArrowRight size={15} color={c.primaryStrong} /></Row>
        </Pressable>; })}
        {!bundles.length && <Empty title="동선에 맞는 부탁을 기다리고 있어요" body="방문 예정 지역을 추가하면 같은 장소의 요청을 묶어드려요." action="여행 일정 보기" onPress={() => a.nav('trips')} />}
      </View>
    </Stack> : <Stack gap={20}><View style={{ backgroundColor: c.primarySoft, padding: 24, borderRadius: 20, gap: 14 }}><Row><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }}><Plane size={24} color={c.primaryStrong} /></View><Txt size={11} weight="700" color={c.primaryStrong} style={{ letterSpacing: 1 }}>YOUR NEXT JOURNEY</Txt></Row><Txt size={24} weight="700">다음 여행이,{`\n`}누군가의 기쁨이 돼요.</Txt><Txt size={14} color={c.secondary}>갈 곳과 날짜를 알려주세요.{`\n`}가는 길의 부탁을 한데 모아드릴게요.</Txt><Button label="여행 등록하기" icon={Plane} onPress={() => a.nav('trip-form')} /></View><NearbyHomeEntry /></Stack>}
  </ScrollView>
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
      <Stack gap={6}><Txt size={11} weight="600" color={c.primaryStrong} style={{ letterSpacing: 1.5 }}>DISCOVER YOUR NEXT STOP</Txt><Txt size={25} weight="700">장소를 찾고, 여행과 연결해요.</Txt><Txt size={13} color={c.secondary}>물건이 있는 곳과 그곳에 가는 여행자를 함께 찾아요.</Txt></Stack>
      <SearchField
        label="장소 또는 상품 검색"
        value={query}
        onChange={setQuery}
        placeholder="상품 · 매장 · 지역 검색"
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

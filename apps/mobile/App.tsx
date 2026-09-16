import React, { Component, ReactNode, useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowUpRight,
  Compass,
  Home as HomeIcon,
  Layers,
  Plus,
  ShoppingBag,
  User,
  HelpCircle,
  Plane,
  RefreshCw,
} from 'lucide-react-native';
import { AppProvider, Screen, useApp } from './src/state/AppContext';
import { colors as c } from './src/theme/tokens';
import { Badge, Button, Row, Stack, Txt } from './src/components/ui';
import { Logo } from './src/components/visuals';
import { CreateScreen, GuideScreen, Home, Onboarding, PlaceScreen, SearchScreen } from './src/screens/Home';
import { RequestForm } from './src/screens/Forms';
import { TripForm } from './src/screens/TripForm';
import { FlightProofScreen } from './src/screens/FlightProof';
import { TripRouteScreen } from './src/screens/TripRoute';
import { IdentityScreen, PaymentMethodsScreen, TopUpScreen, WalletScreen, WithdrawalScreen } from './src/screens/Wallet';
import {
  BundleScreen,
  OfferForm,
  OffersScreen,
  ProfileScreen,
  RequestScreen,
} from './src/screens/Matching';
import {
  ChatScreen,
  PaymentScreen,
  PayoutsScreen,
  ReceiptScreen,
  ReceiveScreen,
  TradesScreen,
  TransactionScreen,
} from './src/screens/Trading';
import {
  FavoritesScreen,
  AddressesScreen,
  HelpScreen,
  MyScreen,
  NotificationsScreen,
  ReviewsScreen,
  SettingsScreen,
  TripsScreen,
} from './src/screens/Account';
const screens: Record<Screen, React.ComponentType> = {
  home: Home,
  search: SearchScreen,
  create: CreateScreen,
  trades: TradesScreen,
  my: MyScreen,
  place: PlaceScreen,
  request: RequestScreen,
  'request-form': RequestForm,
  'trip-form': TripForm,
  'flight-proof': FlightProofScreen,
  'trip-route': TripRouteScreen,
  offers: OffersScreen,
  profile: ProfileScreen,
  'offer-form': OfferForm,
  bundle: BundleScreen,
  payment: PaymentScreen,
  transaction: TransactionScreen,
  chat: ChatScreen,
  receipt: ReceiptScreen,
  receive: ReceiveScreen,
  payouts: PayoutsScreen,
  wallet: WalletScreen,
  'wallet-topup': TopUpScreen,
  'wallet-withdraw': WithdrawalScreen,
  identity: IdentityScreen,
  'payment-methods': PaymentMethodsScreen,
  notifications: NotificationsScreen,
  favorites: FavoritesScreen,
  trips: TripsScreen,
  reviews: ReviewsScreen,
  settings: SettingsScreen,
  addresses: AddressesScreen,
  help: HelpScreen,
  guide: GuideScreen,
};
const tabs: [Screen, string, typeof HomeIcon][] = [
  ['home', '홈', HomeIcon],
  ['search', '찾아보기', Compass],
  ['create', '등록', Plus],
  ['trades', '거래', ShoppingBag],
  ['my', 'MY', User],
];
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Stack style={{ padding: 36, flex: 1, justifyContent: 'center' }}>
        <Txt size={26} weight="700">
          화면을 다시 열어주세요.
        </Txt>
        <Txt color={c.secondary}>표시 중 오류가 발생했어요. 저장된 거래는 서버에 남아 있어요.</Txt>
        <Button label="다시 시도" onPress={() => this.setState({ failed: false })} />
      </Stack>
    ) : (
      this.props.children
    );
  }
}
function Shell() {
  const a = useApp(),
    { width, height } = useWindowDimensions();
  const desktop = width >= 1060;
  const Current = screens[a.route.name] || Home;
  useEffect(() => {
    if (Platform.OS === 'web') document.title = 'MOA · 가는 김에, 하나 더.';
  }, []);
  const navigation = (vertical = false) => (
    <View
      style={{
        flexDirection: vertical ? 'column' : 'row',
        gap: vertical ? 10 : 0,
        ...(vertical
          ? {}
          : {
              borderTopWidth: 1,
              borderColor: c.border,
              backgroundColor: c.paper,
              paddingTop: 8,
              paddingBottom: 6,
            }),
      }}
    >
      {tabs.map(([name, label, Icon]) => {
        const selected = a.route.name === name;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => a.tab(name)}
            style={({ pressed }) =>
              vertical
                ? {
                    flexDirection: 'row',
                    gap: 14,
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 15,
                    backgroundColor: selected ? c.mint : pressed ? c.paper : 'transparent',
                  }
                : { flex: 1, minHeight: 53, alignItems: 'center', justifyContent: 'center', gap: 3 }
            }
          >
            {name === 'create' ? (
              <View
                style={{
                  backgroundColor: c.green,
                  borderRadius: 14,
                  width: vertical ? 34 : 42,
                  height: vertical ? 34 : 42,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: vertical ? 0 : -10,
                }}
              >
                <Plus size={25} color="white" />
              </View>
            ) : (
              <Icon
                size={vertical ? 21 : 23}
                color={selected ? c.green : c.muted}
                strokeWidth={selected ? 2.2 : 1.7}
              />
            )}
            <Txt
              size={vertical ? 15 : 11}
              weight={selected ? '700' : '500'}
              color={selected ? c.green : c.secondary}
            >
              {vertical && name === 'create' ? '새로 등록하기' : label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View
        style={{
          flex: 1,
          height,
          alignItems: 'center',
            backgroundColor: desktop ? c.desktopBackground : c.canvas,
        }}
      >
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: desktop ? 1170 : 680,
            flexDirection: 'row',
            borderLeftWidth: desktop ? 1 : 0,
            borderRightWidth: desktop ? 1 : 0,
            borderColor: c.border,
          }}
        >
          {desktop && a.data && (
            <View
              style={{
                width: 250,
                padding: 25,
                backgroundColor: c.canvas,
                borderRightWidth: 1,
                borderColor: c.border,
                gap: 35,
              }}
            >
              <Row style={{ gap: 10, marginTop: 13 }}>
                <Logo size={42} />
                <Txt size={33} weight="800" color={c.green}>
                  MOA
                </Txt>
              </Row>
              <Stack gap={8}>
                <Txt size={21} weight="700">
                  가는 김에,{'\n'}하나 더.
                </Txt>
                <Txt size={13} color={c.secondary}>
                  이미 그곳에 가는 사람과{'\n'}작은 부탁을 연결해요.
                </Txt>
              </Stack>
              {navigation(true)}
              <View style={{ flex: 1 }} />
              <View style={{ backgroundColor: c.mint, borderRadius: 20, padding: 18, gap: 12 }}>
                <Plane size={25} color={c.darkGreen} />
                <Txt size={14} weight="700">
                  여행은 그대로.{'\n'}작은 보상은 덤으로.
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    a.setRole('traveler');
                    a.tab('home');
                  }}
                >
                  <Row style={{ gap: 4 }}>
                    <Txt size={12} color={c.darkGreen} weight="700">
                      내 동선 살펴보기
                    </Txt>
                    <ArrowUpRight size={13} color={c.darkGreen} />
                  </Row>
                </Pressable>
              </View>
              <Button
                small
                kind="ghost"
                label="MOA 이용 안내"
                icon={HelpCircle}
                onPress={() => a.nav('help')}
              />
              <Txt size={11} color={c.muted}>
                MOA PROTOTYPE · 2026{'\n'}요청이 모이면, 여행이 이어져요.
              </Txt>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0, backgroundColor: c.canvas }}>
            {a.loading ? (
              <Stack style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Logo size={70} />
                <Txt size={30} weight="800" color={c.green}>
                  MOA
                </Txt>
                <Txt color={c.secondary}>가는 김에, 하나 더.</Txt>
                <ActivityIndicator color={c.green} />
              </Stack>
            ) : !a.data ? (
              <Onboarding />
            ) : (
              <>
                {a.error && (
                  <View
                    accessibilityRole="alert"
                    style={{ backgroundColor: c.dangerBg, padding: 12 }}
                  >
                    <Row>
                      <Txt size={12} color={c.danger} style={{ flex: 1 }}>
                        {a.error}
                      </Txt>
                      <Button
                        small
                        kind="ghost"
                        label="다시 시도"
                        onPress={() => a.refresh().catch((e) => a.notify(e.message))}
                      />
                    </Row>
                  </View>
                )}
                <View style={{ flex: 1, minHeight: 0 }}>
                  <Boundary key={`${JSON.stringify(a.route)}-${a.data.me.id}`}>
                    <Current />
                  </Boundary>
                </View>
                {!desktop && navigation()}
              </>
            )}
            {!!a.toast && (
              <View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{
                  position: 'absolute',
                  bottom: desktop ? 22 : 83,
                  left: 18,
                  right: 18,
                  backgroundColor: c.ink,
                  borderRadius: 15,
                  padding: 16,
                  shadowColor: c.shadow,
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Txt size={14} color="white">
                  {a.toast}
                </Txt>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

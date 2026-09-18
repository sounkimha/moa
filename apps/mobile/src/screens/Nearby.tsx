import React, { useState } from 'react';
import { Linking, Platform, Pressable, Switch, View } from 'react-native';
import { Bell, ChevronRight, MapPin, Plane, ShieldCheck } from 'lucide-react-native';
import { localMoney, money, ProductRequest } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { useNearby } from '../nearby/NearbyProvider';
import { distanceLabel, requestsFromAlert } from '../nearby/model';
import { backgroundSupported, supported } from '../nearby/platform';
import { Badge, Button, Card, Divider, Empty, Notice, Page, Row, Sheet, Stack, Txt } from '../components/ui';
import { ProductArt } from '../components/visuals';
import { colors as c } from '../theme/tokens';

function SettingSwitch({ title, body, value, disabled, onChange }: {
  title: string; body?: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void;
}) {
  return <Row style={{ minHeight: 54, gap: 16 }}>
    <Stack gap={5} style={{ flex: 1, minWidth: 0 }}><Txt size={16} weight="600">{title}</Txt>{body && <Txt size={13} color={c.secondary}>{body}</Txt>}</Stack>
    <Switch accessibilityLabel={title} value={value} disabled={disabled} onValueChange={onChange}
      {...(Platform.OS === 'web' ? { activeThumbColor: c.paper, style: { height: 28 } } : {})}
      trackColor={{ false: c.border, true: c.primaryStrong }} thumbColor={c.paper} />
  </Row>;
}
function Choices<T extends number | null>({ title, items, value, disabled, onChange }: {
  title: string; items: { value: T; label: string }[]; value: T; disabled: boolean; onChange: (value: T) => void;
}) {
  return <Stack gap={12}><Txt size={15} weight="600">{title}</Txt><Row style={{ gap: 8 }}>
    {items.map((item) => <Pressable key={String(item.value)} accessibilityRole="radio" accessibilityLabel={`${title} ${item.label}`}
      accessibilityState={{ checked: value === item.value, disabled }} aria-checked={value === item.value} disabled={disabled} onPress={() => onChange(item.value)}
      style={{ flex: 1, minWidth: 0, paddingVertical: 13, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1,
        borderColor: value === item.value ? c.primaryStrong : c.border, backgroundColor: value === item.value ? c.primarySoft : c.paper, opacity: disabled ? 0.5 : 1 }}>
      <Txt size={14} weight={value === item.value ? '600' : '400'} color={value === item.value ? c.primaryStrong : c.secondary} style={{ textAlign: 'center' }}>{item.label}</Txt>
    </Pressable>)}
  </Row></Stack>;
}
export function NotificationSettingsScreen() {
  const a = useApp(), n = useNearby();
  const [consent, setConsent] = useState<'nearby' | 'background' | null>(null);
  if (!n) return <Page title="알림 설정"><Notice>알림 설정을 준비하고 있어요.</Notice></Page>;
  const p = n.preferences, disabled = !n.ready || n.busy;
  const close = () => { n.cancelConsent(); setConsent(null); };
  return <Page title="알림 설정">
    <Stack gap={20}>
      <SettingSwitch title="휴대폰 알림 수신" body="끄면 근처 부탁의 위치 확인과 알림도 멈춰요." value={p.notificationsEnabled} disabled={disabled}
        onChange={(value) => void n.update({ notificationsEnabled: value, ...(!value ? { nearbyEnabled: false } : {}) })} />
      <Divider />
      <Row style={{ justifyContent: 'space-between' }}><Txt>거래 · 채팅 소식</Txt><Badge>앱 알림함</Badge></Row>
      <Txt size={13} color={c.secondary}>거래·채팅은 기존 알림함에서 확인해요. 해당 소식의 휴대폰 Push는 아직 연결 전이에요.</Txt>
      <Button small kind="ghost" label="받은 알림 보기" onPress={() => a.nav('notifications')} />
    </Stack>
    <Card><Stack gap={24}>
      <SettingSwitch title="근처 부탁 알림" body="이동 중 가까운 곳에 부탁이 있으면 알려드려요."
        value={p.nearbyEnabled} disabled={disabled || !p.notificationsEnabled || a.role !== 'traveler' || !supported}
        onChange={(value) => value ? setConsent('nearby') : void n.update({ nearbyEnabled: false })} />
      {a.role !== 'traveler' && <Notice>가져올게요 모드에서 사용할 수 있어요. 홈 상단에서 모드를 바꿔주세요.</Notice>}
      {!supported && <Notice>휴대폰 Expo 앱에서 사용할 수 있어요. 웹에서는 위치 추적이나 휴대폰 알림을 실행하지 않아요.</Notice>}
      <Choices title="알림 거리" value={p.radius} items={[{ value: 300, label: '300m' }, { value: 500, label: '500m' }, { value: 1000, label: '1km' }]}
        disabled={disabled} onChange={(radius) => void n.update({ radius })} />
      <Choices title="하루 최대 알림" value={p.dailyLimit} items={[{ value: 3, label: '3회' }, { value: 5, label: '5회' }, { value: null, label: '제한 없음' }]}
        disabled={disabled} onChange={(dailyLimit) => void n.update({ dailyLimit })} />
      <Txt size={13} color={c.secondary}>같은 매장 부탁은 하나로 묶어요. 같은 부탁은 24시간, 같은 장소는 1시간 동안 다시 알리지 않아요.</Txt>
      <Divider />
      <SettingSwitch title="앱을 닫은 동안에도 확인" body="등록된 여행 기간에만 방문 예정 매장 근처를 확인해요."
        value={p.backgroundEnabled} disabled={disabled || !p.nearbyEnabled || !p.notificationsEnabled || a.role !== 'traveler' || !backgroundSupported}
        onChange={(value) => value ? setConsent('background') : void n.update({ backgroundEnabled: false })} />
      <Txt size={13} color={c.secondary}>{backgroundSupported
        ? '항상 위치 허용과 일반 자동 로그인이 필요해요. 생체 인증 로그인은 앱을 열어둔 동안 이용할 수 있어요.'
        : 'Expo Go에서는 앱을 열어둔 동안 테스트해요. 백그라운드 알림은 Development Build가 필요해요.'}</Txt>
      {p.nearbyEnabled && !n.activeTripCount && <Notice>지금 진행 중인 여행이 없어요. 등록한 여행 기간에만 실제 위치를 확인해요.</Notice>}
      {!!n.error && <Notice tone="error">{n.error}</Notice>}
      {supported && (n.error || (p.nearbyEnabled && (!n.permissions?.location || !n.permissions?.notifications))) &&
        <Button kind="secondary" small label="기기 권한 설정 열기" onPress={() => void Linking.openSettings().catch(() => a.notify('기기 설정에서 MOA 권한을 확인해주세요.'))} />}
    </Stack></Card>
    <Row style={{ alignItems: 'flex-start' }}><ShieldCheck size={19} color={c.secondary} /><Txt size={13} color={c.secondary} style={{ flex: 1 }}>위치는 기기 안에서 근처 부탁을 찾을 때만 사용해요. 여행자의 정확한 위치는 상대방에게 공개되지 않아요.</Txt></Row>
    {__DEV__ && <Button kind="ghost" label="근처 부탁 테스트 설정" onPress={() => a.nav('nearby-test')} />}
    <Sheet visible={consent !== null} title={consent === 'background' ? '앱을 닫아도 알려드릴까요?' : '가는 길에 부탁을 발견해드릴게요'} onClose={close}
      footer={<Button label={consent === 'background' ? '백그라운드 위치 허용하기' : '근처 부탁 알림 사용하기'} loading={n.busy} onPress={() => {
        void (consent === 'background' ? n.enableBackground() : n.enable()).then(() => setConsent(null));
      }} />}>
      <Txt>{consent === 'background'
        ? '활성 여행 기간에 예정된 매장 근처에 도착하면 알려드려요. 다음 화면에서 위치 권한을 항상 허용으로 선택해주세요. Android에서는 기기 설정 화면이 열릴 수 있어요.'
        : '여행 중 가까운 매장에 등록된 부탁이 있으면 MOA가 알려드릴 수 있어요.'}</Txt>
      <View style={{ padding: 18, borderRadius: 16, gap: 8, backgroundColor: c.primarySoft }}>
        <Badge>알림 예시</Badge><Txt weight="600">시부야 PARCO 근처예요</Txt><Txt size={14}>이곳에서 부탁 3건을 확인할 수 있어요.</Txt>
      </View>
      <Txt size={13} color={c.secondary}>위치정보는 근처 부탁을 찾기 위해서만 사용됩니다. 설정에서 언제든 끌 수 있어요.</Txt>
      {consent === 'background' && <Txt size={13} color={c.secondary}>배터리를 아끼도록 매장 도착 이벤트를 사용해요. 앱 강제 종료·절전 설정에 따라 알림이 지연되거나 오지 않을 수 있어요.</Txt>}
    </Sheet>
  </Page>;
}

export function NearbyHomeEntry() {
  const a = useApp(), n = useNearby();
  if (!n || a.role !== 'traveler') return null;
  const on = n.preferences.nearbyEnabled && n.preferences.notificationsEnabled;
  return <Pressable accessibilityRole="button" accessibilityLabel="근처 부탁 둘러보기" onPress={() => a.nav(on ? 'nearby' : 'notification-settings')}
    style={({ pressed }) => ({ padding: 18, borderRadius: 18, backgroundColor: c.primarySoft, opacity: pressed ? 0.7 : 1 })}>
    <Row><MapPin size={23} color={c.primaryStrong} /><Stack gap={4} style={{ flex: 1 }}>
      <Txt size={18} weight="700">근처 부탁</Txt><Txt size={13} color={c.secondary}>{!on ? '가는 길의 부탁을 알려드릴게요 · 알림 켜기'
        : n.candidates.length ? `내 주변에서 확인할 수 있는 부탁 ${n.candidates.length}건${n.testMode ? ' · 테스트' : ''}`
          : !n.activeTripCount ? '여행 기간이 시작되면 가까운 부탁을 찾아요' : '내 동선 근처의 부탁 둘러보기'}</Txt>
    </Stack><ChevronRight size={19} color={c.primaryStrong} /></Row>
  </Pressable>;
}

export function NearbyRequestContext({ request }: { request: ProductRequest }) {
  const a = useApp(), n = useNearby();
  if (!n || a.role !== 'traveler' || request.requesterId === a.data?.me.id) return null;
  const item = n.candidates.find((i) => i.request.id === request.id);
  return <Stack gap={10} style={{ padding: 18, backgroundColor: c.primarySoft, borderRadius: 16 }}>
    <Row><Plane size={19} color={c.primaryStrong} /><Txt weight="600">가는 김에 가져와요</Txt></Row>
    {item && <Txt size={14}>현재 위치에서 {distanceLabel(item.distance)} · 도보 약 {Math.max(1, Math.ceil(item.distance / 70))}분{n.testMode ? ' · 테스트 위치' : ''}</Txt>}
    {!item && <Txt size={13} color={c.secondary}>현재 위치에서 거리 확인 전</Txt>}
    {item && <Txt size={12} color={c.secondary}>직선거리로 계산한 예상이에요. 실제 보행 경로와 다를 수 있어요.</Txt>}
    <Txt size={17} weight="700" color={c.primaryStrong}>{request.requestedReward !== undefined ? `여행자 보상 ${money(request.requestedReward)}` : '보상은 지원할 때 제안해요'}</Txt>
    <Txt size={13} color={c.secondary}>상품 구매금액{request.localPriceEstimated ? ' (예상)' : ''} {localMoney(request.localPrice * request.quantity, request.currency)} · {request.quantity}개</Txt>
    <Txt size={12} color={c.secondary}>보상은 수수료 차감 전이에요. 지원 후 구매자가 선택하면 기존 거래가 시작돼요.</Txt>
  </Stack>;
}

export function NearbyScreen() {
  const a = useApp(), n = useNearby();
  const [sort, setSort] = useState<'distance' | 'reward'>('distance');
  if (!n) return <Page title="근처 부탁"><Notice>근처 부탁을 준비하고 있어요.</Notice></Page>;
  if (a.role !== 'traveler') return <Page title="근처 부탁"><Empty title="가져올게요 모드에서 만나요" body="여행자의 동선 근처에 있는 부탁을 모아드려요." action="홈으로" onPress={() => a.tab('home')} /></Page>;
  const selectedIds = a.route.requestIds, selectedPlace = a.data?.places.find((p) => p.id === a.route.placeId);
  const rows = selectedIds ? requestsFromAlert(a.data!, { requestIds: selectedIds, placeId: a.route.placeId || '' })
    .map((request) => ({ request, place: a.data!.places.find((p) => p.id === request.placeId), distance: n.candidates.find((i) => i.request.id === request.id)?.distance }))
    : n.candidates;
  const sorted = [...rows].sort((a, b) => sort === 'reward' ? (b.request.requestedReward ?? -1) - (a.request.requestedReward ?? -1) : (a.distance ?? Infinity) - (b.distance ?? Infinity));
  const on = n.preferences.notificationsEnabled && n.preferences.nearbyEnabled;
  return <Page title="근처 부탁">
    <Stack gap={8}>
      {selectedPlace && <Txt size={24} weight="700">{selectedPlace.name}</Txt>}
      <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}><Txt size={15} color={c.secondary}>{selectedIds ? '알림에 담긴 부탁 · 현재 모집 상태 기준' : `현재 위치 기준 ${distanceLabel(n.preferences.radius)}`}</Txt><Button small kind="ghost" label="알림 설정" onPress={() => a.nav('notification-settings')} /></Row>
      {n.testMode && <Notice>테스트 위치 · 여행 첫날 기준이에요. 실제 위치와 여행 일정은 바꾸지 않아요.</Notice>}
    </Stack>
    <Row style={{ flexWrap: 'wrap', gap: 8 }}>
      {([{ value: 'distance', label: '가까운 순' }, { value: 'reward', label: '보상 높은 순' }] as const).map((item) => <Pressable key={item.value}
        accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: sort === item.value }} aria-checked={sort === item.value} onPress={() => setSort(item.value)}
        style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: sort === item.value ? c.primarySoft : c.paper }}>
        <Txt size={14} color={sort === item.value ? c.primaryStrong : c.secondary}>{item.label}</Txt>
      </Pressable>)}<Txt size={12} color={c.muted}>가는 길 순 · 준비 중</Txt>
    </Row>
    {!!n.error && <Notice tone="error">{n.error}</Notice>}
    {!on && !selectedIds ? <Empty title="가는 길의 부탁을 발견해보세요" body="위치와 알림 사용에 동의하면 가까운 매장의 부탁을 모아드려요." action="근처 부탁 알림 켜기" onPress={() => a.nav('notification-settings')} />
      : !sorted.length && !selectedIds && !n.activeTripCount && !n.testMode ? <Empty title="여행 기간에 가까운 부탁을 찾아요" body="방문 예정 매장과 여행 기간을 등록해주세요. 여행 중일 때만 실제 위치를 사용해요." action="여행 일정 보기" onPress={() => a.nav('trips')} />
      : !sorted.length && !selectedIds && (!n.permissions?.location || !n.permissions?.notifications) ? <Empty title="위치와 알림 권한이 필요해요" body="권한을 허용하지 않아 위치를 확인하지 않고 있어요." action="권한 확인" onPress={() => a.nav('notification-settings')} />
      : !sorted.length ? <Empty title={selectedIds ? '이 부탁은 이미 마감되었어요' : n.point ? '아직 동선 근처에 부탁이 없어요' : '현재 위치를 확인하고 있어요'}
        body={selectedIds ? '근처의 다른 모집 중인 부탁도 확인해보세요.' : n.point ? '방문 예정 매장에 모집 중인 부탁이 생기면 알려드릴게요.' : '정확한 위치가 확인되면 가까운 부탁을 보여드려요.'}
        action={selectedIds ? '전체 근처 부탁 보기' : '다시 확인'} onPress={() => selectedIds ? a.nav('nearby') : void n.check()} />
      : <Stack gap={0}><Txt size={14} color={c.secondary} style={{ marginBottom: 8 }}>확인할 수 있는 부탁 {sorted.length}건</Txt>{sorted.map(({ request, place, distance }) => <Pressable key={request.id}
        accessibilityRole="button" accessibilityLabel={`${request.productName} 요청 보기`} onPress={() => a.nav('request', { id: request.id })}
        style={({ pressed }) => ({ paddingVertical: 20, borderBottomWidth: 1, borderColor: c.border, opacity: pressed ? 0.65 : 1 })}>
        <Row style={{ alignItems: 'flex-start' }}><ProductArt product={request} art={request.art} image={request.productImage} size={66} /><Stack gap={7} style={{ flex: 1, minWidth: 0 }}>
          <Txt size={13} color={c.secondary}>{place?.name || request.storeName}</Txt><Txt size={18} weight="600">{request.productName}</Txt>
          <Txt size={13} color={c.secondary}>{distance !== undefined ? `현재 위치에서 ${distanceLabel(distance)} · 도보 약 ${Math.max(1, Math.ceil(distance / 70))}분 예상` : '현재 위치에서 거리 확인 전'}</Txt>
          <Txt size={14}>상품가 {localMoney(request.localPrice, request.currency)} · {request.quantity}개</Txt>
          <Txt size={17} weight="700" color={c.primaryStrong}>{request.requestedReward !== undefined ? `보상 ${money(request.requestedReward)}` : '보상 제안 가능'}</Txt>
          <Txt size={12} color={c.secondary}>희망 수령일 {request.desiredDate}</Txt><Txt size={14} color={c.primaryStrong}>요청 보기 →</Txt>
        </Stack></Row>
      </Pressable>)}</Stack>}
    <Txt size={12} color={c.secondary}>거리는 직선거리, 보행 시간은 예상이에요. 보상은 수수료 차감 전이며, 방문 전 재고를 확인해주세요. 정확한 위치는 상대방에게 공개되지 않아요.</Txt>
    {on && <Button small kind="ghost" label="현재 위치로 다시 확인" onPress={() => { n.clearTest(); void n.check(); }} />}
  </Page>;
}

export function NearbyTestScreen() {
  const a = useApp(), n = useNearby();
  if (!__DEV__ || !n) return <Page title="근처 부탁"><Notice>개발 빌드의 테스트 메뉴예요.</Notice></Page>;
  const places = a.data!.places.filter((p) => a.data!.trips.some((t) => t.travelerId === a.data!.me.id && t.placeIds.includes(p.id))).slice(0, 8);
  const enabled = a.role === 'traveler' && n.preferences.nearbyEnabled && n.preferences.notificationsEnabled && supported;
  return <Page title="근처 부탁 테스트">
    <Notice>기존 요청 데이터와 내 여행 일정을 사용해요. 선택한 매장에서 약 110m 떨어진 위치·여행 첫날로만 계산하며, 실제 위치·일정·요청 상태는 변경하지 않아요.</Notice>
    {!enabled && <Button label="먼저 근처 부탁 알림 켜기" onPress={() => a.nav('notification-settings')} />}
    <Txt size={13} color={c.secondary}>테스트도 동의와 위치·알림 권한이 필요해요. 테스트 기록은 실제 알림 기록과 분리되며 동일한 중복·하루 제한이 적용돼요.</Txt>
    {places.map((p) => <Card key={p.id}><Stack gap={12}><Txt size={18} weight="600">{p.name}</Txt><Txt size={13} color={c.secondary}>{p.city} · {p.region}</Txt>
      <Button kind="secondary" small disabled={!enabled || n.busy} label={`${p.name} 위치로 확인`} onPress={() => void n.test(p.id, false)} />
      <Button kind="ghost" small disabled={!enabled || n.busy} label="근처 부탁 알림 테스트" icon={Bell} onPress={() => void n.test(p.id, true)} />
    </Stack></Card>)}
    {!places.length && <Empty title="먼저 여행 일정을 등록해주세요" body="방문 예정 매장이 테스트 위치에 나타나요." action="여행 등록" onPress={() => a.nav('trip-form')} />}
    {!!n.error && <Notice tone="error">{n.error}</Notice>}{!!n.status && <Notice>{n.status}</Notice>}
    {n.testMode && <><Button label={`테스트 근처 부탁 ${n.candidates.length}건 보기`} onPress={() => a.nav('nearby')} /><Button kind="ghost" label="테스트 위치 종료" onPress={n.clearTest} /></>}
  </Page>;
}

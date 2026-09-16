import React, { ReactNode, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  Plane,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Wallet,
  LucideIcon,
} from 'lucide-react-native';
import { money, shortDate, UserAddress, TRIP_VERIFICATION_LABEL } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { colors as c } from '../theme/tokens';
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Notice,
  Page,
  Row,
  Section,
  Sheet,
  Stack,
  Txt,
} from '../components/ui';
import { Avatar, PlaceCard } from '../components/visuals';

function AccountGroup({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: 6 }}>
    <Txt size={12} weight="600" color={c.muted} style={{ paddingHorizontal: 4 }}>{title}</Txt>
    <View style={{ backgroundColor: c.paper, borderRadius: 18, paddingHorizontal: 16 }}>{children}</View>
  </View>;
}

function AccountRow({ title, icon: Icon, detail, onPress, label, selected }: {
  title: string; icon: LucideIcon; detail?: string; onPress: () => void; label?: string; selected?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label || title} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 58, justifyContent: 'center', paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}>
    <Row style={{ gap: 12 }}>
      <Icon size={20} color={c.secondary} strokeWidth={1.7} />
      <Txt weight="500" style={{ flex: 1, minWidth: 0 }}>{title}</Txt>
      {!!detail && <Txt size={12} color={selected ? c.green : c.muted} lines={1} style={{ flexShrink: 1, maxWidth: '38%' }}>{detail}</Txt>}
      <ChevronRight size={17} color={c.muted} />
    </Row>
  </Pressable>;
}

type AccountPanel = 'identity' | 'meetups' | 'payments' | 'settlement' | 'notifications' | null;

function AccountDetails({ panel, onClose }: { panel: AccountPanel; onClose: () => void }) {
  const a = useApp(), d = a.data!;
  const ownPayments = d.payments.filter((payment) => payment.buyerId === d.me.id);
  const completed = d.transactions.filter((trade) => ['DELIVERED', 'CONFIRMED', 'SETTLED'].includes(trade.status) && (trade.buyerId === d.me.id || trade.travelerId === d.me.id));
  const meetups = completed.flatMap((trade) => {
    const request = d.requests.find((item) => item.id === trade.requestId);
    const name = request?.meetupPoint?.name || request?.meetupLocation;
    return request?.transport === 'MEETUP' && name ? [{ request, trade, name }] : [];
  }).reverse().filter((item, index, all) => all.findIndex((other) => other.name === item.name && other.request.meetupPoint?.address === item.request.meetupPoint?.address) === index);
  const identityVerified = d.me.verificationLabels.includes('본인 인증');
  const titles: Record<NonNullable<AccountPanel>, string> = {
    identity: '본인 인증', meetups: '직거래 장소 기록', payments: '결제수단 관리', settlement: '정산 계좌', notifications: '알림 설정',
  };
  const navigate = (screen: 'trades' | 'notifications' | 'payouts' | 'trips') => { onClose(); a.nav(screen); };
  return <Sheet visible={!!panel} title={panel ? titles[panel] : ''} onClose={onClose}>
    {panel === 'identity' && <Stack gap={20}>
      <View style={{ alignSelf: 'flex-start', padding: 14, backgroundColor: c.mint, borderRadius: 16 }}><ShieldCheck size={28} color={c.green} /></View>
      <Stack gap={8}>
        <Txt size={21} weight="700">{identityVerified ? '인증 정보를 확인했어요' : '부탁을 받기 전에 본인 확인이 필요해요'}</Txt>
        <Txt color={c.secondary}>{identityVerified ? '현재 계정은 본인 인증이 적용된 체험 계정이에요.' : '휴대폰으로 본인을 확인한 뒤 여행 일정까지 인증하면 부탁을 받을 수 있어요.'}</Txt>
      </Stack>
      <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 16, gap: 12 }}>
        <Row><CheckCircle2 size={18} color={c.green} /><Txt size={14} style={{ flex: 1 }}>상대방에게는 인증 여부만 보여요</Txt></Row>
        <Row><ShieldCheck size={18} color={c.green} /><Txt size={14} style={{ flex: 1 }}>신분증이나 실명 전체는 공개하지 않아요</Txt></Row>
      </View>
      <Notice>실제 본인 인증 서비스는 아직 연결 전이에요. 이 화면에서는 개인정보를 받지 않아요.</Notice>
      <Button label="내 여행 인증 확인" kind="secondary" onPress={() => navigate('trips')} />
    </Stack>}
    {panel === 'meetups' && <Stack gap={4}>
      <Txt size={14} color={c.secondary} style={{ marginBottom: 12 }}>직거래를 마친 장소예요. 다음 부탁에서도 다시 선택할 수 있어요.</Txt>
      {meetups.map(({ request, trade, name }) => <Pressable key={request.id} accessibilityRole="button" accessibilityLabel={`${name} 거래 보기`}
        onPress={() => { onClose(); a.nav('transaction', { id: trade.id }); }} style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: c.border }}>
        <Row><MapPin size={20} color={c.green} /><Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Txt weight="600">{name}</Txt>
          {!!request.meetupPoint?.address && <Txt size={13} color={c.secondary}>{request.meetupPoint.address}</Txt>}
          {!!request.meetupPoint?.detail && <Txt size={12} color={c.muted}>{request.meetupPoint.detail}</Txt>}
        </Stack><ChevronRight size={18} color={c.muted} /></Row>
      </Pressable>)}
      {!meetups.length && <Empty title="아직 만난 장소가 없어요" body="직거래를 완료하면 이곳에 기록돼요." action="내 거래 보기" onPress={() => navigate('trades')} />}
    </Stack>}
    {panel === 'payments' && <Stack gap={20}>
      <Stack gap={8}><CreditCard size={28} color={c.green} /><Txt size={21} weight="700">결제할 때 수단을 선택해요</Txt>
        <Txt color={c.secondary}>카드 또는 계좌를 선택하고 금액을 확인한 후 결제해요.</Txt></Stack>
      <Notice>체험에서는 실제로 결제되지 않아요. 카드·계좌 정보도 저장하지 않으며, 간편결제 등록은 결제 서비스 연결 후 사용할 수 있어요.</Notice>
      {!!ownPayments.length && <View><Txt size={13} weight="600" color={c.secondary}>최근 결제 체험</Txt>
        {ownPayments.slice().reverse().slice(0, 3).map((payment) => {
          const trade = d.transactions.find((item) => item.id === payment.transactionId);
          const request = trade && d.requests.find((item) => item.id === trade.requestId);
          return <AccountRow key={payment.id} title={request?.productName || '거래 결제'} icon={CreditCard} detail={money(payment.amount)} onPress={() => { onClose(); a.nav('transaction', { id: payment.transactionId }); }} />;
        })}
      </View>}
      <Button label="결제할 거래 보기" kind="secondary" onPress={() => navigate('trades')} />
    </Stack>}
    {panel === 'settlement' && <Stack gap={20}>
      <Stack gap={8}><Wallet size={28} color={c.green} /><Txt size={21} weight="700">보상은 본인 명의 계좌로</Txt><Txt color={c.secondary}>구매자가 수령을 확인하면 정산할 수 있어요.</Txt></Stack>
      <View style={{ backgroundColor: c.canvas, borderRadius: 14, padding: 16, gap: 10 }}>
        <Txt size={14}>여행자 보상 − 플랫폼 수수료 10%</Txt><Txt size={13} color={c.secondary}>상품 구매비와 국내 배송비는 보상과 별도로 돌려받아요.</Txt>
      </View>
      <Notice>계좌 등록과 실제 송금은 아직 연결 전이에요. 현재 정산 내역은 체험용이며 계좌번호를 받지 않아요.</Notice>
      <Button label="정산 내역 보기" kind="secondary" onPress={() => navigate('payouts')} />
    </Stack>}
    {panel === 'notifications' && <Stack gap={20}>
      <Row style={{ justifyContent: 'space-between' }}><Txt weight="600">앱 안에서 받는 소식</Txt><Badge>사용 중</Badge></Row>
      <Txt size={14} color={c.secondary}>부탁 수락, 새 메시지, 구매와 전달 소식을 알림함에서 확인해요.</Txt>
      <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 20, gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}><Txt weight="600">휴대폰 푸시 알림</Txt><Txt size={13} color={c.muted}>준비 중</Txt></Row>
        <Txt size={14} color={c.secondary}>푸시 서비스가 연결되면 거래·메시지 알림을 각각 설정할 수 있어요.</Txt>
      </View>
      <Button label="받은 알림 보기" kind="secondary" onPress={() => navigate('notifications')} />
    </Stack>}
  </Sheet>;
}

export function MyScreen() {
  const a = useApp(), d = a.data!;
  const [panel, setPanel] = useState<AccountPanel>(null);
  const ownRequests = d.requests.filter((request) => request.requesterId === d.me.id).length;
  const ownTravelerTrades = d.transactions.filter((trade) => trade.travelerId === d.me.id).length;
  const ownTrips = d.trips.filter((trip) => trip.travelerId === d.me.id).length;
  const reward = d.payouts.filter((payout) => payout.travelerId === d.me.id).reduce(
    (sum, payout) => sum + (payout.netReward ?? payout.reward - Math.round(payout.reward * 0.1)),
    0,
  );
  const modeLabel = a.role === 'buyer' ? '부탁하기' : '여행하기';
  const reviews = d.reviews.filter((review) => review.targetId === d.me.id);
  const identityVerified = d.me.verificationLabels.includes('본인 인증');
  return (
    <Page title="마이" back={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="내 프로필 보기" onPress={() => a.nav('profile', { id: d.me.id })}>
        <Row style={{ paddingVertical: 8, gap: 14 }}>
          <Avatar user={d.me} size={58} />
          <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <Txt size={23} weight="700" lines={1}>{d.me.nickname}</Txt>
            <Row style={{ gap: 4 }}><ShieldCheck size={14} color={identityVerified ? c.green : c.muted} /><Txt size={12} color={c.secondary}>{identityVerified ? '본인 인증 · 체험 계정' : '본인 인증 필요'}</Txt></Row>
          </View>
          <ChevronRight size={20} color={c.muted} />
        </Row>
      </Pressable>
      <Row style={{ justifyContent: 'space-between', gap: 4, paddingBottom: 4 }}>
        {[[`${d.me.completed}건`, '완료한 거래'], [d.me.successRate === null ? '—' : `${d.me.successRate}%`, '거래 성공률'], [`${reviews.length}개`, '받은 후기'], [`${d.me.responseMinutes}분`, '평균 응답']].map(([value, label]) =>
          <View key={label} style={{ flex: 1, alignItems: 'center', gap: 5 }}><Txt size={17} weight="700">{value}</Txt><Txt size={11} color={c.muted}>{label}</Txt></View>)}
      </Row>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border }}>
        <AccountRow title="이용 모드" icon={a.role === 'buyer' ? ShoppingBag : Plane} detail={modeLabel} selected label="이용 모드 설정" onPress={() => a.nav('settings')} />
      </View>
      {a.role === 'traveler' && <Card style={{ backgroundColor: c.mint }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 0 }}><Txt size={12} color={c.secondary}>정산된 보상 · 체험</Txt><Txt size={26} weight="700">{money(reward)}</Txt></View>
          <Button small kind="ghost" label="정산 내역" onPress={() => a.nav('payouts')} />
        </Row>
      </Card>}
      <AccountGroup title="나의 활동">
        <AccountRow title={a.role === 'buyer' ? '내 부탁' : '가져오는 거래'} icon={ShoppingBag} detail={`${a.role === 'buyer' ? ownRequests : ownTravelerTrades}건`} onPress={() => a.tab('trades')} />
        <AccountRow title="여행 일정" icon={Plane} detail={`${ownTrips}개`} onPress={() => a.nav('trips')} />
        <AccountRow title="관심 장소" icon={Heart} detail={`${d.favorites.length}곳`} onPress={() => a.nav('favorites')} />
        <AccountRow title="남긴 후기" icon={Star} onPress={() => a.nav('reviews')} />
      </AccountGroup>
      <AccountGroup title="거래 준비">
        <AccountRow title="본인 인증" icon={ShieldCheck} detail={identityVerified ? '체험 인증' : '확인 필요'} onPress={() => setPanel('identity')} />
        <AccountRow title="배송지 관리" icon={MapPin} detail={`${(d.addresses || []).filter((item) => item.userId === d.me.id).length}개`} onPress={() => a.nav('addresses')} />
        <AccountRow title="직거래 장소 기록" icon={MapPin} onPress={() => setPanel('meetups')} />
        <AccountRow title="결제수단 관리" icon={CreditCard} onPress={() => setPanel('payments')} />
        {a.role === 'traveler' && <AccountRow title="정산 계좌" icon={Wallet} onPress={() => setPanel('settlement')} />}
      </AccountGroup>
      <AccountGroup title="설정과 도움말">
        <AccountRow title="MOA 이용 안내" icon={HelpCircle} detail="3단계" onPress={() => a.nav('guide')} />
        <AccountRow title="알림" icon={Bell} detail={d.notifications.filter((notice) => !notice.read).length ? '새 소식' : undefined} onPress={() => a.nav('notifications')} />
        <AccountRow title="알림 설정" icon={Bell} onPress={() => setPanel('notifications')} />
        <AccountRow title="설정" icon={Settings} onPress={() => a.nav('settings')} />
        <AccountRow title="고객센터" icon={HelpCircle} onPress={() => a.nav('help')} />
      </AccountGroup>
      <Txt size={11} color={c.muted} style={{ textAlign: 'center' }}>모아 0.1.0 · 체험 버전</Txt>
      <AccountDetails panel={panel} onClose={() => setPanel(null)} />
    </Page>
  );
}

type AddressForm = { id: string; label: string; recipient: string; phone: string; postalCode: string; address1: string; address2: string; isDefault: boolean };
export function addressFormErrors(form: AddressForm): Partial<Record<keyof AddressForm, string>> {
  const errors: Partial<Record<keyof AddressForm, string>> = {};
  if (!form.label.trim() || form.label.trim().length > 20) errors.label = '배송지 이름은 1~20자로 입력해주세요.';
  if (!form.recipient.trim() || form.recipient.trim().length > 50) errors.recipient = '받는 분 이름을 50자 이내로 입력해주세요.';
  if (!/^[+\d\s()-]+$/.test(form.phone) || form.phone.replace(/\D/g, '').length < 8 || form.phone.replace(/\D/g, '').length > 15 || form.phone.trim().length > 30) errors.phone = '연락 가능한 전화번호를 입력해주세요.';
  if (!/^\d{3,12}$/.test(form.postalCode.trim())) errors.postalCode = '우편번호를 확인해주세요.';
  if (form.address1.trim().length < 3 || form.address1.trim().length > 160) errors.address1 = '도로명·건물 번호를 포함한 주소를 입력해주세요.';
  if (form.address2.trim().length > 160) errors.address2 = '상세 주소는 160자 이내로 입력해주세요.';
  return errors;
}

export function AddressesScreen() {
  const a = useApp(), d = a.data!;
  const own = (d.addresses || []).filter((item) => item.userId === d.me.id);
  const empty = { id: '', label: '집', recipient: '', phone: '', postalCode: '', address1: '', address2: '', isDefault: !own.length };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(!own.length);
  const errors = addressFormErrors(form);
  const currentDefault = own.find((item) => item.isDefault);
  const defaultRequired = !currentDefault || currentDefault.id === form.id;
  const change = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (Object.keys(errors).length) return;
    const result = await a.mutate<UserAddress>('/addresses', {
      ...(form.id ? { id: form.id } : {}),
      label: form.label.trim(), recipient: form.recipient.trim(), phone: form.phone.trim(),
      postalCode: form.postalCode.trim(), address1: form.address1.trim(), address2: form.address2.trim(),
      isDefault: defaultRequired || form.isDefault,
    }, '배송지를 저장했어요.');
    if (result) { setEditing(false); setForm(empty); }
  };
  return (
    <Page title="배송지 관리" footer={editing ? <Button label="배송지 저장" disabled={Object.keys(errors).length > 0} loading={a.busy} onPress={save} /> : <Button label="새 배송지 추가" icon={MapPin} onPress={() => { setForm({ ...empty, isDefault: !currentDefault }); setEditing(true); }} />}>
      <Txt size={14} color={c.secondary}>기본 배송지는 부탁할 때 바로 채워드려요.</Txt>
      {!editing && own.map((item) => (
        <Card key={item.id}>
          <Stack gap={10}>
            <Row style={{ justifyContent: 'space-between' }}><Txt size={18} weight="700">{item.label}</Txt>{item.isDefault && <Badge>기본 배송지</Badge>}</Row>
            <Txt weight="600">{item.recipient} · {item.phone}</Txt>
            <Txt size={14} color={c.secondary}>({item.postalCode}) {item.address1}{item.address2 ? ` · ${item.address2}` : ''}</Txt>
            <Row style={{ flexWrap: 'wrap' }}>
              {!item.isDefault && <Button small kind="secondary" label="기본으로 설정" onPress={() => a.mutate(`/addresses/${item.id}/default`, {}, '기본 배송지를 바꿨어요.')} />}
              <Button small kind="ghost" label="수정" onPress={() => { setForm({ id: item.id, label: item.label, recipient: item.recipient, phone: item.phone, postalCode: item.postalCode, address1: item.address1, address2: item.address2, isDefault: item.isDefault }); setEditing(true); }} />
            </Row>
          </Stack>
        </Card>
      ))}
      {editing && <Stack gap={20}>
        <Row style={{ justifyContent: 'space-between' }}><Txt size={20} weight="700">{form.id ? '배송지 수정' : '새 배송지'}</Txt><Button small kind="ghost" label="취소" onPress={() => { setEditing(false); setForm(empty); }} /></Row>
        <Field label="배송지 이름" value={form.label} onChange={(v) => change('label', v)} placeholder="집, 회사" error={form.label ? errors.label : undefined} />
        <Field label="받는 분" required value={form.recipient} onChange={(v) => change('recipient', v)} error={form.recipient ? errors.recipient : undefined} />
        <Field label="연락처" required value={form.phone} onChange={(v) => change('phone', v)} placeholder="010-0000-0000" error={form.phone ? errors.phone : undefined} />
        <Field label="우편번호" required value={form.postalCode} onChange={(v) => change('postalCode', v.replace(/[^0-9]/g, ''))} keyboard="numeric" error={form.postalCode ? errors.postalCode : undefined} />
        <Field label="주소" required value={form.address1} onChange={(v) => change('address1', v)} placeholder="도로명 주소" error={form.address1 ? errors.address1 : undefined} />
        <Field label="상세 주소" value={form.address2} onChange={(v) => change('address2', v)} error={errors.address2} />
        <Pressable accessibilityRole="checkbox" accessibilityLabel="기본 배송지로 사용" accessibilityState={{ checked: defaultRequired || form.isDefault, disabled: defaultRequired }} aria-checked={defaultRequired || form.isDefault} aria-disabled={defaultRequired} disabled={defaultRequired} onPress={() => change('isDefault', !form.isDefault)} style={{ minHeight: 44, justifyContent: 'center' }}><Row><CheckCircle2 size={22} color={defaultRequired || form.isDefault ? c.green : c.muted} /><Txt style={{ flex: 1 }}>기본 배송지로 사용</Txt></Row></Pressable>
        {defaultRequired && <Txt size={12} color={c.muted}>기본 배송지를 바꾸려면 다른 배송지를 기본으로 선택해주세요.</Txt>}
      </Stack>}
      {!own.length && !editing && <Empty title="저장된 배송지가 없어요" />}
      {editing && <Txt size={12} color={c.muted}>주소는 거래 상대방에게 필요한 때만 보여줘요.</Txt>}
    </Page>
  );
}
export function FavoritesScreen() {
  const a = useApp(),
    d = a.data!,
    places = d.places.filter((p) => d.favorites.some((f) => f.placeId === p.id));
  return (
    <Page title="마음에 담은 장소">
      {places.map((p) => (
        <PlaceCard
          key={p.id}
          variant="list"
          place={p}
          favorite
          onFavorite={() => a.mutate(`/favorites/${p.id}`, {})}
          onPress={() => a.nav('place', { id: p.id })}
        />
      ))}
      {!places.length && (
        <Empty
          title="어디를 담아볼까요?"
          body="장소의 하트를 눌러 관심 장소에 모아보세요."
          action="장소 찾아보기"
          onPress={() => a.tab('search')}
        />
      )}
    </Page>
  );
}
export function TripsScreen() {
  const a = useApp(),
    d = a.data!,
    trips = d.trips.filter((t) => t.travelerId === d.me.id);
  return (
    <Page
      title="나의 여행 일정"
      footer={<Button label="새 일정 등록" icon={Plane} onPress={() => a.nav('trip-form')} />}
    >
      {trips
        .slice()
        .reverse()
        .map((t) => {
          const places = t.placeIds.flatMap((id) => {
            const place = d.places.find((item) => item.id === id);
            return place ? [place] : [];
          });
          const areas = t.destinationAreas?.length ? t.destinationAreas : [...new Set(places.map((place) => place.city))];
          const stops = [...new Set(t.customStops || [])];
          return (
          <Card key={t.id}>
            <Stack gap={16}>
              <Row style={{ gap: 6 }}><Plane size={16} color={c.green} /><Txt size={13} color={c.secondary}>{t.departureCity} 출발</Txt></Row>
              <Stack gap={6}>
                <Txt size={23} weight="700">{areas.join(' · ') || t.destinationCity}</Txt>
                <Txt size={14} color={c.secondary}>{shortDate(t.startDate)} — {shortDate(t.endDate)}</Txt>
              </Stack>
              <Txt size={12} color={t.verificationStatus === 'NEEDS_REVIEW' ? c.danger : c.secondary}>{TRIP_VERIFICATION_LABEL[t.verificationStatus]}</Txt>
              {(places.length > 0 || stops.length > 0) && <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 10 }}>
                {places.map((place) => <AccountRow key={place.id} title={place.name} icon={MapPin} onPress={() => a.nav('place', { id: place.id })} />)}
                {stops.map((stop) => <Row key={stop} style={{ minHeight: 42, paddingVertical: 8 }}><MapPin size={18} color={c.muted} /><Txt size={14} style={{ flex: 1 }}>{stop}</Txt></Row>)}
              </View>}
              <Button label={t.flightProof ? '항공권 확인 결과 보기' : '왕복 항공권 인증하기'} kind="secondary" icon={ShieldCheck} onPress={() => a.nav('flight-proof', { id: t.id })} />
            </Stack>
          </Card>
        );})}
      {!trips.length && (
        <Empty title="첫 여행을 알려주세요" body="방문할 곳의 요청을 모아 보여드릴게요." action="여행 등록하기" onPress={() => a.nav('trip-form')} />
      )}
    </Page>
  );
}
export function NotificationsScreen() {
  const a = useApp(),
    d = a.data!;
  useEffect(() => {
    a.mutate('/notifications/read', {});
  }, []);
  return (
    <Page title="알림">
      {d.notifications
        .slice()
        .reverse()
        .map((n) => (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            onPress={() =>
              n.transactionId
                ? a.nav('transaction', { id: n.transactionId })
                : n.requestId
                  ? a.nav('request', { id: n.requestId })
                  : a.nav('help')
            }
          >
            <View style={{ paddingVertical: 18, borderBottomWidth: 1, borderColor: c.border }}>
              <Row style={{ alignItems: 'flex-start', gap: 14 }}>
                <View style={{ backgroundColor: c.mint, padding: 10, borderRadius: 14 }}>
                  <Bell color={c.green} size={19} />
                </View>
                <Stack style={{ flex: 1 }} gap={7}>
                  <Txt weight="600">{n.title}</Txt>
                  <Txt size={12} color={c.secondary}>
                    {shortDate(n.createdAt)}
                  </Txt>
                </Stack>
                <ChevronRight size={18} color={c.muted} />
              </Row>
            </View>
          </Pressable>
        ))}
      {!d.notifications.length && (
        <Empty title="새 소식이 없어요" body="수락과 구매, 전달 소식만 알려드릴게요." />
      )}
    </Page>
  );
}
export function SettingsScreen() {
  const a = useApp(), d = a.data!;
  const [demoOpen, setDemoOpen] = useState(false);
  const [panel, setPanel] = useState<AccountPanel>(null);
  const modes = [
    {
      value: 'buyer' as const,
      title: '부탁하기',
      body: '원하는 물건을 부탁해요',
      icon: ShoppingBag,
    },
    {
      value: 'traveler' as const,
      title: '여행하기',
      body: '가는 길의 부탁을 받아요',
      icon: Plane,
    },
  ];
  return (
    <Page title="설정">
      <View>
        <Section title="어떻게 이용할까요?" subtitle="같은 계정으로 언제든 바꿀 수 있어요." />
        <Stack gap={10}>
          {modes.map((mode) => {
            const selected = a.role === mode.value;
            const Icon = mode.icon;
            return (
              <Pressable
                key={mode.value}
                accessibilityRole="button"
                accessibilityLabel={mode.title + ' 모드로 전환'}
                accessibilityState={{ selected }}
                aria-selected={selected}
                onPress={() => {
                  a.setRole(mode.value);
                  a.notify(mode.title + ' 모드로 바꿨어요.');
                  a.tab('home');
                }}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: selected ? c.mint : c.paper,
                  borderWidth: 1,
                  borderColor: selected ? c.green : c.border,
                }}
              >
                <Row>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: selected ? c.paper : c.lilac, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={21} color={selected ? c.green : c.secondary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Txt size={17} weight="700">{mode.title}</Txt>
                    <Txt size={13} color={c.secondary}>{mode.body}</Txt>
                  </View>
                  {selected ? <CheckCircle2 size={22} color={c.green} /> : <ChevronRight size={18} color={c.muted} />}
                </Row>
              </Pressable>
            );
          })}
        </Stack>
      </View>

      <AccountGroup title="계정 관리">
        <AccountRow title="본인 인증" icon={ShieldCheck} onPress={() => setPanel('identity')} />
        <AccountRow title="결제수단 관리" icon={CreditCard} onPress={() => setPanel('payments')} />
        {a.role === 'traveler' && <AccountRow title="정산 계좌" icon={Wallet} onPress={() => setPanel('settlement')} />}
        <AccountRow title="알림 설정" icon={Bell} onPress={() => setPanel('notifications')} />
      </AccountGroup>
      <AccountGroup title="도움말">
        <AccountRow title="MOA 이용 안내" icon={HelpCircle} detail="3단계" onPress={() => a.nav('guide')} />
        <AccountRow title="고객센터" icon={HelpCircle} onPress={() => a.nav('help')} />
        <AccountRow title="최신 정보 불러오기" icon={RefreshCw} onPress={() => a.refresh().then(() => a.notify('최신 정보로 바꿨어요.')).catch(() => a.notify('정보를 불러오지 못했어요. 연결을 확인하고 다시 시도해주세요.'))} />
      </AccountGroup>
      <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="체험 계정 전환" accessibilityState={{ expanded: demoOpen }} aria-expanded={demoOpen} onPress={() => setDemoOpen(!demoOpen)} style={{ minHeight: 56, justifyContent: 'center' }}>
          <Row><View style={{ flex: 1 }}><Txt size={14} color={c.secondary}>체험 계정 전환</Txt><Txt size={12} color={c.muted}>현재 {d.me.nickname} 계정이에요.</Txt></View><ChevronDown size={18} color={c.muted} style={{ transform: [{ rotate: demoOpen ? '180deg' : '0deg' }] }} /></Row>
        </Pressable>
        {demoOpen && <View style={{ paddingTop: 6 }}>
          {d.users.map((user) => (
            <Pressable
              key={user.id}
              accessibilityRole="button"
              accessibilityLabel={user.nickname + ' 계정으로 전환'}
              onPress={() => a.switchActor(user.id)}
              style={{ paddingVertical: 13, borderBottomWidth: user.id === d.users.at(-1)?.id ? 0 : 1, borderColor: c.border }}
            >
              <Row>
                <Avatar user={user} size={40} />
                <Txt weight="600" style={{ flex: 1, minWidth: 0 }} lines={1}>{user.nickname}</Txt>
                {d.me.id === user.id ? <CheckCircle2 size={21} color={c.green} /> : <ChevronRight size={18} color={c.muted} />}
              </Row>
            </Pressable>
          ))}
        </View>}
      </View>
      <Button label="로그아웃" kind="ghost" icon={LogOut} onPress={a.logout} />
      <AccountDetails panel={panel} onClose={() => setPanel(null)} />
    </Page>
  );
}

export function ReviewsScreen() {
  const a = useApp(),
    d = a.data!,
    t = d.transactions.find((x) => x.id === a.route.id),
    [rating, setRating] = useState(5),
    [text, setText] = useState('');
  const already = t && d.reviews.some((r) => r.transactionId === t.id && r.authorId === d.me.id);
  const save = async () => {
    if (!t) return;
    const v = await a.mutate(`/transactions/${t.id}/reviews`, { rating, text }, '후기를 남겼어요.');
    if (v) a.back();
  };
  return (
    <Page
      title="함께한 마음을 남겨요"
      footer={
        t && !already ? (
          <Button
            label="후기 남기기"
            disabled={text.trim().length < 2}
            loading={a.busy}
            onPress={save}
          />
        ) : undefined
      }
    >
      {t && !already ? (
        <>
          <Txt size={28} weight="800">
            이번 부탁은 어땠나요?
          </Txt>
          <Row style={{ justifyContent: 'center', gap: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`${n}점`}
                onPress={() => setRating(n)}
                style={{ padding: 6 }}
              >
                <Star
                  size={36}
                  fill={n <= rating ? c.green : 'none'}
                  color={n <= rating ? c.green : c.border}
                />
              </Pressable>
            ))}
          </Row>
          <Field
            label="후기"
            value={text}
            onChange={setText}
            multiline
            placeholder="좋았던 점을 짧게 알려주세요."
          />
        </>
      ) : (
        <>
          {already && <Notice>이미 이 거래의 후기를 남겼어요.</Notice>}
          {d.reviews
            .filter((r) => r.authorId === d.me.id)
            .map((r) => (
              <Card key={r.id}>
                <Stack>
                  <Txt color={c.green}>{'★'.repeat(r.rating)}</Txt>
                  <Txt>{r.text}</Txt>
                </Stack>
              </Card>
            ))}
          {!d.reviews.some((r) => r.authorId === d.me.id) && (
            <Empty
              title="아직 남긴 후기가 없어요"
              body="거래가 끝나면 짧은 후기로 마음을 전해보세요."
            />
          )}
        </>
      )}
    </Page>
  );
}
export function HelpScreen() {
  const a = useApp();
  const [question, setQuestion] = useState<number | null>(0);
  const questions = [
    { title: '어떻게 부탁하나요?', body: '원하는 물건의 링크나 사진을 보내주세요. 상품 정보를 확인하고 국내 택배나 직거래를 선택하면, 방문 예정인 여행자가 부탁을 확인해요.' },
    { title: '여행 중 부탁은 어떻게 받나요?', body: '여행지와 방문 예정지를 등록하면 같은 곳의 부탁을 모아볼 수 있어요. 본인과 여행 일정 인증 후 가능한 부탁을 선택해요.' },
    { title: '상품은 어떻게 받나요?', body: '여행자가 직접 가져온 뒤 국내 택배로 보내거나 약속한 장소에서 만나요. 거래 화면의 대화하기로 시간과 상세 장소를 정할 수 있어요.' },
    { title: '여행자가 구매하지 못하면요?', body: '품절이나 매장 휴무로 구매하지 못했다면 먼저 대화로 확인해주세요. 거래 화면에서 구매 불가와 환불 상황을 확인하고 다른 여행자에게 다시 부탁할 수 있어요.' },
    { title: '결제와 인증은 실제로 되나요?', body: '지금은 체험 버전이에요. 실제 결제·송금·본인 인증은 연결 전이고, 등록한 새 항공권은 일정만 대조해요. 로그인·지도·상품 인식은 연결된 서비스와 설정에 따라 사용할 수 있어요.' },
  ];
  return (
    <Page title="고객센터">
      <Stack gap={8}>
        <Txt size={26} weight="700">무엇이 궁금하세요?</Txt>
        <Txt size={14} color={c.secondary}>부탁부터 전달까지, 필요한 내용을 모았어요.</Txt>
      </Stack>
      <View>
        {questions.map((item, index) => <View key={item.title} style={{ borderBottomWidth: 1, borderColor: c.border }}>
          <Pressable accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ expanded: question === index }} aria-expanded={question === index} onPress={() => setQuestion(question === index ? null : index)} style={{ minHeight: 64, justifyContent: 'center', paddingVertical: 16 }}>
            <Row><Txt weight="600" style={{ flex: 1, minWidth: 0 }}>{item.title}</Txt><ChevronDown size={18} color={c.muted} style={{ transform: [{ rotate: question === index ? '180deg' : '0deg' }] }} /></Row>
          </Pressable>
          {question === index && <Txt size={14} color={c.secondary} style={{ paddingBottom: 20, lineHeight: 23 }}>{item.body}</Txt>}
        </View>)}
      </View>
      <AccountGroup title="거래가 진행 중이라면">
        <AccountRow title="거래와 대화 확인하기" icon={ShoppingBag} onPress={() => a.tab('trades')} />
      </AccountGroup>
      <Txt size={12} color={c.muted}>상담 접수는 아직 준비 중이에요. 이 체험 화면에서는 상담이 접수되거나 결제가 이루어지지 않아요.</Txt>
      <Button label="첫 부탁 만들기" kind="secondary" onPress={() => a.nav('request-form')} />
    </Page>
  );
}

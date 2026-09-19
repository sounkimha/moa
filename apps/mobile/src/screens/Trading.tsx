import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ImagePlus,
  Landmark,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Package,
  Plane,
  RefreshCw,
  Send,
  ShieldCheck,
  Stamp,
  Truck,
  Wallet,
} from 'lucide-react-native';
import { Place, Transaction, money, shortDate, STATUS_LABEL, TRANSPORT_LABEL, travelerEarnings } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { MeetupSummary } from '../components/MeetupSummary';
import { PlaneRouteAnimation } from '../components/travel-route';
import { RequestPaymentScreen } from './RequestPayment';
import { ChatReplies } from '../components/chat-replies';
import { colors as c, radius, space, typography } from '../theme/tokens';
import { pickImage } from '../lib/images';
import demoImages from '../lib/demo-images.json';
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  Empty,
  Field,
  DateField,
  Notice,
  Page,
  Row,
  Section,
  SectionTabs,
  Stack,
  Txt,
} from '../components/ui';
import { Avatar, MoneyBreakdown, ProductArt, ProductRow, Timeline } from '../components/visuals';
const tradeStatusLabel = (transaction: Transaction, domestic = false) => {
  if (transaction.status === 'TRAVELING' && domestic) return '약속한 곳으로 이동해요';
  if (transaction.status === 'SHIPPED' && transaction.transport === 'MEETUP') return '만날 약속이 준비됐어요';
  return STATUS_LABEL[transaction.status];
};
const optimizedRoute = (places: Place[]) => {
  if (places.length < 2) return places;
  const remaining = places.slice(1), ordered = [places[0]];
  while (remaining.length) {
    const current = ordered.at(-1)!;
    remaining.sort((a, b) => (a.latitude - current.latitude) ** 2 + (a.longitude - current.longitude) ** 2 - ((b.latitude - current.latitude) ** 2 + (b.longitude - current.longitude) ** 2));
    ordered.push(remaining.shift()!);
  }
  return ordered;
};

/** Five readable milestones using the same transaction status order as the detail flow. */
function TradeJourney({ status }: { status: Transaction['status'] }) {
  const progress = ['MATCHED', 'PAYMENT_HELD', 'PURCHASED', 'TRAVELING', 'SHIPPED', 'DELIVERED', 'CONFIRMED', 'SETTLED'].indexOf(status);
  const stages = [{ at: 0, label: '매칭' }, { at: 2, label: '구매' }, { at: 3, label: '이동' }, { at: 4, label: '전달' }, { at: 6, label: '완료' }];
  if (progress < 0) return null;
  const active = stages.reduce((current, stage, index) => progress >= stage.at ? index : current, 0);
  return <Row accessibilityLabel={`거래 진행 단계: ${stages[active].label}`} style={{ gap: 0, paddingVertical: 2 }}>
    {stages.map((stage, index) => <View key={stage.label} style={{ flex: 1, minWidth: 0, gap: 5, alignItems: 'center' }}>
      <View style={{ height: 20, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        {index > 0 && <View style={{ position: 'absolute', left: 0, width: '50%', height: 1, backgroundColor: index <= active ? c.primary : c.border }} />}
        {index < stages.length - 1 && <View style={{ position: 'absolute', right: 0, width: '50%', height: 1, backgroundColor: index < active ? c.primary : c.border }} />}
        <View style={{ width: index === active ? 20 : 12, height: index === active ? 20 : 12, borderRadius: 10, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center', borderWidth: index === active ? 1 : 0, borderColor: c.primaryTint }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: index <= active ? c.primary : c.border }} />
        </View>
      </View>
      <Txt size={11} color={index === active ? c.primaryStrong : c.secondary} weight={index === active ? '700' : '400'}>{stage.label}</Txt>
    </View>)}
  </Row>;
}

export function TradesScreen() {
  const a = useApp(), d = a.data!, buyer = a.role === 'buyer';
  const [filter, setFilter] = useState('진행 중');
  useEffect(() => setFilter('진행 중'), [a.role]);
  const myTransactions = d.transactions.filter((t) => buyer ? t.buyerId === d.me.id : t.travelerId === d.me.id);
  const completed = (t: Transaction) => ['CONFIRMED', 'SETTLED', 'CANCELLED'].includes(t.status);
  const transactions = myTransactions.filter((t) => filter === '완료' ? completed(t) : !completed(t)).slice().reverse();
  const waitingLabel = buyer ? '내 요청' : '지원한 부탁';
  const requests = d.requests.filter((r) => r.requesterId === d.me.id && !myTransactions.some((t) => t.requestId === r.id));
  const offers = d.offers.filter((o) => o.travelerId === d.me.id && !myTransactions.some((t) => t.offerId === o.id));
  const actionLabel = (t: Transaction) => {
    if (t.status === 'MATCHED') return buyer ? '결제를 완료해주세요' : '이전 거래 · 결제 확인이 필요해요';
    if (t.status === 'PAYMENT_HELD') return buyer ? '여행자가 구매할 차례예요' : '구매 후 사진을 올려주세요';
    if (t.status === 'PURCHASED') return '약속한 방법으로 전달을 준비해요';
    if (t.status === 'TRAVELING') return buyer ? '전달 소식을 기다려요' : t.transport === 'MEETUP' ? '만날 약속을 등록해주세요' : t.transport === 'CONVENIENCE_PARCEL' ? '편의점 택배 정보를 등록해주세요' : '국내 택배 정보를 등록해주세요';
    if (['SHIPPED', 'DELIVERED'].includes(t.status)) return buyer ? '받으셨다면 구매를 확정해주세요' : '구매자의 수령을 기다려요';
    if (t.status === 'CONFIRMED') return buyer ? '받은 상품은 어떠셨나요?' : '정산을 받을 수 있어요';
    return STATUS_LABEL[t.status];
  };
  return (
    <Page title="거래" back={false}>
      <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}><Stack gap={space.sm} style={{ flex: 1, minWidth: 0 }}><Row style={{ gap: 6 }}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.primary }} /><View style={{ width: 24, height: 1, backgroundColor: c.primaryTint }} /><Plane size={13} color={c.primary} /><Txt size={11} color={c.primaryStrong} weight="700">{buyer ? '나에게 오는 여정' : '함께 가져오는 여정'}</Txt></Row><Txt size={26} weight="800">{buyer ? '설레는 기다림' : '가는 길의 약속'}</Txt></Stack><View style={{ alignItems: 'center', minWidth: 64, padding: space.md, backgroundColor: c.primarySoft, borderRadius: radius.md, gap: 2 }}><Txt size={24} weight="800" color={c.primaryStrong}>{myTransactions.filter((item) => !completed(item)).length}</Txt><Txt size={11} color={c.secondary}>진행 중</Txt></View></Row>
      <SectionTabs items={['진행 중', waitingLabel, '완료']} value={filter} onChange={setFilter} />
      {filter === waitingLabel ? (
        <Stack gap={12}>
          {buyer ? requests.map((r) => (
            <View key={r.id} style={{ borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 16 }}>
              <Row style={{ justifyContent: 'space-between' }}><Badge>{STATUS_LABEL[r.status]}</Badge><Txt size={12} color={c.secondary}>{shortDate(r.desiredDate)}까지</Txt></Row>
              <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
            </View>
          )) : offers.map((o) => {
            const r = d.requests.find((r) => r.id === o.requestId);
            return <Card key={o.id}><Stack gap={12}>
              <Row style={{ justifyContent: 'space-between' }}><Badge>{o.status === 'PENDING' ? '구매자 확인 대기' : o.status === 'ACCEPTED' ? '매칭 완료' : o.status === 'REJECTED' ? '다른 여행자가 선택됐어요' : '취소된 부탁'}</Badge><Txt weight="700">{money(o.reward)}</Txt></Row>
              <Txt weight="600">{r?.productName || '종료된 부탁'}</Txt>
              <Txt size={13} color={c.secondary}>{shortDate(o.estimatedDeliveryDate)} 전달 예정</Txt>
              {r && <Button small kind="secondary" label="요청 보기" onPress={() => a.nav('request', { id: r.id })} />}
            </Stack></Card>;
          })}
          {(buyer ? !requests.length : !offers.length) && <Empty title={buyer ? '기다리는 부탁이 없어요' : '지원한 부탁이 없어요'} body={buyer ? '원하는 장소에서 첫 부탁을 남겨보세요.' : '가는 길의 부탁을 찾아보세요.'} action={buyer ? '이거 부탁하기' : '내 동선 보기'} onPress={() => buyer ? a.nav('request-form') : a.tab('home')} />}
        </Stack>
      ) : (
        <Stack gap={14}>
          <Txt size={13} color={c.secondary}>{buyer ? '받을 물건' : '가져올 물건'} {transactions.length}건</Txt>
          {transactions.map((t) => {
            const r = d.requests.find((r) => r.id === t.requestId);
            if (!r) return null;
            const partner = d.users.find((u) => u.id === (buyer ? t.travelerId : t.buyerId));
            const room = d.rooms.find((room) => room.transactionId === t.id);
            return <Card key={t.id} style={{ padding: 0, overflow: 'hidden' }}>
              <Pressable accessibilityRole="button" accessibilityLabel={r.productName + ' 거래 보기'} onPress={() => a.nav(t.status === 'MATCHED' && buyer ? 'payment' : 'transaction', { id: t.id })} style={{ padding: 18, gap: 16 }}>
                <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><Badge color={t.status === 'DISPUTED' ? c.danger : c.primaryStrong} bg={t.status === 'DISPUTED' ? c.dangerBg : c.primarySoft}>{tradeStatusLabel(t, r.country === r.deliveryCountry)}</Badge><Row style={{ gap: 3 }}><MapPin size={12} color={c.secondary} /><Txt size={12} color={c.secondary}>{r.city}</Txt></Row></Row>
                <Row style={{ alignItems: 'flex-start', gap: space.md }}><ProductArt product={r} art={r.art} image={r.productImage} featured={r.productName.includes('치이카와')} size={62} /><Stack gap={5} style={{ flex: 1, minWidth: 0 }}><Txt size={16} weight="700" lines={2}>{r.productName}</Txt><Txt size={12} color={c.secondary}>{shortDate(t.estimatedDeliveryDate)} 전달 · {TRANSPORT_LABEL[t.transport]}</Txt><Txt size={18} color={buyer ? c.ink : c.primaryStrong} weight="700">{buyer ? money(t.totalPrice) : '보상 ' + money(t.travelerReward)}</Txt></Stack></Row>
                <TradeJourney status={t.status} />
                <Row style={{ paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.border }}><Txt size={13} color={t.status === 'DISPUTED' ? c.danger : c.primaryDeep} weight="600" style={{ flex: 1 }}>{actionLabel(t)}</Txt><ChevronRight size={17} color={c.primary} /></Row>
              </Pressable>
              {partner && room && <View style={{ borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.ultraSoft, paddingHorizontal: 18, paddingVertical: 6 }}><Row style={{ justifyContent: 'space-between' }}><Row style={{ flex: 1 }}><Avatar user={partner} size={26} /><Txt size={12} color={c.secondary} lines={1} style={{ flex: 1 }}>{partner.nickname}</Txt></Row><Button small kind="ghost" icon={MessageCircle} label="대화하기" onPress={() => a.nav('chat', { id: t.id })} /></Row></View>}
            </Card>;
          })}
          {!transactions.length && <Empty title={filter === '완료' ? '아직 완료된 거래가 없어요' : '진행 중인 거래가 없어요'} body={filter === '완료' ? '전달을 마친 부탁이 여기에 모여요.' : buyer ? '등록한 부탁은 내 요청에서 확인해요.' : '지원한 부탁에서 구매자가 나를 선택하면 거래와 대화가 시작돼요.'} action={filter === '완료' ? undefined : buyer ? '내 요청 보기' : '가는 길의 부탁 보기'} onPress={() => buyer ? setFilter(waitingLabel) : a.tab('home')} />}
        </Stack>
      )}
    </Page>
  );
}
export function PaymentScreen() {
  const a = useApp();
  return a.route.requestIds?.[0] ? <RequestPaymentScreen key={a.route.requestIds[0]} requestId={a.route.requestIds[0]} /> : <LegacyPaymentScreen />;
}
function LegacyPaymentScreen() {
  const a = useApp(), d = a.data!, t = d.transactions.find((x) => x.id === a.route.id);
  const [agreed, setAgreed] = useState(false);
  const [fail, setFail] = useState(false);
  const [method, setMethod] = useState<'CARD' | 'ACCOUNT' | ''>('');
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  if (!t) return <Page title="결제"><Empty /></Page>;
  const r = d.requests.find((r) => r.id === t.requestId), u = d.users.find((u) => u.id === t.travelerId);
  if (!r || !u) return <Page title="결제"><Empty title="거래 정보를 다시 확인해주세요" body="상품이나 여행자 정보를 불러오지 못했어요." action="거래 목록으로" onPress={() => a.tab('trades')} /></Page>;
  if (t.buyerId !== d.me.id) return <Page title="결제"><Empty title="구매자가 결제할 차례예요" body="결제가 완료되면 거래 화면에서 알려드려요." action="거래 진행 보기" onPress={() => a.nav('transaction', { id: t.id })} /></Page>;
  const reference = method === 'CARD' ? '체험 카드 끝 4242' : '체험 계좌 끝 0001';
  const canPay = t.status === 'MATCHED' && t.buyerId === d.me.id;
  const pay = async () => {
    if (!canPay) {
      a.nav('transaction', { id: t.id });
      return;
    }
    if (!method) {
      setPaymentError('아래에서 카드 또는 계좌를 선택해주세요.');
      a.notify('카드 또는 계좌를 먼저 선택해주세요.');
      return;
    }
    if (!paymentReady) {
      setPaymentReady(true);
      return;
    }
    if (!agreed) {
      setPaymentError('결제 금액을 확인한 후 체크해주세요.');
      a.notify('결제 금액 확인에 체크해주세요.');
      return;
    }
    setPaymentError('');
    const result = await a.mutate<Transaction>(
      `/transactions/${t.id}/actions`,
      { action: 'PAY', expectedRevision: t.revision, paymentMethod: method, paymentReference: reference, simulateFailure: fail },
      '결제 체험을 완료했어요.',
    );
    if (result) a.nav('transaction', { id: t.id });
    else setPaymentError('결제가 완료되지 않았어요. 거래 상태를 확인한 뒤 다시 시도해주세요.');
  };
  return (
    <Page title="안전결제" footer={<Stack gap={space.md}>
      <Row style={{ justifyContent: 'space-between' }}><Txt size={13} color={c.secondary}>총 결제금액</Txt><Txt size={25} weight="800">{money(t.totalPrice)}</Txt></Row>
      <Button label={!canPay ? '거래 진행 보기' : paymentReady ? money(t.totalPrice) + ' 결제 체험하기' : method ? '이 결제수단으로 계속' : '결제수단을 선택해주세요'} loading={a.busy} icon={LockKeyhole} onPress={() => void pay()} />
    </Stack>}>
      <Row style={{ gap: space.sm }}>
        {['결제수단', '금액 확인'].map((label, index) => <Row key={label} style={{ gap: space.xs }}><View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: index === (paymentReady ? 1 : 0) ? c.primary : c.primarySoft }}><Txt size={11} weight="700" color={index === (paymentReady ? 1 : 0) ? c.onPrimary : c.primary}>{index + 1}</Txt></View><Txt size={12} weight="600" color={index === (paymentReady ? 1 : 0) ? c.ink : c.muted}>{label}</Txt>{index === 0 && <ChevronRight size={14} color={c.muted} />}</Row>)}
      </Row>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Row style={{ padding: space.lg, alignItems: 'flex-start' }}>
          <ProductArt product={r} art={r.art} image={r.productImage} featured={r.productName.includes('치이카와')} size={80} />
          <Stack gap={space.xs} style={{ flex: 1, minWidth: 0 }}><Txt size={12} color={c.primary} weight="600">{r.city} · {r.storeName}</Txt><Txt size={17} weight="700" lines={3}>{r.productName}</Txt><Txt size={13} color={c.secondary}>{r.quantity}개 · {TRANSPORT_LABEL[t.transport]}</Txt></Stack>
        </Row>
        <View style={{ padding: space.lg, borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.border, backgroundColor: c.primarySoft }}><Row><Avatar user={u} size={32} /><Stack gap={2} style={{ flex: 1 }}><Txt size={13} weight="600">{u.nickname}님이 가져와요</Txt><Txt size={12} color={c.secondary}>{shortDate(t.estimatedDeliveryDate)} 전달 예정</Txt></Stack><ShieldCheck size={20} color={c.primary} /></Row></View>
      </Card>
      <Stack gap={space.xs}><Txt size={typography.title} weight="700">{paymentReady ? '금액을 확인해주세요' : '어떻게 결제할까요?'}</Txt><Txt size={13} color={c.secondary}>상품을 받은 뒤 여행자에게 정산돼요.</Txt></Stack>
      {!!paymentError && <Notice tone="error">{paymentError}</Notice>}
      {!paymentReady ? (
        <Stack gap={12}>
          {[
            { value: 'CARD' as const, title: '카드로 결제', subtitle: '체험 카드 · 4242', icon: CreditCard },
            { value: 'ACCOUNT' as const, title: '계좌로 결제', subtitle: '체험 계좌 · 0001', icon: Landmark },
          ].map((item) => {
            const selected = method === item.value, Icon = item.icon;
            return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.title} aria-checked={selected} accessibilityState={{ checked: selected }} onPress={() => { setMethod(item.value); setAgreed(false); setPaymentError(''); }} style={({ pressed }) => ({ borderWidth: selected ? 2 : 1, borderColor: selected ? c.primary : c.border, borderRadius: radius.md, padding: selected ? 19 : 20, backgroundColor: selected ? c.primarySoft : c.paper, opacity: pressed ? 0.8 : 1 })}><Row><View style={{ width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? c.paper : c.canvas }}><Icon size={23} color={selected ? c.primary : c.secondary} /></View><Stack gap={space.xs} style={{ flex: 1 }}><Txt weight="700">{item.title}</Txt><Txt size={13} color={c.secondary}>{item.subtitle}</Txt></Stack><CheckCircle2 size={22} color={selected ? c.primary : c.border} /></Row></Pressable>;
          })}
        </Stack>
      ) : (
        <Stack gap={16}>
          <Card><Row>{method === 'CARD' ? <CreditCard size={24} color={c.primary} /> : <Landmark size={24} color={c.primary} />}<View style={{ flex: 1 }}><Txt size={12} color={c.secondary}>선택한 결제수단</Txt><Txt weight="700">{reference}</Txt></View><Button kind="ghost" small label="변경" onPress={() => { setPaymentReady(false); setAgreed(false); setPaymentError(''); }} /></Row></Card>
        </Stack>
      )}
      <Card><Stack gap={space.lg}><Txt size={17} weight="700">결제 내역</Txt><MoneyBreakdown price={t} /></Stack></Card>
      {paymentReady && <Pressable accessibilityRole="checkbox" accessibilityLabel="결제 금액 확인" aria-checked={agreed} accessibilityState={{ checked: agreed }} onPress={() => { setAgreed(!agreed); setPaymentError(''); }} style={{ minHeight: 56, padding: space.lg, borderRadius: radius.md, backgroundColor: agreed ? c.primarySoft : c.paper, borderWidth: 1, borderColor: agreed ? c.primary : c.border }}><Row style={{ alignItems: 'flex-start' }}><CheckCircle2 size={24} color={agreed ? c.primary : c.muted} /><Txt size={14} style={{ flex: 1 }}>상품·보상·국내 전달비와 체험 결제 금액을 확인했어요.</Txt></Row></Pressable>}
      <Row style={{ alignItems: 'flex-start' }}><ShieldCheck size={18} color={c.primary} /><Txt size={12} color={c.secondary} style={{ flex: 1 }}>체험 결제예요. 예시 카드·계좌로 진행하며 실제 출금이나 인증은 일어나지 않아요. 실제 결제정보는 입력하지 마세요.</Txt></Row>
      <Button small kind="ghost" label={fail ? '결제 실패 체험 켜짐 · 끄기' : '결제 실패 상태도 체험하기'} onPress={() => setFail(!fail)} />
    </Page>
  );
}
export function TransactionScreen() {
  const a = useApp(),
    d = a.data!,
    t = d.transactions.find((x) => x.id === a.route.id);
  const [shipping, setShipping] = useState(false),
    [carrier, setCarrier] = useState(''),
    [tracking, setTracking] = useState(''),
    [problem, setProblem] = useState(false),
    [reason, setReason] = useState(''),
    [cancelConfirm, setCancelConfirm] = useState(false),
    [showPrice, setShowPrice] = useState(false);
  if (!t)
    return (
      <Page title="거래 진행">
        <Empty />
      </Page>
    );
  const r = d.requests.find((x) => x.id === t.requestId),
    buyer = t.buyerId === d.me.id,
    other = d.users.find((u) => u.id === (buyer ? t.travelerId : t.buyerId)),
    travelerUser = d.users.find((u) => u.id === t.travelerId),
    escrow = d.escrows.find((e) => e.transactionId === t.id),
    receipt = d.receipts.find((x) => x.transactionId === t.id),
    shipment = d.shipments.find((x) => x.transactionId === t.id),
    offer = d.offers.find((item) => item.id === t.offerId),
    trip = d.trips.find((item) => item.id === offer?.tripId);
  if (!r || !other || !travelerUser) return <Page title="거래 상세"><Empty title="거래 정보를 다시 확인해주세요" body="상품이나 거래 상대 정보를 불러오지 못했어요." action="거래 목록으로" onPress={() => a.tab('trades')} /></Page>;
  const acceptedPlaces = [...new Set(d.transactions.filter((item) => item.travelerId === t.travelerId && d.offers.find((o) => o.id === item.offerId)?.tripId === trip?.id && !['CANCELLED', 'SETTLED'].includes(item.status)).map((item) => d.requests.find((request) => request.id === item.requestId)?.placeId).filter(Boolean))]
    .map((id) => d.places.find((place) => place.id === id)).filter(Boolean);
  const routePlaces = optimizedRoute((acceptedPlaces.length ? acceptedPlaces : (trip?.placeIds.map((id) => d.places.find((place) => place.id === id)).filter(Boolean) || [])) as Place[]);
  const action = async (code: string, extra: object = {}) =>
    a.mutate<Transaction>(
      `/transactions/${t.id}/actions`,
      { action: code, expectedRevision: t.revision, ...extra },
      code === 'CANCEL' ? undefined : '거래 상태를 업데이트했어요.',
    );
  if (shipping && !buyer && t.status === 'TRAVELING')
    return (
      <Page
        title={t.transport === 'MEETUP' ? '전달 약속 등록' : t.transport === 'CONVENIENCE_PARCEL' ? '편의점 택배 등록' : '운송장 등록'}
        backLabel="거래로"
        onBack={() => setShipping(false)}
        footer={
          <Button
            label="등록하고 알리기"
            disabled={carrier.trim().length < 2 || tracking.trim().length < 3}
            loading={a.busy}
            onPress={async () => {
              const value = await action('SHIP', { carrier, trackingNumber: tracking });
              if (value) setShipping(false);
            }}
          />
        }
      >
        <Stack gap={8}>
          <Badge>전달 마지막 단계</Badge>
          <Txt size={28} weight="800">
            {t.transport === 'MEETUP'
              ? '만날 장소와 시간을\n입력해요.'
              : t.transport === 'CONVENIENCE_PARCEL' ? '편의점 택배\n접수 정보를 입력해요.' : '구매자에게 보낼\n배송 정보를 입력해요.'}
          </Txt>
          <Txt color={c.secondary}>
            {t.transport === 'MEETUP'
              ? '합의한 전달 약속을 등록하면 구매자가 수령을 확인할 수 있어요.'
              : t.transport === 'CONVENIENCE_PARCEL' ? '접수한 편의점 또는 택배사와 운송장 번호를 등록하면 구매자에게 알림이 가요.' : '운송장을 등록하면 거래가 배송 중으로 바뀌고 구매자에게 알림이 가요.'}
          </Txt>
        </Stack>
        <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
        <Card>
          <Stack gap={16}>
            <Field
              label={t.transport === 'MEETUP' ? '전달 장소' : t.transport === 'CONVENIENCE_PARCEL' ? '접수 편의점 또는 택배사' : '배송사'}
              value={carrier}
              onChange={setCarrier}
              required
            />
            <Field
              label={t.transport === 'MEETUP' ? '약속 일시' : '운송장 번호'}
              value={tracking}
              onChange={setTracking}
              required
            />
          </Stack>
        </Card>
        <Notice>
          {t.transport === 'MEETUP'
            ? '등록한 약속은 거래 참여자에게만 보여요. 변경이 필요하면 채팅으로 먼저 알려주세요.'
            : '운송장 번호는 거래 참여자에게만 보여요. 실제 택배사 배송 조회는 아직 연결되지 않았어요.'}
        </Notice>
      </Page>
    );
  let next: { label: string; run: () => void } | null = null;
  if (buyer && t.status === 'MATCHED')
    next = { label: '안전결제 이어가기', run: () => a.nav('payment', { id: t.id }) };
  if (!buyer && t.status === 'PAYMENT_HELD')
    next = { label: '상품 구매 인증하기', run: () => a.nav('receipt', { id: t.id }) };
  if (!buyer && t.status === 'PURCHASED')
    next = { label: '전달 준비 시작하기', run: () => action('TRAVEL') };
  if (!buyer && t.status === 'TRAVELING')
    next = {
      label: t.transport === 'MEETUP' ? '전달 일정 등록' : t.transport === 'CONVENIENCE_PARCEL' ? '편의점 택배 등록하기' : '운송장 등록하기',
      run: () => {
        if (t.transport === 'MEETUP' && !carrier) setCarrier(r.meetupLocation || '');
        setShipping(true);
      },
    };
  if (buyer && ['SHIPPED', 'DELIVERED'].includes(t.status))
    next = {
      label: t.status === 'SHIPPED' ? '수령하고 구매 확정하기' : '구매 확정 마치기',
      run: () => a.nav('receive', { id: t.id }),
    };
  if (!buyer && t.status === 'CONFIRMED')
    next = {
      label: '보상 정산 체험하기',
      run: async () => {
        const v = await action('SETTLE');
        if (v) a.nav('payouts');
      },
    };
  const held = escrow?.status === 'HELD',
    frozen = escrow?.status === 'FROZEN',
    unavailable = receipt?.outcome === 'OUT_OF_STOCK';
  const domestic = r.country === r.deliveryCountry;
  const isComingHome = t.status === 'TRAVELING' && !domestic;
  const isDomesticDelivery = ['SHIPPED', 'DELIVERED'].includes(t.status);
  const handoffIcon = t.transport === 'MEETUP' ? MapPin : Truck;
  const StatusIcon = isComingHome ? Plane : t.status === 'TRAVELING' && domestic ? MapPin : isDomesticDelivery ? handoffIcon : ['CONFIRMED', 'SETTLED'].includes(t.status) ? CheckCircle2 : t.status === 'DISPUTED' ? AlertCircle : Package;
  const statusTitle = isComingHome ? `${travelerUser.nickname}님이\n상품과 함께 돌아와요` : t.status === 'TRAVELING' && domestic ? '약속한 곳으로 이동해요' : isDomesticDelivery ? t.transport === 'MEETUP' ? t.status === 'DELIVERED' ? '상품을 전달받았어요' : '만날 약속이 준비됐어요' : t.status === 'DELIVERED' ? '상품이 도착했어요' : t.transport === 'CONVENIENCE_PARCEL' ? '편의점 택배로 오는 중이에요' : '국내 택배로 오는 중이에요' : ['CONFIRMED', 'SETTLED'].includes(t.status) ? '이번 여정을 함께 마쳤어요' : STATUS_LABEL[t.status];
  if (buyer && t.status === 'CANCELLED')
    return (
      <Page
        key={`cancelled-${t.id}`}
        title={unavailable ? '구매하지 못했어요' : '거래 취소'}
        footer={
          <Stack gap={8}>
            <Button
              label={unavailable ? '다시 부탁하기' : '다른 사람에게 부탁하기'}
              icon={RefreshCw}
              onPress={() => a.nav('request-form', { id: r.id, placeId: r.placeId })}
            />
            <Button
              label="부탁하고 싶지 않아요"
              kind="ghost"
              onPress={() => a.tab('home')}
            />
          </Stack>
        }
      >
        <Stack gap={12}>
          <Badge>{unavailable ? unavailableLabel(receipt.unavailableReason) : '거래가 취소됐어요'}</Badge>
          <Txt size={28} weight="800">
            {unavailable ? '이번 방문에서는\n구매하지 못했어요.' : '다른 사람에게\n부탁해보실래요?'}
          </Txt>
          <Txt color={c.secondary}>
            {unavailable
              ? '여행자가 매장에서 확인한 내용이에요. 결제금은 환불됐고, 원하면 재입고 뒤 다시 부탁할 수 있어요.'
              : '같은 장소에 가는 다른 여행자를 기다려볼 수 있어요. 기존 상품과 수령 정보를 확인한 뒤 다시 등록해주세요.'}
          </Txt>
        </Stack>
        {unavailable && (
          <Card style={{ backgroundColor: c.butter }}>
            <Stack gap={12}>
              <Row><AlertCircle size={21} color={c.ink} /><Txt weight="700">매장 방문 기록</Txt></Row>
              {!!receipt.productImage && <Image source={{ uri: receipt.productImage }} style={{ width: '100%', height: 190, borderRadius: 14 }} resizeMode="cover" />}
              <Txt size={13}>{receipt.storeName} · {receipt.purchasedAt}</Txt>
              <Txt size={13} color={c.secondary}>{receipt.locationNote}</Txt>
              {!!receipt.unavailableNote && <Txt size={13}>{receipt.unavailableNote}</Txt>}
            </Stack>
          </Card>
        )}
        <Card>
          <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
        </Card>
        <Notice>
          {escrow?.status === 'REFUNDED'
            ? `결제한 모의 금액 ${money(t.totalPrice)}은 전액 환불됐어요.`
            : '결제 전에 취소되어 청구된 금액은 없어요.'}
          {'\n'}새 부탁은 직접 등록하기 전까지 공개되지 않아요.
          {'\n'}다시 등록하면 이전에 제안한 다른 여행자에게 앱 내 알림을 보내요.
        </Notice>
        <Txt size={13} color={c.secondary}>
          취소된 거래와 대화 기록은 거래 메뉴에서 다시 확인할 수 있어요.
        </Txt>
        <Button
          small
          kind="secondary"
          label="이전 거래 대화 보기"
          icon={MessageCircle}
          onPress={() => a.nav('chat', { id: t.id })}
        />
      </Page>
    );
  return (
    <Page
      title="거래 상세"
      footer={
        next ? (
          <Button label={next.label} loading={a.busy} onPress={next.run} />
        ) : (
          <Button
            label="거래 채팅 열기"
            kind="secondary"
            icon={MessageCircle}
            onPress={() => a.nav('chat', { id: t.id })}
          />
        )
      }
    >
      <View style={{ backgroundColor: frozen ? c.dangerBg : c.primarySoft, borderRadius: radius.lg, padding: space.page, gap: space.lg }}>
        <Row style={{ justifyContent: 'space-between' }}><Badge bg={c.paper} color={frozen ? c.danger : c.primaryStrong}>{tradeStatusLabel(t, domestic)}</Badge><StatusIcon size={24} color={frozen ? c.danger : c.primary} /></Row>
        <Stack gap={space.sm}><Txt size={typography.hero} weight="800">{statusTitle}</Txt><Txt size={13} color={c.secondary}>{shortDate(t.estimatedDeliveryDate)} 전달 예정 · {TRANSPORT_LABEL[t.transport]}</Txt></Stack>
        {isComingHome && trip && <Stack gap={space.sm}><PlaneRouteAnimation departure={trip.destinationCity} destination={trip.departureCity} /><Txt size={12} color={c.secondary}>등록된 여행 일정 기준 · 실제 GPS 위치가 아니에요.</Txt></Stack>}
        {isDomesticDelivery && shipment && <Row style={{ paddingTop: space.lg, borderTopWidth: 1, borderColor: c.primaryTint }}><View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }}><StatusIcon size={22} color={c.primary} /></View><Stack gap={2} style={{ flex: 1 }}><Txt size={15} weight="700">{shipment.carrier}</Txt><Txt size={13} color={c.secondary}>{shipment.trackingNumber}</Txt></Stack></Row>}
        {isComingHome && trip && <Button small kind="secondary" label="여행 일정 보기" icon={Plane} onPress={() => a.nav('trip-route', { id: trip.id, placeId: r.placeId })} style={{ backgroundColor: c.paper }} />}
      </View>
      <Card style={{ padding: space.lg }}><ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} /></Card>
      <Row style={{ justifyContent: 'space-between' }}><Row style={{ flex: 1 }}><Avatar user={other} size={36} /><View style={{ flex: 1 }}><Txt size={15} weight="600">{other.nickname}</Txt><Txt size={12} color={c.secondary}>{buyer ? '가져오는 여행자' : '부탁한 사람'}</Txt></View></Row><Button small kind="secondary" label="대화하기" icon={MessageCircle} onPress={() => a.nav('chat', { id: t.id })} /></Row>
      <Row style={{ backgroundColor: frozen ? c.dangerBg : c.canvas, padding: 14, borderRadius: 12, alignItems: 'flex-start' }}><LockKeyhole size={17} color={frozen ? c.danger : c.secondary} /><Txt size={13} color={frozen ? c.danger : c.secondary} style={{ flex: 1 }}>{frozen ? '문제를 확인하는 동안 정산을 멈췄어요.' : held ? '결제 체험 완료 · 구매 확정 후 정산해요.' : escrow?.status === 'RELEASED' ? '정산 체험을 완료했어요.' : escrow?.status === 'REFUNDED' ? '체험 결제금이 환불됐어요.' : '결제가 완료되면 구매를 시작해요.'}</Txt></Row>
      {!['DISPUTED', 'CANCELLED'].includes(t.status) ? (
        <Stack gap={space.lg}><Txt size={typography.section} weight="700">부탁이 오는 길</Txt><View style={{ paddingHorizontal: space.xs }}><Timeline transaction={t} domestic={domestic} /></View></Stack>
      ) : (
        <Notice tone={t.status === 'DISPUTED' ? 'error' : 'info'}>
          {t.status === 'DISPUTED'
            ? '문제가 접수됐어요. 거래 기록과 증빙은 보관되며 정산은 중단돼요. 실제 상담원은 연결되지 않은 체험 상태예요.'
            : '이 거래는 취소되었어요. 결제된 모의 금액은 전액 환불됐어요.'}
        </Notice>
      )}
      {trip && <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Stack gap={space.lg} style={{ padding: space.page }}>
          <Row style={{ justifyContent: 'space-between' }}><View style={{ flex: 1 }}><Txt size={12} color={c.primary} weight="700">TRIP WITH {travelerUser.nickname}</Txt><Txt size={18} weight="700">함께 오는 여행 일정</Txt></View><Plane size={23} color={c.primary} /></Row>
          <Row><Txt size={18} weight="700" style={{ flex: 1 }}>{trip.departureCity}</Txt><View style={{ flex: 1, height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.primary }} /><ArrowRight size={16} color={c.primary} /><Txt size={18} weight="700" style={{ flex: 1, textAlign: 'right' }}>{trip.destinationCity}</Txt></Row>
          <Txt size={13} color={c.secondary}>{shortDate(trip.startDate)} — {shortDate(trip.endDate)} · {routePlaces.length}곳 방문 동선</Txt>
          <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.border, paddingTop: space.lg, gap: space.md }}>
            {routePlaces.slice(0, 3).map((place, index) => place && <Row key={place.id}><View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: place.id === r.placeId ? c.primary : c.primarySoft }}><Txt size={11} weight="700" color={place.id === r.placeId ? c.onPrimary : c.primary}>{index + 1}</Txt></View><Txt size={14} weight={place.id === r.placeId ? '700' : '400'} style={{ flex: 1 }}>{place.name}</Txt>{place.id === r.placeId && <Txt size={11} color={c.primary}>내 부탁</Txt>}</Row>)}
            {routePlaces.length > 3 && <Txt size={12} color={c.secondary}>외 {routePlaces.length - 3}곳 · 전체 일정에서 확인해요</Txt>}
          </View>
          <Button small kind="secondary" icon={Plane} label="여행 경로 전체 보기" onPress={() => a.nav('trip-route', { id: trip.id, placeId: r.placeId })} />
        </Stack>
      </Card>}
      <View><Button kind="ghost" label={showPrice ? '금액 접기' : '결제금액 자세히 보기'} icon={Wallet} onPress={() => setShowPrice(!showPrice)} />{showPrice && <View style={{ paddingTop: 16 }}><MoneyBreakdown price={t} /></View>}</View>
      {t.transport === 'MEETUP' && <MeetupSummary point={r.meetupPoint} />}
      {receipt && (
        <Stack gap={12}>
          <Section title={receipt.outcome === 'OUT_OF_STOCK' ? '구매하지 못한 이유' : '구매 인증'} />
          {receipt.outcome === 'OUT_OF_STOCK' && <Badge>{unavailableLabel(receipt.unavailableReason)}</Badge>}
          <Row style={{ flexWrap: 'wrap' }}>
            {!!receipt.productImage && (
              <Image source={{ uri: receipt.productImage }} accessibilityLabel={receipt.outcome === 'OUT_OF_STOCK' ? '방문 증빙 사진' : '구매한 상품 사진'} style={{ width: 130, height: 150, borderRadius: 15, backgroundColor: c.mint }} resizeMode="cover" />
            )}
            {!!receipt.receiptImage && (
              <Image source={{ uri: receipt.receiptImage }} accessibilityLabel="구매 영수증 사진" style={{ width: 130, height: 150, borderRadius: 15, backgroundColor: c.mint }} resizeMode="cover" />
            )}
          </Row>
          <Txt size={13} color={c.secondary}>
            {receipt.storeName} · {receipt.purchasedAt}
            {'\n'}{receipt.locationNote}
            {!!receipt.unavailableNote && `\n${receipt.unavailableNote}`}
            {'\n'}첨부 사진은 거래 참여자에게만 보여요.
          </Txt>
        </Stack>
      )}
      {shipment && !isDomesticDelivery && (
        <Card>
          <Stack gap={9}>
            <Row>
              <Truck size={21} color={c.green} />
              <Txt weight="700">등록된 전달 정보</Txt>
            </Row>
            <Txt>{shipment.carrier}</Txt>
            <Txt size={18} weight="700">
              {shipment.trackingNumber}
            </Txt>
            <Txt size={12} color={c.secondary}>
              {t.transport === 'MEETUP' ? '변경할 내용이 있으면 채팅으로 알려주세요.' : '등록된 정보예요. 배송 현황은 택배사에서 확인해주세요.'}
            </Txt>
          </Stack>
        </Card>
      )}
      {['CONFIRMED', 'SETTLED'].includes(t.status) && (
        <Button
          kind="secondary"
          icon={Stamp}
          label={d.reviews.some((review) => review.transactionId === t.id && review.authorId === d.me.id) ? '남긴 후기 보기' : '거래 후기 남기기'}
          onPress={() => a.nav('reviews', { id: t.id })}
        />
      )}
      <Stack gap={6}>
        {['PAYMENT_HELD', 'PURCHASED', 'TRAVELING', 'SHIPPED', 'DELIVERED', 'CONFIRMED'].includes(
          t.status,
        ) && (
          <Button
            small
            kind="ghost"
            label="상품이나 거래에 문제가 있어요"
            onPress={() => setProblem(!problem)}
          />
        )}
        {problem && (
          <Card>
            <Stack>
              <Field
                label="어떤 문제가 있나요?"
                value={reason}
                onChange={setReason}
                multiline
                placeholder="5자 이상 적어주세요."
              />
              <Button
                kind="danger"
                label="문제 접수하고 정산 멈추기"
                loading={a.busy}
                onPress={async () => {
                  const v = await action('DISPUTE', { reason });
                  if (v) setProblem(false);
                }}
              />
            </Stack>
          </Card>
        )}
        {buyer && ['MATCHED', 'PAYMENT_HELD'].includes(t.status) && (
          <Button
            small
            kind="ghost"
            label="구매 전 거래 취소"
            onPress={() => setCancelConfirm(!cancelConfirm)}
          />
        )}
        {cancelConfirm && (
          <Notice tone="warning">
            취소하면 이 거래는 종료돼요. 결제된 모의 금액은 전액 환불돼요.
          </Notice>
        )}
        {cancelConfirm && (
          <Button
            kind="danger"
            label="거래 취소 확정"
            loading={a.busy}
            onPress={async () => {
              const v = await action('CANCEL');
              if (v) {
                setCancelConfirm(false);
                a.notify('');
              }
            }}
          />
        )}
      </Stack>
    </Page>
  );
}
const unavailableReasons = [
  ['OUT_OF_STOCK', '품절'],
  ['PRODUCT_NOT_FOUND', '상품을 찾지 못함'],
  ['PURCHASE_LIMIT', '구매 제한'],
  ['STORE_CLOSED', '매장 휴무·폐점'],
] as const;
const unavailableLabel = (value?: string) =>
  unavailableReasons.find(([key]) => key === value)?.[1] || '구매 불가';

export function ReceiptScreen() {
  const a = useApp(),
    d = a.data!,
    t = d.transactions.find((x) => x.id === a.route.id),
    r = d.requests.find((x) => x.id === t?.requestId),
    offer = d.offers.find((o) => o.id === t?.offerId),
    trip = d.trips.find((item) => item.id === offer?.tripId);
  const [outcome, setOutcome] = useState<'PURCHASED' | 'OUT_OF_STOCK'>('PURCHASED'),
    [purchaseStep, setPurchaseStep] = useState<1 | 2>(1),
    [productImage, setProductImage] = useState(''),
    [receiptImage, setReceiptImage] = useState(''),
    [stockEvidence, setStockEvidence] = useState(''),
    [reason, setReason] = useState<(typeof unavailableReasons)[number][0]>('OUT_OF_STOCK'),
    [note, setNote] = useState(''),
    [storeName, setStoreName] = useState(r?.storeName || ''),
    [date, setDate] = useState(offer?.estimatedPurchaseDate || ''),
    [amount, setAmount] = useState(String((r?.localPrice || 0) * (r?.quantity || 1))),
    [location, setLocation] = useState(r ? `${r.city} ${r.storeName}` : '');
  if (!t || !r)
    return (
      <Page title="구매 결과">
        <Empty />
      </Page>
    );
  if (t.travelerId !== d.me.id || t.status !== 'PAYMENT_HELD') return <Page title="구매 결과"><Empty title="지금은 구매 인증을 보낼 수 없어요" body="결제된 부탁의 여행자만 구매 결과를 등록할 수 있어요." action="거래 진행 보기" onPress={() => a.nav('transaction', { id: t.id })} /></Page>;
  if (!offer || !trip) return <Page title="구매 결과"><Empty title="여행 일정을 불러오지 못했어요" action="거래 진행 보기" onPress={() => a.nav('transaction', { id: t.id })} /></Page>;
  const pick = async (which: 'product' | 'receipt' | 'stock') => {
    try {
      const value = await pickImage();
      if (!value) return;
      if (which === 'product') setProductImage(value);
      else if (which === 'receipt') setReceiptImage(value);
      else setStockEvidence(value);
    } catch (error) {
      a.notify((error as Error).message);
    }
  };
  const submit = async () => {
    const body = outcome === 'PURCHASED'
      ? {
          action: 'PURCHASE', expectedRevision: t.revision, productImage, receiptImage,
          storeName, purchasedAt: date, localAmount: Number(amount), locationNote: location,
        }
      : {
          action: 'OUT_OF_STOCK', expectedRevision: t.revision, evidenceImage: stockEvidence,
          storeName, checkedAt: date, locationNote: location, reason, note,
        };
    const result = await a.mutate(
      `/transactions/${t.id}/actions`,
      body,
      outcome === 'PURCHASED' ? '구매 인증을 보냈어요.' : '구매 불가를 알리고 결제금을 환불했어요.',
    );
    if (result) a.nav('transaction', { id: t.id });
  };
  const upload = (which: 'product' | 'receipt' | 'stock', label: string, value: string, fullWidth = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value ? '다시 선택' : '올리기'}`}
      onPress={() => pick(which)}
      style={({ pressed }) => ({
        flex: fullWidth ? undefined : 1,
        alignSelf: fullWidth ? 'stretch' : undefined,
        width: fullWidth || which === 'stock' ? '100%' : undefined,
        minWidth: which === 'stock' ? '100%' : 130,
        height: fullWidth ? 220 : which === 'stock' ? 170 : 150,
        borderRadius: 18,
        borderWidth: value ? 0 : 1,
        borderStyle: 'dashed',
        borderColor: c.green,
        backgroundColor: c.mint,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        overflow: 'hidden',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {value ? (
        <>
          <Image source={{ uri: value }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <View style={{ position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: '#14213DCC' }}>
            <Txt size={11} color="white">다시 선택</Txt>
          </View>
        </>
      ) : (
        <>
          <ImagePlus size={29} color={c.green} />
          <Txt size={14} weight="700" color={c.green}>{label}</Txt>
          <Txt size={11} color={c.secondary}>눌러서 사진 선택</Txt>
        </>
      )}
    </Pressable>
  );
  const expectedAmount = Math.round(r.localPrice * r.quantity * 100) / 100;
  const amountValid = /^\d+(?:\.\d{1,2})?$/.test(amount) && Number.isFinite(Number(amount)) && Number(amount) > 0 && Math.round(Number(amount) * 100) === Math.round(expectedAmount * 100);
  const dateValid = date >= trip.startDate && date <= trip.endDate;
  const detailsValid = storeName.trim().length >= 2 && storeName.trim().length <= 100 && dateValid && location.trim().length >= 2 && location.trim().length <= 150;
  const valid = detailsValid && (outcome === 'PURCHASED' ? Boolean(productImage && receiptImage) && amountValid : Boolean(stockEvidence && reason) && note.trim().length <= 500);
  return (
    <Page
      title={outcome === 'PURCHASED' ? purchaseStep === 1 ? '상품 구매 인증' : '영수증 등록' : '매장 방문 결과'}
      footer={
        <Button
          label={outcome === 'PURCHASED' ? purchaseStep === 1 ? '다음: 영수증 등록' : '구매 인증 보내기' : '구매 불가 알리고 환불하기'}
          disabled={outcome === 'PURCHASED' && purchaseStep === 1 ? !productImage : !valid}
          loading={a.busy}
          onPress={outcome === 'PURCHASED' && purchaseStep === 1 ? () => setPurchaseStep(2) : submit}
        />
      }
    >
      <Stack gap={8}>
        <Badge>구매자에게 바로 알려요</Badge>
        <Txt size={28} weight="800">매장에서는 어땠나요?</Txt>
        <Txt color={c.secondary}>결과와 사진을 남기면 다음 단계가 자동으로 이어져요.</Txt>
      </Stack>
      <Row style={{ alignItems: 'stretch', gap: 10 }}>
        {[
          ['PURCHASED', '구매했어요', '상품을 전달할게요', CheckCircle2],
          ['OUT_OF_STOCK', '구매하지 못했어요', '품절·휴무·구매 제한', AlertCircle],
        ].map(([value, title, body, Icon]) => {
          const selected = outcome === value;
          const ResultIcon = Icon as typeof CheckCircle2;
          return (
            <Pressable
              key={value as string}
              accessibilityRole="radio"
              accessibilityLabel={title as string}
              aria-checked={selected}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => {
                setOutcome(value as typeof outcome);
                if (value === 'PURCHASED') setPurchaseStep(1);
              }}
              style={{ flex: 1, minHeight: 112, padding: 15, gap: 7, borderRadius: 18, borderWidth: 1.5, borderColor: selected ? c.green : c.border, backgroundColor: selected ? c.mint : c.paper }}
            >
              <ResultIcon size={22} color={selected ? c.green : c.muted} />
              <Txt size={15} weight="700">{title as string}</Txt>
              <Txt size={11} color={c.secondary}>{body as string}</Txt>
            </Pressable>
          );
        })}
      </Row>
      {outcome === 'PURCHASED' ? (
        <Stack gap={16}>
          <Row style={{ gap: 8, alignItems: 'center' }}>
            <Txt size={13} weight="700" color={c.primaryDeep}>1 상품 사진</Txt>
            <ArrowRight size={14} color={c.muted} />
            <Txt size={13} weight={purchaseStep === 2 ? '700' : '500'} color={purchaseStep === 2 ? c.primaryDeep : c.secondary}>2 영수증</Txt>
          </Row>
          {purchaseStep === 1 ? (
            <Card>
              <Stack gap={14}>
                <Stack gap={4}>
                  <Txt size={19} weight="700">구매한 상품을 찍어주세요</Txt>
                  <Txt size={13} color={c.secondary}>상품 전체와 옵션·수량이 보이게 찍으면 구매자가 확인하기 쉬워요.</Txt>
                </Stack>
                {upload('product', '상품 사진 올리기', productImage, true)}
                <Txt size={12} color={productImage ? c.green : c.secondary}>{productImage ? '상품 사진을 확인했어요. 다음에서 영수증을 올려주세요.' : '상품 사진을 먼저 올려주세요.'}</Txt>
                <Button small kind="ghost" label="체험용 상품 사진 채우기" onPress={() => setProductImage(demoImages.product)} />
              </Stack>
            </Card>
          ) : (
            <Stack gap={16}>
              <Card>
                <Stack gap={14}>
                  <Stack gap={4}>
                    <Txt size={19} weight="700">영수증을 올려주세요</Txt>
                    <Txt size={13} color={c.secondary}>구매 금액과 매장명이 보이게 찍어주세요. 카드번호 등 민감한 정보는 가려도 돼요.</Txt>
                  </Stack>
                  {upload('receipt', '영수증 사진 올리기', receiptImage, true)}
                  <Txt size={12} color={receiptImage ? c.green : c.secondary}>{receiptImage ? '영수증을 확인했어요.' : '영수증 사진을 올려주세요.'}</Txt>
                  <Row style={{ justifyContent: 'space-between', gap: 8 }}>
                    <Button small kind="ghost" label="상품 사진 수정" onPress={() => setPurchaseStep(1)} />
                    <Button small kind="ghost" label="체험용 영수증 채우기" onPress={() => setReceiptImage(demoImages.receipt)} />
                  </Row>
                </Stack>
              </Card>
              <Card>
                <Stack gap={14}>
                  <Field label="구매 매장" value={storeName} onChange={setStoreName} required />
                  <DateField label="구매일" value={date} onChange={setDate} min={trip.startDate} max={trip.endDate} />
                  <Field label={`실제 현지 결제금액 (${r.currency})`} value={amount} onChange={(value) => setAmount(value.replace(/[^0-9.]/g, ''))} keyboard="numeric" required error={!amountValid ? `합의된 전체 상품가격 ${expectedAmount.toLocaleString('ko-KR')} ${r.currency}과 달라요. 채팅으로 먼저 확인해주세요.` : undefined} />
                  <Field label="매장 위치 메모" value={location} onChange={setLocation} required hint="지금은 직접 입력한 위치예요. GPS 확인은 하지 않아요." />
                </Stack>
              </Card>
            </Stack>
          )}
          <Notice>구매 인증은 상품 사진과 영수증을 모두 받은 뒤 구매자에게 전달돼요. 실제 증빙 사진만 올려주세요.</Notice>
        </Stack>
      ) : (
        <Stack gap={16}>
          <Notice tone="warning">결제금 전액이 구매자에게 환불되고 이 거래는 종료돼요. 방문 기록은 양쪽 거래 내역에 남아요.</Notice>
          <Button
            small
            kind="secondary"
            icon={MessageCircle}
            label="환불 전 구매자와 상의하기"
            onPress={() => a.nav('chat', { id: t.id })}
          />
          <Stack gap={8}>
            <Txt size={16} weight="700">구매하지 못한 이유</Txt>
            <Row style={{ flexWrap: 'wrap' }}>
              {unavailableReasons.map(([value, label]) => (
                <Chip key={value} label={label} selected={reason === value} onPress={() => setReason(value)} />
              ))}
            </Row>
          </Stack>
          <Card>
            <Stack gap={12}>
              <Stack gap={3}>
                <Txt size={18} weight="700">방문 증빙</Txt>
                <Txt size={13} color={c.secondary}>품절 안내, 빈 매대, 구매 제한 안내처럼 상황을 확인할 수 있는 사진을 올려주세요.</Txt>
              </Stack>
              {upload('stock', '방문 증빙 사진', stockEvidence)}
            </Stack>
          </Card>
          <Button small kind="secondary" label="체험용 방문 증빙 채우기" onPress={() => setStockEvidence(demoImages.product)} />
          <Notice>샘플에는 DEMO 표기가 있어요. 실제 구매나 방문 증빙을 뜻하지 않으며 사진 진위 판독 기능은 아직 연결되지 않았어요.</Notice>
          <Field label="방문 매장" value={storeName} onChange={setStoreName} required />
          <DateField label="방문 확인일" value={date} onChange={setDate} min={trip.startDate} max={trip.endDate} />
          <Field label="매장 위치 메모" value={location} onChange={setLocation} required hint="지금은 직접 입력한 위치예요. GPS 확인은 하지 않아요." />
          <Field label="구매 불가 메모" value={note} onChange={setNote} multiline placeholder="직원이 재입고 일정을 모른다고 안내했어요." hint="선택 사항 · 구매자에게 그대로 보여요." />
        </Stack>
      )}
    </Page>
  );
}
export function ReceiveScreen() {
  const a = useApp(),
    d = a.data!,
    t = d.transactions.find((x) => x.id === a.route.id),
    [checks, setChecks] = useState<string[]>([]);
  if (!t)
    return (
      <Page title="수령 확인">
        <Empty />
      </Page>
    );
  const r = d.requests.find((r) => r.id === t.requestId);
  if (!r) return <Page title="수령 확인"><Empty title="상품 정보를 불러오지 못했어요" action="거래 목록으로" onPress={() => a.tab('trades')} /></Page>;
  if (t.buyerId !== d.me.id || !['SHIPPED', 'DELIVERED'].includes(t.status)) return <Page title="수령 확인"><Empty title="수령 확인 단계가 아니에요" body="전달이 시작된 뒤 구매자가 확인할 수 있어요." action="거래 진행 보기" onPress={() => a.nav('transaction', { id: t.id })} /></Page>;
  const delivered = t.status === 'DELIVERED';
  const submit = async () => {
    const result = await a.mutate(
      `/transactions/${t.id}/actions`,
      { action: delivered ? 'CONFIRM' : 'RECEIVE_AND_CONFIRM', expectedRevision: t.revision },
      '수령과 구매 확정을 마쳤어요. 고마운 마음을 후기로 전해보세요.',
    );
    if (result) {
      setChecks([]);
      a.nav('transaction', { id: t.id });
    }
  };
  return (
    <Page
      title="수령 및 구매 확정"
      footer={
        <Button
          label={delivered ? '구매 확정 마치기' : '받았어요 · 구매 확정'}
          disabled={checks.length < 3}
          loading={a.busy}
          onPress={submit}
        />
      }
    >
      <View style={{ alignItems: 'center', padding: space.xl, backgroundColor: c.primarySoft, borderRadius: radius.lg, gap: space.md }}>
        <ProductArt
          product={r}
          art={r.art}
          image={r.productImage}
          featured={r.productName.includes('치이카와')}
          size={140}
        />
        <Txt size={15} weight="600" lines={2} style={{ textAlign: 'center' }}>{r.productName}</Txt>
      </View>
      <Txt size={27} weight="800">
        {delivered ? '상품 확인을 마치고\n구매를 확정해주세요.' : '상품 잘 받으셨나요?'}
      </Txt>
      <Txt color={c.secondary}>
        아래 세 가지를 확인하면 수령 기록과 구매 확정이 함께 처리되고 여행자가 정산할 수 있어요.
      </Txt>
      {[
        '요청한 상품과 옵션이 맞아요.',
        '수량과 상품 상태를 확인했어요.',
        '실제로 상품을 전달받았어요.',
      ].map((v) => (
        <Pressable
          key={v}
          accessibilityRole="checkbox"
          aria-checked={checks.includes(v)}
          accessibilityState={{ checked: checks.includes(v) }}
          onPress={() =>
            setChecks(checks.includes(v) ? checks.filter((x) => x !== v) : [...checks, v])
          }
          style={{
            padding: 19,
            borderRadius: 15,
            backgroundColor: checks.includes(v) ? c.mint : c.paper,
            borderWidth: 1,
            borderColor: checks.includes(v) ? c.green : c.border,
          }}
        >
          <Row>
            <CheckCircle2 size={24} color={checks.includes(v) ? c.green : c.muted} />
            <Txt size={15} style={{ flex: 1 }}>
              {v}
            </Txt>
          </Row>
        </Pressable>
      ))}
      <Row style={{ alignItems: 'flex-start' }}><ShieldCheck size={18} color={c.primary} /><Txt size={13} color={c.secondary} style={{ flex: 1 }}>구매를 확정하면 여행자가 보상을 정산할 수 있어요. 상품과 상태를 먼저 확인해주세요.</Txt></Row>
      <Button kind="ghost" label="상품에 문제가 있어요" onPress={() => a.nav('transaction', { id: t.id })} />
    </Page>
  );
}
export function ChatScreen() {
  const a = useApp(),
    d = a.data!,
    t = d.transactions.find((x) => x.id === a.route.id),
    [text, setText] = useState('');
  const messagesRef = useRef<ScrollView>(null);
  const nearBottom = useRef(true);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const room = d.rooms.find((r) => r.transactionId === t?.id);
  useEffect(() => { setText(''); nearBottom.current = true; }, [room?.id, d.me.id]);
  useEffect(() => {
    const timer = setInterval(() => a.refresh().then(() => setConnectionFailed(false)).catch(() => setConnectionFailed(true)), 5000);
    return () => clearInterval(timer);
  }, [a.route.id]);
  if (!t || !room)
    return (
      <Page title="거래 채팅">
        <Empty />
      </Page>
    );
  const other = d.users.find((u) => u.id === (t.buyerId === d.me.id ? t.travelerId : t.buyerId));
  const request = d.requests.find((item) => item.id === t.requestId);
  if (!other || ![t.buyerId, t.travelerId].includes(d.me.id)) return <Page title="거래 채팅"><Empty title="이 대화를 불러올 수 없어요" action="거래 목록으로" onPress={() => a.tab('trades')} /></Page>;
  const messages = d.messages.filter((m) => m.roomId === room.id);
  const send = async () => {
    nearBottom.current = true;
    const sent = text;
    const v = await a.mutate(`/rooms/${room.id}/messages`, { text: sent });
    if (v) setText((current) => current === sent ? '' : current);
  };
  return (
    <Page
      title={`${other.nickname}님과 대화`}
      scroll={false}
      footer={
        <Stack gap={10}>
          <ChatReplies key={room.id} roomId={room.id} contextKey={`${d.me.id}:${t.status}:${t.revision}:${messages.at(-1)?.id || ''}`} draft={text} onSelect={setText} />
          <Row style={{ alignItems: 'flex-end' }}>
            <Field
              style={{ flex: 1 }}
              label="메시지"
              value={text}
              onChange={setText}
              placeholder="편하게 이야기 나눠요"
            />
            <Button
              label="전송"
              icon={Send}
              small
              disabled={!text.trim()}
              loading={a.busy}
              onPress={send}
            />
          </Row>
        </Stack>
      }
    >
      <ScrollView ref={messagesRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled" onScroll={(event) => { const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent; nearBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80; }} scrollEventThrottle={100} onContentSizeChange={() => { if (nearBottom.current) messagesRef.current?.scrollToEnd({ animated: true }); }}>
      <Pressable accessibilityRole="button" accessibilityLabel="거래 상세 보기" onPress={() => a.nav('transaction', { id: t.id })}><Row style={{ padding: 14, borderRadius: 14, backgroundColor: c.canvas }}><Package size={19} color={c.green} /><Txt size={14} weight="600" style={{ flex: 1 }}>{tradeStatusLabel(t, !!request && request.country === request.deliveryCountry)}</Txt><ChevronRight size={18} color={c.muted} /></Row></Pressable>
      {connectionFailed && <Notice tone="warning">새 대화를 불러오지 못했어요. 연결되면 다시 확인할게요.</Notice>}
      {messages.map((m) =>
        m.system ? (
          <View
            key={m.id}
            style={{
              alignSelf: 'center',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: c.mint,
              maxWidth: '95%',
            }}
          >
            <Txt size={12} color={c.secondary} style={{ textAlign: 'center' }}>
              {m.text === '구매자가 여행자를 선택했어요. 결제금은 이미 모의 보관 중이며, 채팅으로 구매 정보를 확인해주세요.'
                ? '매칭됐어요! 편하게 인사 나눠요.' : m.text}
            </Txt>
          </View>
        ) : (
          <View
            key={m.id}
            style={{
              alignSelf: m.senderId === d.me.id ? 'flex-end' : 'flex-start',
              maxWidth: '82%',
              gap: 5,
            }}
          >
            <View
              style={{
                backgroundColor: m.senderId === d.me.id ? c.green : c.paper,
                borderRadius: 17,
                padding: 15,
                borderWidth: m.senderId === d.me.id ? 0 : 1,
                borderColor: c.border,
              }}
            >
              <Txt color={m.senderId === d.me.id ? 'white' : c.ink}>{m.text}</Txt>
            </View>
            <Txt
              size={10}
              color={c.secondary}
              style={{ textAlign: m.senderId === d.me.id ? 'right' : 'left' }}
            >
              {new Date(m.createdAt).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Txt>
          </View>
        ),
      )}
      </ScrollView>
    </Page>
  );
}
export function PayoutsScreen() {
  const a = useApp(),
    d = a.data!;
  const [expanded, setExpanded] = useState<string[]>([]);
  const pending = d.transactions.filter(
    (t) => t.travelerId === d.me.id && t.status === 'CONFIRMED',
  );
  const payouts = d.payouts.filter((p) => p.travelerId === d.me.id);
  return (
    <Page title="보상 정산">
        <Stack gap={space.lg} style={{ padding: space.xl, backgroundColor: c.primarySoft, borderRadius: radius.lg }}>
          <Row style={{ justifyContent: 'space-between' }}><Txt size={13} color={c.primaryStrong} weight="600">지금까지 받은 순보상</Txt><Wallet size={22} color={c.primary} /></Row>
          <Txt size={34} weight="800">
            {money(payouts.reduce((s, p) => s + (p.netReward ?? travelerEarnings(p.reward).netReward), 0))}
          </Txt>
          <Txt size={12} color={c.secondary}>상품대금 상환액 제외 · 정산 체험</Txt>
          <Button kind="secondary" label="MOA 보관함 보기" onPress={() => a.nav('wallet')} style={{ backgroundColor: c.paper }} />
        </Stack>
      {pending.map((t) => (
        <Card key={t.id}>
          <Stack>
            <Txt weight="700">구매 확정 · 정산 가능</Txt>
            <Txt size={21} weight="700">
              예상 순보상 {money(travelerEarnings(t.travelerReward).netReward)}
            </Txt>
            <Txt size={13} color={c.secondary}>보상 {money(t.travelerReward)}에서 운영 수수료 10%가 정산 시 공제돼요.</Txt>
            <Button
              label="정산 체험하기"
              loading={a.busy}
              onPress={() =>
                a.mutate(
                  `/transactions/${t.id}/actions`,
                  { action: 'SETTLE', expectedRevision: t.revision },
                  '모의 정산을 마쳤어요.',
                )
              }
            />
          </Stack>
        </Card>
      ))}
      <View>
        <Section title="정산 내역" />
        {payouts.map((p) => (
          <Card key={p.id} style={{ marginBottom: space.md }}>
            <Stack gap={space.md}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${shortDate(p.createdAt)} 정산 내역 ${expanded.includes(p.id) ? '접기' : '보기'}`} accessibilityState={{ expanded: expanded.includes(p.id) }} onPress={() => setExpanded((current) => current.includes(p.id) ? current.filter((id) => id !== p.id) : [...current, p.id])} style={{ minHeight: 52, justifyContent: 'center' }}>
                <Row><View style={{ flex: 1, gap: space.sm }}><Badge>모의 정산 완료</Badge><Txt size={12} color={c.secondary}>{shortDate(p.createdAt)}</Txt></View><Txt size={22} weight="800" color={c.primaryStrong}>+{money(p.netReward ?? travelerEarnings(p.reward).netReward)}</Txt><ChevronRight size={18} color={c.muted} style={{ transform: [{ rotate: expanded.includes(p.id) ? '90deg' : '0deg' }] }} /></Row>
              </Pressable>
              {expanded.includes(p.id) && <Stack gap={space.md}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt color={c.secondary}>상품 선지출 상환</Txt>
                <Txt>{money(p.reimbursement)}</Txt>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt color={c.secondary}>운송비 상환</Txt>
                <Txt>{money(p.shippingReimbursement)}</Txt>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt>여행자 보상</Txt>
                <Txt>{money(p.reward)}</Txt>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt color={c.secondary}>운영 수수료 10%</Txt>
                <Txt color={c.secondary}>-{money(p.platformCommission ?? Math.round(p.reward * 0.1))}</Txt>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt weight="700">순보상</Txt>
                <Txt weight="700" color={c.green}>
                  {money(p.netReward ?? p.reward - Math.round(p.reward * 0.1))}
                </Txt>
              </Row>
              <Divider />
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt weight="700">모의 지급 총액</Txt>
                <Txt size={24} weight="800">
                  {money(p.amount)}
                </Txt>
              </Row>
              </Stack>}
            </Stack>
          </Card>
        ))}
        {!payouts.length && !pending.length && (
          <Empty
            title="아직 정산할 보상이 없어요"
            body="구매자가 구매를 확정하면 정산할 수 있어요."
            action="거래 확인"
            onPress={() => a.tab('trades')}
          />
        )}
      </View>
      <Notice>
        실제 계좌 지급은 연결되지 않았어요. 계좌번호 입력 없이 정산 흐름만 체험할 수 있어요.
      </Notice>
    </Page>
  );
}

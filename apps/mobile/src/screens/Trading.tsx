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
  MessageCircle,
  Package,
  Plane,
  RefreshCw,
  Send,
  ShieldCheck,
  Star,
  Truck,
  Wallet,
} from 'lucide-react-native';
import { Place, Transaction, money, shortDate, STATUS_LABEL, TRANSPORT_LABEL, travelerEarnings } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { MeetupSummary } from '../components/MeetupSummary';
import { PlaneRouteAnimation } from '../components/travel-route';
import { colors as c } from '../theme/tokens';
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

export function TradesScreen() {
  const a = useApp(), d = a.data!, buyer = a.role === 'buyer';
  const [filter, setFilter] = useState('진행 중');
  useEffect(() => setFilter('진행 중'), [a.role]);
  const myTransactions = d.transactions.filter((t) => buyer ? t.buyerId === d.me.id : t.travelerId === d.me.id);
  const completed = (t: Transaction) => ['CONFIRMED', 'SETTLED', 'CANCELLED'].includes(t.status);
  const transactions = myTransactions.filter((t) => filter === '완료' ? completed(t) : !completed(t)).slice().reverse();
  const waitingLabel = buyer ? '내 요청' : '수락한 부탁';
  const requests = d.requests.filter((r) => r.requesterId === d.me.id && !myTransactions.some((t) => t.requestId === r.id));
  const offers = d.offers.filter((o) => o.travelerId === d.me.id && !myTransactions.some((t) => t.offerId === o.id));
  const actionLabel = (t: Transaction) => {
    if (t.status === 'MATCHED') return buyer ? '결제를 완료해주세요' : '구매자의 결제를 기다려요';
    if (t.status === 'PAYMENT_HELD') return buyer ? '여행자가 구매할 차례예요' : '구매 후 사진을 올려주세요';
    if (t.status === 'PURCHASED') return '귀국 후 전달을 준비해요';
    if (t.status === 'TRAVELING') return buyer ? '전달 소식을 기다려요' : t.transport === 'MEETUP' ? '만날 약속을 등록해주세요' : '국내 택배 정보를 등록해주세요';
    if (['SHIPPED', 'DELIVERED'].includes(t.status)) return buyer ? '받으셨다면 구매를 확정해주세요' : '구매자의 수령을 기다려요';
    if (t.status === 'CONFIRMED') return buyer ? '받은 상품은 어떠셨나요?' : '정산을 받을 수 있어요';
    return STATUS_LABEL[t.status];
  };
  return (
    <Page title="거래" back={false}>
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
              <Row style={{ justifyContent: 'space-between' }}><Badge>{o.status === 'PENDING' ? '구매자 확인 대기' : o.status === 'ACCEPTED' ? '수락 완료' : '종료된 부탁'}</Badge><Txt weight="700">{money(o.reward)}</Txt></Row>
              <Txt weight="600">{r?.productName || '종료된 부탁'}</Txt>
              <Txt size={13} color={c.secondary}>{shortDate(o.estimatedDeliveryDate)} 전달 예정</Txt>
              {r && <Button small kind="secondary" label="요청 보기" onPress={() => a.nav('request', { id: r.id })} />}
            </Stack></Card>;
          })}
          {(buyer ? !requests.length : !offers.length) && <Empty title={buyer ? '기다리는 부탁이 없어요' : '기다리는 수락이 없어요'} body={buyer ? '원하는 장소에서 첫 부탁을 남겨보세요.' : '가는 길의 부탁을 찾아보세요.'} action={buyer ? '이거 부탁하기' : '내 동선 보기'} onPress={() => buyer ? a.nav('request-form') : a.tab('home')} />}
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
                <Row style={{ justifyContent: 'space-between' }}><Badge color={t.status === 'DISPUTED' ? c.danger : c.green} bg={t.status === 'DISPUTED' ? c.dangerBg : c.mint}>{STATUS_LABEL[t.status]}</Badge><ChevronRight size={18} color={c.muted} /></Row>
                <Row><ProductArt art={r.art} image={r.productImage} size={64} /><Stack gap={5} style={{ flex: 1 }}><Txt weight="700" lines={2}>{r.productName}</Txt><Txt size={13} color={c.secondary}>{shortDate(t.estimatedDeliveryDate)} 전달 · {TRANSPORT_LABEL[t.transport]}</Txt><Txt weight="700">{buyer ? money(t.totalPrice) : '보상 ' + money(t.travelerReward)}</Txt></Stack></Row>
                <Txt size={14} color={c.green} weight="600">{actionLabel(t)}</Txt>
              </Pressable>
              {partner && room && <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 18, paddingVertical: 10 }}><Row style={{ justifyContent: 'space-between' }}><Row><Avatar user={partner} size={28} /><Txt size={13} color={c.secondary}>{partner.nickname}</Txt></Row><Button small kind="ghost" icon={MessageCircle} label="대화하기" onPress={() => a.nav('chat', { id: t.id })} /></Row></View>}
            </Card>;
          })}
          {!transactions.length && <Empty title={filter === '완료' ? '아직 완료된 거래가 없어요' : '진행 중인 거래가 없어요'} body={filter === '완료' ? '전달을 마친 부탁이 여기에 모여요.' : buyer ? '등록한 부탁은 내 요청에서 확인해요.' : '부탁을 수락하면 거래와 대화가 시작돼요.'} action={filter === '완료' ? undefined : buyer ? '내 요청 보기' : '가는 길의 부탁 보기'} onPress={() => buyer ? setFilter(waitingLabel) : a.tab('home')} />}
        </Stack>
      )}
    </Page>
  );
}
export function PaymentScreen() {
  const a = useApp(), d = a.data!, t = d.transactions.find((x) => x.id === a.route.id);
  const [agreed, setAgreed] = useState(false);
  const [fail, setFail] = useState(false);
  const [method, setMethod] = useState<'CARD' | 'ACCOUNT' | ''>('');
  const [paymentReady, setPaymentReady] = useState(false);
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
      a.notify('카드 또는 계좌를 먼저 선택해주세요.');
      return;
    }
    if (!paymentReady) {
      setPaymentReady(true);
      return;
    }
    if (!agreed) {
      a.notify('결제 금액 확인에 체크해주세요.');
      return;
    }
    const result = await a.mutate<Transaction>(
      `/transactions/${t.id}/actions`,
      { action: 'PAY', expectedRevision: t.revision, paymentMethod: method, paymentReference: reference, simulateFailure: fail },
      '결제 체험을 완료했어요.',
    );
    if (result) a.nav('transaction', { id: t.id });
  };
  return (
    <Page title="결제" footer={<Button label={!canPay ? '거래 진행 보기' : paymentReady ? money(t.totalPrice) + ' 결제 체험하기' : method ? '이 결제수단으로 계속' : '결제수단을 선택해주세요'} loading={a.busy} icon={LockKeyhole} onPress={() => void pay()} />}>
      <Stack gap={8}>
        <Txt size={13} color={c.secondary}>{paymentReady ? '2 / 2 · 최종 확인' : '1 / 2 · 결제수단'}</Txt>
        <Txt size={25} weight="700">{paymentReady ? '금액을 확인해주세요' : '어떻게 결제할까요?'}</Txt>
        <Txt size={32} weight="700">{money(t.totalPrice)}</Txt>
      </Stack>
      <Notice>실제 결제 연결 전인 체험 화면이에요. 예시 카드·계좌로 진행하며 실제 출금이나 인증은 일어나지 않아요.</Notice>
      {!paymentReady ? (
        <Stack gap={12}>
          {[
            { value: 'CARD' as const, title: '카드로 결제', subtitle: '체험 카드 · 4242', icon: CreditCard },
            { value: 'ACCOUNT' as const, title: '계좌로 결제', subtitle: '체험 계좌 · 0001', icon: Landmark },
          ].map((item) => {
            const selected = method === item.value, Icon = item.icon;
            return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.title} aria-checked={selected} accessibilityState={{ checked: selected }} onPress={() => { setMethod(item.value); setAgreed(false); }} style={{ borderWidth: 1, borderColor: selected ? c.green : c.border, borderRadius: 16, padding: 18, backgroundColor: selected ? c.mint : c.paper }}><Row><Icon size={24} color={selected ? c.green : c.secondary} /><View style={{ flex: 1 }}><Txt weight="700">{item.title}</Txt><Txt size={13} color={c.secondary}>{item.subtitle}</Txt></View><CheckCircle2 size={22} color={selected ? c.green : c.border} /></Row></Pressable>;
          })}
          <Txt size={13} color={c.secondary}>실제 카드번호나 계좌번호를 입력할 필요가 없어요.</Txt>
        </Stack>
      ) : (
        <Stack gap={16}>
          <Card><Row>{method === 'CARD' ? <CreditCard size={24} color={c.green} /> : <Landmark size={24} color={c.green} />}<View style={{ flex: 1 }}><Txt size={12} color={c.secondary}>선택한 결제수단</Txt><Txt weight="700">{reference}</Txt></View><Button kind="ghost" small label="변경" onPress={() => { setPaymentReady(false); setAgreed(false); }} /></Row></Card>
          <Pressable accessibilityRole="checkbox" accessibilityLabel="결제 금액 확인" aria-checked={agreed} accessibilityState={{ checked: agreed }} onPress={() => setAgreed(!agreed)} style={{ paddingVertical: 12 }}><Row style={{ alignItems: 'flex-start' }}><CheckCircle2 size={24} color={agreed ? c.green : c.muted} /><Txt size={14} style={{ flex: 1 }}>상품·보상·국내 전달비와 체험 결제 금액을 확인했어요.</Txt></Row></Pressable>
        </Stack>
      )}
      <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
      <MoneyBreakdown price={t} />
      <Divider />
      <Row><Avatar user={u} /><View style={{ flex: 1 }}><Txt weight="600">{u.nickname}님이 가져와요</Txt><Txt size={13} color={c.secondary}>{shortDate(t.estimatedDeliveryDate)} · {TRANSPORT_LABEL[t.transport]}</Txt></View></Row>
      <Row style={{ alignItems: 'flex-start' }}><ShieldCheck size={20} color={c.green} /><View style={{ flex: 1 }}><Txt size={14} weight="600">구매 확정 후 여행자에게 정산해요</Txt><Txt size={13} color={c.secondary}>체험에서는 결제 승인과 보관, 정산 순서를 확인할 수 있어요.</Txt></View></Row>
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
        title={t.transport === 'MEETUP' ? '전달 약속 등록' : '운송장 등록'}
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
              : '구매자에게 보낼\n배송 정보를 입력해요.'}
          </Txt>
          <Txt color={c.secondary}>
            {t.transport === 'MEETUP'
              ? '합의한 전달 약속을 등록하면 구매자가 수령을 확인할 수 있어요.'
              : '운송장을 등록하면 거래가 배송 중으로 바뀌고 구매자에게 알림이 가요.'}
          </Txt>
        </Stack>
        <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
        <Card>
          <Stack gap={16}>
            <Field
              label={t.transport === 'MEETUP' ? '전달 장소' : '배송사'}
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
      label: t.transport === 'MEETUP' ? '전달 일정 등록' : '운송장 등록하기',
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
      <Stack gap={8}>
        <Txt size={25} weight="700">
          {STATUS_LABEL[t.status]}
        </Txt>
        <Txt size={14} color={c.secondary}>
          {shortDate(t.estimatedDeliveryDate)} 전달 예정 · {TRANSPORT_LABEL[t.transport]}
        </Txt>
      </Stack>
      <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
      <Row style={{ justifyContent: 'space-between' }}><Row style={{ flex: 1 }}><Avatar user={other} size={36} /><View style={{ flex: 1 }}><Txt size={15} weight="600">{other.nickname}</Txt><Txt size={12} color={c.secondary}>{buyer ? '가져오는 여행자' : '부탁한 사람'}</Txt></View></Row><Button small kind="secondary" label="대화하기" icon={MessageCircle} onPress={() => a.nav('chat', { id: t.id })} /></Row>
      <Row style={{ backgroundColor: frozen ? c.dangerBg : c.canvas, padding: 14, borderRadius: 12, alignItems: 'flex-start' }}><LockKeyhole size={17} color={frozen ? c.danger : c.secondary} /><Txt size={13} color={frozen ? c.danger : c.secondary} style={{ flex: 1 }}>{frozen ? '문제를 확인하는 동안 정산을 멈췄어요.' : held ? '결제 체험 완료 · 구매 확정 후 정산해요.' : escrow?.status === 'RELEASED' ? '정산 체험을 완료했어요.' : escrow?.status === 'REFUNDED' ? '체험 결제금이 환불됐어요.' : '결제가 완료되면 구매를 시작해요.'}</Txt></Row>
      {!['DISPUTED', 'CANCELLED'].includes(t.status) ? (
        <View style={{ paddingHorizontal: 4, paddingVertical: 8 }}>
          {t.status === 'TRAVELING' && trip && (
            <Stack gap={8} style={{ marginBottom: 18 }}>
              <PlaneRouteAnimation departure={trip.destinationCity} destination={trip.departureCity} />
              <Txt size={11} color={c.secondary}>여행 일정 기준 귀국 단계 · 실제 항공편이나 GPS 위치가 아니에요.</Txt>
            </Stack>
          )}
          <Timeline transaction={t} />
        </View>
      ) : (
        <Notice tone={t.status === 'DISPUTED' ? 'error' : 'info'}>
          {t.status === 'DISPUTED'
            ? '문제가 접수됐어요. 거래 기록과 증빙은 보관되며 정산은 중단돼요. 실제 상담원은 연결되지 않은 체험 상태예요.'
            : '이 거래는 취소되었어요. 결제된 모의 금액은 전액 환불됐어요.'}
        </Notice>
      )}
      {trip && <Card style={{ backgroundColor: c.canvas }}>
        <Stack gap={13}>
          <Row style={{ justifyContent: 'space-between' }}><View style={{ flex: 1 }}><Txt size={18} weight="700">{travelerUser.nickname}님의 공개 여행 일정</Txt><Txt size={12} color={c.secondary}>일정을 보며 자연스럽게 이야기할 수 있어요.</Txt></View><Plane size={23} color={c.green} /></Row>
          <Txt weight="700">{trip.departureCity} → {[...new Set(trip.placeIds.map((id) => d.places.find((place) => place.id === id)?.city).filter(Boolean))].join(' · ')}</Txt>
          <Txt size={13} color={c.secondary}>{trip.startDate} — {trip.endDate}</Txt>
          <Divider />
          <Txt size={14} weight="700">수락한 부탁 기준 추천 동선</Txt>
          {routePlaces.map((place, index) => place && <Row key={place.id}><Badge>{index + 1}</Badge><View style={{ flex: 1 }}><Txt weight="600">{place.name}</Txt><Txt size={12} color={c.secondary}>{place.city} {place.region} · 동선 추가 약 {place.extraMinutes}분</Txt></View></Row>)}
          <Txt size={11} color={c.secondary}>좌표 기반 가까운 장소 순서의 예시 동선이에요. 실제 교통편·영업시간을 연결하면 다시 계산해요.</Txt>
          <Button small kind="secondary" icon={Plane} label="여행 경로 전체 보기" onPress={() => a.nav('trip-route', { id: trip.id, placeId: r.placeId })} />
          <Button small kind="secondary" icon={MessageCircle} label="일정 이야기하기" onPress={() => a.nav('chat', { id: t.id })} />
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
      {shipment && (
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
          icon={Star}
          label="거래 후기 남기기"
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
  const upload = (which: 'product' | 'receipt' | 'stock', label: string, value: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value ? '다시 선택' : '올리기'}`}
      onPress={() => pick(which)}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: which === 'stock' ? '100%' : 130,
        height: which === 'stock' ? 170 : 150,
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
  const valid = detailsValid && (outcome === 'PURCHASED' ? Boolean(productImage || receiptImage) && amountValid : Boolean(stockEvidence && reason) && note.trim().length <= 500);
  return (
    <Page
      title="매장 방문 결과"
      footer={
        <Button
          label={outcome === 'PURCHASED' ? '구매 인증 보내기' : '구매 불가 알리고 환불하기'}
          disabled={!valid}
          loading={a.busy}
          onPress={submit}
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
              onPress={() => setOutcome(value as typeof outcome)}
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
        <Card>
          <Stack gap={12}>
            <Stack gap={3}>
              <Txt size={18} weight="700">구매 증빙</Txt>
              <Txt size={13} color={c.secondary}>상품 사진 또는 영수증 중 하나만 올려도 돼요. 둘 다 있으면 함께 남겨주세요.</Txt>
            </Stack>
            <Row style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {upload('product', '상품 사진', productImage)}
              {upload('receipt', '영수증', receiptImage)}
            </Row>
            <Txt size={12} color={productImage || receiptImage ? c.green : c.secondary}>
              {productImage || receiptImage ? '필수 증빙이 첨부됐어요.' : '사진 1장 이상이 필요해요.'}
            </Txt>
          </Stack>
        </Card>
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
          <Field label="구매 불가 메모" value={note} onChange={setNote} multiline placeholder="직원이 재입고 일정을 모른다고 안내했어요." hint="선택 사항 · 구매자에게 그대로 보여요." />
        </Stack>
      )}
      <Button
        small
        kind="secondary"
        label={outcome === 'PURCHASED' ? '체험용 샘플 사진 채우기' : '체험용 방문 증빙 채우기'}
        onPress={() => {
          if (outcome === 'PURCHASED') {
            setProductImage(demoImages.product);
            setReceiptImage(demoImages.receipt);
          } else setStockEvidence(demoImages.product);
        }}
      />
      <Notice>샘플에는 DEMO 표기가 있어요. 실제 구매나 방문 증빙을 뜻하지 않으며 사진 진위 판독 기능은 아직 연결되지 않았어요.</Notice>
      <Field label={outcome === 'PURCHASED' ? '구매 매장' : '방문 매장'} value={storeName} onChange={setStoreName} required />
      <DateField label={outcome === 'PURCHASED' ? '구매일' : '방문 확인일'} value={date} onChange={setDate} min={trip.startDate} max={trip.endDate} />
      {outcome === 'PURCHASED' && (
        <Field label={`실제 현지 결제금액 (${r.currency})`} value={amount} onChange={(value) => setAmount(value.replace(/[^0-9.]/g, ''))} keyboard="numeric" required error={!amountValid ? `합의된 전체 상품가격 ${expectedAmount.toLocaleString('ko-KR')} ${r.currency}과 달라요. 채팅으로 먼저 확인해주세요.` : undefined} />
      )}
      <Field label="매장 위치 메모" value={location} onChange={setLocation} required hint="지금은 직접 입력한 위치예요. GPS 확인은 하지 않아요." />
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
      <View style={{ alignItems: 'center', padding: 10 }}>
        <ProductArt
          art={r.art}
          image={r.productImage}
          featured={r.productName.includes('치이카와')}
          size={170}
        />
      </View>
      <Txt size={27} weight="800">
        {delivered ? '상품 확인을 마치고\n구매를 확정해주세요.' : '상품을 받았다면\n한 번에 완료해요.'}
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
      <Notice>문제가 있다면 구매 확정을 누르기 전에 거래 화면에서 문제를 접수해주세요.</Notice>
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
  if (!other || ![t.buyerId, t.travelerId].includes(d.me.id)) return <Page title="거래 채팅"><Empty title="이 대화를 불러올 수 없어요" action="거래 목록으로" onPress={() => a.tab('trades')} /></Page>;
  const messages = d.messages.filter((m) => m.roomId === room.id);
  const send = async () => {
    nearBottom.current = true;
    const v = await a.mutate(`/rooms/${room.id}/messages`, { text });
    if (v) setText('');
  };
  return (
    <Page
      title={`${other.nickname}님과 대화`}
      scroll={false}
      footer={
        <Stack gap={10}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {(t.buyerId === d.me.id ? ['재고 있나요?', '다른 색상도 가능한가요?', '영수증 부탁드려요.'] : ['매장에 도착했어요.', '구매 완료했어요.', '전달 시간을 정할까요?']).map((v) => (
              <Chip key={v} label={v} onPress={() => setText(v)} />
            ))}
          </ScrollView>
          <Row style={{ alignItems: 'flex-end' }}>
            <Field
              style={{ flex: 1 }}
              label="메시지"
              value={text}
              onChange={setText}
              placeholder="거래에 필요한 이야기를 나눠요"
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
      <Pressable accessibilityRole="button" accessibilityLabel="거래 상세 보기" onPress={() => a.nav('transaction', { id: t.id })}><Row style={{ padding: 14, borderRadius: 14, backgroundColor: c.canvas }}><Package size={19} color={c.green} /><Txt size={14} weight="600" style={{ flex: 1 }}>{STATUS_LABEL[t.status]}</Txt><ChevronRight size={18} color={c.muted} /></Row></Pressable>
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
              {m.text}
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
  const pending = d.transactions.filter(
    (t) => t.travelerId === d.me.id && t.status === 'CONFIRMED',
  );
  const payouts = d.payouts.filter((p) => p.travelerId === d.me.id);
  return (
    <Page title="보상 정산">
        <Stack gap={8}>
          <Txt size={14} color={c.secondary}>지금까지 받은 보상</Txt>
          <Txt size={32} weight="700">
            {money(payouts.reduce((s, p) => s + (p.netReward ?? travelerEarnings(p.reward).netReward), 0))}
          </Txt>
          <Txt size={13} color={c.secondary}>
            상품대금 상환액 제외 · 정산 체험
          </Txt>
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
          <Card key={p.id} style={{ marginBottom: 12 }}>
            <Stack gap={12}>
              <Badge>모의 정산 완료</Badge>
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

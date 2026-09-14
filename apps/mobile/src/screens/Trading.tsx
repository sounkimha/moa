import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  ImagePlus,
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
import { Place, Transaction, money, shortDate, STATUS_LABEL, TRANSPORT_LABEL } from '@moa/domain';
import { useApp } from '../state/AppContext';
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
  IconButton,
  Notice,
  Page,
  Row,
  Section,
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
  const a = useApp(),
    d = a.data!;
  const [filter, setFilter] = useState(a.role === 'buyer' ? '받는 거래' : '가져오는 거래');
  useEffect(() => setFilter(a.role === 'buyer' ? '받는 거래' : '가져오는 거래'), [a.role]);
  const filters = a.role === 'buyer' ? ['받는 거래', '내 요청'] : ['가져오는 거래', '수락한 부탁'];
  const transactions = d.transactions.filter((t) =>
    filter === '받는 거래' ? t.buyerId === d.me.id : t.travelerId === d.me.id,
  );
  const requests = d.requests.filter((r) => r.requesterId === d.me.id);
  const offers = d.offers.filter((o) => o.travelerId === d.me.id);
  return (
    <Page title="나의 거래" back={false}>
      <Stack gap={6}>
        <Txt size={28} weight="800">
          부탁은 지금{'\n'}어디까지 왔을까요?
        </Txt>
        <Txt color={c.secondary}>결제부터 수령까지 여기에서 확인해요.</Txt>
      </Stack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {filters.map((v) => (
          <Chip key={v} label={v} selected={filter === v} onPress={() => setFilter(v)} />
        ))}
      </ScrollView>
      {filter === '내 요청' ? (
        <View>
          {requests.map((r) => (
            <View key={r.id}>
              <Badge>{STATUS_LABEL[r.status]}</Badge>
              <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
            </View>
          ))}
          {!requests.length && (
            <Empty
              title="등록한 부탁이 없어요"
              action="이거 부탁하기"
              onPress={() => a.nav('request-form')}
            />
          )}
        </View>
      ) : filter === '수락한 부탁' ? (
        <View>
          {offers.map((o) => {
            const r = d.requests.find((r) => r.id === o.requestId);
            return (
              <Card key={o.id} style={{ marginBottom: 12 }}>
                <Stack gap={12}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Badge>
                      {o.status === 'PENDING'
                        ? '구매자의 선택 대기'
                        : o.status === 'ACCEPTED'
                          ? '수락 완료'
                          : o.status === 'CANCELLED'
                            ? '취소된 수락'
                            : '다른 여행자가 먼저 수락했어요'}
                    </Badge>
                    <Txt weight="700" color={c.green}>
                      {money(o.reward)}
                    </Txt>
                  </Row>
                  <Txt weight="600">{r?.productName || '종료된 구매 요청'}</Txt>
                  <Txt size={13} color={c.secondary}>
                    수령 예정 {o.estimatedDeliveryDate}
                  </Txt>
                  {r && (
                    <Button
                      small
                      kind="secondary"
                      label="요청 보기"
                      onPress={() => a.nav('request', { id: r.id })}
                    />
                  )}
                </Stack>
              </Card>
            );
          })}
          {!offers.length && (
            <Empty
              title="아직 수락한 부탁이 없어요"
              body="가는 길의 부탁을 골라 수락해보세요."
              action="내 동선 보기"
              onPress={() => {
                a.setRole('traveler');
                a.tab('home');
              }}
            />
          )}
        </View>
      ) : (
        <View>
          {transactions
            .slice()
            .reverse()
            .map((t) => {
              const r = d.requests.find((r) => r.id === t.requestId)!;
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.productName} 거래 보기`}
                  onPress={() =>
                    a.nav(
                      t.status === 'MATCHED' && t.buyerId === d.me.id ? 'payment' : 'transaction',
                      { id: t.id },
                    )
                  }
                  style={{
                    backgroundColor: c.paper,
                    borderRadius: 21,
                    borderWidth: 1,
                    borderColor: c.border,
                    padding: 18,
                    marginBottom: 14,
                  }}
                >
                  <Stack gap={16}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Badge
                        color={t.status === 'DISPUTED' ? c.danger : c.green}
                        bg={t.status === 'DISPUTED' ? c.dangerBg : c.mint}
                      >
                        {STATUS_LABEL[t.status]}
                      </Badge>
                      <ChevronRight size={18} />
                    </Row>
                    <Row>
                      <ProductArt
                        art={r.art}
                        image={r.productImage}
                        featured={r.productName.includes('치이카와')}
                        size={74}
                      />
                      <Stack gap={7} style={{ flex: 1 }}>
                        <Txt weight="700">{r.productName}</Txt>
                        <Txt size={13} color={c.secondary}>
                          수령 예정 {shortDate(t.estimatedDeliveryDate)}
                        </Txt>
                      </Stack>
                    </Row>
                    <Divider />
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt size={13} color={c.secondary}>
                        {t.buyerId === d.me.id ? '총 결제금액' : '여행자 보상'}
                      </Txt>
                      <Txt weight="700">
                        {money(t.buyerId === d.me.id ? t.totalPrice : Math.round(t.travelerReward * 0.9))}
                      </Txt>
                    </Row>
                  </Stack>
                </Pressable>
              );
            })}
          {!transactions.length && (
            <Empty
              title="진행 중인 거래가 없어요"
              body={
                filter === '받는 거래'
                  ? '보낸 부탁과 수락 소식은 내 요청에서 확인해요.'
                  : '부탁을 수락하면 여기에 바로 보여요.'
              }
              action={filter === '받는 거래' ? '내 요청 보기' : '수락한 부탁 보기'}
              onPress={() => setFilter(filter === '받는 거래' ? '내 요청' : '수락한 부탁')}
            />
          )}
        </View>
      )}
    </Page>
  );
}
export function PaymentScreen() {
  const a = useApp(),
    d = a.data!,
    t = d.transactions.find((x) => x.id === a.route.id);
  const [agreed, setAgreed] = useState(false),
    [fail, setFail] = useState(false);
  if (!t)
    return (
      <Page title="결제">
        <Empty />
      </Page>
    );
  const r = d.requests.find((r) => r.id === t.requestId)!,
    u = d.users.find((u) => u.id === t.travelerId)!;
  const pay = async () => {
    const result = await a.mutate<Transaction>(
      `/transactions/${t.id}/actions`,
      { action: 'PAY', expectedRevision: t.revision, simulateFailure: fail },
      '결제 체험이 완료됐어요.',
    );
    if (result) a.nav('transaction', { id: t.id });
  };
  return (
    <Page
      title="안전하게 부탁해요"
      footer={
        <Button
          label={`${money(t.totalPrice)} 모의 결제하기`}
          disabled={!agreed || t.status !== 'MATCHED' || t.buyerId !== d.me.id}
          loading={a.busy}
          icon={LockKeyhole}
          onPress={pay}
        />
      }
    >
      <Notice>결제 체험이에요. 카드나 계좌에서 실제 돈이 빠져나가지 않아요.</Notice>
      <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
      <Card>
        <Row>
          <Avatar user={u} />
          <View style={{ flex: 1 }}>
            <Txt weight="700">{u.nickname}님이 가져와요</Txt>
            <Txt size={13} color={c.secondary}>
              {t.estimatedDeliveryDate} 수령 예정
            </Txt>
          </View>
          <ShieldCheck size={22} color={c.green} />
        </Row>
      </Card>
      <MoneyBreakdown price={t} />
      <Card style={{ backgroundColor: c.mint }}>
        <Stack gap={12}>
          <Row>
            <LockKeyhole size={22} color={c.green} />
            <Txt weight="700">구매 확정 전에는 지급하지 않아요</Txt>
          </Row>
          <Txt size={14} color={c.secondary}>
            지금은 모의 장부에 보관 상태를 기록해요. 상품을 받고 구매를 확정하면 여행자가 정산을
            진행할 수 있어요.
          </Txt>
        </Stack>
      </Card>
      <Stack gap={12}>
        <Txt weight="700">전달 방식</Txt>
        <Txt>{TRANSPORT_LABEL[t.transport]}</Txt>
        <Notice>
          여행자가 돌아오는 길에 직접 가져와요. 귀국 후 국내 택배 또는 직거래로 전달해요.
        </Notice>
      </Stack>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="모의 결제와 금액 확인"
        accessibilityState={{ checked: agreed }}
        onPress={() => setAgreed(!agreed)}
        style={{ paddingVertical: 12 }}
      >
        <Row style={{ alignItems: 'flex-start' }}>
          <CheckCircle2 size={24} color={agreed ? c.green : c.muted} />
          <Txt size={14} style={{ flex: 1 }}>
            상품·보상·국내 전달비와 모의 결제임을 확인했어요.
          </Txt>
        </Row>
      </Pressable>
      <Button
        small
        kind="ghost"
        label={fail ? '결제 실패 체험 켜짐 · 끄기' : '결제 실패 상태도 체험하기'}
        onPress={() => setFail(!fail)}
      />
      {t.status !== 'MATCHED' && (
        <Button label="거래 진행 보기" onPress={() => a.nav('transaction', { id: t.id })} />
      )}
    </Page>
  );
}
export function TransactionScreen() {
  const a = useApp(),
    d = a.data!,
    t = d.transactions.find((x) => x.id === a.route.id);
  const [shipping, setShipping] = useState(false),
    [carrier, setCarrier] = useState('우체국택배 · 데모'),
    [tracking, setTracking] = useState('DEMO-123456789'),
    [problem, setProblem] = useState(false),
    [reason, setReason] = useState(''),
    [cancelConfirm, setCancelConfirm] = useState(false);
  if (!t)
    return (
      <Page title="거래 진행">
        <Empty />
      </Page>
    );
  const r = d.requests.find((x) => x.id === t.requestId)!,
    buyer = t.buyerId === d.me.id,
    other = d.users.find((u) => u.id === (buyer ? t.travelerId : t.buyerId))!,
    travelerUser = d.users.find((u) => u.id === t.travelerId)!,
    escrow = d.escrows.find((e) => e.transactionId === t.id),
    receipt = d.receipts.find((x) => x.transactionId === t.id),
    shipment = d.shipments.find((x) => x.transactionId === t.id),
    offer = d.offers.find((item) => item.id === t.offerId),
    trip = d.trips.find((item) => item.id === offer?.tripId);
  const acceptedPlaces = [...new Set(d.transactions.filter((item) => item.travelerId === t.travelerId && !['CANCELLED', 'SETTLED'].includes(item.status)).map((item) => d.requests.find((request) => request.id === item.requestId)?.placeId).filter(Boolean))]
    .map((id) => d.places.find((place) => place.id === id)).filter(Boolean);
  const routePlaces = optimizedRoute((acceptedPlaces.length ? acceptedPlaces : (trip?.placeIds.map((id) => d.places.find((place) => place.id === id)).filter(Boolean) || [])) as Place[]);
  const action = async (code: string, extra: object = {}) =>
    a.mutate<Transaction>(
      `/transactions/${t.id}/actions`,
      { action: code, expectedRevision: t.revision, ...extra },
      code === 'CANCEL' ? undefined : '거래 상태를 업데이트했어요.',
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
      run: () => setShipping(true),
    };
  if (buyer && ['SHIPPED', 'DELIVERED'].includes(t.status))
    next = {
      label: t.status === 'SHIPPED' ? '상품을 받았어요' : '상품 확인하고 구매 확정',
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
    frozen = escrow?.status === 'FROZEN';
  if (buyer && t.status === 'CANCELLED')
    return (
      <Page
        key={`cancelled-${t.id}`}
        title="거래 취소"
        footer={
          <Stack gap={8}>
            <Button
              label="다른 사람에게 부탁하기"
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
          <Badge>거래가 취소됐어요</Badge>
          <Txt size={28} weight="800">
            다른 사람에게{'\n'}부탁해보실래요?
          </Txt>
          <Txt color={c.secondary}>
            같은 장소에 가는 다른 여행자를 기다려볼 수 있어요.
            기존 상품과 수령 정보를 확인한 뒤 다시 등록해주세요.
          </Txt>
        </Stack>
        <Card>
          <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
        </Card>
        <Notice>
          {escrow?.status === 'REFUNDED'
            ? `결제한 모의 금액 ${money(t.totalPrice)}은 전액 환불됐어요.`
            : '결제 전에 취소되어 청구된 금액은 없어요.'}
          {'\n'}새 부탁은 직접 등록하기 전까지 공개되지 않아요.
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
      title="지금 어디까지 왔나요?"
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
      <View
        style={{
          backgroundColor: frozen ? c.dangerBg : held ? c.darkGreen : c.mint,
          borderRadius: 23,
          padding: 22,
          gap: 10,
        }}
      >
        <Row>
          <LockKeyhole size={20} color={held ? c.lime : frozen ? c.danger : c.green} />
          <Txt size={17} weight="700" color={held ? 'white' : frozen ? c.danger : c.darkGreen}>
            {frozen
              ? '문제 확인 중 · 정산 중단'
              : held
                ? '안전결제 모의 보관 중'
                : escrow?.status === 'RELEASED'
                  ? '모의 정산 완료'
                  : escrow?.status === 'REFUNDED'
                    ? '모의 결제금 환불 완료'
                    : '아직 결제 전이에요'}
          </Txt>
        </Row>
        <Txt size={30} weight="800" color={held ? c.lime : c.ink}>
          {money(t.totalPrice)}
        </Txt>
        <Txt size={12} color={held ? '#D3E1FA' : c.secondary}>
          실제 자금이 아닌 체험용 거래 상태예요.
        </Txt>
      </View>
      <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
      <Stack gap={12}>
        <Txt size={24} weight="800">
          {STATUS_LABEL[t.status]}
        </Txt>
        <Txt color={c.secondary}>
          수령 예정 {t.estimatedDeliveryDate} · {TRANSPORT_LABEL[t.transport]}
        </Txt>
      </Stack>
      {!['DISPUTED', 'CANCELLED'].includes(t.status) ? (
        <Card>
          <Timeline transaction={t} />
        </Card>
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
          <Button small kind="secondary" icon={MessageCircle} label="일정 이야기하기" onPress={() => a.nav('chat', { id: t.id })} />
        </Stack>
      </Card>}
      {shipping && (
        <Card>
          <Stack>
            <Txt size={19} weight="700">
              {t.transport === 'MEETUP' ? '직접 전달 약속' : '배송 정보'}
            </Txt>
            <Field
              label={t.transport === 'MEETUP' ? '전달 장소' : '배송사'}
              value={carrier}
              onChange={setCarrier}
            />
            <Field
              label={t.transport === 'MEETUP' ? '약속 일시' : '운송장 번호'}
              value={tracking}
              onChange={setTracking}
            />
            <Button
              label="등록하고 알리기"
              loading={a.busy}
              onPress={async () => {
                const v = await action('SHIP', { carrier, trackingNumber: tracking });
                if (v) setShipping(false);
              }}
            />
          </Stack>
        </Card>
      )}
      {receipt && (
        <Stack gap={12}>
          <Section title="매장에서 보내온 소식" />
          <Row>
            <Image
              source={{ uri: receipt.productImage }}
              style={{ width: 130, height: 150, borderRadius: 15, backgroundColor: c.mint }}
            />
            <Image
              source={{ uri: receipt.receiptImage }}
              style={{ width: 130, height: 150, borderRadius: 15, backgroundColor: c.mint }}
            />
          </Row>
          <Txt size={13} color={c.secondary}>
            {receipt.storeName} · {receipt.purchasedAt}
            {'\n'}사진과 영수증은 거래 참여자에게만 보여요.
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
              운송장 조회 사업자 미연동 · 직접 등록된 상태예요.
            </Txt>
          </Stack>
        </Card>
      )}
      <Pressable accessibilityRole="button" onPress={() => a.nav('chat', { id: t.id })}>
        <Card>
          <Row>
            <Avatar user={other} />
            <View style={{ flex: 1 }}>
              <Txt weight="700">{other.nickname}님과 이야기하기</Txt>
              <Txt size={12} color={c.secondary}>
                진행 상황과 필요한 내용을 확인해요.
              </Txt>
            </View>
            <MessageCircle size={22} color={c.green} />
          </Row>
        </Card>
      </Pressable>
      <View>
        <Section title="거래 업데이트" />
        {d.events
          .filter((e) => e.transactionId === t.id)
          .slice()
          .reverse()
          .map((e) => (
            <View
              key={e.id}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border }}
            >
              <Txt size={14}>{e.note}</Txt>
              <Txt size={11} color={c.secondary} style={{ marginTop: 4 }}>
                {new Date(e.createdAt).toLocaleString('ko-KR')}
              </Txt>
            </View>
          ))}
      </View>
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
      <Card style={{ backgroundColor: c.canvas }}>
        <Stack gap={10}>
          <Txt size={13} weight="700">
            양쪽 역할로 거래 흐름 체험하기
          </Txt>
          <Txt size={12} color={c.secondary}>
            현재 {d.me.nickname} · {buyer ? '구매자' : '여행자'} 계정이에요.
          </Txt>
          <Button
            small
            kind="secondary"
            label={`${other.nickname}님 계정으로 바꾸기`}
            loading={a.busy}
            onPress={() => a.switchActor(other.id)}
          />
        </Stack>
      </Card>
    </Page>
  );
}
export function ReceiptScreen() {
  const a = useApp(),
    d = a.data!,
    t = d.transactions.find((x) => x.id === a.route.id);
  const r = d.requests.find((x) => x.id === t?.requestId);
  const offer = d.offers.find((o) => o.id === t?.offerId);
  const [productImage, setProductImage] = useState(''),
    [receiptImage, setReceiptImage] = useState(''),
    [storeName, setStoreName] = useState(r?.storeName || ''),
    [date, setDate] = useState(offer?.estimatedPurchaseDate || ''),
    [amount, setAmount] = useState(String((r?.localPrice || 0) * (r?.quantity || 1))),
    [location, setLocation] = useState(r ? `${r.city} ${r.storeName}` : '');
  if (!t || !r)
    return (
      <Page title="구매 인증">
        <Empty />
      </Page>
    );
  const pick = async (which: 'product' | 'receipt') => {
    try {
      const v = await pickImage();
      if (v) (which === 'product' ? setProductImage : setReceiptImage)(v);
    } catch (e) {
      a.notify((e as Error).message);
    }
  };
  const submit = async () => {
    const result = await a.mutate(
      `/transactions/${t.id}/actions`,
      {
        action: 'PURCHASE',
        expectedRevision: t.revision,
        productImage,
        receiptImage,
        storeName,
        purchasedAt: date,
        localAmount: Number(amount),
        locationNote: location,
      },
      '구매 소식을 전했어요.',
    );
    if (result) a.nav('transaction', { id: t.id });
  };
  return (
    <Page
      title="구매 소식을 전해요"
      footer={
        <Button
          label="구매 인증 보내기"
          disabled={!productImage || !receiptImage}
          loading={a.busy}
          onPress={submit}
        />
      }
    >
      <Stack gap={8}>
        <Txt size={28} weight="800">
          잘 샀다는 안심,{'\n'}사진으로 전해요.
        </Txt>
        <Txt color={c.secondary}>상품과 영수증을 한 장씩 올려주세요.</Txt>
      </Stack>
      <Row style={{ alignItems: 'flex-start' }}>
        {[
          ['product', '상품 사진', productImage],
          ['receipt', '영수증', receiptImage],
        ].map(([kind, label, value]) => (
          <Pressable
            key={kind}
            accessibilityRole="button"
            accessibilityLabel={`${label} 올리기`}
            onPress={() => pick(kind as 'product' | 'receipt')}
            style={{
              flex: 1,
              height: 185,
              borderRadius: 18,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: c.green,
              backgroundColor: c.mint,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              overflow: 'hidden',
            }}
          >
            {value ? (
              <Image
                source={{ uri: value }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            ) : (
              <>
                <ImagePlus size={32} color={c.green} />
                <Txt weight="600" color={c.green}>
                  {label}
                </Txt>
              </>
            )}
          </Pressable>
        ))}
      </Row>
      <Button
        small
        kind="secondary"
        label="체험용 샘플 사진 채우기"
        onPress={() => {
          setProductImage(demoImages.product);
          setReceiptImage(demoImages.receipt);
        }}
      />
      <Notice>
        샘플 증빙에는 DEMO 표기가 있어요. 실제 구매나 인증을 뜻하지 않아요. 업로드한 사진의 진위
        판독 기능은 아직 없어요.
      </Notice>
      <Field label="구매 매장" value={storeName} onChange={setStoreName} />
      <DateField label="구매일" value={date} onChange={setDate} />
      <Field
        label={`실제 현지 결제금액 (${r.currency})`}
        value={amount}
        onChange={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
        keyboard="numeric"
      />
      <Field
        label="구매 위치 메모"
        value={location}
        onChange={setLocation}
        hint="지금은 직접 입력한 위치예요. GPS 확인은 하지 않아요."
      />
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
  const r = d.requests.find((r) => r.id === t.requestId)!;
  const delivered = t.status === 'DELIVERED';
  const submit = async () => {
    const result = await a.mutate(
      `/transactions/${t.id}/actions`,
      { action: delivered ? 'CONFIRM' : 'RECEIVE', expectedRevision: t.revision },
      delivered
        ? '구매를 확정했어요. 고마운 마음을 후기로 전해보세요.'
        : '상품 수령을 기록했어요. 상태를 확인해주세요.',
    );
    if (result) {
      setChecks([]);
      a.nav('transaction', { id: t.id });
    }
  };
  return (
    <Page
      title={delivered ? '상품을 확인해주세요' : '상품을 받으셨나요?'}
      footer={
        <Button
          label={delivered ? '확인했어요 · 구매 확정' : '받았어요 · 수령 기록'}
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
        {delivered ? '작은 부탁이 도착했어요.' : '실제로 받으셨다면,\n확인해주세요.'}
      </Txt>
      <Txt color={c.secondary}>
        구매 확정 뒤 여행자의 정산이 가능해요. 상품을 확인하고 진행해주세요.
      </Txt>
      {[
        '요청한 상품과 옵션이 맞아요.',
        '수량과 상품 상태를 확인했어요.',
        '실제로 상품을 전달받았어요.',
      ].map((v) => (
        <Pressable
          key={v}
          accessibilityRole="checkbox"
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
  const room = d.rooms.find((r) => r.transactionId === t?.id);
  useEffect(() => {
    const timer = setInterval(() => a.refresh().catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [a.route.id]);
  if (!t || !room)
    return (
      <Page title="거래 채팅">
        <Empty />
      </Page>
    );
  const other = d.users.find((u) => u.id === (t.buyerId === d.me.id ? t.travelerId : t.buyerId))!;
  const messages = d.messages.filter((m) => m.roomId === room.id);
  const send = async () => {
    const v = await a.mutate(`/rooms/${room.id}/messages`, { text });
    if (v) setText('');
  };
  return (
    <Page
      title={`${other.nickname}님과 대화`}
      footer={
        <Stack gap={10}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {[
              '재고 있나요?',
              '다른 색상도 가능한가요?',
              '영수증 부탁드려요.',
              '구매 완료했어요.',
              '배송했습니다.',
            ].map((v) => (
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
      <Notice>
        결제와 거래 대화는 모아 안에서 이어가요. 이 채팅은 5초마다 새 메시지를 확인해요.
      </Notice>
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
    </Page>
  );
}
export function PayoutsScreen() {
  const a = useApp(),
    d = a.data!;
  const pending = d.transactions.filter(
    (t) => t.travelerId === d.me.id && t.status === 'CONFIRMED',
  );
  return (
    <Page title="여행으로 모은 보상">
      <Card style={{ backgroundColor: c.darkGreen, borderWidth: 0 }}>
        <Stack gap={8}>
          <Txt color="#D3E1FA">정산된 보상 수익</Txt>
          <Txt size={38} weight="800" color={c.lime}>
            {money(d.payouts.reduce((s, p) => s + (p.netReward ?? p.reward - Math.round(p.reward * 0.1)), 0))}
          </Txt>
          <Txt size={12} color="#D3E1FA">
            상품대금 상환액을 제외한 보상 · 모의 정산
          </Txt>
        </Stack>
      </Card>
      {pending.map((t) => (
        <Card key={t.id}>
          <Stack>
            <Txt weight="700">구매 확정 · 정산 가능</Txt>
            <Txt size={21} weight="700">
              예상 순보상 {money(Math.round(t.travelerReward * 0.9))}
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
        {d.payouts.map((p) => (
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
        {!d.payouts.length && !pending.length && (
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

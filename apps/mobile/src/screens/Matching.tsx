import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react-native';
import {
  groupForTrip,
  localMoney,
  money,
  quote,
  shortDate,
  STATUS_LABEL,
  Transaction,
  TravelerOffer,
  Transport,
  TRANSPORT_LABEL,
  countryName,
  MAX_DEMO_REWARD,
  rewardCommission,
  canAcceptTrip,
  TRIP_VERIFICATION_LABEL,
} from '@moa/domain';
import { useApp } from '../state/AppContext';
import { MeetupSummary } from '../components/MeetupSummary';
import { ProductOriginal } from '../components/ProductOriginal';
import { colors as c } from '../theme/tokens';
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  DateField,
  Empty,
  Field,
  Notice,
  Page,
  Row,
  Section,
  Stack,
  Txt,
} from '../components/ui';
import { Avatar, AvatarStack, MoneyBreakdown, ProductArt, ProductRow } from '../components/visuals';

export function RequestScreen() {
  const a = useApp(),
    d = a.data!,
    r = d.requests.find((x) => x.id === a.route.id);
  if (!r)
    return (
      <Page title="부탁 상세">
        <Empty
          title="이 요청을 볼 수 없어요"
          body="요청 상태가 바뀌었을 수 있어요."
          action="홈으로"
          onPress={() => a.tab('home')}
        />
      </Page>
    );
  const p = d.places.find((x) => x.id === r.placeId)!,
    mine = r.requesterId === d.me.id,
    offers = d.offers.filter((o) => o.requestId === r.id && o.status === 'PENDING'),
    transaction = d.transactions.find((t) => t.requestId === r.id);
  const active = ['REQUESTED', 'OFFER_RECEIVED'].includes(r.status);
  const act = () =>
    transaction
      ? a.nav(transaction.status === 'MATCHED' ? 'payment' : 'transaction', { id: transaction.id })
      : mine
        ? a.nav('offers', { id: r.id })
        : a.nav('offer-form', { id: r.id });
  return (
    <Page
      title="이 부탁, 함께 볼까요?"
      footer={
        <Button
          label={
            transaction
              ? '거래 이어가기'
              : mine
                ? `수락한 여행자 보기 · ${offers.length}명`
                : '이 부탁 수락하기'
          }
          disabled={!active && !transaction}
          icon={ArrowRight}
          onPress={act}
        />
      }
    >
      <View
        style={{
          backgroundColor: c.mint,
          borderRadius: 26,
          padding: 25,
          alignItems: 'center',
          gap: 10,
        }}
      >
        <ProductArt
          art={r.art}
          image={r.productImage}
          featured={r.productName.includes('치이카와')}
          size={192}
        />
        <Txt size={11} color={c.secondary}>
          {r.productImage ? '요청자가 등록한 사진' : '상품 이해를 위한 예시 일러스트'}
        </Txt>
      </View>
      <Stack gap={9}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Badge>{STATUS_LABEL[r.status]}</Badge>
          <Txt size={12} color={c.secondary}>
            {countryName(r.country)} · {r.city}
          </Txt>
        </Row>
        <Txt size={27} weight="800">
          {r.productName}
        </Txt>
        <Txt size={24} weight="700">
          {localMoney(r.localPrice, r.currency)}{' '}
          <Txt size={14} color={c.secondary}>
            / 1개
          </Txt>
        </Txt>
      </Stack>
      <Pressable accessibilityRole="button" onPress={() => a.nav('place', { id: p.id })}>
        <Card>
          <Row>
            <MapPin size={22} color={c.green} />
            <View style={{ flex: 1 }}>
              <Txt weight="700">{p.name}</Txt>
              <Txt size={12} color={c.secondary}>
                예시 방문 예정자 {p.visitors}명
              </Txt>
            </View>
            <ChevronRight size={20} />
          </Row>
        </Card>
      </Pressable>
      <Card style={{ backgroundColor: c.canvas }}>
        <Stack gap={10}>
          <Row><MapPin size={20} color={c.green} /><Txt weight="700">구매 위치와 재고 확인</Txt></Row>
          <Txt size={14}>{p.city} {p.region} · {p.name}</Txt>
          <Txt size={12} color={c.secondary}>위치 분석 {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)} · 여행 동선 계산에 사용</Txt>
          <Badge bg={r.inventoryStatus === 'IN_STOCK' ? c.mint : r.inventoryStatus === 'OUT_OF_STOCK' ? c.dangerBg : c.butter} color={r.inventoryStatus === 'OUT_OF_STOCK' ? c.danger : c.ink}>{r.inventoryStatus === 'IN_STOCK' ? '링크 재고 있음' : r.inventoryStatus === 'OUT_OF_STOCK' ? '링크 품절' : r.inventoryStatus === 'PREORDER' ? '예약 판매' : '재고 확인 필요'}</Badge>
          <Txt size={12} color={c.secondary}>상품 링크의 구조화된 재고 정보가 있으면 자동 판독해요. 정보가 없는 매장은 여행자가 방문 전 판매처 링크나 전화로 확인해야 해요.</Txt>
        </Stack>
      </Card>
      <Card>
        <Stack gap={13}>
          {[
            ['수량', `${r.quantity}개`],
            ['옵션', r.option || '기본 옵션'],
            [transaction ? '총 결제금액' : '보상 제외 금액', money(transaction?.totalPrice ?? quote(r, 0, r.transport).totalPrice)],
            ['희망 수령일', r.desiredDate],
            ['수령지', `${countryName(r.deliveryCountry)} · ${r.deliveryCity}`],
            ['귀국 후 수령 방법', TRANSPORT_LABEL[r.transport]],
            [
              r.transport === 'MEETUP' ? '직거래 희망 장소' : '배송지',
              r.transport === 'MEETUP'
                ? r.meetupLocation || `${r.deliveryCity} · 매칭 후 정확한 위치 공개`
                : r.deliveryAddress1
                  ? `${r.deliveryAddress1}${r.deliveryAddress2 ? ` · ${r.deliveryAddress2}` : ''}`
                  : `${r.deliveryCity} · 매칭 후 상세 주소 확인`,
            ],
          ].map(([label, value]) => (
            <Row key={label} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Txt size={14} color={c.secondary}>
                {label}
              </Txt>
              <Txt size={14} weight="600" style={{ maxWidth: '65%', textAlign: 'right' }}>
                {value}
              </Txt>
            </Row>
          ))}
        </Stack>
      </Card>
      <Stack gap={14}>
        {r.transport === 'MEETUP' && <MeetupSummary point={r.meetupPoint} />}
        <ProductOriginal text={r.originalText} />
        <Section title="예상 금액, 한눈에" subtitle="여행자가 보상금을 직접 제안하고, 구매자는 총액을 확인한 뒤 결제해요." />
        <MoneyBreakdown price={transaction || quote(r, 0, r.transport)} rewardPending={!transaction} />
        <Notice>
          여행자가 돌아오는 길에 직접 가져와요. 귀국 후 국내 택배 예상 3,500원 또는 직거래 0원으로 전달해요.
        </Notice>
      </Stack>
      <Notice>
        직구 비교 정보 확인 필요 · 실제 비교 견적 없이 절약 금액을 표시하지 않아요. 매칭 시간은 첫
        거래 데이터를 모은 뒤 안내해요.
      </Notice>
      <Row>
        <AvatarStack users={d.users.filter((u) => u.id !== d.me.id)} />
        <Txt size={13} color={c.secondary}>
          가격뿐 아니라 일정과 후기도 함께 살펴봐요.
        </Txt>
      </Row>
    </Page>
  );
}
export function OffersScreen() {
  const a = useApp(),
    d = a.data!,
    r = d.requests.find((x) => x.id === a.route.id);
  const [sort, setSort] = useState('추천순');
  if (!r)
    return (
      <Page title="수락한 여행자">
        <Empty />
      </Page>
    );
  const offers = d.offers
    .filter((o) => o.requestId === r.id && o.status === 'PENDING')
    .sort((a, b) =>
      sort === '낮은 보상순'
        ? a.reward - b.reward
        : sort === '빠른 수령순'
          ? a.estimatedDeliveryDate.localeCompare(b.estimatedDeliveryDate)
          : d.users.find((u) => u.id === b.travelerId)!.completed -
            d.users.find((u) => u.id === a.travelerId)!.completed,
    );
  const select = async (o: TravelerOffer) => {
    const result = await a.mutate<Transaction>(
      `/offers/${o.id}/accept`,
      { expectedRevision: r.revision },
      '함께할 여행자를 선택했어요.',
    );
    if (result) a.nav('payment', { id: result.id });
  };
  return (
    <Page title="누가 가져올까요?">
      <Stack gap={8}>
        <Txt size={28} weight="800">
          가는 길의 여행자,{'\n'}
          {offers.length}명이 가져오겠다고 했어요.
        </Txt>
        <Txt color={c.secondary}>보상, 도착일, 거래 경험을 함께 비교해요.</Txt>
      </Stack>
      <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
      <Row style={{ flexWrap: 'wrap' }}>
        {['추천순', '낮은 보상순', '빠른 수령순'].map((v) => (
          <Chip key={v} label={v} selected={sort === v} onPress={() => setSort(v)} />
        ))}
      </Row>
      {offers.map((o, i) => {
        const u = d.users.find((x) => x.id === o.travelerId)!;
        return (
          <Card key={o.id} style={i === 0 ? { borderColor: c.green, borderWidth: 1.5 } : undefined}>
            <Stack gap={17}>
              {i === 0 && <Badge>거래 경험과 일정으로 살펴보세요</Badge>}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${u.nickname} 프로필`}
                onPress={() => a.nav('profile', { id: u.id })}
              >
                <Row>
                  <Avatar user={u} size={49} />
                  <View style={{ flex: 1 }}>
                    <Txt size={17} weight="700">
                      {u.nickname}
                    </Txt>
                    <Txt size={12} color={c.secondary}>
                      거래 완료 {u.completed}건 · 응답 {u.responseMinutes}분
                    </Txt>
                  </View>
                  <ChevronRight size={18} color={c.secondary} />
                </Row>
              </Pressable>
              <Row style={{ gap: 6 }}>
                <ShieldCheck size={15} color={c.green} />
                <Txt size={12} color={c.green}>
                  휴대폰 · 계좌 · 일정 예시 인증
                </Txt>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Stack gap={4}>
                  <Txt size={12} color={c.secondary}>
                    예상 수령일
                  </Txt>
                  <Txt size={22} weight="700">
                    {shortDate(o.estimatedDeliveryDate)}
                  </Txt>
                </Stack>
                <Stack gap={4} style={{ alignItems: 'flex-end' }}>
                  <Txt size={12} color={c.secondary}>
                    여행자 보상
                  </Txt>
                  <Txt size={24} weight="800" color={c.green}>
                    {money(o.reward)}
                  </Txt>
                </Stack>
              </Row>
              <Txt size={14} color={c.secondary}>
                {o.message}
              </Txt>
              <Divider />
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt size={13} color={c.secondary}>
                  모든 항목 포함 예상 총액
                </Txt>
                <Txt weight="700">{money(quote(r, o.reward, o.transport).totalPrice)}</Txt>
              </Row>
              <Button
                label={`${u.nickname}님과 함께하기`}
                loading={a.busy}
                onPress={() => select(o)}
              />
            </Stack>
          </Card>
        );
      })}
      {!offers.length && (
        <Empty
          title="아직 수락한 여행자가 없어요"
          body="가는 길이 맞는 여행자가 부탁을 수락하면 바로 알려드려요."
          action="여행자 계정 체험"
          onPress={() => a.nav('settings')}
        />
      )}
    </Page>
  );
}
export function ProfileScreen() {
  const a = useApp(),
    d = a.data!,
    u = d.users.find((x) => x.id === a.route.id);
  if (!u)
    return (
      <Page title="여행자">
        <Empty />
      </Page>
    );
  const reviews = d.reviews.filter((r) => r.targetId === u.id);
  return (
    <Page title="어떤 여행자인가요?">
      <Stack style={{ alignItems: 'center', paddingHorizontal: 8 }}>
        <Avatar user={u} size={78} />
        <Txt size={25} weight="800" lines={1}>
          {u.nickname}
        </Txt>
        <Txt color={c.secondary} style={{ textAlign: 'center' }}>
          {u.bio}
        </Txt>
        <Badge>체험용 프로필</Badge>
      </Stack>
      <Row style={{ flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        {u.verificationLabels.map((v) => (
          <Badge key={v}>✓ {v} 예시 인증</Badge>
        ))}
      </Row>
      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {[
            ['거래 완료', `${u.completed}건`],
            ['성공률', u.successRate === null ? '첫 거래' : `${u.successRate}%`],
            ['평균 응답', `${u.responseMinutes}분`],
          ].map(([k, v]) => (
            <Stack key={k} style={{ alignItems: 'center', flex: 1, minWidth: 0 }} gap={5}>
              <Txt size={12} color={c.secondary}>
                {k}
              </Txt>
              <Txt size={20} weight="800" lines={1}>
                {v}
              </Txt>
            </Stack>
          ))}
        </Row>
        <Txt size={11} color={c.secondary} style={{ marginTop: 15 }}>
          프로필 수치는 샘플이며 실제 거래 이력이 아니에요.
        </Txt>
      </Card>
      <View>
        <Section title="예정된 여행" />
        {d.trips
          .filter((t) => t.travelerId === u.id)
          .map((t) => (
            <Card key={t.id} style={{ marginBottom: 10 }}>
              <Stack gap={8}>
                <Txt size={20} weight="700">
                  {t.departureCity} → {[...new Set(t.placeIds.map((id) => d.places.find((place) => place.id === id)?.city).filter(Boolean))].join(' · ') || t.destinationCity}
                </Txt>
                <Txt size={13} color={c.secondary}>
                  {t.startDate} — {t.endDate}
                </Txt>
                <Txt size={13}>
                  {t.placeIds.map((id) => d.places.find((p) => p.id === id)?.name).join(' · ')}
                </Txt>
              </Stack>
            </Card>
          ))}
      </View>
      <View>
        <Section title={`함께한 사람들의 후기 ${reviews.length}개`} />
        {reviews.length ? (
          reviews.map((r) => (
            <Card key={r.id} style={{ marginBottom: 10 }}>
              <Stack gap={8}>
                <Txt color={c.green}>{'★'.repeat(r.rating)}</Txt>
                <Txt>{r.text}</Txt>
              </Stack>
            </Card>
          ))
        ) : (
          <Empty
            title="아직 등록된 후기가 없어요"
            body="구매 확정 뒤 작성한 후기가 여기에 모여요."
          />
        )}
      </View>
      <Notice>
        인증 결과만 보여줘요. 연락처, 계좌번호, 신분증 원본은 프로필에 공개하지 않아요.
      </Notice>
    </Page>
  );
}
export function BundleScreen() {
  const a = useApp(),
    d = a.data!,
    trip = d.trips.find((t) => t.id === a.route.tripId);
  const bundle = trip
    ? groupForTrip(d, trip).find((b) => b.place.id === a.route.placeId)
    : undefined;
  const [selected, setSelected] = useState<string[]>(bundle?.requests.map((r) => r.id) || []);
  if (!trip || !bundle)
    return (
      <Page title="묶음 부탁">
        <Empty
          title="처리할 수 있는 요청이 바뀌었어요"
          body="최신 일정에서 부탁을 다시 골라주세요."
          action="홈으로"
          onPress={() => a.tab('home')}
        />
      </Page>
    );
  const requests = bundle.requests.filter((r) => selected.includes(r.id));
  const reserved = d.offers.filter((o) => o.tripId === trip.id && ['PENDING', 'ACCEPTED'].includes(o.status) &&
    !d.transactions.some((t) => t.offerId === o.id && t.status === 'CANCELLED'))
    .reduce((sum, offer) => sum + (d.requests.find((r) => r.id === offer.requestId)?.quantity || 0), 0);
  const remaining = Math.max(0, trip.maxItems - reserved);
  const items = requests.reduce((s, r) => s + r.quantity, 0),
    advance = requests.reduce((s, r) => s + quote(r, 0, r.transport).productPrice, 0);
  return (
    <Page
      title="한 번 가서, 함께 가져와요"
      footer={
        <Button
          label={`${requests.length}건 한 번에 수락하기`}
          icon={Layers}
          disabled={!requests.length || requests.length > 10 || items > remaining}
          onPress={() =>
            a.nav('offer-form', { tripId: trip.id, requestIds: requests.map((r) => r.id), placeId: bundle.place.id })
          }
        />
      }
    >
      <Stack gap={10}>
        <Badge>{trip.destinationCity} · 내 방문 장소</Badge>
        <Txt size={28} weight="800">
          {bundle.place.name}
        </Txt>
        <Row>
          <Clock size={16} color={c.secondary} />
          <Txt size={13} color={c.secondary}>
            동선 추가 +{bundle.extraMinutes}분 · 예시 추정
          </Txt>
        </Row>
      </Stack>
      <Card style={{ backgroundColor: c.lime, borderWidth: 0 }}>
        <Stack gap={10}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={14}>선택한 {requests.length}건의 보상금</Txt>
            <Layers size={22} />
          </Row>
          <Txt size={35} weight="800">
            직접 제안해요
          </Txt>
          <Txt size={12}>다음 화면에서 부탁별로 원하는 금액을 입력해요. 정산 시 보상의 10%가 운영 수수료로 공제돼요.</Txt>
          <Divider />
          <Txt size={14}>
            상품 {items}개 · 선지출 {money(advance)}
          </Txt>
        </Stack>
      </Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt weight="700">함께 처리할 요청</Txt>
        <Button
          small
          kind="ghost"
          label={selected.length === bundle.requests.length ? '선택 해제' : '전체 선택'}
          onPress={() =>
            setSelected(
              selected.length === bundle.requests.length ? [] : bundle.requests.map((r) => r.id),
            )
          }
        />
      </Row>
      <View>
        {bundle.requests.map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected.includes(r.id) }}
            accessibilityLabel={r.productName}
            onPress={() =>
              setSelected(
                selected.includes(r.id) ? selected.filter((x) => x !== r.id) : [...selected, r.id],
              )
            }
            style={{
              padding: 16,
              borderWidth: 1,
              borderColor: selected.includes(r.id) ? c.green : c.border,
              backgroundColor: selected.includes(r.id) ? c.mint : c.paper,
              borderRadius: 18,
              marginBottom: 12,
            }}
          >
            <Row>
              <ProductArt
                art={r.art}
                image={r.productImage}
                featured={r.productName.includes('치이카와')}
                size={68}
              />
              <Stack gap={5} style={{ flex: 1 }}>
                <Txt weight="600" size={14}>
                  {r.productName}
                </Txt>
                <Txt size={12} color={c.secondary}>
                  {r.quantity}개 · {shortDate(r.desiredDate)}까지
                </Txt>
                <Txt size={13} color={c.green}>
                  상품·전달비 {money(quote(r, 0, r.transport).totalPrice)} · 보상 별도
                </Txt>
              </Stack>
              {selected.includes(r.id) ? (
                <CheckCircle2 size={23} color={c.green} />
              ) : (
                <View
                  style={{
                    width: 23,
                    height: 23,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: c.border,
                  }}
                />
              )}
            </Row>
          </Pressable>
        ))}
      </View>
      {(items > remaining || requests.length > 10) && (
        <Notice tone="error">이 여행은 {remaining}개를 더 가져올 수 있어요. 한 번에 10건 이하로 선택해주세요.</Notice>
      )}
      <Notice>
        수락하면 각 구매자와 거래방이 바로 열려요. 결제가 완료된 부탁만 구매해주세요.
        재고와 매장 구매 제한도 방문 전에 확인해야 해요.
      </Notice>
    </Page>
  );
}
export function OfferForm() {
  const a = useApp(),
    d = a.data!;
  const ids = a.route.requestIds || [a.route.id!];
  const requests = d.requests.filter((r) => ids.includes(r.id));
  const first = requests[0];
  const trips = d.trips.filter(
    (t) => t.travelerId === d.me.id && first && t.placeIds.includes(first.placeId),
  );
  const [tripId, setTripId] = useState(a.route.tripId || trips.at(-1)?.id || '');
  const trip = trips.find((t) => t.id === tripId);
  const suggestedDelivery = (endDate: string) => {
    const candidate = new Date(new Date(endDate).getTime() + 5 * 86400000).toISOString().slice(0, 10);
    return requests.reduce((date, request) => request.desiredDate < date ? request.desiredDate : date, candidate);
  };
  const [purchase, setPurchase] = useState(trip?.startDate || ''),
    [delivery, setDelivery] = useState(
      trip
        ? suggestedDelivery(trip.endDate)
        : '',
    ),
    [message, setMessage] = useState(
      '이곳에 방문 예정이에요. 구매 후 사진과 영수증을 보내드릴게요.',
    ),
    [transport] = useState<Transport>(first?.transport || 'DOMESTIC_PARCEL');
  const [agree, setAgree] = useState(false);
  const [rewards, setRewards] = useState<Record<string, string>>({});
  const rewardFor = (id: string) => {
    const input = (rewards[id] || '').replace(/,/g, '').trim();
    const value = Number(input);
    return /^\d+$/.test(input) && Number.isSafeInteger(value) && value <= MAX_DEMO_REWARD
      ? value : undefined;
  };
  if (!first)
    return (
      <Page title="부탁 수락하기">
        <Empty />
      </Page>
    );
  if (!trips.length)
    return (
      <Page title="부탁 수락하기">
        <Empty
          title="먼저 방문 일정을 등록해주세요"
          body="예정된 방문 장소의 부탁만 수락할 수 있어요."
          action="여행 등록"
          onPress={() => a.nav('trip-form')}
        />
      </Page>
    );
  const total = requests.reduce((s, r) => s + quote(r, 0, r.transport).productPrice, 0);
  const validRewards = requests.every((r) => rewardFor(r.id) !== undefined);
  const grossReward = requests.reduce((s, r) => s + (rewardFor(r.id) ?? 0), 0);
  const commission = requests.reduce((s, r) => s + rewardCommission(rewardFor(r.id) ?? 0), 0);
  const methods = [...new Set(requests.map((r) => TRANSPORT_LABEL[r.transport]))].join(' · ');
  const submit = async () => {
    if (!validRewards) return;
    const body = {
      tripId,
      reward: rewardFor(first.id)!,
      estimatedPurchaseDate: purchase,
      estimatedDeliveryDate: delivery,
      message,
      transport,
    };
    const result = await a.mutate(
      ids.length > 1 ? '/bundles/claim' : `/requests/${first.id}/claim`,
      ids.length > 1 ? { ...body, requestIds: ids, rewards: Object.fromEntries(requests.map((r) => [r.id, rewardFor(r.id)!])) } : body,
      '부탁을 수락했어요. 바로 대화를 시작할 수 있어요.',
    );
    if (result) ids.length === 1 ? a.nav('transaction', { id: (result as Transaction).id }) : a.tab('trades');
  };
  return (
    <Page
      title={ids.length > 1 ? '묶음 부탁 수락하기' : '가는 김에 수락하기'}
      footer={
        <Button
          label={canAcceptTrip(trip) ? `${ids.length}건 부탁 수락하기` : '먼저 왕복 항공권 인증하기'}
          disabled={canAcceptTrip(trip) ? !agree || !validRewards : !trip}
          loading={a.busy}
          onPress={() => canAcceptTrip(trip) ? submit() : trip && a.nav('flight-proof', { id: trip.id })}
        />
      }
    >
      <Stack gap={8}>
        <Badge>{ids.length}개의 부탁</Badge>
        <Txt size={28} weight="800">
          이 일정으로{'\n'}가져올 수 있어요.
        </Txt>
      </Stack>
      <Row style={{ flexWrap: 'wrap' }}>
        {trips.map((t) => (
          <Chip
            key={t.id}
            label={`${t.destinationCity} ${shortDate(t.startDate)}–${shortDate(t.endDate)}`}
            selected={tripId === t.id}
            onPress={() => {
              setTripId(t.id);
              setPurchase(t.startDate);
              setDelivery(
                suggestedDelivery(t.endDate),
              );
            }}
          />
        ))}
      </Row>
      <Stack gap={12}>
        <Txt size={20} weight="700">보상금은 직접 정하세요</Txt>
        <Txt size={13} color={c.secondary}>구매자가 이 금액을 포함한 총액을 확인하고 결제해요. 수량과 구매에 드는 시간을 고려해 부탁별로 입력해주세요.</Txt>
        {requests.map((r, index) => (
          <Field
            key={r.id}
            label={`${index + 1}. ${r.productName} 보상금 (원)`}
            value={rewards[r.id] || ''}
            onChange={(value) => { setRewards((current) => ({ ...current, [r.id]: value })); setAgree(false); }}
            keyboard="numeric"
            required
            placeholder="원하는 금액 입력"
            hint={`수량 ${r.quantity}개를 포함한 이 부탁 전체의 보상 · 0~${MAX_DEMO_REWARD.toLocaleString('ko-KR')}원 (체험 한도)`}
            error={rewards[r.id] && rewardFor(r.id) === undefined ? '0원 이상의 원 단위 금액을 체험 한도 안에서 입력해주세요.' : undefined}
          />
        ))}
      </Stack>
      <Card style={{ backgroundColor: c.mint }}>
        <Stack gap={8}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt weight="600">제안 보상 합계</Txt>
            <Txt size={20} weight="800">{validRewards ? money(grossReward) : '금액 입력 필요'}</Txt>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={13} color={c.secondary}>운영 수수료 10%</Txt>
            <Txt size={13} color={c.secondary}>{validRewards ? `-${money(commission)}` : '—'}</Txt>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt weight="700">예상 순보상</Txt>
            <Txt size={24} weight="800" color={c.green}>{validRewards ? money(grossReward - commission) : '—'}</Txt>
          </Row>
        </Stack>
        <Txt size={13} color={c.secondary} style={{ marginTop: 12 }}>
          상품 선지출 {money(total)} · {methods}{'\n'}상품가격은 수익이 아니라 구매 확정 뒤
          상환받을 금액이에요.
        </Txt>
      </Card>
      <DateField label="예상 구매일" value={purchase} onChange={setPurchase} min={trip?.startDate} />
      <DateField label="예상 수령일" value={delivery} onChange={setDelivery} min={trip && trip.endDate > purchase ? trip.endDate : purchase} />
      <Stack>
        <Txt size={14} weight="600">
          전달 방식
        </Txt>
        <Notice>
          구매자가 선택한 {methods} 방식으로 각각 전달해요. 해외에서는 여행자의 원래 이동 동선으로 가져와요.
        </Notice>
      </Stack>
      {trip && <Badge>{TRIP_VERIFICATION_LABEL[trip.verificationStatus]}</Badge>}
      {!canAcceptTrip(trip) && <Notice>인증이 완료된 여행 일정에서만 부탁을 수락할 수 있어요. 항공권 사진·QR 인식 후에도 실제 발권 확인이 필요해요.</Notice>}
      <Field label="구매자에게 한마디" value={message} onChange={setMessage} multiline />
      {requests.map((r) => (
        <Card key={r.id}>
          <Stack>
            <Txt weight="700">{r.productName}</Txt>
            <Badge>{TRANSPORT_LABEL[r.transport]}</Badge>
            <MoneyBreakdown compact price={quote(r, rewardFor(r.id) ?? 0, r.transport)} rewardPending={rewardFor(r.id) === undefined} />
          </Stack>
        </Card>
      ))}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agree }}
        onPress={() => setAgree(!agree)}
        style={{ paddingVertical: 10 }}
      >
        <Row style={{ alignItems: 'flex-start' }}>
          <CheckCircle2 size={23} color={agree ? c.green : c.muted} />
          <Txt style={{ flex: 1 }} size={14}>
            상품대금을 먼저 지출하고 구매 확정 후 상환받는다는 점을 확인했어요.
          </Txt>
        </Row>
      </Pressable>
    </Page>
  );
}

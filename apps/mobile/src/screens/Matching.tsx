import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  ArrowRight,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  Plane,
  Pencil,
  ShieldCheck,
  Stamp,
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
  canAcceptTrip,
  TRIP_VERIFICATION_LABEL,
  rewardCommission,
  PROFILE_AVATAR_COLORS,
  User,
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
import { Avatar, MoneyBreakdown, PlaceCover, ProductArt, ProductRow } from '../components/visuals';
import { pickImage } from '../lib/images';

export function RequestScreen() {
  const [confirmCancel, setConfirmCancel] = useState(false);
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
  const p = d.places.find((x) => x.id === r.placeId),
    mine = r.requesterId === d.me.id,
    offers = d.offers.filter((o) => o.requestId === r.id && o.status === 'PENDING'),
    transaction = d.transactions.find((t) => t.requestId === r.id),
    funding = d.requestFundings?.find((f) => f.requestId === r.id);
  if (!p) return <Page title="부탁 상세"><Empty title="구매 장소를 불러오지 못했어요" body="이전 화면에서 부탁을 다시 확인해주세요." action="둘러보기" onPress={() => a.tab('search')} /></Page>;
  const active = ['REQUESTED', 'OFFER_RECEIVED'].includes(r.status);
  const alreadyAccepted = offers.some((offer) => offer.travelerId === d.me.id);
  const act = () =>
    transaction
      ? a.nav(transaction.status === 'MATCHED' && mine ? 'payment' : 'transaction', { id: transaction.id })
      : mine
        ? r.status === 'PAYMENT_PENDING' ? a.nav('payment', { requestIds: [r.id] }) : a.nav('offers', { id: r.id })
        : a.nav('offer-form', { id: r.id });
  return (
    <Page
      title="부탁 상세"
      footer={
        <Button
          label={
            transaction
              ? '거래 이어가기'
              : mine
                ? r.status === 'PAYMENT_PENDING' ? '결제하고 부탁 공개하기' : `지원한 여행자 보기 · ${offers.length}명`
                : alreadyAccepted ? '지원을 보냈어요' : '가져오겠다고 지원하기'
          }
          disabled={(!active && !transaction && !(mine && r.status === 'PAYMENT_PENDING')) || (alreadyAccepted && !transaction)}
          icon={ArrowRight}
          onPress={act}
        />
      }
    >
      <View
        style={{
          backgroundColor: c.primarySoft,
          borderRadius: 20,
          padding: 24,
          alignItems: 'center',
          gap: 10,
        }}
      >
        <ProductArt
          art={r.art}
          image={r.productImage}
          featured={r.productName.includes('치이카와')}
          size={168}
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
        <Txt size={28} weight="800" color={c.primaryStrong}>
          {money(quote({ ...r, quantity: 1 }, 0, r.transport,
            funding ? { krwPerUnit: funding.fxRate, source: funding.priceSource, asOf: funding.fxAsOf } : undefined).productPrice)}{' '}
          <Txt size={14} color={c.secondary}>
            / 1개
          </Txt>
        </Txt>
        <Txt size={13} color={c.secondary}>{localMoney(r.localPrice, r.currency)} · 현지 상품가 기준</Txt>
      </Stack>
      <Pressable accessibilityRole="button" onPress={() => a.nav('place', { id: p.id })}>
        <Card>
          <Row>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}><MapPin size={21} color={c.primaryStrong} /></View>
            <View style={{ flex: 1 }}>
              <Txt size={11} color={c.secondary}>이곳에서 만나는 상품</Txt>
              <Txt weight="700">{p.name}</Txt>
              <Txt size={12} color={c.secondary}>
                {p.city} · {p.region}
              </Txt>
            </View>
            <ChevronRight size={20} />
          </Row>
        </Card>
      </Pressable>
      <Card style={{ backgroundColor: c.canvas }}>
        <Stack gap={10}>
          <Row><MapPin size={20} color={c.green} /><Txt weight="700">방문 전 확인해요</Txt></Row>
          <Badge bg={r.inventoryStatus === 'IN_STOCK' ? c.mint : r.inventoryStatus === 'OUT_OF_STOCK' ? c.dangerBg : c.butter} color={r.inventoryStatus === 'OUT_OF_STOCK' ? c.danger : c.ink}>{r.inventoryStatus === 'IN_STOCK' ? '링크 재고 있음' : r.inventoryStatus === 'OUT_OF_STOCK' ? '링크 품절' : r.inventoryStatus === 'PREORDER' ? '예약 판매' : '재고 확인 필요'}</Badge>
          <Txt size={13} color={c.secondary}>온라인 재고와 매장 재고는 다를 수 있어요. 방문 전 판매처에서 확인해주세요.</Txt>
        </Stack>
      </Card>
      <Card>
        <Stack gap={13}>
          {[
            ['수량', `${r.quantity}개`],
            ['옵션', r.option || '기본 옵션'],
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
        <Section title={r.status === 'PAYMENT_PENDING' ? '예상 결제금액' : '부탁 금액'} subtitle="구매자가 정한 상품·보상·전달비예요." />
        <MoneyBreakdown price={transaction || funding || quote(r, r.requestedReward ?? 0, r.transport)} rewardPending={!transaction && r.requestedReward === undefined} />
        {mine && !transaction && <Notice>{r.status === 'PAYMENT_PENDING' ? '결제 전에는 나에게만 보여요. 결제를 마치면 여행자들이 지원할 수 있어요.' : r.status === 'CANCELLED' ? '취소된 부탁이에요. 결제했다면 전액 모의 환불됐어요.' : '결제금은 모의 보관 중이에요. 여러 여행자의 일정과 프로필을 비교하고 한 명을 선택해주세요.'}</Notice>}
        {mine && !transaction && ['PAYMENT_PENDING', 'REQUESTED', 'OFFER_RECEIVED'].includes(r.status) && <Stack gap={8}>
          {confirmCancel && <Notice>부탁을 취소할까요? 지원한 여행자에게 안내하고, 보관된 결제금은 전액 모의 환불해요.</Notice>}
          <Button kind="ghost" label={confirmCancel ? '취소 확정하기' : '부탁 취소하기'} loading={a.busy} onPress={async () => {
            if (!confirmCancel) { setConfirmCancel(true); return; }
            const result = await a.mutate(`/requests/${r.id}/cancel`, { expectedRevision: r.revision }, '부탁을 취소했어요. 결제금이 있다면 전액 모의 환불했어요.');
            if (result) a.tab('trades');
          }} />
          {confirmCancel && <Button kind="ghost" label="계속 기다릴게요" onPress={() => setConfirmCancel(false)} />}
        </Stack>}
        <Txt size={13} color={c.secondary}>여행자가 직접 가져와 귀국 후 전달해요.</Txt>
      </Stack>
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
      <Page title="지원한 여행자">
        <Empty />
      </Page>
    );
  const offers = d.offers
    .filter((o) => o.requestId === r.id && o.status === 'PENDING' && d.users.some((u) => u.id === o.travelerId))
    .sort((a, b) =>
      sort === '낮은 보상순'
        ? a.reward - b.reward
        : sort === '빠른 수령순'
          ? a.estimatedDeliveryDate.localeCompare(b.estimatedDeliveryDate)
          : d.users.find((u) => u.id === b.travelerId)!.completed -
            d.users.find((u) => u.id === a.travelerId)!.completed,
    );
  if (r.requesterId !== d.me.id) return <Page title="지원한 여행자"><Empty title="내가 보낸 부탁에서 확인할 수 있어요" action="부탁 상세 보기" onPress={() => a.nav('request', { id: r.id })} /></Page>;
  if (r.status === 'PAYMENT_PENDING') return <Page title="지원한 여행자"><Empty title="먼저 결제를 완료해주세요" body="결제한 부탁에 여행자들이 지원할 수 있어요." action="결제하고 부탁 공개하기" onPress={() => a.nav('payment', { requestIds: [r.id] })} /></Page>;
  if (!['REQUESTED', 'OFFER_RECEIVED'].includes(r.status)) return <Page title="지원한 여행자"><Empty title="선택이 끝난 부탁이에요" action="부탁 확인하기" onPress={() => a.nav('request', { id: r.id })} /></Page>;
  const funding = d.requestFundings?.find((item) => item.requestId === r.id);
  const select = async (o: TravelerOffer) => {
    const result = await a.mutate<Transaction>(
      `/offers/${o.id}/accept`,
      { expectedRevision: r.revision },
      '함께할 여행자를 선택했어요.',
    );
    if (result) a.nav('transaction', { id: result.id });
  };
  return (
    <Page title="누가 가져올까요?">
      <Txt size={13} color={c.secondary}>결제 완료 · 한 명을 선택하면 매칭과 채팅이 시작돼요.</Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={`${r.productName} 부탁 상세`} onPress={() => a.nav('request', { id: r.id })} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
        <Row style={{ gap: 12 }}><ProductArt art={r.art} image={r.productImage} featured={r.productName.includes('치이카와')} size={48} /><Stack gap={3} style={{ flex: 1, minWidth: 0 }}><Txt size={14} weight="600" lines={1}>{r.productName}</Txt><Txt size={12} color={c.secondary}>{r.quantity}개 · {shortDate(r.desiredDate)}까지 받아요</Txt></Stack><ChevronRight size={17} color={c.muted} /></Row>
      </Pressable>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>{(r.requestedReward === undefined ? ['추천순', '낮은 보상순', '빠른 수령순'] : ['추천순', '빠른 수령순']).map((v) => (
          <Chip key={v} label={v} selected={sort === v} onPress={() => setSort(v)} />
        ))}</Row><Txt size={12} color={c.secondary}>지원 {offers.length}명</Txt>
      </Row>
      {offers.map((o, i) => {
        const u = d.users.find((x) => x.id === o.travelerId)!;
        const trip = d.trips.find((item) => item.id === o.tripId);
        const unavailable = !canAcceptTrip(trip) ? '선택 전에 여행 일정 인증을 확인해야 해요.'
          : !['REQUESTED', 'OFFER_RECEIVED'].includes(r.status) ? '이미 매칭되었거나 종료된 부탁이에요.'
            : o.estimatedPurchaseDate < new Date().toISOString().slice(0, 10) ? '구매 예정일이 지나 새 일정 확인이 필요해요.' : '';
        return (
          <Card key={o.id} style={{ padding: 0, overflow: 'hidden', borderWidth: 1, borderColor: i === 0 ? c.primaryTint : c.border }}>
            <Stack gap={12} style={{ padding: 16 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${u.nickname} 프로필`}
                onPress={() => a.nav('profile', { id: u.id })}
              >
                <Row>
                  <Avatar user={u} size={52} />
                  <View style={{ flex: 1 }}>
                    <Txt size={19} weight="700">
                      {u.nickname}
                    </Txt>
                    <Txt size={12} color={c.secondary}>
                      거래 완료 {u.completed}건 · 응답 {u.responseMinutes}분
                    </Txt>
                  </View>
                  <ChevronRight size={18} color={c.secondary} />
                </Row>
              </Pressable>
              <Row style={{ gap: 6, alignItems: 'flex-start' }}><ShieldCheck size={15} color={c.primaryStrong} /><Txt size={12} color={c.secondary} style={{ flex: 1 }}>{u.verificationLabels.length ? `${u.verificationLabels.slice(0, 2).join(' · ')} 예시 인증` : '본인 확인 정보 없음'}{trip ? ` · ${TRIP_VERIFICATION_LABEL[trip.verificationStatus]}` : ''}</Txt></Row>
              {trip && <View style={{ backgroundColor: c.primarySoft, borderRadius: 14, padding: 12 }}>
                <Row style={{ gap: 8 }}><Txt size={14} weight="700" style={{ flex: 1 }}>{trip.departureCity}</Txt><View style={{ flex: 1, height: 1, backgroundColor: c.primaryTint }} /><Plane size={17} color={c.primaryStrong} /><View style={{ flex: 1, height: 1, backgroundColor: c.primaryTint }} /><Txt size={17} weight="800" color={c.primaryDeep} style={{ flex: 1.3, textAlign: 'right' }}>{trip.destinationCity}</Txt></Row>
                <Txt size={12} color={c.secondary} style={{ marginTop: 5 }}>{shortDate(trip.startDate)} — {shortDate(trip.endDate)} · 여행 예정</Txt>
              </View>}
              <Row style={{ justifyContent: 'space-between' }}>
                <Stack gap={4}>
                  <Txt size={12} color={c.secondary}>
                    예상 구매일
                  </Txt>
                  <Txt size={22} weight="700">
                    {shortDate(o.estimatedPurchaseDate)}
                  </Txt>
                </Stack>
                <Stack gap={4} style={{ alignItems: 'flex-end' }}>
                  <Txt size={12} color={c.secondary}>
                    여행자 보상
                  </Txt>
                  <Txt size={26} weight="800" color={c.primaryStrong}>
                    {money(o.reward)}
                  </Txt>
                </Stack>
              </Row>
              <Row style={{ gap: 5 }}><Calendar size={14} color={c.secondary} /><Txt size={12} color={c.secondary}>예상 수령 {shortDate(o.estimatedDeliveryDate)} · {TRANSPORT_LABEL[o.transport]}</Txt></Row>
              <Divider />
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt size={13} color={c.secondary}>
                  보관 중인 결제금
                </Txt>
                <Txt size={20} weight="700">{money(funding?.totalPrice ?? quote(r, o.reward, o.transport).totalPrice)}</Txt>
              </Row>
              {trip && <Button small kind="secondary" icon={Calendar} label="이 사람의 일정 보기" onPress={() => a.nav('trip-route', { id: o.tripId, placeId: r.placeId })} />}
              <Button
                label={`${u.nickname}님과 함께하기`}
                loading={a.busy}
                disabled={!!unavailable}
                onPress={() => select(o)}
              />
              {!!o.message && <Txt size={12} color={c.secondary} lines={2}>{o.message}</Txt>}
              {!!unavailable && <Txt size={12} color={c.secondary}>{unavailable}</Txt>}
            </Stack>
          </Card>
        );
      })}
      {!offers.length && (
        <Empty
          title="아직 지원한 여행자가 없어요"
          body="가는 길이 맞는 여행자가 지원하면 알려드려요. 부탁 상세에서 취소·전액 환불할 수 있어요."
          action="부탁 확인하기"
          onPress={() => a.nav('request', { id: r.id })}
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
  const trips = d.trips.filter((t) => t.travelerId === u.id);
  const rating = reviews.length ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1) : null;
  const mine = u.id === d.me.id;
  return (
    <Page title={mine ? '내 프로필' : '어떤 여행자인가요?'}>
      <Stack gap={20}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack gap={6} style={{ flex: 1, minWidth: 0 }}><Txt size={12} weight="700" color={c.primaryStrong}>YOUR TRAVEL MATE</Txt><Txt size={28} weight="800">{u.nickname}</Txt>{rating ? <Row style={{ gap: 5 }}><Stamp size={15} color={c.primaryStrong} /><Txt size={14} weight="700">스탬프 {rating}/5</Txt><Txt size={12} color={c.secondary}>후기 {reviews.length}개</Txt></Row> : <Txt size={13} color={c.secondary}>첫 후기를 기다리고 있어요</Txt>}</Stack>
          <Avatar user={u} size={80} />
        </Row>
        <Txt size={15} color={c.secondary}>{u.bio || '아직 소개가 없어요.'}</Txt>
        {mine && <Button small kind="secondary" icon={Pencil} label="프로필 수정" onPress={() => a.nav('profile-edit')} />}
        <Row style={{ alignItems: 'flex-start', gap: 7 }}><ShieldCheck size={17} color={c.primaryStrong} /><Txt size={12} color={c.secondary} style={{ flex: 1 }}>{u.verificationLabels.length ? `${u.verificationLabels.join(' · ')} 예시 인증` : '아직 등록된 인증이 없어요'}</Txt></Row>
      </Stack>
      <Card style={{ backgroundColor: c.primarySoft, borderWidth: 0 }}>
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
              <Txt size={23} weight="800" lines={1}>
                {v}
              </Txt>
            </Stack>
          ))}
        </Row>
        <Txt size={11} color={c.secondary} style={{ marginTop: 15 }}>
          체험용 프로필 · 거래 수치는 예시예요.
        </Txt>
      </Card>
      <View>
        <Section title="공개한 여행" subtitle="어디를 들르는지 확인해보세요." />
        {trips.map((t) => {
          const tripPlaces = t.placeIds.map((id) => d.places.find((p) => p.id === id)).filter(Boolean) as typeof d.places;
          return <Card key={t.id} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
              {tripPlaces[0] && <View style={{ height: 148, overflow: 'hidden' }}><PlaceCover place={tripPlaces[0]} thumbnail /></View>}
              <Stack gap={14} style={{ padding: 18 }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}><Stack gap={5} style={{ flex: 1, minWidth: 0 }}><Txt size={23} weight="800">{[...new Set(tripPlaces.map((place) => place.city))].join(' · ') || t.destinationCity}</Txt><Txt size={13} color={c.secondary}>{shortDate(t.startDate)} — {shortDate(t.endDate)}</Txt></Stack><Badge>{tripPlaces.length}곳</Badge></Row>
                <Row style={{ gap: 7 }}><Plane size={15} color={c.primaryStrong} /><Txt size={13} color={c.secondary}>{t.departureCity} 출발</Txt></Row>
                <Txt size={13} color={c.secondary} lines={2}>{tripPlaces.length ? tripPlaces.map((place) => place.name).join(' → ') : '세부 동선을 정하고 있어요'}</Txt>
                <Button small kind="secondary" icon={Calendar} label="경로와 시간 보기" onPress={() => a.nav('trip-route', { id: t.id })} />
              </Stack>
            </Card>;
        })}
        {!trips.length && <Empty title="아직 공개한 여행이 없어요" body="여행을 등록하면 방문 일정이 이곳에 보여요." />}
      </View>
      <View>
        <Section title={`함께한 사람들의 후기 ${reviews.length}개`} />
        {reviews.length ? (
          reviews.map((r) => (
            <View key={r.id} style={{ paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Stack gap={8}>
                <Row style={{ gap: 5 }}><Stamp size={15} color={c.primaryStrong} /><Txt size={13} weight="700">스탬프 {r.rating}/5</Txt><Txt size={12} color={c.secondary}>함께한 여행 후기</Txt></Row>
                <Txt>{r.text}</Txt>
              </Stack>
            </View>
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
function ProfileFormScreen({ firstLogin = false }: { firstLogin?: boolean }) {
  const a = useApp(), u = a.data!.me;
  const [nickname, setNickname] = useState(u.nickname);
  const [bio, setBio] = useState(u.bio);
  const [avatarColor, setAvatarColor] = useState(u.avatarColor);
  const [avatarImage, setAvatarImage] = useState<string | null>(u.avatarImage || null);
  const [imageError, setImageError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const cleanNickname = nickname.trim(), cleanBio = bio.trim();
  const nicknameError = cleanNickname.length < 2 ? '닉네임을 2자 이상 입력해주세요.' : cleanNickname.length > 24 ? '닉네임은 24자 이내로 입력해주세요.' : '';
  const bioError = cleanBio.length > 120 ? '소개는 120자 이내로 입력해주세요.' : '';
  const changed = cleanNickname !== u.nickname || cleanBio !== u.bio || avatarColor !== u.avatarColor || avatarImage !== (u.avatarImage || null);
  const preview: User = { ...u, initials: Array.from(cleanNickname)[0] || u.initials, avatarColor, avatarImage: avatarImage || undefined };
  const choosePhoto = async () => {
    try {
      const selected = await pickImage({ quality: 0.35, allowsEditing: true });
      if (selected) { setAvatarImage(selected); setImageError(''); }
    } catch (error) { setImageError((error as Error).message); }
  };
  const save = async () => {
    setSubmitted(true);
    if (nicknameError || bioError || (!firstLogin && !changed) || a.busy) return;
    const updated = await a.mutate<User>('/profile', { nickname: cleanNickname, bio: cleanBio, avatarColor, avatarImage }, firstLogin ? '프로필을 만들었어요.' : '프로필을 수정했어요.');
    if (updated && !firstLogin) a.back();
  };
  return (
    <Page title={firstLogin ? '프로필 만들기' : '프로필 수정'} back={!firstLogin} footer={<Button label={firstLogin ? '저장하고 시작하기' : '저장하기'} onPress={() => void save()} disabled={(!firstLogin && !changed) || a.busy} loading={a.busy} />}>
      <Stack gap={24}>
        {firstLogin && <Stack gap={6}><Txt size={23} weight="800">반가워요!</Txt><Txt size={14} color={c.secondary}>앞으로 사용할 이름과 사진을 정해주세요.</Txt></Stack>}
        <Row style={{ gap: 16 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="프로필 사진 바꾸기" onPress={() => void choosePhoto()}><Avatar user={preview} size={72} /></Pressable>
          <Stack gap={5} style={{ flex: 1, minWidth: 0 }}><Txt size={18} weight="700">{cleanNickname || u.nickname}</Txt><Txt size={13} color={c.secondary}>다른 사람에게 보이는 프로필이에요.</Txt></Stack>
        </Row>
        <Stack gap={8}>
          <Button small kind="secondary" icon={Camera} label="사진 바꾸기" onPress={() => void choosePhoto()} />
          {avatarImage && <Button small kind="ghost" label="사진 삭제" onPress={() => setAvatarImage(null)} />}
          <Txt size={12} color={c.secondary}>선택 사항 · JPG·PNG·WebP, 2MB 이하</Txt>
          {!!imageError && <Notice tone="error">{imageError}</Notice>}
        </Stack>
        <Field label="닉네임" value={nickname} onChange={setNickname} placeholder="어떻게 불러드릴까요?" required error={submitted ? nicknameError : undefined} hint="2~24자" />
        <Field label="한 줄 소개" value={bio} onChange={setBio} placeholder="어떤 여행을 좋아하시나요?" multiline error={submitted ? bioError : undefined} hint={`${cleanBio.length}/120자 · 비워둘 수 있어요.`} />
        {!avatarImage && <Stack gap={12}><Txt size={14} weight="600">프로필 색상</Txt><Row style={{ flexWrap: 'wrap', gap: 12 }}>{PROFILE_AVATAR_COLORS.map((color, index) => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`프로필 색상 ${index + 1}`} accessibilityState={{ selected: avatarColor === color }} onPress={() => setAvatarColor(color)} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: avatarColor === color ? 2 : 1, borderColor: avatarColor === color ? c.primaryStrong : c.border, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>{avatarColor === color && <Check size={22} color={c.primaryStrong} />}</Pressable>)}</Row></Stack>}
        <Notice>사진·닉네임·소개는 다른 사용자에게 공개돼요. 연락처나 계좌 정보는 적지 마세요.</Notice>
        {firstLogin && <Stack gap={8}><Txt size={12} color={c.secondary}>본인인증은 실제 인증 서비스가 연결된 뒤 이용할 수 있어요.</Txt><Button kind="ghost" label="다른 계정으로 로그인" onPress={() => void a.logout()} /></Stack>}
      </Stack>
    </Page>
  );
}
export function ProfileEditScreen() { return <ProfileFormScreen />; }
export function ProfileSetupScreen() { return <ProfileFormScreen firstLogin />; }
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
    advance = requests.reduce((s, r) => s + (d.requestFundings?.find((f) => f.requestId === r.id)?.productPrice
      ?? quote(r, 0, r.transport).productPrice), 0);
  const grossReward = requests.reduce((sum, request) => sum + (request.requestedReward ?? 0), 0);
  const commission = requests.reduce((sum, request) => sum + rewardCommission(request.requestedReward ?? 0), 0);
  return (
    <Page
      title="한 번 가서, 함께 가져와요"
      footer={
        <Button
          label={`${requests.length}건 한 번에 지원하기`}
          icon={Layers}
          disabled={!requests.length || requests.length > 10 || items > remaining}
          onPress={() =>
            a.nav('offer-form', { tripId: trip.id, requestIds: requests.map((r) => r.id), placeId: bundle.place.id })
          }
        />
      }
    >
      <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: c.surface }}>
        <View style={{ height: 166, overflow: 'hidden' }}><PlaceCover place={bundle.place} thumbnail /></View>
        <Stack gap={10} style={{ padding: 20 }}><Txt size={12} weight="700" color={c.primaryStrong}>{bundle.place.city} · MY ROUTE</Txt><Txt size={25} weight="800">{bundle.place.name}</Txt><Txt size={16} color={c.secondary}>한 번 들러서, {bundle.requests.length}개의 부탁을.</Txt><Row style={{ gap: 6 }}><Clock size={14} color={c.secondary} /><Txt size={12} color={c.secondary}>추가 이동 +{bundle.extraMinutes}분 · 예시 추정</Txt></Row></Stack>
      </View>
      <Card style={{ backgroundColor: c.primaryDeep, borderWidth: 0 }}>
        <Stack gap={12}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={14} color={c.navyText}>선택한 {requests.length}건의 보상금</Txt>
            <Layers size={22} color={c.primaryTint} />
          </Row>
          <Txt size={34} weight="800" color={c.onPrimary}>
            {money(grossReward)}
          </Txt>
          <Txt size={12} color={c.navyText}>{requests.some((request) => request.requestedReward === undefined) ? '보상 미정인 부탁은 다음 화면에서 확인해요.' : '구매자가 정한 보상이에요.'}</Txt>
          <View style={{ height: 1, backgroundColor: c.navyDivider }} />
          <Row style={{ justifyContent: 'space-between' }}><Txt size={12} color={c.navyText}>수수료 10% 제외 후</Txt><Txt size={18} weight="700" color={c.onPrimary}>{money(grossReward - commission)}</Txt></Row>
        </Stack>
      </Card>
      <Row style={{ paddingHorizontal: 4, justifyContent: 'space-between', alignItems: 'flex-start' }}><Stack gap={4}><Txt size={12} color={c.secondary}>가져올 상품</Txt><Txt size={20} weight="700">{items}개 <Txt size={12} color={c.secondary}>/ 여유 {remaining}개</Txt></Txt></Stack><Stack gap={4} style={{ alignItems: 'flex-end' }}><Txt size={12} color={c.secondary}>상품 구매에 필요한 금액</Txt><Txt size={20} weight="700">{money(advance)}</Txt></Stack></Row>
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
            aria-checked={selected.includes(r.id)}
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
              backgroundColor: c.paper,
              borderRadius: 18,
              opacity: 1,
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
                  {r.requestedReward === undefined ? '보상 미정' : `보상 ${money(r.requestedReward)}`}
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
        같은 장소의 부탁에 한 번에 지원해요. 각 구매자가 나를 선택하면 거래방이 열려요.
        재고와 매장 구매 제한도 방문 전에 확인해야 해요.
      </Notice>
    </Page>
  );
}
export function OfferForm() {
  const a = useApp(),
    d = a.data!;
  const ids = [...new Set(a.route.requestIds || [a.route.id!])];
  const requests = d.requests.filter((r) => ids.includes(r.id));
  const first = requests[0];
  const trips = d.trips.filter(
    (t) => t.travelerId === d.me.id && first && t.endDate >= new Date().toISOString().slice(0, 10) && requests.every((request) =>
      t.placeIds.includes(request.placeId) && t.destinationCountry === request.country &&
      t.departureCountry === request.deliveryCountry && (request.transport !== 'MEETUP' || t.departureCity === request.deliveryCity) &&
      t.endDate <= request.desiredDate),
  );
  const [tripId, setTripId] = useState(trips.find((item) => item.id === a.route.tripId)?.id || trips.at(-1)?.id || '');
  const trip = trips.find((t) => t.id === tripId);
  const suggestedDelivery = (endDate: string) => {
    const candidate = new Date(new Date(endDate).getTime() + 5 * 86400000).toISOString().slice(0, 10);
    return requests.reduce((date, request) => request.desiredDate < date ? request.desiredDate : date, candidate);
  };
  const [purchase, setPurchase] = useState(trip ? (trip.startDate > new Date().toISOString().slice(0, 10) ? trip.startDate : new Date().toISOString().slice(0, 10)) : ''),
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
  const [identityStarted, setIdentityStarted] = useState(false);
  const [identityName, setIdentityName] = useState('');
  const [identityPhone, setIdentityPhone] = useState('');
  const [identityBirth, setIdentityBirth] = useState('');
  const [identityConsent, setIdentityConsent] = useState(false);
  const rewardFor = (id: string) => {
    const requestedReward = requests.find((request) => request.id === id)?.requestedReward;
    if (requestedReward !== undefined) return requestedReward;
    const input = (rewards[id] || '').replace(/,/g, '').trim();
    const value = Number(input);
    return /^\d+$/.test(input) && Number.isSafeInteger(value) && value <= MAX_DEMO_REWARD
      ? value : undefined;
  };
  if (!first || requests.length !== ids.length)
    return (
      <Page title="부탁에 지원하기">
        <Empty title="선택한 부탁을 다시 확인해주세요" body="일부 부탁 정보를 불러오지 못했어요." action="가는 길의 부탁 보기" onPress={() => a.tab('home')} />
      </Page>
    );
  if (!trips.length)
    return (
      <Page title="부탁에 지원하기">
        <Empty
          title="이 부탁과 맞는 여행 일정이 없어요"
          body="방문 장소, 귀국 도시와 수령일이 맞는 일정을 등록해주세요."
          action="여행 등록"
          onPress={() => a.nav('trip-form')}
        />
      </Page>
    );
  const identityVerified = d.me.verificationLabels.includes('본인 인증');
  if (!identityVerified) {
    const identityValid = identityName.trim().length >= 2 && /^01[016789]-?\d{3,4}-?\d{4}$/.test(identityPhone) && /^\d{6}$/.test(identityBirth) && identityConsent;
    const verifyIdentity = async () => {
      if (!identityValid) return;
      await a.mutate('/auth/identity/verify', {
        name: identityName,
        phone: identityPhone,
        birthDate: identityBirth,
        consent: identityConsent,
      }, '본인인증을 완료했어요. 이제 부탁에 지원할 수 있어요.');
    };
    return (
      <Page
        title="본인인증"
        footer={
          <Button
            label={identityStarted ? '본인인증 완료하기' : '본인인증 시작하기'}
            icon={ShieldCheck}
            disabled={identityStarted && !identityValid}
            loading={a.busy}
            onPress={() => identityStarted ? void verifyIdentity() : setIdentityStarted(true)}
          />
        }
      >
        <Stack gap={8}>
          <Badge>여행자 필수</Badge>
          <Txt size={28} weight="800">본인인증부터{`\n`}진행할게요</Txt>
          <Txt size={15} color={c.secondary}>구매자가 안심하고 부탁할 수 있도록 한 번만 확인해요.</Txt>
        </Stack>
        {!identityStarted ? (
          <Stack gap={10}>
            <Card><Row><ShieldCheck size={22} color={c.green} /><View style={{ flex: 1 }}><Txt weight="700">본인 여부 확인</Txt><Txt size={13} color={c.secondary}>인증된 계정만 부탁에 지원할 수 있어요.</Txt></View></Row></Card>
            <Card><Row><CheckCircle2 size={22} color={c.green} /><View style={{ flex: 1 }}><Txt weight="700">노쇼 위험 줄이기</Txt><Txt size={13} color={c.secondary}>본인인증 후 왕복 일정까지 확인해요.</Txt></View></Row></Card>
          </Stack>
        ) : (
          <Stack gap={14}>
            <Field label="이름" value={identityName} onChange={setIdentityName} placeholder="본인 이름" required />
            <Field label="휴대폰 번호" value={identityPhone} onChange={setIdentityPhone} placeholder="01012345678" keyboard="numeric" required />
            <Field label="생년월일" value={identityBirth} onChange={setIdentityBirth} placeholder="예: 950101" keyboard="numeric" required hint="주민등록번호 뒷자리는 받지 않아요." />
            <Pressable accessibilityRole="checkbox" accessibilityLabel="본인인증 동의" aria-checked={identityConsent} accessibilityState={{ checked: identityConsent }} onPress={() => setIdentityConsent(!identityConsent)} style={{ paddingVertical: 8 }}>
              <Row style={{ alignItems: 'flex-start' }}><CheckCircle2 size={23} color={identityConsent ? c.green : c.muted} /><Txt size={14} style={{ flex: 1 }}>본인 확인을 위해 인증 정보를 일회성으로 사용하는 데 동의해요.</Txt></Row>
            </Pressable>
            <Notice>체험에서는 인증 결과만 저장하고 이름·생년월일·휴대폰 번호는 저장하지 않아요.</Notice>
          </Stack>
        )}
      </Page>
    );
  }
  const total = requests.reduce((s, r) => s + (d.requestFundings?.find((f) => f.requestId === r.id)?.productPrice
    ?? quote(r, 0, r.transport).productPrice), 0);
  const earliestPurchase = trip && trip.startDate > new Date().toISOString().slice(0, 10) ? trip.startDate : new Date().toISOString().slice(0, 10);
  const latestDelivery = requests.reduce((earliest, request) => request.desiredDate < earliest ? request.desiredDate : earliest, first.desiredDate);
  const datesValid = Boolean(trip && purchase >= earliestPurchase && purchase <= trip.endDate && delivery >= purchase && delivery >= trip.endDate && delivery <= latestDelivery);
  const requestsOpen = requests.every((request) => request.requesterId !== d.me.id && ['REQUESTED', 'OFFER_RECEIVED'].includes(request.status));
  const validRewards = requests.every((r) => rewardFor(r.id) !== undefined);
  const grossReward = requests.reduce((s, r) => s + (rewardFor(r.id) ?? 0), 0);
  const serviceFee = requests.reduce((sum, request) => sum + rewardCommission(rewardFor(request.id) ?? 0), 0);
  const methods = [...new Set(requests.map((r) => TRANSPORT_LABEL[r.transport]))].join(' · ');
  const submit = async () => {
    if (!validRewards || !datesValid || !requestsOpen || !agree) return;
    const body = {
      tripId,
      reward: rewardFor(first.id)!,
      estimatedPurchaseDate: purchase,
      estimatedDeliveryDate: delivery,
      message,
      transport,
    };
    const result = await a.mutate(
      ids.length > 1 ? '/bundles/offers' : `/requests/${first.id}/offers`,
      ids.length > 1 ? { ...body, requestIds: ids, rewards: Object.fromEntries(requests.map((r) => [r.id, rewardFor(r.id)!])) } : body,
      '지원을 보냈어요. 구매자가 선택하면 매칭과 채팅이 시작돼요.',
    );
    if (result) a.tab('trades');
  };
  return (
    <Page
      title={ids.length > 1 ? '묶음 부탁 지원하기' : '가는 김에 가져올게요'}
      footer={
        <Button
          label={canAcceptTrip(trip) ? `${ids.length}건 부탁에 지원하기` : '먼저 왕복 항공권 인증하기'}
          disabled={canAcceptTrip(trip) ? !agree || !validRewards || !datesValid || !requestsOpen || !message.trim() : !trip}
          loading={a.busy}
          onPress={() => canAcceptTrip(trip) ? submit() : trip && a.nav('flight-proof', { id: trip.id })}
        />
      }
    >
      <Stack gap={6}><Txt size={12} weight="700" color={c.primaryStrong}>내 동선의 부탁</Txt><Txt size={27} weight="800">{ids.length}건, 가는 길에{`\n`}가져올게요.</Txt><Txt size={14} color={c.secondary}>구매일과 보상을 확인하면 준비 끝이에요.</Txt></Stack>
      <Row style={{ flexWrap: 'wrap' }}>
        {trips.map((t) => (
          <Chip
            key={t.id}
            label={`${t.destinationCity} ${shortDate(t.startDate)}–${shortDate(t.endDate)}`}
            selected={tripId === t.id}
            onPress={() => {
              setTripId(t.id);
              setPurchase(t.startDate > new Date().toISOString().slice(0, 10) ? t.startDate : new Date().toISOString().slice(0, 10));
              setAgree(false);
              setDelivery(
                suggestedDelivery(t.endDate),
              );
            }}
          />
        ))}
      </Row>
      <Stack gap={12}>
        <Txt size={18} weight="700">부탁과 보상 확인</Txt>
        {requests.map((r, index) => r.requestedReward !== undefined ? (
          <Row key={r.id} style={{ paddingVertical: 12, alignItems: 'flex-start' }}>
            <ProductArt art={r.art} image={r.productImage} featured={r.productName.includes('치이카와')} size={52} />
            <View style={{ flex: 1 }}><Txt size={15} weight="600">{r.productName}</Txt><Txt size={13} color={c.secondary}>{r.quantity}개 · {TRANSPORT_LABEL[r.transport]}</Txt></View>
            <Txt weight="700">{money(r.requestedReward)}</Txt>
          </Row>
        ) : (
          <Field
            key={r.id}
            label={`${index + 1}. ${r.productName} 보상금 (원)`}
            value={rewards[r.id] || ''}
            onChange={(value) => { setRewards((current) => ({ ...current, [r.id]: value })); setAgree(false); }}
            keyboard="numeric"
            required
            placeholder="원하는 금액 입력"
            hint={`보상이 정해지지 않은 이전 부탁이에요. 전체 수량 ${r.quantity}개의 보상을 입력해주세요.`}
            error={rewards[r.id] && rewardFor(r.id) === undefined ? '0원 이상의 원 단위 금액을 체험 한도 안에서 입력해주세요.' : undefined}
          />
        ))}
      </Stack>
      <Card style={{ backgroundColor: c.primarySoft, borderWidth: 0 }}>
        <Stack gap={12}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt size={13} color={c.secondary}>보상 합계</Txt>
            <Txt size={18} weight="700">{validRewards ? money(grossReward) : '금액 입력 필요'}</Txt>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}><Txt size={13} color={c.secondary}>정산 수수료 · 10%</Txt><Txt size={14}>{validRewards ? `− ${money(serviceFee)}` : '—'}</Txt></Row>
          <Divider />
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}><Txt size={15} weight="600">예상 받는 보상</Txt><Txt size={27} weight="800" color={c.primaryStrong}>{validRewards ? money(grossReward - serviceFee) : '—'}</Txt></Row>
        </Stack>
        <Txt size={13} color={c.secondary} style={{ marginTop: 12 }}>
          상품 구매에 {money(total)}이 필요해요. 구매 확정 후 돌려받아요.
        </Txt>
      </Card>
      <DateField label="예상 구매일" value={purchase} onChange={(value) => { setPurchase(value); setAgree(false); }} min={earliestPurchase} max={trip?.endDate} />
      <DateField label="예상 수령일" value={delivery} onChange={(value) => { setDelivery(value); setAgree(false); }} min={trip && trip.endDate > purchase ? trip.endDate : purchase} max={latestDelivery} />
      {!datesValid && <Notice tone="warning">구매일은 여행 기간 안에서, 수령일은 귀국일 이후부터 {shortDate(latestDelivery)}까지로 선택해주세요.</Notice>}
      {!requestsOpen && <Notice tone="warning">이미 매칭되었거나 내 계정의 부탁이 포함되어 있어요. 다른 부탁을 선택해주세요.</Notice>}
      <Stack>
        <Txt size={14} weight="600">
          전달 방식
        </Txt>
        <Notice>
          구매자가 선택한 {methods} 방식으로 각각 전달해요. 해외에서는 여행자의 원래 이동 동선으로 가져와요.
        </Notice>
      </Stack>
      {trip && <Badge>{TRIP_VERIFICATION_LABEL[trip.verificationStatus]}</Badge>}
      {!canAcceptTrip(trip) && <Notice>인증이 완료된 여행 일정에서만 부탁에 지원할 수 있어요. 항공권 사진·QR 인식 후에도 실제 발권 확인이 필요해요.</Notice>}
      <Field label="구매자에게 한마디" value={message} onChange={setMessage} multiline />
      {requests.map((r) => (
        <Card key={r.id}>
          <Stack>
            <Txt weight="700">{r.productName}</Txt>
            <Badge>{TRANSPORT_LABEL[r.transport]}</Badge>
            <MoneyBreakdown compact price={d.requestFundings?.find((f) => f.requestId === r.id)
              ?? quote(r, rewardFor(r.id) ?? 0, r.transport)} rewardPending={rewardFor(r.id) === undefined} />
          </Stack>
        </Card>
      ))}
      <Pressable
        accessibilityRole="checkbox"
        aria-checked={agree}
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

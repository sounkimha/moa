import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  Plane,
  RefreshCw,
  Settings,
  ShieldCheck,
  Star,
  Wallet,
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
  ListItem,
  Notice,
  Page,
  Row,
  Section,
  Stack,
  Txt,
} from '../components/ui';
import { Avatar, PlaceCard } from '../components/visuals';
export function MyScreen() {
  const a = useApp(),
    d = a.data!;
  return (
    <Page title="MY" back={false}>
      <Pressable accessibilityRole="button" onPress={() => a.nav('profile', { id: d.me.id })}>
        <Card style={{ padding: 16 }}>
        <Row style={{ alignItems: 'center' }}>
          <Avatar user={d.me} size={58} />
          <View style={{ flex: 1 }}>
            <Txt size={23} weight="800" lines={1}>
              {d.me.nickname}
            </Txt>
            <Txt size={13} color={c.secondary}>
              여행하는 마음, 모으는 취향
            </Txt>
          </View>
          <ChevronRight size={22} />
        </Row>
        </Card>
      </Pressable>
      <Row style={{ flexWrap: 'wrap' }}>
        <Badge>✓ 휴대폰 예시 인증</Badge>
        <Badge>✓ 계좌 예시 인증</Badge>
        <Badge bg={c.lilac}>체험 계정</Badge>
      </Row>
      <Card style={{ backgroundColor: c.lime, borderWidth: 0 }}>
        <Stack gap={10}>
          <Txt weight="600">여행으로 모은 보상</Txt>
          <Txt size={32} weight="800">
            {money(d.payouts.reduce((s, p) => s + (p.netReward ?? p.reward - Math.round(p.reward * 0.1)), 0))}
          </Txt>
          <Button small kind="secondary" label="정산 내역 보기" onPress={() => a.nav('payouts')} />
        </Stack>
      </Card>
      <View>
        <ListItem
          title="배송지 관리"
          icon={MapPin}
          onPress={() => a.nav('addresses')}
          right={`${(d.addresses || []).filter((item) => item.userId === d.me.id).length}개`}
        />
        <ListItem
          title="나의 여행 일정"
          icon={Plane}
          onPress={() => a.nav('trips')}
          right={`${d.trips.filter((t) => t.travelerId === d.me.id).length}개`}
        />
        <ListItem
          title="관심 장소"
          icon={Heart}
          onPress={() => a.nav('favorites')}
          right={`${d.favorites.length}곳`}
        />
        <ListItem
          title="알림"
          icon={Bell}
          onPress={() => a.nav('notifications')}
          right={`${d.notifications.filter((n) => !n.read).length}개`}
        />
        <ListItem title="내가 남긴 후기" icon={Star} onPress={() => a.nav('reviews')} />
        <ListItem title="인증과 체험 설정" icon={Settings} onPress={() => a.nav('settings')} />
        <ListItem title="모아 이용 안내" icon={HelpCircle} onPress={() => a.nav('help')} />
      </View>
      <Txt size={12} color={c.secondary}>
        모아 0.1.0 · 가칭{'\n'}실제 결제·본인인증이 발생하지 않는 프로토타입이에요.
      </Txt>
    </Page>
  );
}
export function AddressesScreen() {
  const a = useApp(), d = a.data!;
  const own = (d.addresses || []).filter((item) => item.userId === d.me.id);
  const empty = { id: '', label: '집', recipient: '', phone: '', postalCode: '', address1: '', address2: '', isDefault: !own.length };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(!own.length);
  const change = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const result = await a.mutate<UserAddress>('/addresses', {
      ...(form.id ? { id: form.id } : {}),
      label: form.label, recipient: form.recipient, phone: form.phone,
      postalCode: form.postalCode, address1: form.address1, address2: form.address2,
      isDefault: form.isDefault,
    }, '배송지를 저장했어요.');
    if (result) { setEditing(false); setForm(empty); }
  };
  return (
    <Page title="배송지 관리" footer={editing ? <Button label="배송지 저장" disabled={!form.recipient || !form.phone || !form.postalCode || !form.address1} loading={a.busy} onPress={save} /> : <Button label="새 배송지 추가" icon={MapPin} onPress={() => { setForm({ ...empty, isDefault: !own.length }); setEditing(true); }} />}>
      <Stack gap={6}>
        <Txt size={27} weight="800">받을 곳을 미리 저장해요</Txt>
        <Txt color={c.secondary}>부탁 등록 때 기본 배송지가 바로 채워져요.</Txt>
      </Stack>
      {own.map((item) => (
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
      {editing && <Card><Stack gap={12}>
        <Field label="배송지 이름" value={form.label} onChange={(v) => change('label', v)} placeholder="집, 회사" />
        <Field label="받는 분" required value={form.recipient} onChange={(v) => change('recipient', v)} />
        <Field label="연락처" required value={form.phone} onChange={(v) => change('phone', v)} placeholder="010-0000-0000" />
        <Field label="우편번호" required value={form.postalCode} onChange={(v) => change('postalCode', v.replace(/[^0-9]/g, ''))} keyboard="numeric" />
        <Field label="주소" required value={form.address1} onChange={(v) => change('address1', v)} placeholder="도로명 주소" />
        <Field label="상세 주소" value={form.address2} onChange={(v) => change('address2', v)} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.isDefault }} onPress={() => change('isDefault', !form.isDefault)}><Row><CheckCircle2 size={22} color={form.isDefault ? c.green : c.muted} /><Txt style={{ flex: 1 }}>기본 배송지로 사용</Txt></Row></Pressable>
      </Stack></Card>}
      {!own.length && !editing && <Empty title="저장된 배송지가 없어요" />}
      <Notice>주소는 해당 부탁의 국내 배송과 거래 확인에만 사용해요.</Notice>
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
        .map((t) => (
          <Card key={t.id}>
            <Stack gap={14}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge>
                  {TRIP_VERIFICATION_LABEL[t.verificationStatus]}
                </Badge>
                <Txt size={12} color={c.secondary}>
                  최대 {t.maxItems}개
                </Txt>
              </Row>
              <Txt size={26} weight="800">
                {t.departureCity} → {[...new Set(t.placeIds.map((id) => d.places.find((place) => place.id === id)?.city).filter(Boolean))].join(' · ') || t.destinationCity}
              </Txt>
              <Txt color={c.secondary}>
                {t.startDate} — {t.endDate}
              </Txt>
              <Button label={t.flightProof ? '항공권 확인 결과 보기' : '왕복 항공권 인증하기'} kind="secondary" icon={ShieldCheck} onPress={() => a.nav('flight-proof', { id: t.id })} />
              <View>
                {t.placeIds.map((id) => {
                  const p = d.places.find((x) => x.id === id)!;
                  return (
                    <ListItem
                      key={id}
                      title={p.name}
                      icon={Calendar}
                      onPress={() => a.nav('place', { id: p.id })}
                    />
                  );
                })}
              </View>
              <Button
                kind="secondary"
                label="이 여행의 부탁 보기"
                onPress={() => {
                  a.setRole('traveler');
                  a.nav('home', { tripId: t.id });
                }}
              />
            </Stack>
          </Card>
        ))}
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
    <Page title="필요한 소식만 모아요">
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
            <Card>
              <Row style={{ alignItems: 'flex-start' }}>
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
            </Card>
          </Pressable>
        ))}
      {!d.notifications.length && (
        <Empty title="새 소식이 없어요" body="수락과 구매, 전달 소식만 알려드릴게요." />
      )}
    </Page>
  );
}
export function SettingsScreen() {
  const a = useApp(),
    d = a.data!;
  return (
    <Page title="인증과 체험 설정">
      <Notice>
        현재 계정: {d.me.nickname}. 아래 계정은 모두 가상 사용자예요. 실제 계정·본인인증 정보가
        아니에요.
      </Notice>
      <View>
        <Section
          title="양쪽 역할로 이어서 체험"
          subtitle="한 거래를 구매자와 여행자 시점에서 확인할 수 있어요."
        />
        {d.users.map((u) => (
          <Pressable
            key={u.id}
            accessibilityRole="button"
            accessibilityLabel={`${u.nickname} 계정 체험`}
            onPress={() => a.switchActor(u.id)}
            style={{ paddingVertical: 15, borderBottomWidth: 1, borderColor: c.border }}
          >
            <Row>
              <Avatar user={u} />
              <View style={{ flex: 1 }}>
                <Txt weight="700">{u.nickname}</Txt>
                <Txt size={12} color={c.secondary}>
                  {u.id === 'u-me' ? '기본 구매자 · 등록된 요청 1개' : '여행자·구매자 체험 계정'}
                </Txt>
              </View>
              {d.me.id === u.id ? (
                <CheckCircle2 size={22} color={c.green} />
              ) : (
                <ChevronRight size={18} color={c.muted} />
              )}
            </Row>
          </Pressable>
        ))}
      </View>
      <Card>
        <Stack>
          <Txt size={18} weight="700">
            실서비스 연결 현황
          </Txt>
          {[
            ['휴대폰·Apple·Google·Kakao', '예시 계정 로그인'],
            ['안전결제·정산', 'Mock 장부'],
            ['직거래 지도', '지도 이동·좌표 저장'],
            ['장소 이름 검색', '카카오 키 연결 필요'],
            ['상품 링크 입력', '판매 페이지 정보 추출'],
            ['사진 AI 인식', d.recognition?.image ? '연결됨 · 결과 확인 필요' : '키 미설정 · 샘플만 가능'],
            ['왕복 항공권', 'QR 인식 · 발권 확인 미연결'],
            ['채팅·알림', '서버 저장 · 주기적 갱신'],
          ].map(([k, v]) => (
            <Row key={k} style={{ justifyContent: 'space-between' }}>
              <Txt size={13} color={c.secondary} style={{ flex: 1 }}>
                {k}
              </Txt>
              <Txt size={13} weight="600" style={{ flex: 1, textAlign: 'right' }}>
                {v}
              </Txt>
            </Row>
          ))}
        </Stack>
      </Card>
      <Button
        label="최신 상태 다시 가져오기"
        kind="secondary"
        icon={RefreshCw}
        onPress={() =>
          a
            .refresh()
            .then(() => a.notify('최신 상태로 바꿨어요.'))
            .catch((e) => a.notify(e.message))
        }
      />
      <Button label="체험 로그아웃" kind="ghost" icon={LogOut} onPress={a.logout} />
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
  return (
    <Page title="모아, 이렇게 이용해요">
      <Stack gap={10}>
        <Txt size={30} weight="800">
          가는 사람과,{'\n'}갖고 싶은 사람.
        </Txt>
        <Txt color={c.secondary}>
          새로운 심부름 동선을 만들기보다, 이미 예정된 방문에서 부탁을 모아요.
        </Txt>
      </Stack>
      {[
        ['1', '장소에서 만나기', '방문 예정 장소를 탐색하고 링크나 사진으로 구매를 요청해요.'],
        ['2', '여행자의 수락 확인', '가는 길이 맞는 여행자가 수락하면 거래와 채팅이 바로 열려요.'],
        ['3', '구매와 전달 확인하기', '구매 사진·영수증·배송 정보를 거래 화면에서 확인해요.'],
        [
          '4',
          '받고 확인하면 정산',
          '수령한 상품을 확인하고 구매를 확정하면 여행자가 보상 정산을 진행해요.',
        ],
      ].map(([n, title, body]) => (
        <Row key={n} style={{ alignItems: 'flex-start' }}>
          <View
            style={{
              width: 35,
              height: 35,
              borderRadius: 12,
              backgroundColor: c.mint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt color={c.green} weight="800">
              {n}
            </Txt>
          </View>
          <Stack gap={7} style={{ flex: 1 }}>
            <Txt size={19} weight="700">
              {title}
            </Txt>
            <Txt size={14} color={c.secondary}>
              {body}
            </Txt>
          </Stack>
        </Row>
      ))}
      <Notice>
        이 버전은 실행 가능한 프로토타입이에요. 데이터와 인증, 결제는 체험용이에요. 실운영
        지도·PG·본인인증·통관 조건은 별도 연결과 검증이 필요해요.
      </Notice>
      <Button label="첫 부탁 만들기" onPress={() => a.nav('request-form')} />
    </Page>
  );
}

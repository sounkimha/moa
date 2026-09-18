import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { ArrowDown, ArrowUp, CheckCircle2, FileImage, Plane, ShieldCheck } from 'lucide-react-native';
import { FlightLeg, Trip } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { pickImage } from '../lib/images';
import { colors as c } from '../theme/tokens';
import { Badge, Button, Card, Empty, Notice, Page, Row, Stack, Txt } from '../components/ui';

type FlightProofStatus = Trip['verificationStatus'];

/** This screen only calls a ticket "complete" when the existing, labelled demo fixture is eligible. */
export function flightProofStatusCopy(status: FlightProofStatus) {
  switch (status) {
    case 'DEMO_VERIFIED':
      return {
        title: '왕복 항공권 확인 완료했어요',
        body: '체험 계정의 예시 항공권 인증이에요.',
        badge: '확인 완료 · 예시',
        tone: 'complete' as const,
      };
    case 'PENDING_REVIEW':
      return {
        title: '항공권 정보를 확인했어요',
        body: '등록한 여행 일정과 가는 편·오는 편 정보를 확인했어요. 발권 확인은 진행 중이에요.',
        badge: '발권 확인 진행 중',
        tone: 'pending' as const,
      };
    case 'NEEDS_REVIEW':
      return {
        title: '항공권 정보를 다시 확인해주세요',
        body: '등록한 여행 일정과 다른 정보가 있어요. 사진을 확인한 뒤 다시 올려주세요.',
        badge: '재확인 필요',
        tone: 'needs-review' as const,
      };
    default:
      return {
        title: '왕복 항공권을 확인해주세요',
        body: '가는 편과 오는 편을 올리면 등록한 여행 일정과 함께 확인해드려요.',
        badge: '사진 업로드 전',
        tone: 'idle' as const,
      };
  }
}

function dateParts(value: string) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!matched) return null;
  const year = Number(matched[1]), month = Number(matched[2]), day = Number(matched[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day, time: date.getTime() };
}

export function formatFlightDate(value: string) {
  const date = dateParts(value);
  return date ? `${date.month}월 ${date.day}일` : '날짜 확인 중';
}

export function tripDurationLabel(startDate: string, endDate: string) {
  const start = dateParts(startDate), end = dateParts(endDate);
  if (!start || !end || end.time < start.time) return null;
  const nights = Math.round((end.time - start.time) / 86_400_000);
  return `${nights}박 ${nights + 1}일`;
}

function FlightRoute({ departure, destination }: { departure: string; destination: string }) {
  return <Row style={{ alignItems: 'center', gap: 8 }}>
    <Txt size={15} weight="700" color={c.onPrimary} style={{ flex: 1, minWidth: 0 }} lines={1}>{departure}</Txt>
    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.navyText }} />
    <View style={{ flex: 1, minWidth: 14, height: 1, backgroundColor: c.translucentWhite }} />
    <Plane size={20} color={c.navyTextBright} />
    <View style={{ flex: 1, minWidth: 14, height: 1, backgroundColor: c.translucentWhite }} />
    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.sky }} />
    <Txt size={15} weight="800" color={c.onPrimary} style={{ flex: 1, minWidth: 0, textAlign: 'right' }} lines={1}>{destination}</Txt>
  </Row>;
}

export function FlightProofScreen() {
  const a = useApp();
  const trip = a.data?.trips.find((t) => t.id === a.route.id && t.travelerId === a.data?.me.id);
  const [outbound, setOutbound] = useState(''), [inbound, setInbound] = useState('');
  const [consent, setConsent] = useState(false), [allowAI, setAllowAI] = useState(false);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  if (!trip) return <Page title="왕복 항공권 인증"><Empty title="내 여행 일정을 먼저 등록해주세요" body="일정별로 출국·귀국 항공권을 확인해요." action="여행 등록" onPress={() => a.nav('trip-form')} /></Page>;
  const pick = async (direction: 'outbound' | 'inbound') => {
    try {
      const image = await pickImage({ quality: 0.9 });
      if (image) { (direction === 'outbound' ? setOutbound : setInbound)(image); setError(''); }
    } catch (e) { setError((e as Error).message); }
  };
  const submit = async () => {
    if (!outbound || !inbound || !consent || busy) return;
    setBusy(true); setError('');
    try {
      const result = await a.mutate(`/trips/${trip.id}/flight-proof`, {
        outboundImage: outbound, inboundImage: inbound, consent, allowAI,
      }, '항공권 확인 결과를 저장했어요.');
      if (result) { setOutbound(''); setInbound(''); setConsent(false); setAllowAI(false); }
    } finally { setBusy(false); }
  };
  const status = flightProofStatusCopy(trip.verificationStatus);
  const duration = tripDurationLabel(trip.startDate, trip.endDate);
  const legs = (title: string, items: FlightLeg[], direction: 'outbound' | 'inbound') => <Stack gap={8}>
    <Row style={{ alignItems: 'center' }}>
      <View style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }}>
        {direction === 'outbound' ? <ArrowUp size={16} color={c.primaryStrong} /> : <ArrowDown size={16} color={c.primaryStrong} />}
      </View>
      <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
        <Txt size={14} weight="700">{title}</Txt>
        <Txt size={12} color={c.secondary}>{direction === 'outbound' ? '출발하는 날' : '돌아오는 날'}</Txt>
      </Stack>
    </Row>
    {items.map((leg, index) => <Row key={`${leg.from}-${leg.to}-${index}`} style={{ alignItems: 'center', gap: 8, paddingLeft: 4 }}>
      <Plane size={15} color={c.primaryStrong} />
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Txt size={14} weight="600" lines={1}>{leg.from} → {leg.to}</Txt>
        <Txt size={12} color={c.secondary}>{leg.date ? `항공권에 표시된 날짜 · ${formatFlightDate(leg.date)}` : '항공권 날짜를 확인하지 못했어요'}</Txt>
      </Stack>
    </Row>)}
  </Stack>;
  return <Page title="왕복 항공권 인증" resetScrollKey={`${trip.flightProof?.checkedAt || ''}:${error}`} footer={<Button
    label={busy ? '왕복 항공권 확인 중' : trip.flightProof ? '항공권 다시 확인하기' : '항공권 확인하기'}
    loading={busy} disabled={!outbound || !inbound || !consent} onPress={submit} icon={ShieldCheck} />}>
    <Stack gap={10}>
      <Txt size={12} weight="700" color={c.primaryStrong}>TRAVEL VERIFIED</Txt>
      <Txt size={28} weight="800">믿고 부탁할 수 있도록,{ '\n' }항공권을 확인해요.</Txt>
      <Txt size={15} color={c.secondary}>왕복 항공권이나 예약 확인서를 준비해주세요.</Txt>
    </Stack>
    <Card style={{ backgroundColor: c.primaryDeep, borderColor: c.primaryDeep }}><Stack gap={18}>
      <Row style={{ alignItems: 'center', gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.translucentWhite }}><Plane size={21} color={c.onPrimary} /></View>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}><Txt size={13} weight="700" color={c.navyText}>등록한 여행 일정</Txt><Txt size={18} weight="800" color={c.onPrimary}>{trip.destinationCity} 여행</Txt></Stack>
        <Badge>{duration || '여행 기간 확인 중'}</Badge>
      </Row>
      <FlightRoute departure={trip.departureCity} destination={trip.destinationCity} />
      <Row style={{ justifyContent: 'space-between', gap: 12 }}>
        <Stack gap={3} style={{ flex: 1 }}><Txt size={12} weight="600" color={c.navyText}>출발</Txt><Txt size={16} weight="800" color={c.onPrimary}>{formatFlightDate(trip.startDate)}</Txt></Stack>
        <View style={{ width: 1, backgroundColor: c.translucentWhite }} />
        <Stack gap={3} style={{ flex: 1, alignItems: 'flex-end' }}><Txt size={12} weight="600" color={c.navyText}>귀국</Txt><Txt size={16} weight="800" color={c.onPrimary}>{formatFlightDate(trip.endDate)}</Txt></Stack>
      </Row>
    </Stack></Card>
    <Notice>체험 앱에서는 사진 속 일정 정보를 읽어 등록한 여행 일정과 비교해요. 실제 발권·본인 인증은 아직 연결되지 않아, 새 일정으로는 부탁에 지원할 수 없어요.</Notice>
    {trip.flightProof && <Card><Stack gap={14}>
      <Row style={{ alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: status.tone === 'needs-review' ? c.warningSoft : c.primarySoft }}>
          <ShieldCheck size={19} color={status.tone === 'needs-review' ? c.warning : c.primaryStrong} />
        </View>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}><Txt size={17} weight="700">{status.title}</Txt><Txt size={13} color={c.secondary}>{status.body}</Txt></Stack>
      </Row>
      <Badge>{status.badge}</Badge>
      <View style={{ height: 1, backgroundColor: c.border }} />
      {legs('가는 편', trip.flightProof.outbound, 'outbound')}
      <View style={{ height: 1, backgroundColor: c.border }} />
      {legs('오는 편', trip.flightProof.inbound, 'inbound')}
      <Txt size={12} color={c.secondary}>{trip.flightProof.source === 'BARCODE' ? 'QR·바코드로 읽어온 항공 정보예요.' : trip.flightProof.source === 'OCR' ? '사진에서 읽어온 항공 정보예요.' : 'QR·사진에서 함께 읽어온 항공 정보예요.'}</Txt>
      {trip.flightProof.issues.length > 0 && <Notice tone={trip.verificationStatus === 'NEEDS_REVIEW' ? 'warning' : undefined}>
        <Stack gap={6}><Txt size={13} weight="700">{trip.verificationStatus === 'NEEDS_REVIEW' ? '다시 확인할 내용' : '확인 중인 내용'}</Txt>{trip.flightProof.issues.map((issue, index) => <Txt key={index} size={13} color={c.secondary}>• {issue}</Txt>)}</Stack>
      </Notice>}
    </Stack></Card>}
    {[{ title: '가는 편 항공권', value: outbound, direction: 'outbound' as const },
      { title: '오는 편 항공권', value: inbound, direction: 'inbound' as const }].map((item) => <Card key={item.direction} style={{ borderColor: item.value ? c.primaryTint : c.border }}><Stack gap={14}>
        <Row><View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }}>{item.direction === 'outbound' ? <ArrowUp size={19} color={c.primaryStrong} /> : <ArrowDown size={19} color={c.primaryStrong} />}</View><View style={{ flex: 1, gap: 2 }}><Txt size={17} weight="700">{item.title}</Txt><Txt size={12} color={c.secondary}>{item.direction === 'outbound' ? `${trip.departureCity} → ${trip.destinationCity}` : `${trip.destinationCity} → ${trip.departureCity}`}</Txt></View>{!!item.value && <CheckCircle2 size={21} color={c.primary} />}</Row>
        {item.value && <Image source={{ uri: item.value }} accessibilityLabel={`${item.title} 선택한 사진`} style={{ width: '100%', height: 132, borderRadius: 12, backgroundColor: c.canvas }} resizeMode="contain" />}
        <Txt size={13} color={c.secondary}>{item.value ? '확인 버튼을 누르면 선택한 사진이 전송돼요.' : '이름, 항공편, 날짜, 출발·도착지가 보이게 올려주세요.'}</Txt>
        <Button kind="secondary" icon={FileImage} label={`${item.title} ${item.value ? '다시 선택' : '사진 올리기'}`} disabled={busy} onPress={() => pick(item.direction)} />
        {item.value !== '' && <Button small kind="ghost" label={`${item.title} 사진 지우기`} disabled={busy} onPress={() => (item.direction === 'outbound' ? setOutbound : setInbound)('')} />}
      </Stack></Card>)}
    {error !== '' && <Notice tone="error">{error}</Notice>}
    <Txt size={12} color={c.secondary}>JPG·PNG·WebP 각 2MB 이하. PDF는 항공편 정보 부분을 캡처해주세요. 왕복이 한 장이면 같은 사진을 두 칸에 올릴 수 있어요. 경유 구간은 한 방향당 한 사진에 모두 보여주세요.</Txt>
    <Card><Stack gap={12}>
      <Txt size={15} weight="700">항공권은 비공개로 확인해요</Txt>
      <Txt size={13} color={c.secondary}>MOA 서버에서 먼저 바코드를 읽어요. 이름은 왕복 동일인 대조에만 사용해요. 이름·예약번호·좌석·QR 원문·사진 원본은 MOA 저장소에 남기거나 상대에게 공개하지 않아요. 선택 동의 시 사진이 외부 AI로 전송되며 해당 서비스의 데이터 처리 정책이 적용돼요.</Txt>
      {[{ value: consent, set: setConsent, label: '항공권의 개인정보를 일정 대조에 사용하는 데 동의해요 (필수)' },
        { value: allowAI, set: setAllowAI, label: '바코드로 읽지 못하면 항공권 사진을 OpenAI로 보내 문자 인식하는 데 동의해요 (선택)' }].map((item) => <Pressable
          key={item.label} accessibilityRole="checkbox" accessibilityLabel={item.label} accessibilityState={{ checked: item.value }} aria-checked={item.value} aria-disabled={busy} disabled={busy} onPress={() => item.set(!item.value)} style={{ paddingVertical: 8 }}>
          <Row style={{ alignItems: 'flex-start' }}><CheckCircle2 size={23} color={item.value ? c.green : c.muted} /><Txt size={13} style={{ flex: 1 }}>{item.label}</Txt></Row>
        </Pressable>)}
    </Stack></Card>
    <Button kind="ghost" label="나중에 인증하고 내 일정 보기" disabled={busy} onPress={() => a.nav('trips')} />
  </Page>;
}

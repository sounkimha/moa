import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CheckCircle2, FileImage, Plane, ShieldCheck } from 'lucide-react-native';
import { FlightLeg, TRIP_VERIFICATION_LABEL } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { pickImage } from '../lib/images';
import { colors as c } from '../theme/tokens';
import { Badge, Button, Card, Empty, Notice, Page, Row, Stack, Txt } from '../components/ui';

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
  const legs = (title: string, items: FlightLeg[]) => <Stack gap={6}>
    <Txt size={14} weight="700">{title}</Txt>
    {items.map((leg, index) => <Txt key={index} size={13}>{leg.from} → {leg.to} · {leg.flightNumber}{'\n'}
      {leg.date || `연도 확인 필요 · 연중 ${leg.dayOfYear || '?'}번째 날`}</Txt>)}
  </Stack>;
  return <Page title="왕복 항공권 인증" resetScrollKey={`${trip.flightProof?.checkedAt || ''}:${error}`} footer={<Button
    label={busy ? '왕복 항공권 확인 중' : '항공권 인식하고 일정 대조하기'}
    loading={busy} disabled={!outbound || !inbound || !consent} onPress={submit} icon={ShieldCheck} />}>
    <Stack gap={10}>
      <Badge>부탁 수락 전 필수 확인</Badge>
      <Txt size={28} weight="800">가는 편도, 오는 편도{ '\n' }확인할게요.</Txt>
      <Txt color={c.secondary}>항공권·예약 확인서 사진이나 QR·바코드가 보이는 탑승권을 올려주세요.</Txt>
    </Stack>
    <Card><Stack gap={10}>
      <Row><Plane size={20} color={c.green} /><Txt weight="700" style={{ flex: 1 }}>{trip.departureCity} ↔ {trip.destinationCity}</Txt></Row>
      <Txt size={14}>가는 날 {trip.startDate} · 오는 날 {trip.endDate}</Txt>
      <Badge>{TRIP_VERIFICATION_LABEL[trip.verificationStatus]}</Badge>
    </Stack></Card>
    <Notice>항공권 인식은 발권 진위·탑승 보장과 달라요. 현재 항공사·본인확인 연동이 없어 새 일정은 최종 인증 전까지 부탁을 수락할 수 없어요.</Notice>
    {trip.flightProof && <Card><Stack gap={14}>
      <Txt size={17} weight="700">최근 항공권 대조 결과</Txt>
      {legs('가는 편', trip.flightProof.outbound)}
      {legs('오는 편', trip.flightProof.inbound)}
      <Txt size={12} color={c.secondary}>{trip.flightProof.source === 'BARCODE' ? 'QR·바코드 인식' : trip.flightProof.source === 'OCR' ? '사진 문자 인식' : 'QR·문자 함께 인식'}</Txt>
      {trip.flightProof.issues.map((issue, index) => <Txt key={index} size={13} color={c.secondary}>{issue}</Txt>)}
    </Stack></Card>}
    {[{ title: '가는 편 항공권', value: outbound, direction: 'outbound' as const },
      { title: '오는 편 항공권', value: inbound, direction: 'inbound' as const }].map((item) => <Card key={item.direction}><Stack gap={10}>
        <Txt size={17} weight="700">{item.title}</Txt>
        <Txt size={13} color={c.secondary}>{item.value ? '사진을 선택했어요. 인증 버튼을 누르면 전송돼요.' : '탑승객 이름·항공편·날짜·출발/도착 구간이 보여야 해요.'}</Txt>
        <Button kind="secondary" icon={FileImage} label={`${item.title} ${item.value ? '다시 선택' : '사진 올리기'}`} disabled={busy} onPress={() => pick(item.direction)} />
        {item.value !== '' && <Button small kind="ghost" label={`${item.title} 사진 지우기`} disabled={busy} onPress={() => (item.direction === 'outbound' ? setOutbound : setInbound)('')} />}
      </Stack></Card>)}
    {error !== '' && <Notice tone="error">{error}</Notice>}
    <Txt size={12} color={c.secondary}>JPG·PNG·WebP 각 2MB 이하. PDF는 항공편 정보 부분을 캡처해주세요. 왕복이 한 장이면 같은 사진을 두 칸에 올릴 수 있어요. 경유 구간은 한 방향당 한 사진에 모두 보여주세요.</Txt>
    <Card><Stack gap={12}>
      <Txt size={15} weight="700">항공권은 비공개로 확인해요</Txt>
      <Txt size={13} color={c.secondary}>모아 서버에서 먼저 바코드를 읽어요. 이름은 왕복 동일인 대조에만 사용해요. 이름·예약번호·좌석·QR 원문·사진 원본은 모아 저장소에 남기거나 상대에게 공개하지 않아요. 선택 동의 시 사진이 외부 AI로 전송되며 해당 서비스의 데이터 처리 정책이 적용돼요.</Txt>
      {[{ value: consent, set: setConsent, label: '항공권의 개인정보를 일정 대조에 사용하는 데 동의해요 (필수)' },
        { value: allowAI, set: setAllowAI, label: '바코드로 읽지 못하면 항공권 사진을 OpenAI로 보내 문자 인식하는 데 동의해요 (선택)' }].map((item) => <Pressable
          key={item.label} accessibilityRole="checkbox" accessibilityLabel={item.label} accessibilityState={{ checked: item.value }} disabled={busy} onPress={() => item.set(!item.value)} style={{ paddingVertical: 8 }}>
          <Row style={{ alignItems: 'flex-start' }}><CheckCircle2 size={23} color={item.value ? c.green : c.muted} /><Txt size={13} style={{ flex: 1 }}>{item.label}</Txt></Row>
        </Pressable>)}
    </Stack></Card>
    <Button kind="ghost" label="나중에 인증하고 내 일정 보기" disabled={busy} onPress={() => a.nav('trips')} />
  </Page>;
}

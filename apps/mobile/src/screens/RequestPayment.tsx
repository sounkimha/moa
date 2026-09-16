import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { CheckCircle2, LockKeyhole } from 'lucide-react-native';
import { ProductRequest, money, quote } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { Button, Card, Chip, Empty, Notice, Page, Row, Stack, Txt } from '../components/ui';
import { MoneyBreakdown, ProductRow } from '../components/visuals';
import { colors as c } from '../theme/tokens';

export function RequestPaymentScreen({ requestId }: { requestId: string }) {
  const a = useApp(), d = a.data!, r = d.requests.find((item) => item.id === requestId);
  const [method, setMethod] = useState<'CARD' | 'ACCOUNT'>('CARD');
  const [agreed, setAgreed] = useState(false);
  if (!r || r.requesterId !== d.me.id) return <Page title="부탁 결제"><Empty title="본인의 부탁만 결제할 수 있어요" /></Page>;
  const funding = d.requestFundings?.find((item) => item.requestId === r.id);
  const price = funding || quote(r, r.requestedReward ?? 0, r.transport);
  if (r.status !== 'PAYMENT_PENDING') return <Page title="부탁 결제"><Empty title={funding?.status === 'REFUNDED' ? '전액 환불된 부탁이에요' : funding ? '이미 결제를 완료했어요' : '부탁 상태를 확인해주세요'} action="부탁 확인하기" onPress={() => a.nav('request', { id: r.id })} /></Page>;
  const pay = async () => {
    if (!agreed) return;
    const result = await a.mutate<ProductRequest>(`/requests/${r.id}/pay`, {
      expectedRevision: r.revision, paymentMethod: method,
      paymentReference: method === 'CARD' ? '체험 카드 4242' : '체험 계좌 0001',
    }, '결제 체험 완료! 지원한 여행자 중 한 명을 선택해주세요.');
    if (result) a.nav('offers', { id: result.id });
  };
  return <Page title="결제하고 부탁 공개하기" footer={<Button label={`${money(price.totalPrice)} 결제 체험하기`} icon={LockKeyhole} disabled={!agreed} loading={a.busy} onPress={pay} />}>
    <ProductRow request={r} onPress={() => a.nav('request', { id: r.id })} />
    <Card><Stack gap={12}><Txt size={20} weight="700">결제 먼저, 여행자는 직접 선택</Txt><Txt color={c.secondary}>결제하면 가는 길의 여행자들이 지원해요. 일정과 프로필을 비교하고 한 명을 선택해주세요.</Txt><Txt size={13} color={c.secondary}>선택 전 취소하면 전액 환불돼요. 선택한 뒤에도 다시 결제하지 않아요.</Txt></Stack></Card>
    <MoneyBreakdown price={price} />
    <Stack gap={12}><Txt weight="700">결제수단</Txt><Row><Chip label="체험 카드" selected={method === 'CARD'} onPress={() => setMethod('CARD')} /><Chip label="체험 계좌" selected={method === 'ACCOUNT'} onPress={() => setMethod('ACCOUNT')} /></Row></Stack>
    <Notice>체험용 모의 결제예요. 실제 돈이 청구되거나 이체되지 않아요.</Notice>
    <Pressable accessibilityRole="checkbox" accessibilityLabel="결제 금액 확인" accessibilityState={{ checked: agreed }} aria-checked={agreed} onPress={() => setAgreed(!agreed)} style={{ padding: 16, borderWidth: 1, borderColor: agreed ? c.primary : c.border, borderRadius: 16 }}><Row><CheckCircle2 size={22} color={agreed ? c.primary : c.muted} /><Txt style={{ flex: 1 }}>상품·보상·전달비와 결제 금액을 확인했어요.</Txt></Row></Pressable>
  </Page>;
}

import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Banknote, CheckCircle2, ChevronRight, CreditCard, Landmark, LockKeyhole, ShieldCheck, Smartphone, Wallet as WalletIcon } from 'lucide-react-native';
import { money, PaymentMethod, WalletTransactionType } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { colors as c } from '../theme/tokens';
import { Badge, Button, Card, Chip, Divider, Empty, Field, Notice, Page, Row, Section, Stack, Txt } from '../components/ui';

const entryLabels: Record<WalletTransactionType, string> = {
  TOP_UP: '충전', PAYMENT: '상품 결제', TRAVELER_REWARD: '여행 정산',
  REFUND: '환불', WITHDRAWAL: '출금', ADJUSTMENT: '조정',
};
function MethodIcon({ method }: { method: PaymentMethod }) {
  return method.type === 'CARD' ? <CreditCard size={21} color={c.primary} /> : method.type === 'WALLET' ? <WalletIcon size={21} color={c.primary} /> : <Smartphone size={21} color={c.primary} />;
}

export function WalletScreen() {
  const a = useApp(), d = a.data!;
  const wallet = d.wallets[0];
  const entries = d.walletTransactions.slice().reverse();
  if (!wallet) return <Page title="MOA 포인트 보관함"><Empty title="보관함을 준비하지 못했어요" body="최신 상태를 다시 불러와주세요." /></Page>;
  return (
    <Page title="MOA 포인트 보관함">
      <Card style={{ backgroundColor: c.primaryDeep, borderWidth: 0 }}>
        <Stack gap={14}>
          <Row style={{ justifyContent: 'space-between' }}><Badge bg={c.navySurface} color={c.onPrimary}>DEMO WALLET</Badge><LockKeyhole size={20} color={c.primaryTint} /></Row>
          <Stack gap={3}><Txt size={12} color={c.navyText}>사용 가능</Txt><Txt size={38} weight="800" color={c.onPrimary}>{money(wallet.availableBalance)}</Txt></Stack>
          <Row style={{ justifyContent: 'space-between' }}><Stack gap={2}><Txt size={11} color={c.navyText}>정산 중</Txt><Txt weight="700" color={c.onPrimary}>{money(wallet.pendingBalance)}</Txt></Stack><Stack gap={2} style={{ alignItems: 'flex-end' }}><Txt size={11} color={c.navyText}>출금 처리 중</Txt><Txt weight="700" color={c.onPrimary}>{money(wallet.withdrawalPending)}</Txt></Stack></Row>
        </Stack>
      </Card>
      <Row style={{ alignItems: 'stretch' }}><Button style={{ flex: 1 }} label="충전" icon={Banknote} onPress={() => a.nav('wallet-topup')} /><Button style={{ flex: 1 }} kind="secondary" label="계좌로 받기" icon={Landmark} onPress={() => a.nav('wallet-withdraw')} /></Row>
      <Notice>현재 보관함·충전·출금은 체험용 장부입니다. 실제 선불금 충전이나 은행 이체가 발생하지 않아요.</Notice>
      <View><Section title="최근 내역" />
        {entries.map((entry) => <Card key={entry.id} style={{ marginBottom: 10 }}><Row><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: entry.amount >= 0 ? c.primarySoft : c.background, alignItems: 'center', justifyContent: 'center' }}>{entry.amount >= 0 ? <Banknote size={20} color={c.primary} /> : <CreditCard size={20} color={c.secondary} />}</View><Stack gap={2} style={{ flex: 1 }}><Txt weight="700">{entry.title}</Txt><Txt size={11} color={c.secondary}>{entryLabels[entry.type]} · {entry.status === 'PROCESSING' ? '처리 중' : '체험 기록 완료'}</Txt></Stack><Txt weight="800" color={entry.amount >= 0 ? c.primaryStrong : c.ink}>{entry.amount >= 0 ? '+' : '-'} {money(Math.abs(entry.amount))}</Txt></Row></Card>)}
        {!entries.length && <Empty title="아직 받은 정산금이 없어요" body="구매자가 수령을 확인하면 여행 정산이 여기에 적립돼요." action="거래 확인" onPress={() => a.tab('trades')} />}
      </View>
    </Page>
  );
}

export function TopUpScreen() {
  const a = useApp(), d = a.data!;
  const methods = d.paymentMethods.filter((method) => method.type !== 'WALLET');
  const [amount, setAmount] = useState(30_000);
  const [custom, setCustom] = useState('');
  const [methodId, setMethodId] = useState(methods.find((method) => method.isDefault)?.id || methods[0]?.id || '');
  const value = custom ? Number(custom) : amount;
  const submit = async () => {
    const result = await a.mutate('/wallet/top-up', { amount: value, paymentMethodId: methodId }, '체험용 보관함을 충전했어요.');
    if (result) a.nav('wallet');
  };
  return (
    <Page title="보관함 충전" footer={<Button label={`${money(value || 0)} 체험 충전`} disabled={!Number.isSafeInteger(value) || value <= 0 || !methodId} loading={a.busy} onPress={submit} />}>
      <Stack gap={6}><Txt size={28} weight="800">얼마를 충전할까요?</Txt><Txt color={c.secondary}>결제수단을 선택해 Mock 충전 흐름을 확인할 수 있어요.</Txt></Stack>
      <Row style={{ flexWrap: 'wrap' }}>{[10_000, 30_000, 50_000, 100_000].map((value) => <Chip key={value} label={money(value)} selected={!custom && amount === value} onPress={() => { setCustom(''); setAmount(value); }} />)}</Row>
      <Field label="직접 입력" value={custom} onChange={(value) => setCustom(value.replace(/[^0-9]/g, ''))} keyboard="numeric" placeholder="원 단위" />
      <Section title="충전 결제수단" />
      {methods.map((method) => <Pressable key={method.id} accessibilityRole="radio" accessibilityState={{ selected: methodId === method.id }} onPress={() => setMethodId(method.id)}><Card style={{ borderColor: methodId === method.id ? c.primary : c.border }}><Row><MethodIcon method={method} /><Stack gap={1} style={{ flex: 1 }}><Txt weight="700">{method.label} {method.last4 ? `•••• ${method.last4}` : ''}</Txt><Txt size={11} color={c.secondary}>Mock Provider · 실제 승인 없음</Txt></Stack><CheckCircle2 size={22} color={methodId === method.id ? c.primary : c.muted} /></Row></Card></Pressable>)}
      <Notice tone="warning">실제 충전은 PG 계약, 선불전자지급수단 정책과 법률 검토가 끝난 뒤 연결해야 해요.</Notice>
    </Page>
  );
}

export function IdentityScreen() {
  const a = useApp(), verified = a.data!.verificationSummary.identity;
  const verify = (method: 'PASS' | 'SMS') => a.mutate('/identity/verify', { method }, '체험 본인확인을 완료했어요.');
  return (
    <Page title="본인확인">
      <Stack gap={8}><Badge>{verified ? '체험 확인 완료' : '확인 필요'}</Badge><Txt size={29} weight="800">안전한 거래와 출금을 위해{`\n`}본인을 확인해요.</Txt><Txt color={c.secondary}>여행자로 거래하거나 정산 계좌를 등록할 때 필요한 구조예요.</Txt></Stack>
      <Card><Stack gap={14}><Row><ShieldCheck size={25} color={c.primary} /><Txt size={18} weight="800">개발환경 Mock Identity</Txt></Row><Txt size={13} color={c.secondary}>PASS·SMS 사업자 Credential은 연결되지 않았습니다. 아래 버튼은 상태 전환과 예외 처리를 검증하기 위한 체험입니다.</Txt></Stack></Card>
      <Button label={verified ? 'PASS 체험 다시 확인' : 'PASS로 체험 확인'} onPress={() => verify('PASS')} loading={a.busy} />
      <Button kind="secondary" label="SMS로 체험 확인" onPress={() => verify('SMS')} loading={a.busy} />
      <Notice>신분증 원본이나 주민등록번호를 저장하지 않아요. 실서비스에서는 인증 사업자의 결과 토큰만 보관해야 해요.</Notice>
    </Page>
  );
}

export function PaymentMethodsScreen() {
  const a = useApp(), methods = a.data!.paymentMethods;
  return (
    <Page title="결제수단">
      <Stack gap={6}><Txt size={27} weight="800">결제할 방법을 관리해요</Txt><Txt color={c.secondary}>카드번호 전체는 MOA 서버나 기기에 저장하지 않아요.</Txt></Stack>
      {methods.map((method) => <Pressable key={method.id} accessibilityRole="button" onPress={() => a.mutate(`/payment-methods/${method.id}/default`, {}, '기본 결제수단을 바꿨어요.')}><Card><Row><MethodIcon method={method} /><Stack gap={2} style={{ flex: 1 }}><Txt weight="700">{method.label} {method.last4 ? `•••• ${method.last4}` : ''}</Txt><Txt size={11} color={c.secondary}>{method.status === 'DEMO_ONLY' ? '체험 전용 토큰' : ''}</Txt></Stack>{method.isDefault ? <Badge>기본</Badge> : <ChevronRight size={18} color={c.muted} />}</Row></Card></Pressable>)}
      <Button kind="secondary" label="결제수단 추가 구조 보기" onPress={() => a.notify('실제 PG 토큰 발급 화면을 연결할 자리예요. 카드번호는 MOA가 직접 받지 않아요.')} />
      <Notice>실서비스에서는 계약된 PG가 발급한 Tokenized Payment Method만 저장해야 해요.</Notice>
    </Page>
  );
}

export function WithdrawalScreen() {
  const a = useApp(), d = a.data!, wallet = d.wallets[0], account = d.payoutAccounts[0];
  const [bankName, setBankName] = useState('모아은행 · 데모'), [last4, setLast4] = useState(''), [holder, setHolder] = useState(d.me.nickname), [amount, setAmount] = useState('');
  const save = async () => a.mutate('/wallet/payout-account', { bankName, accountLast4: last4, holderName: holder }, '체험 정산 계좌를 저장했어요.');
  const withdraw = async () => {
    const result = await a.mutate('/wallet/withdrawals', { amount: Number(amount), payoutAccountId: account.id, simulateProcessing: false }, '출금 체험을 완료했어요. 실제 은행 이체는 발생하지 않았어요.');
    if (result) a.nav('wallet');
  };
  return (
    <Page title="내 계좌로 받기" footer={account ? <Button label={`${money(Number(amount) || 0)} 출금 체험`} disabled={!Number(amount) || Number(amount) > (wallet?.availableBalance || 0)} loading={a.busy} onPress={withdraw} /> : undefined}>
      <Notice>Mock Payout Provider 화면입니다. 실제 은행 송금이나 계좌 실명 조회가 발생하지 않아요.</Notice>
      {!d.verificationSummary.identity ? <Card><Stack><Txt size={20} weight="800">본인확인이 먼저 필요해요</Txt><Txt color={c.secondary}>정산 계좌와 출금 요청은 확인된 사용자에게만 열려요.</Txt><Button label="체험 본인확인" icon={ShieldCheck} onPress={() => a.nav('identity')} /></Stack></Card> : !account ? <Card><Stack gap={13}><Txt size={20} weight="800">정산 계좌 등록</Txt><Txt size={12} color={c.secondary}>체험에서는 민감한 전체 계좌번호를 받지 않고 표시용 끝 4자리만 저장해요.</Txt><Field label="은행명" value={bankName} onChange={setBankName} required /><Field label="계좌 끝 4자리" value={last4} onChange={(value) => setLast4(value.replace(/[^0-9]/g, '').slice(0, 4))} keyboard="numeric" required /><Field label="예금주" value={holder} onChange={setHolder} required /><Button label="체험 계좌 등록" disabled={last4.length !== 4 || holder.trim().length < 2} loading={a.busy} onPress={save} /></Stack></Card> : <><Card><Row><Landmark size={23} color={c.primary} /><Stack gap={2} style={{ flex: 1 }}><Txt weight="800">{account.bankName}</Txt><Txt size={13} color={c.secondary}>•••• {account.accountLast4} · {account.holderName}</Txt></Stack><Badge>체험 확인</Badge></Row></Card><Card><Stack><Row style={{ justifyContent: 'space-between' }}><Txt color={c.secondary}>출금 가능</Txt><Txt size={23} weight="800">{money(wallet?.availableBalance || 0)}</Txt></Row><Divider /><Field label="출금 금액" value={amount} onChange={(value) => setAmount(value.replace(/[^0-9]/g, ''))} keyboard="numeric" placeholder="원 단위" /></Stack></Card></>}
    </Page>
  );
}

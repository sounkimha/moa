import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Banknote, CheckCircle2, ChevronRight, CreditCard, Landmark, LockKeyhole, ShieldCheck, Smartphone, Wallet as WalletIcon } from 'lucide-react-native';
import { money, shortDate, PaymentMethod, WalletTransactionType } from '@moa/domain';
import { useApp } from '../state/AppContext';
import { colors as c, radius, space, typography } from '../theme/tokens';
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
  const wallet = d.wallets.find((item) => item.userId === d.me.id);
  const [filter, setFilter] = useState<'전체' | '들어온 금액' | '나간 금액'>('전체');
  const ownEntries = d.walletTransactions.filter((item) => item.userId === d.me.id);
  const entries = ownEntries.filter((item) => filter === '전체' || (filter === '들어온 금액' ? item.amount >= 0 : item.amount < 0)).slice().reverse();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthReward = ownEntries.filter((item) => item.type === 'TRAVELER_REWARD' && item.status === 'COMPLETED' && item.createdAt.startsWith(currentMonth)).reduce((sum, item) => sum + item.amount, 0);
  if (!wallet) return <Page title="MOA 포인트 보관함"><Empty title="보관함을 준비하지 못했어요" body="최신 상태를 다시 불러와주세요." /></Page>;
  return (
    <Page title="MOA 보관함">
      <Card style={{ backgroundColor: c.primaryDeep, borderWidth: 0, padding: space.xl }}>
        <Stack gap={space.xl}>
          <Row style={{ justifyContent: 'space-between' }}><Txt size={13} color={c.navyText} weight="600">나의 여행이 남긴 여유</Txt><WalletIcon size={22} color={c.primaryTint} /></Row>
          <Stack gap={space.xs}><Txt size={13} color={c.navyText}>사용 가능한 체험 잔액</Txt><Txt size={36} weight="800" color={c.onPrimary}>{money(wallet.availableBalance)}</Txt></Stack>
          <Button label="내 계좌로 받기" icon={Landmark} kind="secondary" onPress={() => a.nav('wallet-withdraw')} style={{ backgroundColor: c.onPrimary }} />
        </Stack>
      </Card>
      <Row style={{ alignItems: 'stretch', gap: space.md }}>
        <View style={{ flex: 1, backgroundColor: c.paper, borderRadius: radius.md, padding: space.lg, gap: space.sm }}><Txt size={12} color={c.secondary}>정산 예정</Txt><Txt size={22} weight="700">{money(wallet.pendingBalance)}</Txt></View>
        <View style={{ flex: 1, backgroundColor: c.primarySoft, borderRadius: radius.md, padding: space.lg, gap: space.sm }}><Txt size={12} color={c.secondary}>이번 달 여행 정산</Txt><Txt size={22} weight="700" color={c.primaryStrong}>{money(monthReward)}</Txt></View>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}><Txt size={13} color={c.secondary}>출금 처리 중 {money(wallet.withdrawalPending)}</Txt><Button small kind="ghost" label="체험 충전" icon={Banknote} onPress={() => a.nav('wallet-topup')} /></Row>
      <Stack gap={space.lg}><Txt size={typography.section} weight="700">최근 내역</Txt>
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{(['전체', '들어온 금액', '나간 금액'] as const).map((label) => <Chip key={label} label={label} selected={filter === label} onPress={() => setFilter(label)} />)}</Row>
        <View style={{ backgroundColor: c.paper, borderRadius: radius.lg, paddingHorizontal: space.lg }}>
          {entries.map((entry, index) => <View key={entry.id} style={{ paddingVertical: space.page, borderBottomWidth: index === entries.length - 1 ? 0 : 1, borderColor: c.border }}><Row style={{ alignItems: 'flex-start' }}><View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: entry.amount >= 0 ? c.primarySoft : c.background, alignItems: 'center', justifyContent: 'center' }}>{entry.amount >= 0 ? <Banknote size={18} color={c.primary} /> : <CreditCard size={18} color={c.secondary} />}</View><Stack gap={space.xs} style={{ flex: 1, minWidth: 0 }}><Txt size={14} weight="600">{entry.title}</Txt><Txt size={12} color={entry.status === 'FAILED' ? c.danger : c.secondary}>{shortDate(entry.createdAt)} · {entry.status === 'PROCESSING' ? '처리 중' : entry.status === 'FAILED' ? '실패' : entryLabels[entry.type]}</Txt></Stack><Txt size={15} weight="700" color={entry.amount >= 0 ? c.primaryStrong : c.ink}>{entry.amount >= 0 ? '+' : '−'}{money(Math.abs(entry.amount))}</Txt></Row></View>)}
        </View>
        {!entries.length && <Empty title={filter === '전체' ? '보관함의 첫 기록을 기다려요' : '아직 해당 내역이 없어요'} body="수령 확인 후 여행 정산과 결제 기록이 여기에 모여요." action="거래 확인" onPress={() => a.tab('trades')} />}
      </Stack>
      <Row style={{ alignItems: 'flex-start' }}><LockKeyhole size={16} color={c.muted} /><Txt size={12} color={c.secondary} style={{ flex: 1 }}>체험용 금액이에요. 충전·출금 버튼으로 실제 결제나 은행 이체가 발생하지 않아요.</Txt></Row>
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
      <Stack gap={6}><Txt size={28} weight="800">얼마를 충전할까요?</Txt><Txt color={c.secondary}>예시 결제수단으로 보관함 충전을 체험해요.</Txt></Stack>
      <Row style={{ flexWrap: 'wrap' }}>{[10_000, 30_000, 50_000, 100_000].map((value) => <Chip key={value} label={money(value)} selected={!custom && amount === value} onPress={() => { setCustom(''); setAmount(value); }} />)}</Row>
      <Field label="직접 입력" value={custom} onChange={(value) => setCustom(value.replace(/[^0-9]/g, ''))} keyboard="numeric" placeholder="원 단위" />
      <Section title="충전 결제수단" />
      {methods.map((method) => <Pressable key={method.id} accessibilityRole="radio" accessibilityLabel={method.label} accessibilityState={{ checked: methodId === method.id }} aria-checked={methodId === method.id} onPress={() => setMethodId(method.id)}><Card style={{ borderColor: methodId === method.id ? c.primary : c.border, backgroundColor: methodId === method.id ? c.primarySoft : c.paper }}><Row><MethodIcon method={method} /><Stack gap={1} style={{ flex: 1 }}><Txt weight="700">{method.label} {method.last4 ? `•••• ${method.last4}` : ''}</Txt><Txt size={12} color={c.secondary}>체험 전용 · 실제 승인 없음</Txt></Stack><CheckCircle2 size={22} color={methodId === method.id ? c.primary : c.muted} /></Row></Card></Pressable>)}
      {!methods.length && <Empty title="사용할 수 있는 결제수단이 없어요" action="결제수단 확인" onPress={() => a.nav('payment-methods')} />}
      <Notice>체험용 잔액만 늘어나요. 실제 카드 결제나 계좌 출금은 일어나지 않아요.</Notice>
    </Page>
  );
}

export function IdentityScreen() {
  const a = useApp(), verified = a.data!.verificationSummary.identity;
  const verify = (method: 'PASS' | 'SMS') => a.mutate('/identity/verify', { method }, '체험 본인확인을 완료했어요.');
  return (
    <Page title="본인확인">
      <View style={{ width: 72, height: 72, backgroundColor: c.primarySoft, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' }}><ShieldCheck size={36} color={c.primary} /></View>
      <Stack gap={space.sm}><Badge>{verified ? '체험 확인 완료' : '확인 필요'}</Badge><Txt size={typography.hero} weight="800">서로 믿고 부탁할 수 있게{`\n`}본인을 확인해요.</Txt><Txt color={c.secondary}>부탁을 수락하거나 정산금을 받기 전 한 번 확인해요.</Txt></Stack>
      <View style={{ paddingVertical: space.lg, gap: space.lg }}><Row><CheckCircle2 size={20} color={c.primary} /><Txt size={14}>상대에게는 인증 여부만 보여요</Txt></Row><Row><LockKeyhole size={20} color={c.primary} /><Txt size={14}>신분증과 주민등록번호를 받지 않아요</Txt></Row></View>
      <Button label={verified ? 'PASS 체험 다시 확인' : 'PASS로 체험 확인'} onPress={() => verify('PASS')} loading={a.busy} />
      <Button kind="secondary" label="SMS로 체험 확인" onPress={() => verify('SMS')} loading={a.busy} />
      <Notice>현재는 본인확인 체험이에요. 실제 PASS·SMS 인증은 진행되지 않아요.</Notice>
    </Page>
  );
}

export function PaymentMethodsScreen() {
  const a = useApp(), methods = a.data!.paymentMethods;
  return (
    <Page title="결제수단">
      <Stack gap={6}><Txt size={27} weight="800">결제할 방법을 관리해요</Txt><Txt color={c.secondary}>카드번호 전체는 MOA 서버나 기기에 저장하지 않아요.</Txt></Stack>
      {methods.map((method) => <Pressable key={method.id} accessibilityRole="button" onPress={() => a.mutate(`/payment-methods/${method.id}/default`, {}, '기본 결제수단을 바꿨어요.')}><Card><Row><MethodIcon method={method} /><Stack gap={2} style={{ flex: 1 }}><Txt weight="700">{method.label} {method.last4 ? `•••• ${method.last4}` : ''}</Txt><Txt size={11} color={c.secondary}>{method.status === 'DEMO_ONLY' ? '체험 전용 토큰' : ''}</Txt></Stack>{method.isDefault ? <Badge>기본</Badge> : <ChevronRight size={18} color={c.muted} />}</Row></Card></Pressable>)}
      {!methods.length && <Empty title="등록된 결제수단이 없어요" body="현재는 거래 결제에서 예시 카드 또는 계좌로 체험할 수 있어요." />}
      <Notice>현재는 예시 결제수단만 사용할 수 있어요. 카드번호를 직접 입력하거나 실제로 결제되지 않아요.</Notice>
    </Page>
  );
}

export function WithdrawalScreen() {
  const a = useApp(), d = a.data!, wallet = d.wallets[0], account = d.payoutAccounts[0];
  const [bankName, setBankName] = useState('MOA 데모은행'), [last4, setLast4] = useState(''), [holder, setHolder] = useState(d.me.nickname), [amount, setAmount] = useState('');
  const save = async () => a.mutate('/wallet/payout-account', { bankName, accountLast4: last4, holderName: holder }, '체험 정산 계좌를 저장했어요.');
  const withdraw = async () => {
    const result = await a.mutate('/wallet/withdrawals', { amount: Number(amount), payoutAccountId: account.id, simulateProcessing: false }, '출금 체험을 완료했어요. 실제 은행 이체는 발생하지 않았어요.');
    if (result) a.nav('wallet');
  };
  return (
    <Page title="내 계좌로 받기" footer={account ? <Button label={`${money(Number(amount) || 0)} 출금 체험`} disabled={!Number(amount) || Number(amount) > (wallet?.availableBalance || 0)} loading={a.busy} onPress={withdraw} /> : undefined}>
      <Stack gap={space.sm}><Txt size={typography.hero} weight="800">여행에서 쌓은 보상,{`\n`}내 계좌로 받아요</Txt><Txt size={14} color={c.secondary}>지금은 출금 흐름을 체험하며 실제 송금은 일어나지 않아요.</Txt></Stack>
      {!d.verificationSummary.identity ? <Card><Stack><Txt size={20} weight="800">본인확인이 먼저 필요해요</Txt><Txt color={c.secondary}>정산 계좌와 출금 요청은 확인된 사용자에게만 열려요.</Txt><Button label="체험 본인확인" icon={ShieldCheck} onPress={() => a.nav('identity')} /></Stack></Card> : !account ? <Card><Stack gap={13}><Txt size={20} weight="800">정산 계좌 등록</Txt><Txt size={12} color={c.secondary}>체험에서는 민감한 전체 계좌번호를 받지 않고 표시용 끝 4자리만 저장해요.</Txt><Field label="은행명" value={bankName} onChange={setBankName} required /><Field label="계좌 끝 4자리" value={last4} onChange={(value) => setLast4(value.replace(/[^0-9]/g, '').slice(0, 4))} keyboard="numeric" required /><Field label="예금주" value={holder} onChange={setHolder} required /><Button label="체험 계좌 등록" disabled={last4.length !== 4 || holder.trim().length < 2} loading={a.busy} onPress={save} /></Stack></Card> : <><Card><Row><Landmark size={23} color={c.primary} /><Stack gap={2} style={{ flex: 1 }}><Txt weight="800">{account.bankName}</Txt><Txt size={13} color={c.secondary}>•••• {account.accountLast4} · {account.holderName}</Txt></Stack><Badge>체험 확인</Badge></Row></Card><Card><Stack><Row style={{ justifyContent: 'space-between' }}><Txt color={c.secondary}>출금 가능</Txt><Txt size={23} weight="800">{money(wallet?.availableBalance || 0)}</Txt></Row><Divider /><Field label="출금 금액" value={amount} onChange={(value) => setAmount(value.replace(/[^0-9]/g, ''))} keyboard="numeric" placeholder="원 단위" /></Stack></Card></>}
    </Page>
  );
}

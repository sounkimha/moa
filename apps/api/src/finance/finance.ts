import { Body, Controller, Headers, Injectable, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ActorRequest, AuthGuard } from '../auth/auth';
import { base, check, once, parse } from '../common/validation';
import { MockIdentityProvider, MockPayoutProvider } from '../infrastructure/adapters';
import { Store } from '../infrastructure/store';

const won = z.number().int().positive().max(10_000_000);

@Injectable()
export class FinanceService {
  constructor(
    private readonly store: Store,
    private readonly payoutProvider: MockPayoutProvider,
    private readonly identityProvider: MockIdentityProvider,
  ) {}

  setDefaultPaymentMethod(actor: string, id: string) {
    return this.store.transaction((db) => {
      const method = db.paymentMethods.find((item) => item.id === id && item.userId === actor);
      check(method, '결제수단을 찾을 수 없어요.');
      db.paymentMethods.filter((item) => item.userId === actor).forEach((item) => {
        item.isDefault = item.id === id;
      });
      return method;
    });
  }

  topUp(actor: string, key: string | undefined, input: unknown) {
    const data = parse(z.object({ amount: won, paymentMethodId: z.string().min(1) }).strict(), input);
    return this.store.transaction((db) =>
      once(db, actor, key, 'wallet:top-up', data, () => {
        const method = db.paymentMethods.find((item) => item.id === data.paymentMethodId && item.userId === actor);
        check(method && method.type !== 'WALLET', '충전에 사용할 카드 또는 간편결제를 선택해주세요.');
        const wallet = db.wallets.find((item) => item.userId === actor);
        check(wallet, '보관함을 찾을 수 없어요.');
        wallet.availableBalance += data.amount;
        const entry = {
          ...base(), walletId: wallet.id, userId: actor, type: 'TOP_UP' as const,
          amount: data.amount, balanceAfter: wallet.availableBalance,
          title: '체험용 보관함 충전', status: 'COMPLETED' as const,
        };
        db.walletTransactions.push(entry);
        return entry;
      }),
    );
  }

  verifyIdentity(actor: string, key: string | undefined, input: unknown) {
    const data = parse(z.object({ method: z.enum(['PASS', 'SMS']) }).strict(), input);
    return this.store.transaction((db) =>
      once(db, actor, key, 'identity:verify', data, () => {
        const result = this.identityProvider.verify(actor, data.method);
        const existing = db.verifications.find((item) => item.userId === actor && item.kind === 'IDENTITY');
        const verification = {
          ...(existing || base()), userId: actor, kind: 'IDENTITY' as const,
          status: result.status, providerRef: result.providerRef,
        };
        if (existing) Object.assign(existing, verification);
        else db.verifications.push(verification);
        return { status: result.status, method: data.method, demoOnly: true };
      }),
    );
  }

  savePayoutAccount(actor: string, key: string | undefined, input: unknown) {
    const data = parse(z.object({
      bankName: z.string().trim().min(2).max(40),
      accountLast4: z.string().regex(/^\d{4}$/),
      holderName: z.string().trim().min(2).max(40),
    }).strict(), input);
    return this.store.transaction((db) =>
      once(db, actor, key, 'wallet:payout-account', data, () => {
        check(
          db.verifications.some((item) => item.userId === actor && item.kind === 'IDENTITY' && item.status === 'DEMO_VERIFIED'),
          '체험 본인확인을 먼저 완료해주세요.',
        );
        const existing = db.payoutAccounts.find((item) => item.userId === actor);
        const account = {
          ...(existing || base()), ...data, userId: actor,
          status: 'DEMO_VERIFIED' as const, providerRef: `mock-account-${actor}`,
        };
        if (existing) Object.assign(existing, account);
        else db.payoutAccounts.push(account);
        return account;
      }),
    );
  }

  withdraw(actor: string, key: string | undefined, input: unknown) {
    const data = parse(z.object({
      amount: won,
      payoutAccountId: z.string().min(1),
      simulateProcessing: z.boolean().default(false),
    }).strict(), input);
    return this.store.transaction((db) =>
      once(db, actor, key, 'wallet:withdraw', data, () => {
        const wallet = db.wallets.find((item) => item.userId === actor);
        check(wallet, '보관함을 찾을 수 없어요.');
        const account = db.payoutAccounts.find((item) => item.id === data.payoutAccountId && item.userId === actor);
        check(account?.status === 'DEMO_VERIFIED', '확인된 정산 계좌를 선택해주세요.');
        check(!db.withdrawals.some((item) => item.userId === actor && item.status === 'PROCESSING'), '처리 중인 출금이 있어요. 완료 후 다시 시도해주세요.');
        check(wallet.availableBalance >= data.amount, '사용 가능한 보관함 금액보다 많이 출금할 수 없어요.');
        const provider = data.simulateProcessing
          ? { providerRef: `mock-pending-${actor}`, status: 'PROCESSING' as const }
          : this.payoutProvider.request(actor, data.amount);
        wallet.availableBalance -= data.amount;
        wallet.withdrawalPending += provider.status === 'PROCESSING' ? data.amount : 0;
        const withdrawal = {
          ...base(), userId: actor, walletId: wallet.id, payoutAccountId: account.id,
          amount: data.amount, status: provider.status, providerRef: provider.providerRef,
        };
        db.withdrawals.push(withdrawal);
        db.walletTransactions.push({
          ...base(), walletId: wallet.id, userId: actor, type: 'WITHDRAWAL', amount: -data.amount,
          balanceAfter: wallet.availableBalance, title: provider.status === 'PROCESSING' ? '출금 처리 중' : '내 계좌로 받기 · 체험',
          status: provider.status === 'PROCESSING' ? 'PROCESSING' : 'COMPLETED', withdrawalId: withdrawal.id,
        });
        return withdrawal;
      }),
    );
  }
}

@UseGuards(AuthGuard)
@Controller()
export class FinanceController {
  constructor(private readonly service: FinanceService) {}
  @Post('payment-methods/:id/default') defaultMethod(@Req() r: ActorRequest, @Param('id') id: string) {
    return this.service.setDefaultPaymentMethod(r.actorId, id);
  }
  @Post('wallet/top-up') topUp(@Req() r: ActorRequest, @Headers('idempotency-key') k: string, @Body() b: unknown) {
    return this.service.topUp(r.actorId, k, b);
  }
  @Post('identity/verify') verify(@Req() r: ActorRequest, @Headers('idempotency-key') k: string, @Body() b: unknown) {
    return this.service.verifyIdentity(r.actorId, k, b);
  }
  @Post('wallet/payout-account') account(@Req() r: ActorRequest, @Headers('idempotency-key') k: string, @Body() b: unknown) {
    return this.service.savePayoutAccount(r.actorId, k, b);
  }
  @Post('wallet/withdrawals') withdraw(@Req() r: ActorRequest, @Headers('idempotency-key') k: string, @Body() b: unknown) {
    return this.service.withdraw(r.actorId, k, b);
  }
}

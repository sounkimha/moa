import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Injectable,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { Database, Payment, Payout, Status, Transaction, quote, travelerEarnings } from '@moa/domain';
import { ActorRequest, AuthGuard } from '../auth/auth';
import {
  amount,
  localAmount,
  base,
  check,
  date,
  get,
  imageData,
  once,
  owner,
  parse,
} from '../common/validation';
import { Store } from '../infrastructure/store';
import { canAcceptTrip } from '@moa/domain';
import { MockPaymentProvider } from '../infrastructure/adapters';
const revision = { expectedRevision: z.number().int().min(0) };
const actionSchema = z.discriminatedUnion('action', [
  z
    .object({
      ...revision,
      action: z.literal('PAY'),
      paymentMethodId: z.string().min(1).optional(),
      simulateFailure: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      ...revision,
      action: z.literal('PURCHASE'),
      productImage: z.union([z.literal(''), imageData]),
      receiptImage: z.union([z.literal(''), imageData]),
      storeName: z.string().trim().min(2).max(100),
      purchasedAt: date,
      localAmount: localAmount.positive(),
      locationNote: z.string().trim().min(2).max(150),
    })
    .strict(),
  z
    .object({
      ...revision,
      action: z.literal('OUT_OF_STOCK'),
      evidenceImage: imageData,
      storeName: z.string().trim().min(2).max(100),
      checkedAt: date,
      locationNote: z.string().trim().min(2).max(150),
      reason: z.enum(['OUT_OF_STOCK', 'STORE_CLOSED', 'PRODUCT_NOT_FOUND', 'PURCHASE_LIMIT']),
      note: z.string().trim().max(500).default(''),
    })
    .strict(),
  z.object({ ...revision, action: z.literal('TRAVEL') }).strict(),
  z
    .object({
      ...revision,
      action: z.literal('SHIP'),
      carrier: z.string().trim().min(2).max(60),
      trackingNumber: z.string().trim().min(3).max(100),
    })
    .strict(),
  z.object({ ...revision, action: z.literal('RECEIVE_AND_CONFIRM') }).strict(),
  z.object({ ...revision, action: z.literal('RECEIVE') }).strict(),
  z.object({ ...revision, action: z.literal('CONFIRM') }).strict(),
  z.object({ ...revision, action: z.literal('SETTLE') }).strict(),
  z.object({ ...revision, action: z.literal('CANCEL') }).strict(),
  z
    .object({
      ...revision,
      action: z.literal('DISPUTE'),
      reason: z.string().trim().min(5).max(1000),
    })
    .strict(),
]);
@Injectable()
export class TransactionsService {
  constructor(
    private readonly store: Store,
    private readonly paymentProvider: MockPaymentProvider,
  ) {}
  private refundPayment(db: Database, payment: Payment) {
    this.paymentProvider.refund(payment.providerRef);
    payment.status = 'REFUNDED';
    if (payment.provider !== 'MOCK_WALLET') return;
    const wallet = db.wallets.find((item) => item.userId === payment.buyerId);
    if (!wallet) return;
    wallet.availableBalance += payment.amount;
    db.walletTransactions.push({
      ...base(), walletId: wallet.id, userId: payment.buyerId, type: 'REFUND',
      amount: payment.amount, balanceAfter: wallet.availableBalance,
      title: '취소 거래 보관함 환불', status: 'COMPLETED', transactionId: payment.transactionId,
    });
  }
  private audit(db: Database, actorId: string, t: Transaction, from: Status, note: string) {
    db.events.push({
      ...base(),
      actorId,
      transactionId: t.id,
      type: t.status,
      from,
      to: t.status,
      note,
    });
    const room = db.rooms.find((r) => r.transactionId === t.id);
    if (room)
      db.messages.push({ ...base(), roomId: room.id, senderId: actorId, text: note, system: true });
    db.notifications.push({
      ...base(),
      userId: actorId === t.buyerId ? t.travelerId : t.buyerId,
      title: note,
      transactionId: t.id,
      read: false,
    });
  }
  accept(actor: string, key: string | undefined, id: string, input: unknown) {
    const data = parse(z.object({ ...revision }).strict(), input);
    return this.store.transaction((db) =>
      once(db, actor, key, `accept:${id}`, data, () => {
        const offer = get(db.offers, id, '제안');
        const request = get(db.requests, offer.requestId, '요청');
        owner(actor, request.requesterId);
        check(canAcceptTrip(get(db.trips, offer.tripId)), '여행자의 왕복 항공권 인증이 완료되지 않았어요. 인증 상태를 확인해주세요.');
        check(
          request.revision === data.expectedRevision,
          '요청이 변경됐어요. 새로고침 후 다시 선택해주세요.',
        );
        check(
          offer.status === 'PENDING' && ['REQUESTED', 'OFFER_RECEIVED'].includes(request.status),
          '이미 선택되었거나 종료된 제안이에요.',
        );
        const price = quote(request, offer.reward, offer.transport);
        const t: Transaction = {
          ...base(),
          ...price,
          requestId: request.id,
          offerId: offer.id,
          travelerId: offer.travelerId,
          buyerId: actor,
          status: 'MATCHED',
          revision: 0,
          transport: offer.transport,
          estimatedDeliveryDate: offer.estimatedDeliveryDate,
        };
        db.transactions.push(t);
        request.status = 'MATCHED';
        request.revision++;
        db.offers
          .filter((o) => o.requestId === request.id)
          .forEach((o) => (o.status = o.id === id ? 'ACCEPTED' : 'REJECTED'));
        db.rooms.push({
          ...base(),
          transactionId: t.id,
          buyerId: actor,
          travelerId: offer.travelerId,
        });
        this.audit(
          db,
          actor,
          t,
          'OFFER_RECEIVED',
          '여행자가 매칭됐어요. 결제를 완료하면 구매를 시작해요.',
        );
        return t;
      }),
    );
  }
  action(actor: string, key: string | undefined, id: string, input: unknown) {
    const data = parse(actionSchema, input);
    return this.store.transaction((db) =>
      once(db, actor, key, `transaction:${id}:${data.action}`, data, () => {
        const t = get(db.transactions, id, '거래');
        const request = get(db.requests, t.requestId);
        check(
          t.buyerId === actor || t.travelerId === actor,
          '이 거래의 참여자만 접근할 수 있어요.',
        );
        check(
          t.revision === data.expectedRevision,
          '거래 상태가 변경됐어요. 새로고침 후 다시 진행해주세요.',
        );
        const from = t.status;
        const buyer = () => owner(actor, t.buyerId),
          traveler = () => owner(actor, t.travelerId);
        const at = (s: Status) =>
          check(t.status === s, '현재 거래 단계에서는 이 작업을 진행할 수 없어요.');
        let note = '';
        switch (data.action) {
          case 'PAY': {
            buyer();
            at('MATCHED');
            if (data.simulateFailure)
              throw new BadRequestException('결제 승인 실패를 체험했어요. 다시 시도할 수 있어요.');
            const method = data.paymentMethodId
              ? db.paymentMethods.find((item) => item.id === data.paymentMethodId && item.userId === actor)
              : db.paymentMethods.find((item) => item.userId === actor && item.isDefault);
            check(method, '사용할 결제수단을 선택해주세요.');
            if (method.type === 'WALLET') {
              const wallet = db.wallets.find((item) => item.userId === actor);
              check(wallet && wallet.availableBalance >= t.totalPrice, '보관함 잔액이 부족해요. 충전하거나 다른 결제수단을 선택해주세요.');
              wallet.availableBalance -= t.totalPrice;
              db.walletTransactions.push({
                ...base(), walletId: wallet.id, userId: actor, type: 'PAYMENT', amount: -t.totalPrice,
                balanceAfter: wallet.availableBalance, title: request.productName,
                status: 'COMPLETED', transactionId: id,
              });
            }
            const result = this.paymentProvider.hold(t.id, t.totalPrice, method.type);
            db.payments.push({
              ...base(),
              transactionId: id,
              buyerId: actor,
              amount: t.totalPrice,
              provider: method.type === 'WALLET' ? 'MOCK_WALLET' : method.type === 'EASY_PAY' ? 'MOCK_EASY_PAY' : 'MOCK_CARD',
              paymentMethodId: method.id,
              status: 'HELD',
              providerRef: result.providerRef,
            });
            db.escrows.push({
              ...base(),
              transactionId: id,
              amount: t.totalPrice,
              holder: 'MOCK_LEDGER',
              status: 'HELD',
            });
            t.status = 'PAYMENT_HELD';
            note = '안전결제 체험이 완료됐어요. 결제금은 모의 보관 중이에요.';
            break;
          }
          case 'PURCHASE': {
            traveler();
            at('PAYMENT_HELD');
            check(
              Boolean(data.productImage || data.receiptImage),
              '상품 사진 또는 영수증 중 하나 이상을 첨부해주세요.',
            );
            const offer = get(db.offers, t.offerId);
            const trip = get(db.trips, offer.tripId);
            check(
              data.purchasedAt >= trip.startDate && data.purchasedAt <= trip.endDate,
              '구매일을 여행 기간 안에서 선택해주세요.',
            );
            check(
              Math.round(data.localAmount * 100) === Math.round(request.localPrice * request.quantity * 100),
              '구매 금액이 합의한 상품가격과 달라요. 채팅으로 먼저 확인해주세요.',
            );
            db.receipts.push({
              ...base(),
              transactionId: id,
              travelerId: actor,
              outcome: 'PURCHASED',
              productImage: data.productImage,
              receiptImage: data.receiptImage,
              storeName: data.storeName,
              purchasedAt: data.purchasedAt,
              localAmount: data.localAmount,
              currency: request.currency,
              locationNote: data.locationNote,
            });
            t.status = 'PURCHASED';
            note = '상품 구매를 마쳤어요. 상품 또는 영수증 증빙을 확인해주세요.';
            break;
          }
          case 'OUT_OF_STOCK': {
            traveler();
            at('PAYMENT_HELD');
            const offer = get(db.offers, t.offerId);
            const trip = get(db.trips, offer.tripId);
            check(
              data.checkedAt >= trip.startDate && data.checkedAt <= trip.endDate,
              '방문 확인일을 여행 기간 안에서 선택해주세요.',
            );
            db.receipts.push({
              ...base(),
              transactionId: id,
              travelerId: actor,
              outcome: 'OUT_OF_STOCK',
              productImage: data.evidenceImage,
              receiptImage: '',
              storeName: data.storeName,
              purchasedAt: data.checkedAt,
              localAmount: 0,
              currency: request.currency,
              locationNote: data.locationNote,
              unavailableReason: data.reason,
              unavailableNote: data.note,
            });
            db.payments
              .filter((payment) => payment.transactionId === id)
              .forEach((payment) => this.refundPayment(db, payment));
            db.escrows
              .filter((escrow) => escrow.transactionId === id)
              .forEach((escrow) => (escrow.status = 'REFUNDED'));
            offer.status = 'CANCELLED';
            request.inventoryStatus = data.reason === 'OUT_OF_STOCK' ? 'OUT_OF_STOCK' : 'CHECK_REQUIRED';
            t.status = 'CANCELLED';
            note = data.reason === 'OUT_OF_STOCK'
              ? '매장에서 품절을 확인했어요. 증빙을 남기고 결제금을 전액 환불했어요.'
              : '매장에서 구매하지 못했어요. 방문 기록을 남기고 결제금을 전액 환불했어요.';
            break;
          }
          case 'TRAVEL':
            traveler();
            at('PURCHASED');
            t.status = 'TRAVELING';
            note = '여행자가 귀국 후 합의한 방법으로 전달을 준비하고 있어요.';
            break;
          case 'SHIP': {
            traveler();
            at('TRAVELING');
            db.shipments.push({
              ...base(),
              transactionId: id,
              transport: t.transport,
              carrier: data.carrier,
              trackingNumber: data.trackingNumber,
              status: 'SHIPPED',
            });
            t.status = 'SHIPPED';
            note =
              t.transport === 'MEETUP'
                ? '직접 전달 일정을 등록했어요.'
                : '운송장 정보가 등록됐어요. 배송을 시작해요.';
            break;
          }
          case 'RECEIVE_AND_CONFIRM':
            buyer();
            at('SHIPPED');
            t.status = 'CONFIRMED';
            db.shipments
              .filter((s) => s.transactionId === id)
              .forEach((s) => (s.status = 'DELIVERED'));
            note = '구매자가 상품을 수령하고 구매를 확정했어요.';
            break;
          case 'RECEIVE':
            buyer();
            at('SHIPPED');
            t.status = 'DELIVERED';
            db.shipments
              .filter((s) => s.transactionId === id)
              .forEach((s) => (s.status = 'DELIVERED'));
            note = '구매자가 상품을 받았어요. 상태를 확인해주세요.';
            break;
          case 'CONFIRM':
            buyer();
            at('DELIVERED');
            t.status = 'CONFIRMED';
            note = '구매자가 상품을 확인하고 구매를 확정했어요.';
            break;
          case 'SETTLE': {
            traveler();
            at('CONFIRMED');
            const escrow = db.escrows.find((e) => e.transactionId === id);
            check(escrow?.status === 'HELD', '정산 가능한 보관금이 없어요.');
            check(
              !db.disputes.some((d) => d.transactionId === id && d.status === 'OPEN'),
              '분쟁이 해결되기 전에는 정산할 수 없어요.',
            );
            const { platformCommission, netReward } = travelerEarnings(t.travelerReward);
            const payout: Payout = {
              ...base(),
              transactionId: id,
              travelerId: actor,
              reimbursement: t.productPrice,
              reward: t.travelerReward,
              platformCommission,
              netReward,
              shippingReimbursement: t.shippingFee,
              amount: t.productPrice + netReward + t.shippingFee,
              status: 'MOCK_SETTLED',
              providerRef: `mock-payout-${id}`,
            };
            db.payouts.push(payout);
            const wallet = db.wallets.find((item) => item.userId === actor);
            check(wallet, '여행자 보관함을 찾을 수 없어요.');
            wallet.availableBalance += payout.amount;
            db.walletTransactions.push({
              ...base(), walletId: wallet.id, userId: actor, type: 'TRAVELER_REWARD',
              amount: payout.amount, balanceAfter: wallet.availableBalance,
              title: `${request.productName} 정산`, status: 'COMPLETED',
              transactionId: id, payoutId: payout.id,
            });
            db.notifications.push({
              ...base(), userId: actor,
              title: `${payout.amount.toLocaleString('ko-KR')}원이 MOA 포인트 보관함에 적립됐어요.`,
              transactionId: id, read: false,
            });
            escrow.status = 'RELEASED';
            db.payments
              .filter((p) => p.transactionId === id)
              .forEach((p) => (p.status = 'RELEASED'));
            t.status = 'SETTLED';
            note = '상품 선지출 상환과 보상 정산 체험을 마쳤어요.';
            break;
          }
          case 'CANCEL': {
            buyer();
            check(
              ['MATCHED', 'PAYMENT_HELD'].includes(t.status),
              '구매 이후에는 취소 대신 문제 접수를 이용해주세요.',
            );
            db.payments
              .filter((p) => p.transactionId === id)
              .forEach((p) => this.refundPayment(db, p));
            db.escrows
              .filter((e) => e.transactionId === id)
              .forEach((e) => (e.status = 'REFUNDED'));
            get(db.offers, t.offerId).status = 'CANCELLED';
            t.status = 'CANCELLED';
            note = '거래가 취소됐어요. 결제된 모의 금액은 전액 환불 처리됐어요.';
            break;
          }
          case 'DISPUTE': {
            check(
              [
                'PAYMENT_HELD',
                'PURCHASED',
                'TRAVELING',
                'SHIPPED',
                'DELIVERED',
                'CONFIRMED',
              ].includes(t.status),
              '현재 단계에서는 문제를 접수할 수 없어요.',
            );
            db.disputes.push({
              ...base(),
              transactionId: id,
              openedBy: actor,
              reason: data.reason,
              status: 'OPEN',
            });
            db.escrows.filter((e) => e.transactionId === id).forEach((e) => (e.status = 'FROZEN'));
            t.status = 'DISPUTED';
            note = '문제가 접수되어 정산을 멈췄어요. 거래 기록을 보관해요.';
            break;
          }
        }
        t.revision++;
        request.status = t.status;
        request.revision++;
        this.audit(db, actor, t, from, note);
        return t;
      }),
    );
  }
  review(actor: string, key: string | undefined, id: string, input: unknown) {
    const data = parse(
      z
        .object({ rating: z.number().int().min(1).max(5), text: z.string().trim().min(2).max(500) })
        .strict(),
      input,
    );
    return this.store.transaction((db) =>
      once(db, actor, key, `review:${id}`, data, () => {
        const t = get(db.transactions, id);
        check([t.buyerId, t.travelerId].includes(actor), '거래 참여자만 후기를 남길 수 있어요.');
        check(['CONFIRMED', 'SETTLED'].includes(t.status), '구매 확정 후 후기를 남길 수 있어요.');
        check(
          !db.reviews.some((r) => r.transactionId === id && r.authorId === actor),
          '이미 후기를 남겼어요.',
        );
        const review = {
          ...base(),
          ...data,
          transactionId: id,
          authorId: actor,
          targetId: actor === t.buyerId ? t.travelerId : t.buyerId,
        };
        db.reviews.push(review);
        return review;
      }),
    );
  }
}
@UseGuards(AuthGuard)
@Controller()
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}
  @Post('offers/:id/accept') accept(
    @Req() r: ActorRequest,
    @Headers('idempotency-key') k: string,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.service.accept(r.actorId, k, id, b);
  }
  @Post('transactions/:id/actions') action(
    @Req() r: ActorRequest,
    @Headers('idempotency-key') k: string,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.service.action(r.actorId, k, id, b);
  }
  @Post('transactions/:id/reviews') review(
    @Req() r: ActorRequest,
    @Headers('idempotency-key') k: string,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.service.review(r.actorId, k, id, b);
  }
}

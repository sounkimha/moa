import { Body, Controller, Get, Headers, Injectable, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { COUNTRY_CODES, Database, FxRate, ProductRequest, TravelerOffer, quote, MAX_DEMO_REWARD, currencyForCountry, canAcceptTrip } from '@moa/domain';
import { Store } from '../infrastructure/store';
import { MockPaymentProvider } from '../infrastructure/adapters';
import { FxService } from '../fx/fx';
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
  parse,
  today,
  transport,
} from '../common/validation';

const createSchema = z.object({
  originalText: z.object({
    productName: z.string().max(1500), storeName: z.string().max(500),
    purchaseLocation: z.string().max(200), option: z.string().max(500),
  }).strict().optional(),
  productName: z.string().trim().min(2).max(100),
  productUrl: z.union([z.literal(''), z.string().url().max(2048)]).default(''),
  productImage: z
    .union([
      z.literal(''),
      imageData,
      z.string().url().max(2048).refine((value) => value.startsWith('https://'), '안전한 이미지 주소를 사용해주세요.'),
    ])
    .default(''),
  storeName: z.string().trim().max(120).optional(),
  brandName: z.string().trim().max(120).optional(),
  recognizedCurrency: z.enum(['KRW', 'JPY', 'TWD', 'HKD', 'CNY', 'THB', 'VND', 'SGD', 'MYR', 'IDR', 'USD', 'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'PEN', 'COP', 'GBP', 'EUR', 'CHF', 'AUD', 'NZD', 'INR', 'PHP', 'KHR', 'AED', 'TRY', 'ZAR', 'EGP', 'MAD', 'KES', 'TZS']).nullable().optional(),
  availability: z.object({
    countryCode: z.enum(COUNTRY_CODES).nullable().optional(),
    countryName: z.string().max(80).optional(), city: z.string().max(80).optional(), district: z.string().max(100).optional(),
    placeId: z.string().max(100).nullable().optional(),
    isLocationLimited: z.boolean(), limitedType: z.enum(['COUNTRY', 'CITY', 'DISTRICT', 'STORE']).nullable().optional(), limitedLabel: z.string().max(120).optional(),
  }).strict().optional(),
  stores: z.array(z.object({ name: z.string().trim().min(1).max(120), country: z.enum(COUNTRY_CODES).nullable().optional(), countryCode: z.enum(COUNTRY_CODES).nullable().optional(), city: z.string().max(80).optional(), district: z.string().max(100).optional() }).strict()).max(12).optional(),
  recognizedLocation: z.object({ countryCode: z.enum(COUNTRY_CODES).nullable().optional(), countryName: z.string().max(80).optional(), city: z.string().max(80).optional(), district: z.string().max(100).optional(), placeId: z.string().max(100).nullable().optional(), storeName: z.string().max(120).optional(), purchaseLocation: z.string().max(200).optional() }).strict().optional(),
  locationSource: z.enum(['AI_RECOGNIZED', 'USER_SELECTED']).optional(),
  locationMismatch: z.boolean().optional(),
  art: z.enum(['keyring', 'plush', 'pouch', 'tshirt', 'pin', 'bag']).default('keyring'),
  placeId: z.string(),
  localPrice: localAmount.positive(),
  quantity: z.number().int().min(1).max(10),
  requestedReward: amount.max(MAX_DEMO_REWARD).optional(),
  desiredDate: date,
  deliveryCountry: z.enum(COUNTRY_CODES).default('KR'),
  deliveryCity: z.string().trim().min(1).max(40).default('서울'),
  category: z.enum(['CHARACTER', 'GAME', 'POPUP', 'LOCAL', 'FASHION', 'CONCERT']),
  option: z.string().trim().max(150).default('기본 옵션'),
  transport,
  deliveryAddressId: z.string().optional(),
  deliveryRecipient: z.string().trim().max(50).optional(),
  deliveryPhone: z.string().trim().max(30).optional(),
  deliveryPostalCode: z.string().trim().max(12).optional(),
  deliveryAddress1: z.string().trim().max(160).optional(),
  deliveryAddress2: z.string().trim().max(160).optional(),
  meetupLocation: z.string().trim().max(100).optional(),
  meetupPoint: z.object({
    name: z.string().trim().min(1).max(100),
    address: z.string().trim().max(200),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    detail: z.string().trim().max(100),
    providerId: z.string().max(100).optional(),
  }).strict().optional(),
  retryOfRequestId: z.string().min(1).max(100).optional(),
  inventoryStatus: z.enum(['IN_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'CHECK_REQUIRED']).default('CHECK_REQUIRED'),
}).strict().superRefine((data, ctx) => {
  if (data.transport === 'DOMESTIC_PARCEL') {
    for (const [key, label] of [
      ['deliveryRecipient', '받는 분'], ['deliveryPhone', '연락처'],
      ['deliveryPostalCode', '우편번호'], ['deliveryAddress1', '주소'],
    ] as const) if (!data[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${label}을 입력해주세요.` });
  }
  if (data.transport === 'MEETUP' && !data.meetupLocation)
    ctx.addIssue({ code: 'custom', path: ['meetupLocation'], message: '직거래 희망 장소를 선택해주세요.' });
});
export const offerSchema = z.object({
  tripId: z.string(),
  reward: amount.max(MAX_DEMO_REWARD),
  estimatedPurchaseDate: date,
  estimatedDeliveryDate: date,
  message: z.string().trim().min(1).max(500),
  transport,
});
export type OfferInput = z.infer<typeof offerSchema>;
const bundleSchema = offerSchema.extend({
  requestIds: z.array(z.string()).min(1).max(10),
  rewards: z.record(offerSchema.shape.reward).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.rewards && (Object.keys(data.rewards).length !== data.requestIds.length ||
      data.requestIds.some((id) => !Object.hasOwn(data.rewards!, id)))) {
    ctx.addIssue({ code: 'custom', path: ['rewards'], message: '선택한 부탁마다 보상금을 입력해주세요.' });
  }
});
@Injectable()
export class RequestsService {
  constructor(private readonly store: Store, private readonly paymentProvider: MockPaymentProvider, private readonly fx: FxService) {}
  async paymentQuote(actor: string, id: string) {
    const request = await this.store.read((db) => {
      const current = get(db.requests, id, '부탁');
      check(current.requesterId === actor, '본인의 부탁만 결제할 수 있어요.');
      check(current.status === 'PAYMENT_PENDING', '이미 결제했거나 종료된 부탁이에요.');
      return current;
    });
    const rate = await this.fx.latest(request.currency);
    return quote(request, request.requestedReward ?? 0, request.transport, rate);
  }
  pay(actor: string, key: string | undefined, id: string, input: unknown) {
    const data = parse(z.object({ expectedRevision: z.number().int().min(0),
      paymentMethod: z.enum(['CARD', 'ACCOUNT']), paymentReference: z.string().trim().min(4).max(40),
      expectedTotal: z.number().int().min(1).max(2_600_000).optional(),
      expectedFxRate: z.number().finite().positive().optional(),
      simulateFailure: z.boolean().default(false) }).strict(), input);
    const commit = (rate?: FxRate) => this.store.transaction((db) => once(db, actor, key, `request:pay:${id}`, data, () => {
      const request = get(db.requests, id, '부탁');
      check(request.requesterId === actor, '본인의 부탁만 결제할 수 있어요.');
      check(request.status === 'PAYMENT_PENDING' && request.revision === data.expectedRevision,
        '부탁 상태가 바뀌었어요. 새로고침 후 확인해주세요.');
      check(request.desiredDate >= today(), '희망 수령일이 지났어요. 새 부탁을 작성해주세요.');
      check(!db.requestFundings.some((f) => f.requestId === id), '이미 결제된 부탁이에요.');
      check(!data.simulateFailure, '결제 승인 실패를 체험했어요. 다시 시도할 수 있어요.');
      request.requestedReward ??= 0;
      const price = quote(request, request.requestedReward, request.transport, rate);
      if (data.expectedTotal !== undefined)
        check(data.expectedTotal === price.totalPrice && data.expectedFxRate === price.fxRate,
          '환율이나 금액이 바뀌었어요. 새 금액을 확인하고 다시 결제해주세요.');
      check(price.totalPrice > 0, '결제 금액은 1원 이상이어야 해요. 상품가격을 확인하고 새 부탁을 작성해주세요.');
      check(price.productPrice <= 500000, '체험에서는 상품가격 50만원 이하의 요청만 결제할 수 있어요.');
      const method = data.paymentMethod === 'ACCOUNT' ? 'EASY_PAY' : 'CARD';
      const result = this.paymentProvider.hold(`request-${id}`, price.totalPrice, method);
      db.requestFundings.push({ ...base(), ...price, requestId: id, buyerId: actor, status: 'HELD',
        provider: method === 'CARD' ? 'MOCK_CARD' : 'MOCK_EASY_PAY', providerRef: result.providerRef,
        paymentMethodId: `preview-${data.paymentMethod.toLowerCase()}` });
      request.status = db.offers.some((o) => o.requestId === id && o.status === 'PENDING') ? 'OFFER_RECEIVED' : 'REQUESTED';
      request.revision++;
      if (request.retryOfRequestId) {
        const previousPartners = new Set(db.transactions.filter((t) => t.requestId === request.retryOfRequestId).map((t) => t.travelerId));
        const recipients = new Set(db.offers.filter((o) => o.requestId === request.retryOfRequestId &&
          o.status !== 'CANCELLED' && o.travelerId !== actor && !previousPartners.has(o.travelerId)).map((o) => o.travelerId));
        for (const userId of recipients) db.notifications.push({ ...base(), userId, requestId: request.id, read: false,
          title: `이전에 지원한 ‘${request.productName}’ 부탁이 다시 공개됐어요. 가는 길이라면 확인해주세요.` });
      }
      db.events.push({ ...base(), actorId: actor, type: 'REQUEST_PREPAID', note: id });
      return request;
    }));
    // Preserve the synchronous legacy mock path; current clients supply both preview values.
    if (data.expectedTotal === undefined) return commit();
    return this.store.read((db) => {
      const current = get(db.requests, id, '부탁');
      check(current.requesterId === actor, '본인의 부탁만 결제할 수 있어요.');
      return current.currency;
    }).then((currency) => this.fx.latest(currency)).then(commit);
  }
  cancel(actor: string, key: string | undefined, id: string, input: unknown) {
    const data = parse(z.object({ expectedRevision: z.number().int().min(0) }).strict(), input);
    return this.store.transaction((db) => once(db, actor, key, `request:cancel:${id}`, data, () => {
      const request = get(db.requests, id, '부탁');
      check(request.requesterId === actor, '본인의 부탁만 취소할 수 있어요.');
      check(['PAYMENT_PENDING', 'REQUESTED', 'OFFER_RECEIVED'].includes(request.status) && request.revision === data.expectedRevision,
        '매칭되었거나 상태가 바뀌었어요. 거래 화면에서 확인해주세요.');
      const funding = db.requestFundings.find((f) => f.requestId === id && f.status === 'HELD');
      if (funding) { this.paymentProvider.refund(funding.providerRef); funding.status = 'REFUNDED'; }
      request.status = 'CANCELLED'; request.revision++;
      for (const offer of db.offers.filter((o) => o.requestId === id && o.status === 'PENDING')) {
        offer.status = 'CANCELLED';
        db.notifications.push({ ...base(), userId: offer.travelerId, requestId: id, read: false, title: '지원한 부탁이 취소됐어요.' });
      }
      db.events.push({ ...base(), actorId: actor, type: 'REQUEST_CANCELLED', note: funding ? `${id}: 모의 결제 전액 환불` : id });
      return request;
    }));
  }
  create(actor: string, key: string | undefined, input: unknown) {
    const data = parse(createSchema, input);
    return this.store.transaction((db) =>
      once(db, actor, key, 'request:create', data, () => {
        const place = get(db.places, data.placeId, '장소');
        check(data.desiredDate >= today(), '희망 수령일은 오늘 이후로 선택해주세요.');
        if (data.retryOfRequestId) {
          const original = get(db.requests, data.retryOfRequestId, '이전 부탁');
          check(original.requesterId === actor, '본인의 부탁만 다시 등록할 수 있어요.');
          check(original.status === 'CANCELLED', '취소된 부탁만 다시 등록할 수 있어요.');
          check(!db.requests.some((r) => r.retryOfRequestId === original.id && r.status !== 'CANCELLED'),
            '이미 다시 등록한 부탁이 있어요. 거래 메뉴에서 확인해주세요.');
        }
        const request: ProductRequest = {
          ...base(),
          ...data,
          requesterId: actor,
          storeName: data.storeName || place.name,
          country: place.country,
          city: place.city,
          currency: currencyForCountry(place.country),
          status: 'PAYMENT_PENDING',
          revision: 0,
          directPurchase: 'UNKNOWN',
        };
        const q = quote(request, 1000, request.transport);
        check(q.productPrice >= 1, '상품가격은 원화로 1원 이상이어야 해요. 현지 가격을 확인해주세요.');
        check(
          q.productPrice <= 500000,
          '체험에서는 상품가격 50만원 이하의 요청만 등록할 수 있어요.',
        );
        db.requests.push(request);
        db.events.push({ ...base(), actorId: actor, type: 'request_created', note: request.id });
        return request;
      }),
    );
  }
  createOffer(
    db: Database,
    actor: string,
    requestId: string,
    data: OfferInput,
    bundleId?: string,
  ): TravelerOffer {
    const request = get(db.requests, requestId, '요청');
    const trip = get(db.trips, data.tripId, '일정');
    check(
      db.verifications.some((item) => item.userId === actor && item.kind === 'IDENTITY' && item.status === 'DEMO_VERIFIED'),
      '부탁에 지원하려면 본인인증부터 완료해주세요.',
    );
    check(trip.travelerId === actor, '본인의 여행 일정을 선택해주세요.');
    check(canAcceptTrip(trip), '부탁에 지원하려면 왕복 항공권 인증을 먼저 완료해주세요. 항공권 인식만으로는 최종 인증이 완료되지 않아요.');
    check(request.requesterId !== actor, '본인이 등록한 부탁에는 지원할 수 없어요.');
    check(
      ['REQUESTED', 'OFFER_RECEIVED'].includes(request.status),
      '이미 매칭되었거나 종료된 요청이에요.',
    );
    check(db.requestFundings.some((f) => f.requestId === requestId && f.status === 'HELD'),
      '구매자의 결제가 완료된 부탁에만 지원할 수 있어요.');
    check(
      trip.placeIds.includes(request.placeId) &&
        trip.destinationCountry === request.country,
      '등록한 방문 장소의 부탁만 지원할 수 있어요.',
    );
    check(
      trip.departureCountry === request.deliveryCountry,
      '구매자가 받을 나라로 돌아오는 일정에서만 지원할 수 있어요.',
    );
    check(
      request.transport !== 'MEETUP' || trip.departureCity === request.deliveryCity,
      '직접 전달은 귀국 도시와 수령 도시가 같아야 해요.',
    );
    check(
      data.estimatedPurchaseDate >= today() &&
        data.estimatedPurchaseDate >= trip.startDate &&
        data.estimatedPurchaseDate <= trip.endDate,
      '구매일은 여행 기간 안에서 선택해주세요.',
    );
    check(
      data.estimatedDeliveryDate >= data.estimatedPurchaseDate &&
        data.estimatedDeliveryDate >= trip.endDate &&
        data.estimatedDeliveryDate <= request.desiredDate,
      '수령일은 구매·귀국 이후이며 요청 기한 안이어야 해요.',
    );
    check(data.transport === request.transport, '구매자가 선택한 전달 방식으로 지원해주세요.');
    check(
      !db.offers.some(
        (o) => o.requestId === request.id && o.travelerId === actor && o.status === 'PENDING',
      ),
      '이미 지원한 부탁이에요.',
    );
    const reserved = db.offers
      .filter(
        (o) =>
          o.tripId === trip.id &&
          ['PENDING', 'ACCEPTED'].includes(o.status) &&
          !db.transactions.some((t) => t.offerId === o.id && t.status === 'CANCELLED'),
      )
      .reduce((s, o) => s + get(db.requests, o.requestId).quantity, 0);
    check(reserved + request.quantity <= trip.maxItems, '여행 일정의 최대 처리 수량을 초과해요.');
    const offer: TravelerOffer = {
      ...base(),
      ...data,
      // The buyer's published reward is authoritative, including a zero reward.
      // Older requests without one retain the existing negotiation flow.
      reward: request.requestedReward ?? data.reward,
      requestId,
      travelerId: actor,
      status: 'PENDING',
      ...(bundleId ? { bundleId } : {}),
    };
    db.offers.push(offer);
    request.status = 'OFFER_RECEIVED';
    request.revision++;
    db.notifications.push({
      ...base(),
      userId: request.requesterId,
      title: '가는 길의 여행자가 지원했어요. 함께할 한 명을 선택해주세요.',
      requestId,
      read: false,
    });
    return offer;
  }
  claim(actor: string, key: string | undefined, id: string, input: unknown) {
    // Old clients cannot bypass the buyer's explicit selection.
    return this.offer(actor, key, id, input);
  }
  claimBundle(actor: string, key: string | undefined, input: unknown) {
    const data = parse(bundleSchema, input);
    return this.store.transaction((db) => once(db, actor, key, 'bundle:claim', data, () => {
      check(new Set(data.requestIds).size === data.requestIds.length, '중복된 부탁은 선택할 수 없어요.');
      const requests = data.requestIds.map((id) => get(db.requests, id));
      check(requests.every((request) => request.placeId === requests[0].placeId), '같은 장소의 부탁만 한 번에 지원할 수 있어요.');
      const bundleBase = base();
      const { requestIds, rewards, ...acceptance } = data;
      const offers = requests.map((request) => this.createOffer(db, actor, request.id,
        { ...acceptance, reward: rewards?.[request.id] ?? acceptance.reward, transport: request.transport }, bundleBase.id));
      const bundle = { ...bundleBase, tripId: data.tripId, travelerId: actor, placeId: requests[0].placeId, requestIds, offerIds: offers.map((offer) => offer.id), totalReward: offers.reduce((sum, offer) => sum + offer.reward, 0) };
      db.bundles.push(bundle);
      return bundle;
    }));
  }
  offer(actor: string, key: string | undefined, id: string, input: unknown) {
    const data = parse(offerSchema.strict(), input);
    return this.store.transaction((db) =>
      once(db, actor, key, `offer:${id}`, data, () => this.createOffer(db, actor, id, data)),
    );
  }
  bundle(actor: string, key: string | undefined, input: unknown) {
    const data = parse(
      bundleSchema,
      input,
    );
    return this.store.transaction((db) =>
      once(db, actor, key, 'bundle:create', data, () => {
        check(
          new Set(data.requestIds).size === data.requestIds.length,
          '중복된 요청은 선택할 수 없어요.',
        );
        const requests = data.requestIds.map((id) => get(db.requests, id));
        check(
          requests.every((r) => r.placeId === requests[0].placeId),
          '같은 장소의 요청만 묶을 수 있어요.',
        );
        const b = base();
        const { requestIds, rewards, ...offer } = data;
        const offers = requests.map((request) => this.createOffer(db, actor, request.id,
          { ...offer, reward: rewards?.[request.id] ?? offer.reward, transport: request.transport }, b.id));
        const bundle = {
          ...b,
          tripId: data.tripId,
          travelerId: actor,
          placeId: requests[0].placeId,
          requestIds,
          offerIds: offers.map((o) => o.id),
          totalReward: offers.reduce((s, o) => s + o.reward, 0),
        };
        db.bundles.push(bundle);
        return bundle;
      }),
    );
  }
}
@UseGuards(AuthGuard)
@Controller()
export class RequestsController {
  constructor(private readonly service: RequestsService) {}
  @Get('requests/:id/quote') quote(@Req() r: ActorRequest, @Param('id') id: string) {
    return this.service.paymentQuote(r.actorId, id);
  }
  @Post('requests/:id/pay') pay(@Req() r: ActorRequest, @Headers('idempotency-key') k: string, @Param('id') id: string, @Body() body: unknown) {
    return this.service.pay(r.actorId, k, id, body);
  }
  @Post('requests/:id/cancel') cancel(@Req() r: ActorRequest, @Headers('idempotency-key') k: string, @Param('id') id: string, @Body() body: unknown) {
    return this.service.cancel(r.actorId, k, id, body);
  }
  @Post('requests') create(
    @Req() r: ActorRequest,
    @Headers('idempotency-key') k: string,
    @Body() body: unknown,
  ) {
    return this.service.create(r.actorId, k, body);
  }
  @Post('requests/:id/offers') offer(
    @Req() r: ActorRequest,
    @Headers('idempotency-key') k: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.offer(r.actorId, k, id, body);
  }
  @Post('requests/:id/claim') claim(
    @Req() r: ActorRequest,
    @Headers('idempotency-key') k: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.claim(r.actorId, k, id, body);
  }
  @Post('bundles/offers') bundle(
    @Req() r: ActorRequest,
    @Headers('idempotency-key') k: string,
    @Body() body: unknown,
  ) {
    return this.service.bundle(r.actorId, k, body);
  }
  @Post('bundles/claim') claimBundle(
    @Req() r: ActorRequest,
    @Headers('idempotency-key') k: string,
    @Body() body: unknown,
  ) {
    return this.service.claimBundle(r.actorId, k, body);
  }
}

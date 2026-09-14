import { Body, Controller, Headers, Injectable, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Database, ProductRequest, TravelerOffer, Transaction, quote, recommendedReward, currencyForCountry } from '@moa/domain';
import { Store } from '../infrastructure/store';
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
  art: z.enum(['keyring', 'plush', 'pouch', 'tshirt', 'pin', 'bag']).default('keyring'),
  placeId: z.string(),
  localPrice: localAmount.positive(),
  quantity: z.number().int().min(1).max(10),
  desiredDate: date,
  deliveryCountry: z.enum(['KR', 'JP']).default('KR'),
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
  reward: amount.max(100000),
  estimatedPurchaseDate: date,
  estimatedDeliveryDate: date,
  message: z.string().trim().min(1).max(500),
  transport,
});
export type OfferInput = z.infer<typeof offerSchema>;
@Injectable()
export class RequestsService {
  constructor(private readonly store: Store) {}
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
          status: 'REQUESTED',
          revision: 0,
          directPurchase: 'UNKNOWN',
        };
        const q = quote(request, 1000, request.transport);
        check(
          q.productPrice <= 500000,
          '체험에서는 상품가격 50만원 이하의 요청만 등록할 수 있어요.',
        );
        db.requests.push(request);
        if (data.retryOfRequestId) {
          const previousPartners = new Set(db.transactions.filter((t) => t.requestId === data.retryOfRequestId).map((t) => t.travelerId));
          const recipients = new Set(db.offers.filter((o) => o.requestId === data.retryOfRequestId &&
            o.status !== 'CANCELLED' && o.travelerId !== actor && !previousPartners.has(o.travelerId)).map((o) => o.travelerId));
          for (const userId of recipients) db.notifications.push({
            ...base(), userId, requestId: request.id, read: false,
            title: `이전에 제안한 ‘${request.productName}’ 부탁이 다시 등록됐어요. 가는 길이라면 다시 확인해주세요.`,
          });
        }
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
    check(trip.travelerId === actor, '본인의 여행 일정을 선택해주세요.');
    check(request.requesterId !== actor, '본인이 등록한 부탁은 수락할 수 없어요.');
    check(
      ['REQUESTED', 'OFFER_RECEIVED'].includes(request.status),
      '이미 매칭되었거나 종료된 요청이에요.',
    );
    check(
      trip.placeIds.includes(request.placeId) &&
        trip.destinationCountry === request.country,
      '등록한 방문 장소의 부탁만 수락할 수 있어요.',
    );
    check(
      trip.departureCountry === request.deliveryCountry,
      '구매자가 받을 나라로 돌아오는 일정에서만 수락할 수 있어요.',
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
        data.estimatedDeliveryDate <= request.desiredDate,
      '수령일은 구매 이후이며 요청 기한 안이어야 해요.',
    );
    check(data.transport === request.transport, '구매자가 선택한 전달 방식으로 수락해주세요.');
    check(
      !db.offers.some(
        (o) => o.requestId === request.id && o.travelerId === actor && o.status === 'PENDING',
      ),
      '이미 수락한 부탁이에요.',
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
      reward: recommendedReward(request),
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
      title: '가는 길의 여행자가 부탁을 수락했어요.',
      requestId,
      read: false,
    });
    return offer;
  }
  private matchAccepted(db: Database, actor: string, offer: TravelerOffer) {
    const request = get(db.requests, offer.requestId, '요청');
    const price = quote(request, offer.reward, offer.transport);
    const transaction: Transaction = {
      ...base(), ...price,
      requestId: request.id, offerId: offer.id, travelerId: actor, buyerId: request.requesterId,
      status: 'MATCHED', revision: 0, transport: offer.transport,
      estimatedDeliveryDate: offer.estimatedDeliveryDate,
    };
    db.transactions.push(transaction);
    request.status = 'MATCHED';
    request.revision++;
    offer.status = 'ACCEPTED';
    db.offers.filter((item) => item.requestId === request.id && item.id !== offer.id).forEach((item) => (item.status = 'REJECTED'));
    const room = { ...base(), transactionId: transaction.id, buyerId: request.requesterId, travelerId: actor };
    db.rooms.push(room);
    db.messages.push({ ...base(), roomId: room.id, senderId: actor, text: '여행자가 부탁을 수락했어요. 일정과 구매 정보를 채팅으로 확인해보세요.', system: true });
    db.events.push({ ...base(), actorId: actor, transactionId: transaction.id, type: 'MATCHED', from: 'REQUESTED', to: 'MATCHED', note: '여행자가 부탁을 수락했어요.' });
    return transaction;
  }
  claim(actor: string, key: string | undefined, id: string, input: unknown) {
    const data = parse(offerSchema.strict(), input);
    return this.store.transaction((db) => once(db, actor, key, `claim:${id}`, data, () => {
      const offer = this.createOffer(db, actor, id, data);
      return this.matchAccepted(db, actor, offer);
    }));
  }
  claimBundle(actor: string, key: string | undefined, input: unknown) {
    const data = parse(offerSchema.extend({ requestIds: z.array(z.string()).min(1).max(10) }).strict(), input);
    return this.store.transaction((db) => once(db, actor, key, 'bundle:claim', data, () => {
      check(new Set(data.requestIds).size === data.requestIds.length, '중복된 부탁은 선택할 수 없어요.');
      const requests = data.requestIds.map((id) => get(db.requests, id));
      check(requests.every((request) => request.placeId === requests[0].placeId), '같은 장소의 부탁만 한 번에 수락할 수 있어요.');
      const bundleBase = base();
      const { requestIds, ...acceptance } = data;
      const offers = requestIds.map((id) => this.createOffer(db, actor, id, acceptance, bundleBase.id));
      const transactions = offers.map((offer) => this.matchAccepted(db, actor, offer));
      const bundle = { ...bundleBase, tripId: data.tripId, travelerId: actor, placeId: requests[0].placeId, requestIds, offerIds: offers.map((offer) => offer.id), totalReward: offers.reduce((sum, offer) => sum + offer.reward, 0) };
      db.bundles.push(bundle);
      return { ...bundle, transactions };
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
      offerSchema.extend({ requestIds: z.array(z.string()).min(1).max(10) }).strict(),
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
        const { requestIds, ...offer } = data;
        const offers = requestIds.map((id) => this.createOffer(db, actor, id, offer, b.id));
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

import {
  BadRequestException, Body, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param,
  Post, Query, Req, Res, UnauthorizedException, UseGuards,
  CanActivate, ExecutionContext, ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { Database, Payment, Status, STATUS_LABEL, Transaction } from '@moa/domain';
import { Store } from '../infrastructure/store';

type AdminRole = 'SUPER_ADMIN' | 'OPERATIONS' | 'CUSTOMER_SUPPORT' | 'FINANCE' | 'VIEWER';
type AdminIdentity = { email: string; role: AdminRole };
type AdminRequest = Request & { admin: AdminIdentity };
const roles: AdminRole[] = ['SUPER_ADMIN', 'OPERATIONS', 'CUSTOMER_SUPPORT', 'FINANCE', 'VIEWER'];
const loginSchema = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200), code: z.string().regex(/^\d{6}$/) }).strict();
const listSchema = z.object({
  q: z.string().trim().max(120).default(''),
  status: z.string().default('ALL'),
  issue: z.enum(['ALL', 'PAYMENT_WAIT', 'PURCHASE_DELAY', 'RETURN_DELAY', 'SHIPPING_DELAY', 'SETTLEMENT_DELAY', 'DISPUTED']).default('ALL'),
  sort: z.enum(['created_desc', 'created_asc', 'amount_desc', 'amount_asc']).default('created_desc'),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
const conversationListSchema = z.object({
  q: z.string().trim().max(120).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
const validStatuses = new Set<Status>(['REQUESTED', 'OFFER_RECEIVED', 'MATCHED', 'PAYMENT_HELD', 'PURCHASED', 'TRAVELING', 'SHIPPED', 'DELIVERED', 'CONFIRMED', 'SETTLED', 'CANCELLED', 'DISPUTED']);

function sameText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function verifyPassword(password: string, encoded: string) {
  const [salt, expected] = encoded.split(':');
  if (!salt || !expected || !/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(expected)) return false;
  return sameText(scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex'), expected);
}
function totp(secret: string, period: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(period));
  const digest = createHmac('sha1', Buffer.from(secret, 'hex')).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}
function verifyTotp(code: string, secret: string) {
  if (!/^[a-f0-9]{40,}$/i.test(secret) || secret.length % 2) return false;
  const period = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some((offset) => sameText(code, totp(secret, period + offset)));
}
function cookieValue(request: Request, name: string) {
  const pair = (request.headers.cookie || '').split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return pair?.slice(name.length + 1) || '';
}
function assertSameOrigin(request: Request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  try {
    if (!origin || !host || new URL(origin).host !== host ||
      (request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin'))
      throw new Error('origin mismatch');
  } catch {
    throw new ForbiddenException('관리자 요청 출처를 확인할 수 없습니다.');
  }
}

@Injectable()
export class AdminSessions {
  private readonly sessions = new Map<string, { identity: AdminIdentity; expires: number }>();
  private readonly attempts = new Map<string, { count: number; until: number }>();
  configured() {
    return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_SCRYPT &&
      (process.env.ADMIN_TOTP_SECRET || (process.env.NODE_ENV !== 'production' && /^\d{6}$/.test(process.env.ADMIN_DEV_CODE || ''))));
  }
  login(request: Request, body: unknown) {
    if (!this.configured()) throw new ServiceUnavailableException('관리자 계정이 아직 설정되지 않았습니다.');
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) throw new UnauthorizedException('관리자 로그인 정보를 확인해주세요.');
    const ip = request.ip || 'unknown';
    const now = Date.now();
    const prior = this.attempts.get(ip);
    if (prior && prior.until > now && prior.count >= 5) throw new ForbiddenException('로그인 시도 횟수를 초과했습니다. 15분 뒤 다시 시도해주세요.');
    const { email, password, code } = parsed.data;
    const devCodeValid = process.env.NODE_ENV !== 'production' && /^\d{6}$/.test(process.env.ADMIN_DEV_CODE || '') &&
      sameText(code, process.env.ADMIN_DEV_CODE || '');
    const ok = sameText(email.toLowerCase(), (process.env.ADMIN_EMAIL || '').toLowerCase()) &&
      verifyPassword(password, process.env.ADMIN_PASSWORD_SCRYPT || '') &&
      (devCodeValid || verifyTotp(code, process.env.ADMIN_TOTP_SECRET || ''));
    if (!ok) {
      this.attempts.set(ip, { count: prior && prior.until > now ? prior.count + 1 : 1, until: now + 15 * 60000 });
      throw new UnauthorizedException('관리자 로그인 정보를 확인해주세요.');
    }
    this.attempts.delete(ip);
    const role = roles.includes(process.env.ADMIN_ROLE as AdminRole) ? process.env.ADMIN_ROLE as AdminRole : 'VIEWER';
    const token = randomBytes(32).toString('base64url');
    const identity = { email, role };
    this.sessions.set(token, { identity, expires: now + 8 * 3600000 });
    return { token, identity };
  }
  resolve(request: Request) {
    const token = cookieValue(request, 'moa_admin');
    const session = this.sessions.get(token);
    if (!session || session.expires <= Date.now()) {
      this.sessions.delete(token);
      throw new UnauthorizedException('관리자 세션이 만료됐습니다.');
    }
    return session.identity;
  }
  logout(request: Request) { this.sessions.delete(cookieValue(request, 'moa_admin')); }
}
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly sessions: AdminSessions) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    request.admin = this.sessions.resolve(request);
    return true;
  }
}

const ageHours = (value: string) => (Date.now() - new Date(value).getTime()) / 3600000;
function issueFor(db: Database, transaction: Transaction) {
  if (db.disputes.some((item) => item.transactionId === transaction.id && item.status === 'OPEN')) return 'DISPUTED';
  const events = db.events.filter((item) => item.transactionId === transaction.id);
  const last = [...events].reverse().find((item) => item.to === transaction.status);
  const since = last?.createdAt || transaction.createdAt;
  const trip = db.trips.find((item) => item.id === db.offers.find((offer) => offer.id === transaction.offerId)?.tripId);
  if (transaction.status === 'MATCHED' && ageHours(since) >= 24) return 'PAYMENT_WAIT';
  if (transaction.status === 'PAYMENT_HELD' && ageHours(since) >= 24) return 'PURCHASE_DELAY';
  if (['PURCHASED', 'TRAVELING'].includes(transaction.status) && trip && trip.endDate < new Date().toISOString().slice(0, 10)) return 'RETURN_DELAY';
  if (transaction.status === 'SHIPPED' && ageHours(since) >= 7 * 24) return 'SHIPPING_DELAY';
  if (transaction.status === 'CONFIRMED' && ageHours(since) >= 24) return 'SETTLEMENT_DELAY';
  return 'ALL';
}
const user = (db: Database, id: string) => {
  const item = db.users.find((row) => row.id === id);
  return { id, nickname: item?.nickname || '알 수 없음' };
};
const moneyAccess = (role: AdminRole) => ['SUPER_ADMIN', 'OPERATIONS', 'FINANCE'].includes(role);
const supportAccess = (role: AdminRole) => ['SUPER_ADMIN', 'OPERATIONS', 'CUSTOMER_SUPPORT'].includes(role);
const paymentFor = (db: Database, t: Transaction) => db.payments.find((p) => p.transactionId === t.id);
const shipmentFor = (db: Database, t: Transaction) => db.shipments.find((s) => s.transactionId === t.id);
function rowFor(db: Database, transaction: Transaction, role: AdminRole) {
  const request = db.requests.find((item) => item.id === transaction.requestId);
  const place = db.places.find((item) => item.id === request?.placeId);
  const payment = paymentFor(db, transaction);
  const shipment = shipmentFor(db, transaction);
  const payout = db.payouts.find((item) => item.transactionId === transaction.id);
  return {
    id: transaction.id, createdAt: transaction.createdAt, status: transaction.status,
    statusLabel: STATUS_LABEL[transaction.status], issue: issueFor(db, transaction),
    buyer: user(db, transaction.buyerId), traveler: user(db, transaction.travelerId),
    requestId: transaction.requestId, productName: request?.productName || '상품 정보 없음',
    place: place ? `${place.city} · ${place.name}` : '장소 정보 없음',
    paymentStatus: payment?.status || 'NOT_PAID', shipmentStatus: shipment?.status || 'NOT_SHIPPED',
    settlementStatus: payout?.status || 'NOT_SETTLED', dispute: db.disputes.some((item) => item.transactionId === transaction.id && item.status === 'OPEN'),
    trackingNumber: supportAccess(role) ? shipment?.trackingNumber || null : null,
    amounts: moneyAccess(role) ? { productPrice: transaction.productPrice, travelerReward: transaction.travelerReward, platformFee: transaction.platformFee, shippingFee: transaction.shippingFee, totalPrice: transaction.totalPrice } : null,
  };
}
function conversationRowFor(db: Database, room: Database['rooms'][number]) {
  const transaction = db.transactions.find((item) => item.id === room.transactionId);
  const request = transaction && db.requests.find((item) => item.id === transaction.requestId);
  const messages = db.messages
    .filter((item) => item.roomId === room.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lastMessage = messages[0];
  return {
    id: room.id,
    createdAt: room.createdAt,
    transactionId: room.transactionId,
    transactionStatus: transaction?.status || 'UNKNOWN',
    productName: request?.productName || '상품 정보 없음',
    buyer: user(db, room.buyerId),
    traveler: user(db, room.travelerId),
    messageCount: messages.length,
    lastMessage: lastMessage ? {
      createdAt: lastMessage.createdAt,
      sender: user(db, lastMessage.senderId),
      text: lastMessage.system ? '시스템 안내 메시지' : lastMessage.text,
      system: lastMessage.system,
    } : null,
  };
}

type SeoulDate = { year: number; month: number; day: number };
type PeriodPaymentSource = Pick<Payment, 'createdAt' | 'status' | 'amount'>;
const seoulDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});
function seoulDate(value: Date): SeoulDate | null {
  if (Number.isNaN(value.getTime())) return null;
  const values = Object.fromEntries(seoulDateFormatter.formatToParts(value)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day) ? { year, month, day } : null;
}
function periodTransactionMetrics(rows: PeriodPaymentSource[], canViewMoney: boolean, now = new Date()) {
  const current = seoulDate(now);
  const periods = [
    { key: 'today' as const, label: '오늘', periodLabel: current ? `${current.month}월 ${current.day}일` : '오늘', matches: (date: SeoulDate) => !!current && date.year === current.year && date.month === current.month && date.day === current.day },
    { key: 'month' as const, label: '이번 달', periodLabel: current ? `${current.year}년 ${current.month}월` : '이번 달', matches: (date: SeoulDate) => !!current && date.year === current.year && date.month === current.month },
    { key: 'year' as const, label: '올해', periodLabel: current ? `${current.year}년` : '올해', matches: (date: SeoulDate) => !!current && date.year === current.year },
  ];
  return Object.fromEntries(periods.map((period) => {
    const transactions = rows.filter((row) => {
      if (row.status === 'REFUNDED') return false;
      const createdAt = seoulDate(new Date(row.createdAt));
      return !!createdAt && period.matches(createdAt);
    });
    return [period.key, {
      label: period.label,
      periodLabel: period.periodLabel,
      transactionCount: transactions.length,
      transactionAmount: canViewMoney ? transactions.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0) : null,
    }];
  })) as { today: { label: string; periodLabel: string; transactionCount: number; transactionAmount: number | null }; month: { label: string; periodLabel: string; transactionCount: number; transactionAmount: number | null }; year: { label: string; periodLabel: string; transactionCount: number; transactionAmount: number | null } };
}

@Controller('admin')
export class AdminController {
  constructor(private readonly sessions: AdminSessions, private readonly store: Store) {}

  @Post('login') login(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown) {
    assertSameOrigin(request);
    const { token, identity } = this.sessions.login(request, body);
    response.cookie('moa_admin', token, { httpOnly: true, sameSite: 'strict', secure: request.secure || request.headers['x-forwarded-proto'] === 'https' || request.headers.origin?.startsWith('https://'), path: '/api/admin', maxAge: 8 * 3600000 });
    return { admin: identity, mode: 'demo-readonly' };
  }

  @UseGuards(AdminGuard) @Get('me') me(@Req() request: AdminRequest) {
    return { admin: request.admin, mode: 'demo-readonly' };
  }

  @UseGuards(AdminGuard) @Post('logout') logout(@Req() request: AdminRequest, @Res({ passthrough: true }) response: Response) {
    assertSameOrigin(request);
    this.sessions.logout(request);
    response.clearCookie('moa_admin', { path: '/api/admin' });
    return { ok: true };
  }

  @UseGuards(AdminGuard) @Get('dashboard') dashboard(@Req() request: AdminRequest) {
    return this.store.read((db) => {
      const generatedAt = new Date();
      const today = generatedAt.toISOString().slice(0, 10);
      const rows = db.transactions.map((t) => rowFor(db, t, request.admin.role));
      const issueKinds = ['PAYMENT_WAIT', 'PURCHASE_DELAY', 'RETURN_DELAY', 'SHIPPING_DELAY', 'SETTLEMENT_DELAY', 'DISPUTED'] as const;
      const stage = (status: Status) => db.transactions.filter((t) => t.status === status || db.events.some((event) => event.transactionId === t.id && event.to === status)).length;
      return {
        generatedAt: generatedAt.toISOString(), mode: 'demo-readonly',
        kpis: {
          newUsersToday: db.users.filter((u) => u.createdAt.slice(0, 10) === today).length,
          newRequestsToday: db.requests.filter((r) => r.createdAt.slice(0, 10) === today).length,
          matchedToday: db.events.filter((e) => e.to === 'MATCHED' && e.createdAt.slice(0, 10) === today).length,
          activeTransactions: db.transactions.filter((t) => !['SETTLED', 'CANCELLED'].includes(t.status)).length,
          shippedToday: db.events.filter((e) => e.to === 'SHIPPED' && e.createdAt.slice(0, 10) === today).length,
          openDisputes: db.disputes.filter((d) => d.status === 'OPEN').length,
          gmv: moneyAccess(request.admin.role) ? db.payments.filter((p) => p.status !== 'REFUNDED').reduce((sum, p) => sum + p.amount, 0) : null,
          settled: moneyAccess(request.admin.role) ? db.payouts.reduce((sum, p) => sum + p.amount, 0) : null,
        },
        periodTransactions: periodTransactionMetrics(db.payments, moneyAccess(request.admin.role), generatedAt),
        funnel: [
          { key: 'REQUESTED', label: '요청 등록', count: db.requests.length },
          { key: 'MATCHED', label: '매칭', count: stage('MATCHED') },
          { key: 'PAYMENT_HELD', label: '모의 결제', count: stage('PAYMENT_HELD') },
          { key: 'PURCHASED', label: '구매 인증', count: stage('PURCHASED') },
          { key: 'TRAVELING', label: '귀국 준비', count: stage('TRAVELING') },
          { key: 'SHIPPED', label: '국내 전달', count: stage('SHIPPED') },
          { key: 'CONFIRMED', label: '수령 확정', count: stage('CONFIRMED') },
          { key: 'SETTLED', label: '모의 정산', count: stage('SETTLED') },
        ],
        alerts: issueKinds.map((key) => ({ key, count: rows.filter((row) => row.issue === key).length })),
        recent: rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
      };
    });
  }

  @UseGuards(AdminGuard) @Get('transactions') transactions(@Req() request: AdminRequest, @Query() raw: Record<string, unknown>) {
    const parsed = listSchema.safeParse(raw);
    if (!parsed.success || (parsed.data.status !== 'ALL' && !validStatuses.has(parsed.data.status as Status))) throw new BadRequestException('검색 조건을 확인해주세요.');
    const filter = parsed.data;
    if (filter.from && filter.to && filter.from > filter.to) throw new BadRequestException('조회 시작일은 종료일보다 늦을 수 없습니다.');
    if (!moneyAccess(request.admin.role) && filter.sort.startsWith('amount_')) throw new ForbiddenException('금액 정렬 권한이 없습니다.');
    return this.store.read((db) => {
      let rows = db.transactions.map((t) => rowFor(db, t, request.admin.role));
      if (filter.status !== 'ALL') rows = rows.filter((row) => row.status === filter.status);
      if (filter.issue !== 'ALL') rows = rows.filter((row) => row.issue === filter.issue);
      if (filter.from) rows = rows.filter((row) => row.createdAt.slice(0, 10) >= filter.from!);
      if (filter.to) rows = rows.filter((row) => row.createdAt.slice(0, 10) <= filter.to!);
      if (filter.q) {
        const needle = filter.q.toLocaleLowerCase();
        rows = rows.filter((row) => [row.id, row.requestId, row.buyer.id, row.buyer.nickname, row.traveler.id, row.traveler.nickname, row.productName, row.place, row.trackingNumber || ''].some((value) => value.toLocaleLowerCase().includes(needle)));
      }
      rows.sort((a, b) => filter.sort === 'created_asc' ? a.createdAt.localeCompare(b.createdAt) : filter.sort === 'amount_desc' ? (b.amounts?.totalPrice || 0) - (a.amounts?.totalPrice || 0) : filter.sort === 'amount_asc' ? (a.amounts?.totalPrice || 0) - (b.amounts?.totalPrice || 0) : b.createdAt.localeCompare(a.createdAt));
      return { total: rows.length, page: filter.page, size: filter.size, rows: rows.slice((filter.page - 1) * filter.size, filter.page * filter.size) };
    });
  }

  /**
   * Conversation content is deliberately limited to support-facing roles. It
   * is read-only and can only be reached after the existing TOTP admin login.
   * Finance and viewer roles keep their least-privilege access to transaction
   * records without private chat content.
   */
  @UseGuards(AdminGuard) @Get('conversations') conversations(@Req() request: AdminRequest, @Query() raw: Record<string, unknown>) {
    if (!supportAccess(request.admin.role)) throw new ForbiddenException('대화 내용은 고객 지원 권한에서만 확인할 수 있습니다.');
    const parsed = conversationListSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('검색 조건을 확인해주세요.');
    const filter = parsed.data;
    return this.store.read((db) => {
      let rows = db.rooms.map((room) => conversationRowFor(db, room));
      if (filter.q) {
        const needle = filter.q.toLocaleLowerCase();
        // Do not make message bodies globally searchable in the operations
        // console. Operators can inspect a selected support case instead.
        rows = rows.filter((row) => [
          row.id, row.transactionId, row.productName,
          row.buyer.id, row.buyer.nickname, row.traveler.id, row.traveler.nickname,
        ].some((value) => value.toLocaleLowerCase().includes(needle)));
      }
      rows.sort((a, b) => (b.lastMessage?.createdAt || b.createdAt).localeCompare(a.lastMessage?.createdAt || a.createdAt));
      return { total: rows.length, page: filter.page, size: filter.size, rows: rows.slice((filter.page - 1) * filter.size, filter.page * filter.size) };
    });
  }

  @UseGuards(AdminGuard) @Get('conversations/:id') conversation(@Req() request: AdminRequest, @Param('id') id: string) {
    if (!supportAccess(request.admin.role)) throw new ForbiddenException('대화 내용은 고객 지원 권한에서만 확인할 수 있습니다.');
    return this.store.read((db) => {
      const room = db.rooms.find((item) => item.id === id);
      if (!room) throw new NotFoundException('대화 세션을 찾을 수 없습니다.');
      const row = conversationRowFor(db, room);
      return {
        ...row,
        messages: db.messages.filter((item) => item.roomId === room.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((item) => ({
            id: item.id,
            createdAt: item.createdAt,
            sender: user(db, item.senderId),
            text: item.text,
            system: item.system,
          })),
      };
    });
  }

  @UseGuards(AdminGuard) @Get('transactions/:id') transaction(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.store.read((db) => {
      const t = db.transactions.find((item) => item.id === id);
      if (!t) throw new NotFoundException('거래를 찾을 수 없습니다.');
      const role = request.admin.role;
      const offer = db.offers.find((item) => item.id === t.offerId);
      const trip = db.trips.find((item) => item.id === offer?.tripId);
      const requestRow = db.requests.find((item) => item.id === t.requestId);
      const place = db.places.find((item) => item.id === requestRow?.placeId);
      const payment = paymentFor(db, t);
      const escrow = db.escrows.find((item) => item.transactionId === id);
      const receipt = db.receipts.find((item) => item.transactionId === id);
      const shipment = shipmentFor(db, t);
      const payout = db.payouts.find((item) => item.transactionId === id);
      const dispute = db.disputes.find((item) => item.transactionId === id);
      const room = db.rooms.find((item) => item.transactionId === id);
      const timeline = [
        ...(requestRow ? [{ id: `request-${requestRow.id}`, createdAt: requestRow.createdAt, type: 'REQUESTED', from: null, to: 'REQUESTED', actor: user(db, requestRow.requesterId), note: '구매자가 요청을 등록했습니다.', source: 'request' }] : []),
        ...db.events.filter((item) => item.transactionId === id).map((event) => ({ id: event.id, createdAt: event.createdAt, type: event.type, from: event.from || null, to: event.to || null, actor: user(db, event.actorId), note: event.note, source: 'event' })),
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const chat = supportAccess(role) && room ? db.messages.filter((item) => item.roomId === room.id).map((item) => ({ id: item.id, createdAt: item.createdAt, sender: user(db, item.senderId), text: item.text, system: item.system })) : null;
      const money = moneyAccess(role);
      return {
        ...rowFor(db, t, role),
        estimatedDeliveryDate: t.estimatedDeliveryDate,
        buyerFacingStatus: STATUS_LABEL[t.status], travelerFacingStatus: STATUS_LABEL[t.status],
        timeline,
        product: requestRow ? { name: requestRow.productName, url: requestRow.productUrl, image: supportAccess(role) ? requestRow.productImage : null, option: requestRow.option, quantity: requestRow.quantity, localPrice: money ? requestRow.localPrice : null, currency: requestRow.currency, store: requestRow.storeName, desiredDate: requestRow.desiredDate, category: requestRow.category, place: place ? { name: place.name, city: place.city, country: place.country } : null } : null,
        trip: trip ? { id: trip.id, from: `${trip.departureCity} · ${trip.departureCountry}`, to: `${trip.destinationCity} · ${trip.destinationCountry}`, startDate: trip.startDate, endDate: trip.endDate, verificationStatus: trip.verificationStatus, visits: db.destinations.filter((item) => item.tripId === trip.id).sort((a, b) => a.sequence - b.sequence).map((item) => ({ date: item.visitDate, time: item.visitTime, place: db.places.find((place) => place.id === item.placeId)?.name || item.placeId })) } : null,
        payment: payment ? { id: payment.id, status: payment.status, provider: payment.provider, providerRef: payment.providerRef, amount: money ? payment.amount : null, createdAt: payment.createdAt, escrowStatus: escrow?.status || null } : null,
        receipt: receipt ? { outcome: receipt.outcome, store: receipt.storeName, purchasedAt: receipt.purchasedAt, localAmount: money ? receipt.localAmount : null, currency: receipt.currency, locationNote: receipt.locationNote, productImage: supportAccess(role) ? receipt.productImage : null, receiptImage: supportAccess(role) ? receipt.receiptImage : null, unavailableReason: receipt.unavailableReason || null, unavailableNote: receipt.unavailableNote || null, createdAt: receipt.createdAt } : null,
        shipment: shipment ? { id: shipment.id, carrier: shipment.carrier, trackingNumber: supportAccess(role) ? shipment.trackingNumber : null, transport: shipment.transport, status: shipment.status, createdAt: shipment.createdAt } : null,
        payout: payout ? { id: payout.id, status: payout.status, reimbursement: money ? payout.reimbursement : null, reward: money ? payout.reward : null, commission: money ? payout.platformCommission : null, amount: money ? payout.amount : null, createdAt: payout.createdAt } : null,
        walletEntries: money ? db.walletTransactions.filter((item) => item.transactionId === id).map((item) => ({ id: item.id, type: item.type, amount: item.amount, status: item.status, createdAt: item.createdAt })) : null,
        dispute: dispute ? { id: dispute.id, reason: supportAccess(role) ? dispute.reason : null, status: dispute.status, openedBy: user(db, dispute.openedBy), createdAt: dispute.createdAt } : null,
        chat,
        adminActions: [],
        dataLimits: ['모의 결제·정산 데이터', '배송사 실시간 추적 미연결', '항공편 실시간 귀국 확인 미연결', '관리자 조치/메모 기능 미연결'],
      };
    });
  }
}

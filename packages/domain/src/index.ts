export type Role = 'buyer' | 'traveler';
import { Currency, Country, DEMO_FX_RATES, CURRENCY_SYMBOLS } from './destinations';
export * from './destinations';
export type Status =
  | 'PAYMENT_PENDING'
  | 'REQUESTED'
  | 'OFFER_RECEIVED'
  | 'MATCHED'
  | 'PAYMENT_HELD'
  | 'PURCHASED'
  | 'TRAVELING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'SETTLED'
  | 'CANCELLED'
  | 'DISPUTED';
export type Transport = 'DOMESTIC_PARCEL' | 'MEETUP';
export const DOMESTIC_PARCEL_FEE = 3500;
export const MAX_DEMO_REWARD = 2_000_000;
export const rewardCommission = (reward: number) => Math.round(reward * 0.1);
/** Compatibility for old saved requests; never exposes a cross-border shipping option. */
export const normalizeTransport = (value: unknown): Transport =>
  value === 'MEETUP' ? 'MEETUP' : 'DOMESTIC_PARCEL';
export type Category = 'CHARACTER' | 'GAME' | 'POPUP' | 'LOCAL' | 'FASHION' | 'CONCERT';
export type Art = 'keyring' | 'plush' | 'pouch' | 'tshirt' | 'pin' | 'bag';
export interface Entity {
  id: string;
  createdAt: string;
}
export interface User extends Entity {
  nickname: string;
  avatarColor: string;
  /** Public profile image in the prototype; optional for older saved users. */
  avatarImage?: string;
  initials: string;
  bio: string;
  /** Only new social accounts must finish the first-login profile form. */
  profileCompleted?: boolean;
  completed: number;
  successRate: number | null;
  responseMinutes: number;
  lastActive: string;
  verificationLabels: string[];
}
export const PROFILE_AVATAR_COLORS = [
  '#E8EDDF', '#DFEED6', '#E6DFF6', '#F7E4BD', '#D9EAF5', '#EAF2FF', '#FCE8E4',
] as const;
export interface UserVerification extends Entity {
  userId: string;
  kind: 'PHONE' | 'ACCOUNT' | 'IDENTITY' | 'TRIP';
  status: 'DEMO_VERIFIED' | 'PENDING' | 'EXPIRED';
  providerRef: string;
  method?: 'PASS' | 'SMS';
}
export type AuthProvider = 'DEMO' | 'PHONE' | 'KAKAO' | 'NAVER' | 'GOOGLE' | 'APPLE';
export interface AuthIdentity extends Entity {
  userId: string;
  provider: AuthProvider;
  providerUserId: string;
  status: 'DEMO_LINKED' | 'LINKED' | 'DISABLED';
}
export interface Place extends Entity {
  name: string;
  englishName: string;
  country: Country;
  city: string;
  region: string;
  description: string;
  tags: string[];
  latitude: number;
  longitude: number;
  visitors: number;
  requestCount: number;
  recentTrades: number;
  averageReward: number;
  theme: string;
  photo: string;
  extraMinutes: number;
}
export interface Store extends Entity {
  placeId: string;
  name: string;
  address: string;
}
export interface Trip extends Entity {
  travelerId: string;
  departureCountry: Country;
  departureCity: string;
  destinationCountry: Country;
  destinationCity: string;
  /** Same-country multi-city/island selections retained by the existing request matcher. */
  destinationAreas?: string[];
  startDate: string;
  endDate: string;
  placeIds: string[];
  customStops?: string[];
  maxItems: number;
  verificationStatus: 'DEMO_VERIFIED' | 'UNVERIFIED' | 'PENDING_REVIEW' | 'NEEDS_REVIEW';
  flightProof?: FlightProof;
}
export interface FlightLeg {
  from: string;
  to: string;
  flightNumber: string;
  date: string | null;
  dayOfYear: number | null;
}
export interface FlightProof {
  checkedAt: string;
  outbound: FlightLeg[];
  inbound: FlightLeg[];
  source: 'BARCODE' | 'OCR' | 'MIXED';
  issues: string[];
  itineraryMatches: boolean;
}
// Only the pre-existing, explicitly labelled synthetic fixtures may bypass the
// unconnected airline/identity verification provider in this prototype.
export const canAcceptTrip = (trip?: Trip) => Boolean(trip && trip.verificationStatus === 'DEMO_VERIFIED' &&
  trip.id === `trip-${trip.travelerId}` && trip.endDate >= new Date().toISOString().slice(0, 10));
export const TRIP_VERIFICATION_LABEL: Record<Trip['verificationStatus'], string> = {
  DEMO_VERIFIED: '여행 일정 예시 인증', UNVERIFIED: '왕복 항공권 인증 필요',
  PENDING_REVIEW: '일정 대조 완료 · 발권 확인 대기', NEEDS_REVIEW: '항공권 정보 재확인 필요',
};
export interface TripDestination extends Entity {
  tripId: string;
  placeId: string;
  visitDate: string;
  visitTime: string;
  sequence: number;
}
export interface Product extends Entity {
  name: string;
  image: string;
  art: Art;
  category: Category;
  localPrice: number;
  currency: Currency;
  placeId: string;
  url?: string;
}
export interface ProductRequest extends Entity {
  originalText?: ProductOriginalText;
  requesterId: string;
  productName: string;
  productUrl: string;
  productImage: string;
  art: Art;
  storeName: string;
  placeId: string;
  country: Country;
  city: string;
  localPrice: number;
  /** True when the amount was suggested from product/location context rather than a visible price. */
  localPriceEstimated?: boolean;
  currency: Currency;
  quantity: number;
  /** Buyer-selected traveler reward. Undefined only for old saved requests. */
  requestedReward?: number;
  desiredDate: string;
  deliveryCountry: Country;
  deliveryCity: string;
  category: Category;
  option: string;
  status: Status;
  revision: number;
  directPurchase: 'UNKNOWN' | 'OFFLINE_ONLY';
  transport: Transport;
  deliveryAddressId?: string;
  deliveryRecipient?: string;
  deliveryPhone?: string;
  deliveryPostalCode?: string;
  deliveryAddress1?: string;
  deliveryAddress2?: string;
  meetupLocation?: string;
  meetupPoint?: MeetupPoint;
  retryOfRequestId?: string;
  inventoryStatus?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'CHECK_REQUIRED';
  /** AI-derived product context retained for review and later validation. */
  brandName?: string;
  recognizedCurrency?: Currency | null;
  availability?: ProductAvailability;
  stores?: ProductStore[];
  recognizedLocation?: RecognizedLocation;
  locationSource?: 'AI_RECOGNIZED' | 'USER_SELECTED';
  locationMismatch?: boolean;
}
export interface ProductStore {
  name: string;
  country?: Country | null;
  countryCode?: Country | null;
  city?: string;
  district?: string;
}
export interface ProductAvailability {
  countryCode?: Country | null;
  countryName?: string;
  city?: string;
  district?: string;
  placeId?: string | null;
  isLocationLimited: boolean;
  limitedType?: 'COUNTRY' | 'CITY' | 'DISTRICT' | 'STORE' | null;
  limitedLabel?: string;
}
export interface RecognizedLocation {
  countryCode?: Country | null;
  countryName?: string;
  city?: string;
  district?: string;
  placeId?: string | null;
  storeName?: string;
  purchaseLocation?: string;
}
export interface MeetupPoint {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  detail: string;
  providerId?: string;
}
export interface ProductOriginalText {
  productName: string;
  storeName: string;
  purchaseLocation: string;
  option: string;
}
export interface UserAddress extends Entity {
  userId: string;
  label: string;
  recipient: string;
  phone: string;
  postalCode: string;
  address1: string;
  address2: string;
  isDefault: boolean;
}
export interface TravelerOffer extends Entity {
  requestId: string;
  travelerId: string;
  tripId: string;
  reward: number;
  estimatedPurchaseDate: string;
  estimatedDeliveryDate: string;
  message: string;
  transport: Transport;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  bundleId?: string;
}
export interface BundleRequest extends Entity {
  tripId: string;
  travelerId: string;
  placeId: string;
  requestIds: string[];
  offerIds: string[];
  totalReward: number;
}
export interface Price {
  productPrice: number;
  travelerReward: number;
  platformFee: number;
  shippingFee: number;
  taxReserve: number;
  totalPrice: number;
  fxRate: number;
  priceSource: 'DEMO_FIXED' | 'DAILY_REFERENCE' | 'PROVIDER_LATEST' | 'KRW_PARITY';
  fxAsOf?: string;
}
export interface FxRate {
  currency: Currency;
  krwPerUnit: number;
  source: Price['priceSource'];
  asOf?: string;
}
export interface Transaction extends Entity, Price {
  /** True only when the buyer funded this request before selecting an applicant. */
  prepaid?: boolean;
  requestId: string;
  offerId: string;
  travelerId: string;
  buyerId: string;
  status: Status;
  revision: number;
  transport: Transport;
  estimatedDeliveryDate: string;
}
/** A buyer's prepaid quote, before any traveler is selected. No real funds in demo. */
export interface RequestFunding extends Entity, Price {
  requestId: string;
  buyerId: string;
  status: 'HELD' | 'MATCHED' | 'REFUNDED';
  provider: 'MOCK_CARD' | 'MOCK_EASY_PAY';
  providerRef: string;
  paymentMethodId: string;
  transactionId?: string;
}
export interface Payment extends Entity {
  transactionId: string;
  buyerId: string;
  amount: number;
  provider: 'MOCK_CARD' | 'MOCK_EASY_PAY' | 'MOCK_WALLET';
  paymentMethodId: string;
  status: 'HELD' | 'REFUNDED' | 'RELEASED';
  providerRef: string;
}
export type PaymentMethodType = 'CARD' | 'EASY_PAY' | 'WALLET';
export interface PaymentMethod extends Entity {
  userId: string;
  type: PaymentMethodType;
  provider: 'MOCK_CARD' | 'MOCK_KAKAO_PAY' | 'MOA_WALLET';
  label: string;
  last4?: string;
  isDefault: boolean;
  status: 'DEMO_ONLY';
}
export interface Escrow extends Entity {
  transactionId: string;
  amount: number;
  holder: 'MOCK_LEDGER';
  status: 'HELD' | 'FROZEN' | 'RELEASED' | 'REFUNDED';
}
export interface Receipt extends Entity {
  transactionId: string;
  travelerId: string;
  outcome: 'PURCHASED' | 'OUT_OF_STOCK';
  productImage: string;
  receiptImage: string;
  storeName: string;
  purchasedAt: string;
  localAmount: number;
  currency: Currency;
  locationNote: string;
  unavailableReason?: 'OUT_OF_STOCK' | 'STORE_CLOSED' | 'PRODUCT_NOT_FOUND' | 'PURCHASE_LIMIT';
  unavailableNote?: string;
}
export interface Shipment extends Entity {
  transactionId: string;
  transport: Transport;
  carrier: string;
  trackingNumber: string;
  status: 'SHIPPED' | 'DELIVERED';
}
export interface ChatRoom extends Entity {
  transactionId: string;
  buyerId: string;
  travelerId: string;
}
export interface Message extends Entity {
  roomId: string;
  senderId: string;
  text: string;
  system: boolean;
}
export interface Review extends Entity {
  transactionId: string;
  authorId: string;
  targetId: string;
  rating: number;
  text: string;
}
export interface Notification extends Entity {
  userId: string;
  title: string;
  transactionId?: string;
  requestId?: string;
  read: boolean;
}
export interface Payout extends Entity {
  transactionId: string;
  travelerId: string;
  reimbursement: number;
  reward: number;
  platformCommission: number;
  netReward: number;
  shippingReimbursement: number;
  amount: number;
  status: 'MOCK_SETTLED';
  providerRef: string;
}
export interface Wallet extends Entity {
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  withdrawalPending: number;
  currency: 'KRW';
  mode: 'DEMO';
}
export type WalletTransactionType =
  | 'TOP_UP'
  | 'PAYMENT'
  | 'TRAVELER_REWARD'
  | 'REFUND'
  | 'WITHDRAWAL'
  | 'ADJUSTMENT';
export interface WalletTransaction extends Entity {
  walletId: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  title: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  transactionId?: string;
  payoutId?: string;
  withdrawalId?: string;
}
export interface PayoutAccount extends Entity {
  userId: string;
  bankName: string;
  accountLast4: string;
  holderName: string;
  status: 'DEMO_VERIFIED' | 'PENDING';
  providerRef: string;
}
export interface Withdrawal extends Entity {
  userId: string;
  walletId: string;
  payoutAccountId: string;
  amount: number;
  status: 'PROCESSING' | 'MOCK_COMPLETED' | 'FAILED';
  providerRef: string;
}
export interface Dispute extends Entity {
  transactionId: string;
  openedBy: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
}
export interface FavoritePlace extends Entity {
  userId: string;
  placeId: string;
}
export interface SearchHistory extends Entity {
  userId: string;
  query: string;
}
export interface AuditEvent extends Entity {
  actorId: string;
  transactionId?: string;
  type: string;
  from?: Status;
  to?: Status;
  note: string;
}
export interface Command extends Entity {
  actorId: string;
  key: string;
  operation: string;
  fingerprint: string;
  result: unknown;
}
export interface Database {
  users: User[];
  authIdentities: AuthIdentity[];
  addresses: UserAddress[];
  verifications: UserVerification[];
  places: Place[];
  stores: Store[];
  trips: Trip[];
  destinations: TripDestination[];
  products: Product[];
  requests: ProductRequest[];
  offers: TravelerOffer[];
  bundles: BundleRequest[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  payments: Payment[];
  requestFundings: RequestFunding[];
  escrows: Escrow[];
  receipts: Receipt[];
  shipments: Shipment[];
  rooms: ChatRoom[];
  messages: Message[];
  reviews: Review[];
  notifications: Notification[];
  payouts: Payout[];
  wallets: Wallet[];
  walletTransactions: WalletTransaction[];
  payoutAccounts: PayoutAccount[];
  withdrawals: Withdrawal[];
  disputes: Dispute[];
  favorites: FavoritePlace[];
  searches: SearchHistory[];
  events: AuditEvent[];
  commands: Command[];
}
export type Snapshot = Omit<Database, 'commands' | 'verifications' | 'authIdentities'> & {
  recognition?: { image: boolean; sample: boolean; link: boolean };
  verificationSummary: {
    phone: boolean;
    identity: boolean;
    account: boolean;
    trip: boolean;
    demoOnly: boolean;
  };
  me: User;
  mode: 'demo';
  serverDate: string;
};
export interface BundleSuggestion {
  place: Place;
  requests: ProductRequest[];
  advance: number;
  items: number;
  extraMinutes: number;
  timeSource: 'DEMO_ESTIMATE';
}
export const CATEGORIES: Record<Category, string> = {
  CHARACTER: '캐릭터 굿즈',
  GAME: '게임·애니',
  POPUP: '팝업 상품',
  LOCAL: '지역 한정',
  FASHION: '패션 잡화',
  CONCERT: '콘서트 MD',
};
export const STATUS_LABEL: Record<Status, string> = {
  PAYMENT_PENDING: '결제 후 공개돼요',
  REQUESTED: '여행자의 지원을 기다려요',
  OFFER_RECEIVED: '여행자가 손들었어요',
  MATCHED: '이전 거래 · 결제 대기',
  PAYMENT_HELD: '매칭 완료 · 구매 준비 중',
  PURCHASED: '구매를 마쳤어요',
  TRAVELING: '한국으로 오고 있어요',
  SHIPPED: '배송 중이에요',
  DELIVERED: '수령했어요',
  CONFIRMED: '구매가 확정됐어요',
  SETTLED: '정산을 마쳤어요',
  CANCELLED: '취소됐어요',
  DISPUTED: '문제를 확인 중이에요',
};
export const TRANSPORT_LABEL: Record<Transport, string> = {
  DOMESTIC_PARCEL: '국내 택배',
  MEETUP: '직접 전달',
};
export const money = (v: number) => `₩${Math.round(v).toLocaleString('ko-KR')}`;
export const localMoney = (v: number, c: Currency) =>
  `${CURRENCY_SYMBOLS[c]}${v.toLocaleString('ko-KR')}`;
export const shortDate = (s: string) => {
  const m = s.slice(0, 10).split('-');
  return `${Number(m[1])}.${Number(m[2])}`;
};
export function quote(
  request: Pick<ProductRequest, 'localPrice' | 'quantity' | 'currency'>,
  reward: number,
  transport: Transport,
  rate?: Pick<FxRate, 'krwPerUnit' | 'source' | 'asOf'>,
): Price {
  const fxRate = rate?.krwPerUnit ?? DEMO_FX_RATES[request.currency];
  const productPrice = Math.round(request.localPrice * request.quantity * fxRate);
  const shippingFee = normalizeTransport(transport) === 'MEETUP' ? 0 : DOMESTIC_PARCEL_FEE;
  return {
    productPrice,
    travelerReward: reward,
    platformFee: 0,
    shippingFee,
    taxReserve: 0,
    totalPrice: productPrice + reward + shippingFee,
    fxRate,
    priceSource: rate?.source ?? 'DEMO_FIXED',
    ...(rate?.asOf ? { fxAsOf: rate.asOf } : {}),
  };
}
/** Round the commission per transaction, then subtract; never round both sides independently. */
export function travelerEarnings(reward: number) {
  const platformCommission = rewardCommission(reward);
  return { platformCommission, netReward: reward - platformCommission };
}
export function groupForTrip(
  db: Pick<Database, 'places' | 'requests' | 'offers'> & Partial<Pick<Database, 'requestFundings'>>,
  trip: Trip,
): BundleSuggestion[] {
  if (trip.endDate < new Date().toISOString().slice(0, 10)) return [];
  return db.places
    .filter(
      (p) =>
        trip.placeIds.includes(p.id) &&
        p.country === trip.destinationCountry,
    )
    .map((place) => {
      const requests = db.requests.filter(
        (r) =>
          r.placeId === place.id &&
          r.requesterId !== trip.travelerId &&
          r.deliveryCountry === trip.departureCountry &&
          (r.transport !== 'MEETUP' || r.deliveryCity === trip.departureCity) &&
          ['REQUESTED', 'OFFER_RECEIVED'].includes(r.status) &&
          r.desiredDate >= trip.endDate &&
          !db.offers.some(
            (o) =>
              o.requestId === r.id && o.travelerId === trip.travelerId && o.status === 'PENDING',
          ),
      );
      return {
        place,
        requests,
        advance: requests.reduce((s, r) => s + (db.requestFundings?.find((f) => f.requestId === r.id)?.productPrice
          ?? quote(r, 0, r.transport).productPrice), 0),
        items: requests.reduce((s, r) => s + r.quantity, 0),
        extraMinutes: place.extraMinutes,
        timeSource: 'DEMO_ESTIMATE' as const,
      };
    })
    .filter((b) => b.requests.length > 0)
    .sort((a, b) => a.extraMinutes - b.extraMinutes);
}
export const TIMELINE: Status[] = [
  'MATCHED',
  'PAYMENT_HELD',
  'PURCHASED',
  'TRAVELING',
  'SHIPPED',
  'DELIVERED',
  'CONFIRMED',
  'SETTLED',
];
export const TIMELINE_LABEL: Partial<Record<Status, string>> = {
  MATCHED: '여행자가 정해졌어요',
  PAYMENT_HELD: '결제금을 안전하게 보관했어요',
  PURCHASED: '상품을 구매했어요',
  TRAVELING: '한국으로 오고 있어요',
  SHIPPED: '상품이 배송 중이에요',
  DELIVERED: '상품을 수령했어요',
  CONFIRMED: '수령과 구매를 확정했어요',
  SETTLED: '여행자 정산이 완료됐어요',
};

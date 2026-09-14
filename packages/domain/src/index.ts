export type Role = 'buyer' | 'traveler';
import { Currency, Country, DEMO_FX_RATES, CURRENCY_SYMBOLS } from './destinations';
export * from './destinations';
export type Status =
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
  initials: string;
  bio: string;
  completed: number;
  successRate: number | null;
  responseMinutes: number;
  lastActive: string;
  verificationLabels: string[];
}
export interface UserVerification extends Entity {
  userId: string;
  kind: 'PHONE' | 'ACCOUNT' | 'IDENTITY' | 'TRIP';
  status: 'DEMO_VERIFIED' | 'PENDING';
  providerRef: string;
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
  startDate: string;
  endDate: string;
  placeIds: string[];
  maxItems: number;
  verificationStatus: 'DEMO_VERIFIED' | 'UNVERIFIED';
}
export interface TripDestination extends Entity {
  tripId: string;
  placeId: string;
  visitDate: string;
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
  currency: Currency;
  quantity: number;
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
  priceSource: 'DEMO_FIXED';
}
export interface Transaction extends Entity, Price {
  requestId: string;
  offerId: string;
  travelerId: string;
  buyerId: string;
  status: Status;
  revision: number;
  transport: Transport;
  estimatedDeliveryDate: string;
}
export interface Payment extends Entity {
  transactionId: string;
  buyerId: string;
  amount: number;
  provider: 'MOCK';
  status: 'HELD' | 'REFUNDED' | 'RELEASED';
  providerRef: string;
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
  productImage: string;
  receiptImage: string;
  storeName: string;
  purchasedAt: string;
  localAmount: number;
  currency: Currency;
  locationNote: string;
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
  payments: Payment[];
  escrows: Escrow[];
  receipts: Receipt[];
  shipments: Shipment[];
  rooms: ChatRoom[];
  messages: Message[];
  reviews: Review[];
  notifications: Notification[];
  payouts: Payout[];
  disputes: Dispute[];
  favorites: FavoritePlace[];
  searches: SearchHistory[];
  events: AuditEvent[];
  commands: Command[];
}
export type Snapshot = Omit<Database, 'commands' | 'verifications'> & {
  recognition?: { image: boolean; sample: boolean; link: boolean };
  me: User;
  mode: 'demo';
  serverDate: string;
};
export interface BundleSuggestion {
  place: Place;
  requests: ProductRequest[];
  reward: number;
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
  REQUESTED: '여행자의 수락을 기다려요',
  OFFER_RECEIVED: '여행자가 손들었어요',
  MATCHED: '결제를 기다려요',
  PAYMENT_HELD: '결제금 보관 중',
  PURCHASED: '구매를 마쳤어요',
  TRAVELING: '전달을 준비해요',
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
): Price {
  const fxRate = DEMO_FX_RATES[request.currency];
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
    priceSource: 'DEMO_FIXED',
  };
}
export function recommendedReward(
  request: Pick<ProductRequest, 'localPrice' | 'quantity' | 'currency'>,
) {
  const productPrice = Math.round(
    request.localPrice * request.quantity * DEMO_FX_RATES[request.currency],
  );
  return Math.round(productPrice * 0.1);
}
export function groupForTrip(
  db: Pick<Database, 'places' | 'requests' | 'offers'>,
  trip: Trip,
): BundleSuggestion[] {
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
        reward: requests.reduce((s, r) => s + recommendedReward(r), 0),
        advance: requests.reduce((s, r) => s + quote(r, 0, r.transport).productPrice, 0),
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

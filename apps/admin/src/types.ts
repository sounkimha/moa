export type AdminRole = 'SUPER_ADMIN' | 'OPERATIONS' | 'CUSTOMER_SUPPORT' | 'FINANCE' | 'VIEWER';
export type AdminIdentity = { username: string; role: AdminRole };
export type Issue = 'ALL' | 'PAYMENT_WAIT' | 'PURCHASE_DELAY' | 'RETURN_DELAY' | 'SHIPPING_DELAY' | 'SETTLEMENT_DELAY' | 'DISPUTED';
export type TransactionRow = {
  id: string; createdAt: string; status: string; statusLabel: string; issue: Issue;
  buyer: Person; traveler: Person; requestId: string; productName: string; place: string;
  paymentStatus: string; shipmentStatus: string; settlementStatus: string; dispute: boolean;
  trackingNumber: string | null;
  amounts: { productPrice: number; travelerReward: number; platformFee: number; shippingFee: number; totalPrice: number } | null;
};
export type Person = { id: string; nickname: string };
export type PeriodTransactionMetric = {
  label: string;
  periodLabel: string;
  transactionCount: number;
  transactionAmount: number | null;
};
export type DashboardData = {
  generatedAt: string; mode: string;
  kpis: { newUsersToday: number; newRequestsToday: number; matchedToday: number; activeTransactions: number; shippedToday: number; openDisputes: number; gmv: number | null; settled: number | null };
  periodTransactions: { today: PeriodTransactionMetric; month: PeriodTransactionMetric; year: PeriodTransactionMetric };
  funnel: { key: string; label: string; count: number }[];
  alerts: { key: Issue; count: number }[];
  recent: TransactionRow[];
};
export type TransactionList = { total: number; page: number; size: number; rows: TransactionRow[] };
export type ConversationRow = {
  id: string;
  createdAt: string;
  transactionId: string;
  transactionStatus: string;
  productName: string;
  buyer: Person;
  traveler: Person;
  messageCount: number;
  lastMessage: null | { createdAt: string; sender: Person; text: string; system: boolean };
};
export type ConversationList = { total: number; page: number; size: number; rows: ConversationRow[] };
export type ConversationDetail = ConversationRow & {
  messages: { id: string; createdAt: string; sender: Person; text: string; system: boolean }[];
};
export type TimelineEntry = { id: string; createdAt: string; type: string; from: string | null; to: string | null; actor: Person; note: string; source: string };
export type TransactionDetail = TransactionRow & {
  estimatedDeliveryDate: string; buyerFacingStatus: string; travelerFacingStatus: string;
  timeline: TimelineEntry[];
  product: null | { name: string; url: string; image: string | null; option: string; quantity: number; localPrice: number | null; currency: string; store: string; desiredDate: string; category: string; place: null | { name: string; city: string; country: string } };
  trip: null | { id: string; from: string; to: string; startDate: string; endDate: string; verificationStatus: string; visits: { date: string; time: string; place: string }[] };
  payment: null | { id: string; status: string; provider: string; providerRef: string; amount: number | null; createdAt: string; escrowStatus: string | null };
  receipt: null | { outcome: string; store: string; purchasedAt: string; localAmount: number | null; currency: string; locationNote: string; productImage: string | null; receiptImage: string | null; unavailableReason: string | null; unavailableNote: string | null; createdAt: string };
  shipment: null | { id: string; carrier: string; trackingNumber: string | null; transport: string; status: string; createdAt: string };
  payout: null | { id: string; status: string; reimbursement: number | null; reward: number | null; commission: number | null; amount: number | null; createdAt: string };
  walletEntries: null | { id: string; type: string; amount: number; status: string; createdAt: string }[];
  dispute: null | { id: string; reason: string | null; status: string; openedBy: Person; createdAt: string };
  chat: null | { id: string; createdAt: string; sender: Person; text: string; system: boolean }[];
  adminActions: unknown[];
  dataLimits: string[];
};

-- MOA schema v1. PostgreSQL 16+. Local-only prototype credentials belong in .env.

-- JSON payloads preserve the shared TypeScript model; typed generated columns enforce relational constraints.

CREATE SCHEMA IF NOT EXISTS moa;

CREATE TABLE IF NOT EXISTS moa.users (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  nickname text GENERATED ALWAYS AS ((payload->>'nickname')) STORED NOT NULL,
  completed int GENERATED ALWAYS AS ((payload->>'completed')::int) STORED NOT NULL,
  success_rate int GENERATED ALWAYS AS ((payload->>'successRate')::int) STORED,
  response_minutes int GENERATED ALWAYS AS ((payload->>'responseMinutes')::int) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.addresses (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS (payload->>'userId') STORED NOT NULL,
  label text GENERATED ALWAYS AS (payload->>'label') STORED NOT NULL,
  is_default boolean GENERATED ALWAYS AS ((payload->>'isDefault')::boolean) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.places (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  name text GENERATED ALWAYS AS ((payload->>'name')) STORED NOT NULL,
  english_name text GENERATED ALWAYS AS ((payload->>'englishName')) STORED NOT NULL,
  country text GENERATED ALWAYS AS ((payload->>'country')) STORED NOT NULL,
  city text GENERATED ALWAYS AS ((payload->>'city')) STORED NOT NULL,
  region text GENERATED ALWAYS AS ((payload->>'region')) STORED NOT NULL,
  latitude numeric GENERATED ALWAYS AS ((payload->>'latitude')::numeric) STORED NOT NULL,
  longitude numeric GENERATED ALWAYS AS ((payload->>'longitude')::numeric) STORED NOT NULL,
  visitors int GENERATED ALWAYS AS ((payload->>'visitors')::int) STORED NOT NULL,
  request_count int GENERATED ALWAYS AS ((payload->>'requestCount')::int) STORED NOT NULL,
  average_reward int GENERATED ALWAYS AS ((payload->>'averageReward')::int) STORED NOT NULL,
  recent_trades int GENERATED ALWAYS AS ((payload->>'recentTrades')::int) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.stores (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  place_id text GENERATED ALWAYS AS ((payload->>'placeId')) STORED NOT NULL,
  name text GENERATED ALWAYS AS ((payload->>'name')) STORED NOT NULL,
  address text GENERATED ALWAYS AS ((payload->>'address')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.products (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  name text GENERATED ALWAYS AS ((payload->>'name')) STORED NOT NULL,
  image text GENERATED ALWAYS AS ((payload->>'image')) STORED NOT NULL,
  category text GENERATED ALWAYS AS ((payload->>'category')) STORED NOT NULL,
  local_price int GENERATED ALWAYS AS ((payload->>'localPrice')::int) STORED NOT NULL,
  currency text GENERATED ALWAYS AS ((payload->>'currency')) STORED NOT NULL,
  place_id text GENERATED ALWAYS AS ((payload->>'placeId')) STORED NOT NULL,
  url text GENERATED ALWAYS AS ((payload->>'url')) STORED
);

CREATE TABLE IF NOT EXISTS moa.trips (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  traveler_id text GENERATED ALWAYS AS ((payload->>'travelerId')) STORED NOT NULL,
  departure_country text GENERATED ALWAYS AS ((payload->>'departureCountry')) STORED NOT NULL,
  departure_city text GENERATED ALWAYS AS ((payload->>'departureCity')) STORED NOT NULL,
  destination_country text GENERATED ALWAYS AS ((payload->>'destinationCountry')) STORED NOT NULL,
  destination_city text GENERATED ALWAYS AS ((payload->>'destinationCity')) STORED NOT NULL,
  start_date text GENERATED ALWAYS AS ((payload->>'startDate')) STORED NOT NULL,
  end_date text GENERATED ALWAYS AS ((payload->>'endDate')) STORED NOT NULL,
  verification_status text GENERATED ALWAYS AS ((payload->>'verificationStatus')) STORED NOT NULL,
  max_items int GENERATED ALWAYS AS ((payload->>'maxItems')::int) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.destinations (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  trip_id text GENERATED ALWAYS AS ((payload->>'tripId')) STORED NOT NULL,
  place_id text GENERATED ALWAYS AS ((payload->>'placeId')) STORED NOT NULL,
  visit_date text GENERATED ALWAYS AS ((payload->>'visitDate')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.requests (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  requester_id text GENERATED ALWAYS AS ((payload->>'requesterId')) STORED NOT NULL,
  product_name text GENERATED ALWAYS AS ((payload->>'productName')) STORED NOT NULL,
  product_url text GENERATED ALWAYS AS ((payload->>'productUrl')) STORED NOT NULL,
  product_image text GENERATED ALWAYS AS ((payload->>'productImage')) STORED NOT NULL,
  store_name text GENERATED ALWAYS AS ((payload->>'storeName')) STORED NOT NULL,
  place_id text GENERATED ALWAYS AS ((payload->>'placeId')) STORED NOT NULL,
  country text GENERATED ALWAYS AS ((payload->>'country')) STORED NOT NULL,
  city text GENERATED ALWAYS AS ((payload->>'city')) STORED NOT NULL,
  local_price int GENERATED ALWAYS AS ((payload->>'localPrice')::int) STORED NOT NULL,
  currency text GENERATED ALWAYS AS ((payload->>'currency')) STORED NOT NULL,
  quantity int GENERATED ALWAYS AS ((payload->>'quantity')::int) STORED NOT NULL,
  desired_date text GENERATED ALWAYS AS ((payload->>'desiredDate')) STORED NOT NULL,
  delivery_country text GENERATED ALWAYS AS ((payload->>'deliveryCountry')) STORED NOT NULL,
  delivery_city text GENERATED ALWAYS AS ((payload->>'deliveryCity')) STORED NOT NULL,
  status text GENERATED ALWAYS AS ((payload->>'status')) STORED NOT NULL,
  revision int GENERATED ALWAYS AS ((payload->>'revision')::int) STORED NOT NULL,
  transport text GENERATED ALWAYS AS ((payload->>'transport')) STORED NOT NULL,
  category text GENERATED ALWAYS AS ((payload->>'category')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.offers (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  request_id text GENERATED ALWAYS AS ((payload->>'requestId')) STORED NOT NULL,
  traveler_id text GENERATED ALWAYS AS ((payload->>'travelerId')) STORED NOT NULL,
  trip_id text GENERATED ALWAYS AS ((payload->>'tripId')) STORED NOT NULL,
  reward int GENERATED ALWAYS AS ((payload->>'reward')::int) STORED NOT NULL,
  estimated_purchase_date text GENERATED ALWAYS AS ((payload->>'estimatedPurchaseDate')) STORED NOT NULL,
  estimated_delivery_date text GENERATED ALWAYS AS ((payload->>'estimatedDeliveryDate')) STORED NOT NULL,
  message text GENERATED ALWAYS AS ((payload->>'message')) STORED NOT NULL,
  status text GENERATED ALWAYS AS ((payload->>'status')) STORED NOT NULL,
  bundle_id text GENERATED ALWAYS AS ((payload->>'bundleId')) STORED,
  transport text GENERATED ALWAYS AS ((payload->>'transport')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.bundles (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  traveler_id text GENERATED ALWAYS AS ((payload->>'travelerId')) STORED NOT NULL,
  trip_id text GENERATED ALWAYS AS ((payload->>'tripId')) STORED NOT NULL,
  place_id text GENERATED ALWAYS AS ((payload->>'placeId')) STORED NOT NULL,
  total_reward int GENERATED ALWAYS AS ((payload->>'totalReward')::int) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.transactions (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  request_id text GENERATED ALWAYS AS ((payload->>'requestId')) STORED NOT NULL,
  offer_id text GENERATED ALWAYS AS ((payload->>'offerId')) STORED NOT NULL,
  traveler_id text GENERATED ALWAYS AS ((payload->>'travelerId')) STORED NOT NULL,
  buyer_id text GENERATED ALWAYS AS ((payload->>'buyerId')) STORED NOT NULL,
  product_price int GENERATED ALWAYS AS ((payload->>'productPrice')::int) STORED NOT NULL,
  traveler_reward int GENERATED ALWAYS AS ((payload->>'travelerReward')::int) STORED NOT NULL,
  platform_fee int GENERATED ALWAYS AS ((payload->>'platformFee')::int) STORED NOT NULL,
  shipping_fee int GENERATED ALWAYS AS ((payload->>'shippingFee')::int) STORED NOT NULL,
  tax_reserve int GENERATED ALWAYS AS ((payload->>'taxReserve')::int) STORED NOT NULL,
  total_price int GENERATED ALWAYS AS ((payload->>'totalPrice')::int) STORED NOT NULL,
  status text GENERATED ALWAYS AS ((payload->>'status')) STORED NOT NULL,
  revision int GENERATED ALWAYS AS ((payload->>'revision')::int) STORED NOT NULL,
  transport text GENERATED ALWAYS AS ((payload->>'transport')) STORED NOT NULL,
  estimated_delivery_date text GENERATED ALWAYS AS ((payload->>'estimatedDeliveryDate')) STORED NOT NULL,
  fx_rate numeric GENERATED ALWAYS AS ((payload->>'fxRate')::numeric) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.verifications (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS ((payload->>'userId')) STORED NOT NULL,
  kind text GENERATED ALWAYS AS ((payload->>'kind')) STORED NOT NULL,
  status text GENERATED ALWAYS AS ((payload->>'status')) STORED NOT NULL,
  provider_ref text GENERATED ALWAYS AS ((payload->>'providerRef')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.payments (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  transaction_id text GENERATED ALWAYS AS ((payload->>'transactionId')) STORED NOT NULL,
  buyer_id text GENERATED ALWAYS AS ((payload->>'buyerId')) STORED NOT NULL,
  amount int GENERATED ALWAYS AS ((payload->>'amount')::int) STORED NOT NULL,
  status text GENERATED ALWAYS AS ((payload->>'status')) STORED NOT NULL,
  provider text GENERATED ALWAYS AS ((payload->>'provider')) STORED NOT NULL,
  provider_ref text GENERATED ALWAYS AS ((payload->>'providerRef')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.escrows (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  transaction_id text GENERATED ALWAYS AS ((payload->>'transactionId')) STORED NOT NULL,
  amount int GENERATED ALWAYS AS ((payload->>'amount')::int) STORED NOT NULL,
  holder text GENERATED ALWAYS AS ((payload->>'holder')) STORED NOT NULL,
  status text GENERATED ALWAYS AS ((payload->>'status')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.receipts (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  transaction_id text GENERATED ALWAYS AS ((payload->>'transactionId')) STORED NOT NULL,
  traveler_id text GENERATED ALWAYS AS ((payload->>'travelerId')) STORED NOT NULL,
  store_name text GENERATED ALWAYS AS ((payload->>'storeName')) STORED NOT NULL,
  purchased_at text GENERATED ALWAYS AS ((payload->>'purchasedAt')) STORED NOT NULL,
  local_amount int GENERATED ALWAYS AS ((payload->>'localAmount')::int) STORED NOT NULL,
  currency text GENERATED ALWAYS AS ((payload->>'currency')) STORED NOT NULL,
  location_note text GENERATED ALWAYS AS ((payload->>'locationNote')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.shipments (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  transaction_id text GENERATED ALWAYS AS ((payload->>'transactionId')) STORED NOT NULL,
  transport text GENERATED ALWAYS AS ((payload->>'transport')) STORED NOT NULL,
  carrier text GENERATED ALWAYS AS ((payload->>'carrier')) STORED NOT NULL,
  tracking_number text GENERATED ALWAYS AS ((payload->>'trackingNumber')) STORED NOT NULL,
  status text GENERATED ALWAYS AS ((payload->>'status')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.rooms (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  transaction_id text GENERATED ALWAYS AS ((payload->>'transactionId')) STORED NOT NULL,
  buyer_id text GENERATED ALWAYS AS ((payload->>'buyerId')) STORED NOT NULL,
  traveler_id text GENERATED ALWAYS AS ((payload->>'travelerId')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.messages (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  room_id text GENERATED ALWAYS AS ((payload->>'roomId')) STORED NOT NULL,
  sender_id text GENERATED ALWAYS AS ((payload->>'senderId')) STORED NOT NULL,
  "text" text GENERATED ALWAYS AS ((payload->>'text')) STORED NOT NULL,
  "system" boolean GENERATED ALWAYS AS ((payload->>'system')::boolean) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.reviews (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  transaction_id text GENERATED ALWAYS AS ((payload->>'transactionId')) STORED NOT NULL,
  author_id text GENERATED ALWAYS AS ((payload->>'authorId')) STORED NOT NULL,
  target_id text GENERATED ALWAYS AS ((payload->>'targetId')) STORED NOT NULL,
  rating int GENERATED ALWAYS AS ((payload->>'rating')::int) STORED NOT NULL,
  "text" text GENERATED ALWAYS AS ((payload->>'text')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.notifications (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS ((payload->>'userId')) STORED NOT NULL,
  title text GENERATED ALWAYS AS ((payload->>'title')) STORED NOT NULL,
  transaction_id text GENERATED ALWAYS AS ((payload->>'transactionId')) STORED,
  request_id text GENERATED ALWAYS AS ((payload->>'requestId')) STORED,
  "read" boolean GENERATED ALWAYS AS ((payload->>'read')::boolean) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.payouts (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  transaction_id text GENERATED ALWAYS AS ((payload->>'transactionId')) STORED NOT NULL,
  traveler_id text GENERATED ALWAYS AS ((payload->>'travelerId')) STORED NOT NULL,
  reimbursement int GENERATED ALWAYS AS ((payload->>'reimbursement')::int) STORED NOT NULL,
  reward int GENERATED ALWAYS AS ((payload->>'reward')::int) STORED NOT NULL,
  shipping_reimbursement int GENERATED ALWAYS AS ((payload->>'shippingReimbursement')::int) STORED NOT NULL,
  amount int GENERATED ALWAYS AS ((payload->>'amount')::int) STORED NOT NULL,
  status text GENERATED ALWAYS AS ((payload->>'status')) STORED NOT NULL,
  provider_ref text GENERATED ALWAYS AS ((payload->>'providerRef')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.disputes (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  transaction_id text GENERATED ALWAYS AS ((payload->>'transactionId')) STORED NOT NULL,
  opened_by text GENERATED ALWAYS AS ((payload->>'openedBy')) STORED NOT NULL,
  reason text GENERATED ALWAYS AS ((payload->>'reason')) STORED NOT NULL,
  status text GENERATED ALWAYS AS ((payload->>'status')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.favorites (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS ((payload->>'userId')) STORED NOT NULL,
  place_id text GENERATED ALWAYS AS ((payload->>'placeId')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.searches (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS ((payload->>'userId')) STORED NOT NULL,
  "query" text GENERATED ALWAYS AS ((payload->>'query')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.events (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  actor_id text GENERATED ALWAYS AS ((payload->>'actorId')) STORED NOT NULL,
  transaction_id text GENERATED ALWAYS AS ((payload->>'transactionId')) STORED,
  type text GENERATED ALWAYS AS ((payload->>'type')) STORED NOT NULL,
  "from" text GENERATED ALWAYS AS ((payload->>'from')) STORED,
  "to" text GENERATED ALWAYS AS ((payload->>'to')) STORED,
  note text GENERATED ALWAYS AS ((payload->>'note')) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.commands (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  actor_id text GENERATED ALWAYS AS ((payload->>'actorId')) STORED NOT NULL,
  "key" text GENERATED ALWAYS AS ((payload->>'key')) STORED NOT NULL,
  operation text GENERATED ALWAYS AS ((payload->>'operation')) STORED NOT NULL,
  fingerprint text GENERATED ALWAYS AS ((payload->>'fingerprint')) STORED NOT NULL
);

ALTER TABLE moa.stores ADD CONSTRAINT fk_stores_place_id FOREIGN KEY (place_id) REFERENCES moa.places(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.products ADD CONSTRAINT fk_products_place_id FOREIGN KEY (place_id) REFERENCES moa.places(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.trips ADD CONSTRAINT fk_trips_traveler_id FOREIGN KEY (traveler_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.destinations ADD CONSTRAINT fk_destinations_trip_id FOREIGN KEY (trip_id) REFERENCES moa.trips(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.destinations ADD CONSTRAINT fk_destinations_place_id FOREIGN KEY (place_id) REFERENCES moa.places(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.requests ADD CONSTRAINT fk_requests_requester_id FOREIGN KEY (requester_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.requests ADD CONSTRAINT fk_requests_place_id FOREIGN KEY (place_id) REFERENCES moa.places(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.offers ADD CONSTRAINT fk_offers_request_id FOREIGN KEY (request_id) REFERENCES moa.requests(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.offers ADD CONSTRAINT fk_offers_traveler_id FOREIGN KEY (traveler_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.offers ADD CONSTRAINT fk_offers_trip_id FOREIGN KEY (trip_id) REFERENCES moa.trips(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.offers ADD CONSTRAINT fk_offers_bundle_id FOREIGN KEY (bundle_id) REFERENCES moa.bundles(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.bundles ADD CONSTRAINT fk_bundles_traveler_id FOREIGN KEY (traveler_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.bundles ADD CONSTRAINT fk_bundles_trip_id FOREIGN KEY (trip_id) REFERENCES moa.trips(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.bundles ADD CONSTRAINT fk_bundles_place_id FOREIGN KEY (place_id) REFERENCES moa.places(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.transactions ADD CONSTRAINT fk_transactions_request_id FOREIGN KEY (request_id) REFERENCES moa.requests(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.transactions ADD CONSTRAINT fk_transactions_offer_id FOREIGN KEY (offer_id) REFERENCES moa.offers(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.transactions ADD CONSTRAINT fk_transactions_traveler_id FOREIGN KEY (traveler_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.transactions ADD CONSTRAINT fk_transactions_buyer_id FOREIGN KEY (buyer_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.verifications ADD CONSTRAINT fk_verifications_user_id FOREIGN KEY (user_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.payments ADD CONSTRAINT fk_payments_transaction_id FOREIGN KEY (transaction_id) REFERENCES moa.transactions(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.payments ADD CONSTRAINT fk_payments_buyer_id FOREIGN KEY (buyer_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.escrows ADD CONSTRAINT fk_escrows_transaction_id FOREIGN KEY (transaction_id) REFERENCES moa.transactions(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.receipts ADD CONSTRAINT fk_receipts_transaction_id FOREIGN KEY (transaction_id) REFERENCES moa.transactions(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.receipts ADD CONSTRAINT fk_receipts_traveler_id FOREIGN KEY (traveler_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.shipments ADD CONSTRAINT fk_shipments_transaction_id FOREIGN KEY (transaction_id) REFERENCES moa.transactions(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.rooms ADD CONSTRAINT fk_rooms_transaction_id FOREIGN KEY (transaction_id) REFERENCES moa.transactions(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.rooms ADD CONSTRAINT fk_rooms_buyer_id FOREIGN KEY (buyer_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.rooms ADD CONSTRAINT fk_rooms_traveler_id FOREIGN KEY (traveler_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.messages ADD CONSTRAINT fk_messages_room_id FOREIGN KEY (room_id) REFERENCES moa.rooms(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.messages ADD CONSTRAINT fk_messages_sender_id FOREIGN KEY (sender_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.reviews ADD CONSTRAINT fk_reviews_transaction_id FOREIGN KEY (transaction_id) REFERENCES moa.transactions(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.reviews ADD CONSTRAINT fk_reviews_author_id FOREIGN KEY (author_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.reviews ADD CONSTRAINT fk_reviews_target_id FOREIGN KEY (target_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.notifications ADD CONSTRAINT fk_notifications_transaction_id FOREIGN KEY (transaction_id) REFERENCES moa.transactions(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.notifications ADD CONSTRAINT fk_notifications_request_id FOREIGN KEY (request_id) REFERENCES moa.requests(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.payouts ADD CONSTRAINT fk_payouts_transaction_id FOREIGN KEY (transaction_id) REFERENCES moa.transactions(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.payouts ADD CONSTRAINT fk_payouts_traveler_id FOREIGN KEY (traveler_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.disputes ADD CONSTRAINT fk_disputes_transaction_id FOREIGN KEY (transaction_id) REFERENCES moa.transactions(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.disputes ADD CONSTRAINT fk_disputes_opened_by FOREIGN KEY (opened_by) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.favorites ADD CONSTRAINT fk_favorites_user_id FOREIGN KEY (user_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.favorites ADD CONSTRAINT fk_favorites_place_id FOREIGN KEY (place_id) REFERENCES moa.places(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.searches ADD CONSTRAINT fk_searches_user_id FOREIGN KEY (user_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.events ADD CONSTRAINT fk_events_actor_id FOREIGN KEY (actor_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.events ADD CONSTRAINT fk_events_transaction_id FOREIGN KEY (transaction_id) REFERENCES moa.transactions(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.commands ADD CONSTRAINT fk_commands_actor_id FOREIGN KEY (actor_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE moa.requests ADD CONSTRAINT ck_requests_1 CHECK (quantity BETWEEN 1 AND 10);

ALTER TABLE moa.requests ADD CONSTRAINT ck_requests_2 CHECK (local_price > 0);


ALTER TABLE moa.requests ADD CONSTRAINT ck_requests_4 CHECK (currency IN ('JPY','KRW'));

ALTER TABLE moa.requests ADD CONSTRAINT ck_requests_5 CHECK (category IN ('CHARACTER','GAME','POPUP','LOCAL','FASHION','CONCERT'));

ALTER TABLE moa.requests ADD CONSTRAINT ck_requests_6 CHECK (status IN ('REQUESTED','OFFER_RECEIVED','MATCHED','PAYMENT_HELD','PURCHASED','TRAVELING','SHIPPED','DELIVERED','CONFIRMED','SETTLED','CANCELLED','DISPUTED'));

ALTER TABLE moa.trips ADD CONSTRAINT ck_trips_1 CHECK (end_date >= start_date);

ALTER TABLE moa.trips ADD CONSTRAINT ck_trips_2 CHECK (max_items BETWEEN 1 AND 20);

ALTER TABLE moa.offers ADD CONSTRAINT ck_offers_1 CHECK (reward BETWEEN 1000 AND 100000);

ALTER TABLE moa.offers ADD CONSTRAINT ck_offers_2 CHECK (estimated_delivery_date >= estimated_purchase_date);

ALTER TABLE moa.offers ADD CONSTRAINT ck_offers_3 CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED'));

ALTER TABLE moa.transactions ADD CONSTRAINT ck_transactions_1 CHECK (buyer_id <> traveler_id);

ALTER TABLE moa.transactions ADD CONSTRAINT ck_transactions_2 CHECK (product_price >= 0 AND traveler_reward >= 0 AND platform_fee >= 0 AND shipping_fee >= 0 AND tax_reserve >= 0);

ALTER TABLE moa.transactions ADD CONSTRAINT ck_transactions_3 CHECK (total_price = product_price + traveler_reward + platform_fee + shipping_fee + tax_reserve);

ALTER TABLE moa.transactions ADD CONSTRAINT ck_transactions_4 CHECK (status IN ('REQUESTED','OFFER_RECEIVED','MATCHED','PAYMENT_HELD','PURCHASED','TRAVELING','SHIPPED','DELIVERED','CONFIRMED','SETTLED','CANCELLED','DISPUTED'));

ALTER TABLE moa.reviews ADD CONSTRAINT ck_reviews_1 CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE moa.payments ADD CONSTRAINT ck_payments_1 CHECK (amount > 0);

ALTER TABLE moa.payments ADD CONSTRAINT ck_payments_2 CHECK (provider = 'MOCK');

ALTER TABLE moa.payments ADD CONSTRAINT ck_payments_3 CHECK (status IN ('HELD','REFUNDED','RELEASED'));

ALTER TABLE moa.escrows ADD CONSTRAINT ck_escrows_1 CHECK (amount > 0);

ALTER TABLE moa.escrows ADD CONSTRAINT ck_escrows_2 CHECK (status IN ('HELD','FROZEN','REFUNDED','RELEASED'));

ALTER TABLE moa.payouts ADD CONSTRAINT ck_payouts_1 CHECK (amount = reimbursement + reward + shipping_reimbursement);

ALTER TABLE moa.payouts ADD CONSTRAINT ck_payouts_2 CHECK (reward >= 0 AND reimbursement >= 0 AND shipping_reimbursement >= 0);

CREATE UNIQUE INDEX uq_transactions_identity ON moa.transactions(request_id);

CREATE UNIQUE INDEX uq_payments_identity ON moa.payments(transaction_id);

CREATE UNIQUE INDEX uq_escrows_identity ON moa.escrows(transaction_id);

CREATE UNIQUE INDEX uq_receipts_identity ON moa.receipts(transaction_id);

CREATE UNIQUE INDEX uq_shipments_identity ON moa.shipments(transaction_id);

CREATE UNIQUE INDEX uq_rooms_identity ON moa.rooms(transaction_id);

CREATE UNIQUE INDEX uq_payouts_identity ON moa.payouts(transaction_id);

CREATE UNIQUE INDEX uq_reviews_identity ON moa.reviews(transaction_id, author_id);

CREATE UNIQUE INDEX uq_favorites_identity ON moa.favorites(user_id, place_id);

CREATE UNIQUE INDEX uq_destinations_identity ON moa.destinations(trip_id, place_id);

CREATE UNIQUE INDEX uq_commands_identity ON moa.commands(actor_id, operation, "key");

CREATE UNIQUE INDEX uq_pending_offer ON moa.offers(request_id,traveler_id) WHERE status='PENDING';

CREATE INDEX ix_request_matching ON moa.requests(place_id,status,desired_date);

CREATE INDEX ix_trip_destination ON moa.trips(destination_country,destination_city,start_date,end_date);

CREATE INDEX ix_transaction_buyer ON moa.transactions(buyer_id,status);

CREATE INDEX ix_transaction_traveler ON moa.transactions(traveler_id,status);

CREATE INDEX ix_messages_room ON moa.messages(room_id,created_at);

CREATE INDEX ix_notifications_user ON moa.notifications(user_id,"read",created_at);

CREATE INDEX ix_events_transaction ON moa.events(transaction_id,created_at);

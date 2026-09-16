-- Buyer funding is separate from the traveler selected later.
CREATE TABLE IF NOT EXISTS moa.requestFundings (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  request_id text GENERATED ALWAYS AS (payload->>'requestId') STORED NOT NULL UNIQUE,
  buyer_id text GENERATED ALWAYS AS (payload->>'buyerId') STORED NOT NULL,
  amount integer GENERATED ALWAYS AS ((payload->>'totalPrice')::integer) STORED NOT NULL CHECK (amount > 0),
  status text GENERATED ALWAYS AS (payload->>'status') STORED NOT NULL CHECK (status IN ('HELD','MATCHED','REFUNDED')),
  FOREIGN KEY (request_id) REFERENCES moa.requests(id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (buyer_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE moa.requests DROP CONSTRAINT IF EXISTS ck_requests_6;
ALTER TABLE moa.requests ADD CONSTRAINT ck_requests_6 CHECK (status IN ('PAYMENT_PENDING','REQUESTED','OFFER_RECEIVED','MATCHED','PAYMENT_HELD','PURCHASED','TRAVELING','SHIPPED','DELIVERED','CONFIRMED','SETTLED','CANCELLED','DISPUTED'));

-- Only derived columns change; the original JSON payloads and ledger amounts are retained.
ALTER TABLE moa.products DROP COLUMN local_price;
ALTER TABLE moa.products ADD COLUMN local_price numeric(18,2) GENERATED ALWAYS AS ((payload->>'localPrice')::numeric(18,2)) STORED NOT NULL;
ALTER TABLE moa.requests DROP CONSTRAINT ck_requests_2;
ALTER TABLE moa.requests DROP COLUMN local_price;
ALTER TABLE moa.requests ADD COLUMN local_price numeric(18,2) GENERATED ALWAYS AS ((payload->>'localPrice')::numeric(18,2)) STORED NOT NULL;
ALTER TABLE moa.requests ADD CONSTRAINT ck_requests_2 CHECK (local_price > 0);
ALTER TABLE moa.receipts DROP COLUMN local_amount;
ALTER TABLE moa.receipts ADD COLUMN local_amount numeric(18,2) GENERATED ALWAYS AS ((payload->>'localAmount')::numeric(18,2)) STORED NOT NULL;
ALTER TABLE moa.requests DROP CONSTRAINT ck_requests_4;
ALTER TABLE moa.requests ADD CONSTRAINT ck_requests_4 CHECK (currency IN ('JPY','KRW','TWD','HKD','CNY','THB','VND','SGD','MYR','IDR'));
ALTER TABLE moa.offers DROP CONSTRAINT ck_offers_1;
ALTER TABLE moa.offers ADD CONSTRAINT ck_offers_1 CHECK (reward BETWEEN 0 AND 100000);

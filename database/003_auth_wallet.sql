-- MOA auth identity and demo finance boundaries.
-- Values remain JSON payloads to match the prototype repository. Production
-- payment tokens and bank account numbers belong at contracted providers.

CREATE TABLE IF NOT EXISTS moa.authIdentities (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS (payload->>'userId') STORED NOT NULL,
  provider text GENERATED ALWAYS AS (payload->>'provider') STORED NOT NULL,
  provider_user_id text GENERATED ALWAYS AS (payload->>'providerUserId') STORED NOT NULL,
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS moa.paymentMethods (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS (payload->>'userId') STORED NOT NULL,
  type text GENERATED ALWAYS AS (payload->>'type') STORED NOT NULL,
  is_default boolean GENERATED ALWAYS AS ((payload->>'isDefault')::boolean) STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.wallets (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS (payload->>'userId') STORED NOT NULL UNIQUE,
  available_balance bigint GENERATED ALWAYS AS ((payload->>'availableBalance')::bigint) STORED NOT NULL CHECK (available_balance >= 0),
  pending_balance bigint GENERATED ALWAYS AS ((payload->>'pendingBalance')::bigint) STORED NOT NULL CHECK (pending_balance >= 0),
  withdrawal_pending bigint GENERATED ALWAYS AS ((payload->>'withdrawalPending')::bigint) STORED NOT NULL CHECK (withdrawal_pending >= 0)
);

CREATE TABLE IF NOT EXISTS moa.walletTransactions (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  wallet_id text GENERATED ALWAYS AS (payload->>'walletId') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS (payload->>'userId') STORED NOT NULL,
  type text GENERATED ALWAYS AS (payload->>'type') STORED NOT NULL,
  amount bigint GENERATED ALWAYS AS ((payload->>'amount')::bigint) STORED NOT NULL,
  balance_after bigint GENERATED ALWAYS AS ((payload->>'balanceAfter')::bigint) STORED NOT NULL CHECK (balance_after >= 0),
  status text GENERATED ALWAYS AS (payload->>'status') STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.payoutAccounts (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS (payload->>'userId') STORED NOT NULL,
  account_last4 text GENERATED ALWAYS AS (payload->>'accountLast4') STORED NOT NULL CHECK (length(account_last4) = 4),
  status text GENERATED ALWAYS AS (payload->>'status') STORED NOT NULL
);

CREATE TABLE IF NOT EXISTS moa.withdrawals (
  id text PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = id),
  created_at text GENERATED ALWAYS AS (payload->>'createdAt') STORED NOT NULL,
  user_id text GENERATED ALWAYS AS (payload->>'userId') STORED NOT NULL,
  wallet_id text GENERATED ALWAYS AS (payload->>'walletId') STORED NOT NULL,
  payout_account_id text GENERATED ALWAYS AS (payload->>'payoutAccountId') STORED NOT NULL,
  amount bigint GENERATED ALWAYS AS ((payload->>'amount')::bigint) STORED NOT NULL CHECK (amount > 0),
  status text GENERATED ALWAYS AS (payload->>'status') STORED NOT NULL
);

ALTER TABLE moa.authIdentities DROP CONSTRAINT IF EXISTS auth_identities_user_fk;
ALTER TABLE moa.authIdentities ADD CONSTRAINT auth_identities_user_fk FOREIGN KEY (user_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE moa.paymentMethods DROP CONSTRAINT IF EXISTS payment_methods_user_fk;
ALTER TABLE moa.paymentMethods ADD CONSTRAINT payment_methods_user_fk FOREIGN KEY (user_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE moa.wallets DROP CONSTRAINT IF EXISTS wallets_user_fk;
ALTER TABLE moa.wallets ADD CONSTRAINT wallets_user_fk FOREIGN KEY (user_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE moa.walletTransactions DROP CONSTRAINT IF EXISTS wallet_transactions_wallet_fk;
ALTER TABLE moa.walletTransactions ADD CONSTRAINT wallet_transactions_wallet_fk FOREIGN KEY (wallet_id) REFERENCES moa.wallets(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE moa.payoutAccounts DROP CONSTRAINT IF EXISTS payout_accounts_user_fk;
ALTER TABLE moa.payoutAccounts ADD CONSTRAINT payout_accounts_user_fk FOREIGN KEY (user_id) REFERENCES moa.users(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE moa.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_wallet_fk;
ALTER TABLE moa.withdrawals ADD CONSTRAINT withdrawals_wallet_fk FOREIGN KEY (wallet_id) REFERENCES moa.wallets(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE moa.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_account_fk;
ALTER TABLE moa.withdrawals ADD CONSTRAINT withdrawals_account_fk FOREIGN KEY (payout_account_id) REFERENCES moa.payoutAccounts(id) DEFERRABLE INITIALLY DEFERRED;

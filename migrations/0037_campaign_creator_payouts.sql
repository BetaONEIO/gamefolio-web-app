ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_connect_account_unique
  ON users (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS campaign_funding_allocations (
  campaign_id INTEGER PRIMARY KEY REFERENCES campaign_instances(id) ON DELETE CASCADE,
  gross_amount_pence INTEGER NOT NULL CHECK (gross_amount_pence >= 0),
  platform_fee_pence INTEGER NOT NULL CHECK (platform_fee_pence >= 0),
  creator_pool_pence INTEGER NOT NULL CHECK (creator_pool_pence >= 0),
  creator_capacity INTEGER NOT NULL CHECK (creator_capacity > 0),
  payout_per_creator_pence INTEGER NOT NULL CHECK (payout_per_creator_pence >= 0),
  rounding_remainder_pence INTEGER NOT NULL DEFAULT 0 CHECK (rounding_remainder_pence >= 0),
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_charge_id TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'gbp',
  status TEXT NOT NULL DEFAULT 'funded',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (platform_fee_pence + creator_pool_pence = gross_amount_pence),
  CHECK (payout_per_creator_pence * creator_capacity + rounding_remainder_pence = creator_pool_pence)
);

CREATE TABLE IF NOT EXISTS campaign_creator_payouts (
  id BIGSERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
  creator_user_id INTEGER NOT NULL REFERENCES users(id),
  amount_pence INTEGER NOT NULL CHECK (amount_pence >= 0),
  currency TEXT NOT NULL DEFAULT 'gbp',
  stripe_connect_account_id TEXT,
  stripe_transfer_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, participant_id)
);

CREATE INDEX IF NOT EXISTS campaign_creator_payouts_creator_status_idx
  ON campaign_creator_payouts (creator_user_id, status);

CREATE TABLE IF NOT EXISTS "towerdog_reward_payouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "event_type" text NOT NULL,
  "reward_mode" text NOT NULL,
  "xp_amount" integer NOT NULL,
  "xp_awarded" boolean DEFAULT false NOT NULL,
  "gft_amount" integer DEFAULT 0 NOT NULL,
  "wallet_address" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "tx_hash" text,
  "signed_transaction" text,
  "error_message" text,
  "retryable" boolean DEFAULT false NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_attempt_at" timestamp,
  "next_retry_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "paid_at" timestamp,
  CONSTRAINT "towerdog_reward_payouts_event_type_check"
    CHECK ("event_type" IN ('signup', 'pro_purchase')),
  CONSTRAINT "towerdog_reward_payouts_reward_mode_check"
    CHECK ("reward_mode" IN ('wallet', 'xp_only')),
  CONSTRAINT "towerdog_reward_payouts_status_check"
    CHECK ("status" IN ('pending', 'sending', 'submitted', 'paid', 'xp_only', 'failed')),
  CONSTRAINT "towerdog_reward_payouts_reward_combination_check"
    CHECK (
      ("reward_mode" = 'wallet' AND "xp_amount" = 500 AND "gft_amount" = 500 AND "wallet_address" IS NOT NULL)
      OR
      ("reward_mode" = 'xp_only' AND "xp_amount" = 750 AND "gft_amount" = 0 AND "wallet_address" IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "towerdog_reward_payouts_user_event_unique"
  ON "towerdog_reward_payouts" ("user_id", "event_type");
CREATE INDEX IF NOT EXISTS "towerdog_reward_payouts_status_retry_idx"
  ON "towerdog_reward_payouts" ("status", "next_retry_at");
CREATE UNIQUE INDEX IF NOT EXISTS "towerdog_reward_payouts_tx_hash_unique"
  ON "towerdog_reward_payouts" ("tx_hash")
  WHERE "tx_hash" IS NOT NULL;
-- Tracks server-signed purchases paid in GFT from a user's custodial
-- (Gamefolio) wallet. Status flow:
--   pending -> tx_sent -> finalizing -> completed
--                       -> refunding  -> refunded | refund_failed
--                       -> failed
CREATE TABLE IF NOT EXISTS "gamefolio_purchases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" integer NOT NULL,
  "purchase_type" text NOT NULL,
  "item_ref_id" integer NOT NULL,
  "seller_id" integer,
  "wallet_address" text NOT NULL,
  "gf_amount" real NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "tx_hash" text,
  "payout_tx_hash" text,
  "refund_tx_hash" text,
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  CONSTRAINT "gamefolio_purchases_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "gamefolio_purchases_user_idx" ON "gamefolio_purchases" ("user_id");
CREATE INDEX IF NOT EXISTS "gamefolio_purchases_status_idx" ON "gamefolio_purchases" ("status");

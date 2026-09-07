-- Tracks one projected Top 10 GFT payout per season/rank.
-- A unique season/rank key prevents repeated closure checks from double-paying.
CREATE TABLE IF NOT EXISTS "leaderboard_reward_payouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "season_number" integer NOT NULL,
  "rank" integer NOT NULL,
  "user_id" integer NOT NULL,
  "amount" real NOT NULL,
  "wallet_address" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "tx_hash" text,
  "error_message" text,
  "retryable" boolean DEFAULT false NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_attempt_at" timestamp,
  "next_retry_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "paid_at" timestamp,
  CONSTRAINT "leaderboard_reward_payouts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "leaderboard_reward_payouts_season_rank_unique"
    UNIQUE ("season_number", "rank")
);

CREATE INDEX IF NOT EXISTS "leaderboard_reward_payouts_season_idx"
  ON "leaderboard_reward_payouts" ("season_number");
CREATE INDEX IF NOT EXISTS "leaderboard_reward_payouts_user_idx"
  ON "leaderboard_reward_payouts" ("user_id");
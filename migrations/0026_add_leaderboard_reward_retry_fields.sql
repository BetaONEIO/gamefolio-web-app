ALTER TABLE "leaderboard_reward_payouts"
  ADD COLUMN IF NOT EXISTS "retryable" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp,
  ADD COLUMN IF NOT EXISTS "next_retry_at" timestamp;
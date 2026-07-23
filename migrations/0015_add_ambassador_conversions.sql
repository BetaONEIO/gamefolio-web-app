-- Tracks Pro purchases attributed to an ambassador's referral code.
-- referred_user_id is unique: a user is only ever attributed once (their
-- first Pro purchase) — renewals never insert a second row.
CREATE TABLE IF NOT EXISTS "ambassador_conversions" (
  "id" serial PRIMARY KEY NOT NULL,
  "ambassador_user_id" integer NOT NULL,
  "referred_user_id" integer NOT NULL,
  "referral_code" text NOT NULL,
  "subscription_type" text,
  "source" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ambassador_conversions_ambassador_user_id_fkey"
    FOREIGN KEY ("ambassador_user_id") REFERENCES "users"("id"),
  CONSTRAINT "ambassador_conversions_referred_user_id_fkey"
    FOREIGN KEY ("referred_user_id") REFERENCES "users"("id"),
  CONSTRAINT "ambassador_conversions_referred_user_id_unique" UNIQUE ("referred_user_id")
);

CREATE INDEX IF NOT EXISTS "ambassador_conversions_ambassador_idx" ON "ambassador_conversions" ("ambassador_user_id");

-- Partner type discriminator: which paid partner subscription a user holds.
-- NULL = not a partner. Values: 'streamer' | 'indie'.
-- Entitlement lives in is_partner (bool, includes Pro perks); partner_type says
-- WHICH partner, so the streamer-only / indie-only dashboards can gate correctly.
-- Deliberately separate from user_type (self-selected onboarding personas) — a
-- 'streamer' persona tag is NOT the same as a paid Streamer Partner.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "partner_type" text;

-- Optional partial index for looking up partners by type (small table, cheap).
CREATE INDEX IF NOT EXISTS "users_partner_type_idx" ON "users" ("partner_type") WHERE "partner_type" IS NOT NULL;

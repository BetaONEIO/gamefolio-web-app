-- Spam / multi-account detection signals for gamefolio-bot.
-- All columns are nullable and additive: existing rows are unaffected, and
-- older app builds that don't send X-Device-Id simply leave device_id null.
-- IP is always captured server-side; device_id is best-effort (client-supplied).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_ip" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_device_id" text;

ALTER TABLE "clips" ADD COLUMN IF NOT EXISTS "upload_ip" text;
ALTER TABLE "clips" ADD COLUMN IF NOT EXISTS "upload_device_id" text;

ALTER TABLE "screenshots" ADD COLUMN IF NOT EXISTS "upload_ip" text;
ALTER TABLE "screenshots" ADD COLUMN IF NOT EXISTS "upload_device_id" text;

-- Indexes for gamefolio-bot's detection queries (correlating accounts/uploads
-- by shared device or IP). Partial indexes (WHERE ... IS NOT NULL) since most
-- historical rows will have nulls until clients roll out X-Device-Id.
CREATE INDEX IF NOT EXISTS "users_signup_device_id_idx" ON "users" ("signup_device_id") WHERE "signup_device_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "users_signup_ip_idx" ON "users" ("signup_ip") WHERE "signup_ip" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "clips_upload_device_id_idx" ON "clips" ("upload_device_id") WHERE "upload_device_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "clips_upload_ip_idx" ON "clips" ("upload_ip") WHERE "upload_ip" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "screenshots_upload_device_id_idx" ON "screenshots" ("upload_device_id") WHERE "upload_device_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "screenshots_upload_ip_idx" ON "screenshots" ("upload_ip") WHERE "upload_ip" IS NOT NULL;

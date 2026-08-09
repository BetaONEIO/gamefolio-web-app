-- Steam store-page ownership verification for indie developer profiles.
-- A dev proves they control their game's Steam listing by pasting a one-time
-- code into its public store description (checked via Steam's public
-- appdetails API — no Steamworks partner credentials ever touch Gamefolio).
-- steam_verified_app_id/steam_verified_at on users is the permanent record;
-- steam_verification_codes holds the short-lived pending code, same shape as
-- email_verification_tokens.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "steam_verified_app_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "steam_verified_at" timestamp;

CREATE TABLE IF NOT EXISTS "steam_verification_codes" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "steam_app_id" text NOT NULL,
  "code" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "steam_verification_codes_user_id_idx" ON "steam_verification_codes" ("user_id");

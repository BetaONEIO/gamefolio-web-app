-- OAuth2 provider tables for the Developer Platform.
-- These tables support "Login with Gamefolio" — external apps register
-- and get tokens to read/write a consenting user's data.
--
-- All statements use IF NOT EXISTS so this migration is idempotent:
-- safe to re-run without dropping existing data.

-- Registered developer apps
CREATE TABLE IF NOT EXISTS "oauth_clients" (
  "id" serial PRIMARY KEY,
  "client_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "client_secret_hash" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "logo_url" text,
  "owner_user_id" integer NOT NULL REFERENCES "users"("id"),
  "redirect_uris" text[] NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "oauth_clients_owner_idx" ON "oauth_clients" ("owner_user_id");

-- Short-lived authorization codes (Authorization Code grant, step 1). PKCE required.
CREATE TABLE IF NOT EXISTS "oauth_authorization_codes" (
  "id" serial PRIMARY KEY,
  "code_hash" text NOT NULL UNIQUE,
  "client_id" integer NOT NULL REFERENCES "oauth_clients"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "redirect_uri" text NOT NULL,
  "scope" text NOT NULL,
  "code_challenge" text NOT NULL,
  "code_challenge_method" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "oauth_auth_codes_hash_idx" ON "oauth_authorization_codes" ("code_hash");
CREATE INDEX IF NOT EXISTS "oauth_auth_codes_client_idx" ON "oauth_authorization_codes" ("client_id");
CREATE INDEX IF NOT EXISTS "oauth_auth_codes_user_idx" ON "oauth_authorization_codes" ("user_id");

-- Access tokens — opaque, hashed at rest (not JWTs) for O(1) revocation.
CREATE TABLE IF NOT EXISTS "oauth_access_tokens" (
  "id" serial PRIMARY KEY,
  "token_hash" text NOT NULL UNIQUE,
  "client_id" integer NOT NULL REFERENCES "oauth_clients"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "scope" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "last_used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "oauth_access_tokens_hash_idx" ON "oauth_access_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "oauth_access_tokens_user_client_idx" ON "oauth_access_tokens" ("user_id", "client_id");

-- Refresh tokens — separate table so rotation doesn't touch access-token rows.
CREATE TABLE IF NOT EXISTS "oauth_refresh_tokens" (
  "id" serial PRIMARY KEY,
  "token_hash" text NOT NULL UNIQUE,
  "access_token_id" integer NOT NULL REFERENCES "oauth_access_tokens"("id") ON DELETE CASCADE,
  "client_id" integer NOT NULL REFERENCES "oauth_clients"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "scope" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "rotated_to_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "oauth_refresh_tokens_hash_idx" ON "oauth_refresh_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "oauth_refresh_tokens_user_client_idx" ON "oauth_refresh_tokens" ("user_id", "client_id");

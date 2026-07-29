-- RFC 8252 §8.5 public-client support: desktop/mobile/CLI OAuth apps can't
-- keep a client_secret confidential (it ships inside the binary), so they
-- authenticate at /oauth/token with PKCE alone instead. client_secret_hash
-- becomes nullable for these ("public") clients; existing rows are all
-- "confidential" and keep their secret unchanged.

ALTER TABLE "oauth_clients" ADD COLUMN IF NOT EXISTS "client_type" text NOT NULL DEFAULT 'confidential';
ALTER TABLE "oauth_clients" ALTER COLUMN "client_secret_hash" DROP NOT NULL;

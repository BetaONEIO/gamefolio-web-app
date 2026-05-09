-- Push notification device tokens (FCM) and admin broadcast history.

CREATE TABLE IF NOT EXISTS "push_tokens" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "platform" text NOT NULL,
  "device_model" text,
  "app_version" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "last_seen_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "push_tokens_user_idx" ON "push_tokens" ("user_id");

CREATE TABLE IF NOT EXISTS "push_broadcasts" (
  "id" serial PRIMARY KEY,
  "sent_by_user_id" integer NOT NULL REFERENCES "users"("id"),
  "title" text NOT NULL,
  "body" text NOT NULL,
  "action_url" text,
  "audience" json NOT NULL,
  "recipient_count" integer NOT NULL DEFAULT 0,
  "success_count" integer NOT NULL DEFAULT 0,
  "failure_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Per-user daily job count for AI VOD-clip generation, so free vs Pro can be
-- rate-limited differently (local Whisper + Claude make this compute-heavy —
-- unlimited generation per user isn't viable). Mirrors the user_daily_imports
-- convention used elsewhere for Twitch clip-import limits.

CREATE TABLE IF NOT EXISTS "ai_clip_daily_usage" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "usage_date" text NOT NULL,
  "jobs_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE ("user_id", "usage_date")
);

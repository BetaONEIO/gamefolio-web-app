-- Developer-uploaded game builds. Object bytes live in Cloudflare R2; these
-- tables are the index over them (ownership, moderation state, quota usage).

CREATE TABLE IF NOT EXISTS "game_builds" (
  "id" serial PRIMARY KEY NOT NULL,
  "profile_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "build_type" text NOT NULL,
  "platform" text,
  "channel" text DEFAULT 'demo' NOT NULL,
  "label" text NOT NULL,
  "storage_key" text NOT NULL,
  "extracted_prefix" text,
  "web_entry_path" text,
  "original_file_name" text NOT NULL,
  "size_bytes" bigint NOT NULL,
  "stored_bytes" bigint,
  "checksum_sha256" text,
  "status" text DEFAULT 'pending_upload' NOT NULL,
  "review_notes" text,
  "reviewed_by" integer,
  "reviewed_at" timestamp,
  "download_count" integer DEFAULT 0 NOT NULL,
  "last_downloaded_at" timestamp,
  "hidden_at" timestamp,
  "hidden_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "game_builds_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "indie_game_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "game_builds_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "game_builds_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "game_builds_profile_idx"
  ON "game_builds" ("profile_id");
CREATE INDEX IF NOT EXISTS "game_builds_user_status_idx"
  ON "game_builds" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "game_builds_status_created_idx"
  ON "game_builds" ("status", "created_at");

-- One row per (build, visitor, UTC day): keeps download_count honest under
-- refreshes and makes pull-rate abuse visible.
CREATE TABLE IF NOT EXISTS "game_build_downloads" (
  "id" serial PRIMARY KEY NOT NULL,
  "build_id" integer NOT NULL,
  "user_id" integer,
  "visitor_key" text NOT NULL,
  "day_key" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "game_build_downloads_build_id_fkey"
    FOREIGN KEY ("build_id") REFERENCES "game_builds"("id") ON DELETE CASCADE,
  CONSTRAINT "game_build_downloads_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "game_build_downloads_unique_visitor_day"
  ON "game_build_downloads" ("build_id", "visitor_key", "day_key");
CREATE INDEX IF NOT EXISTS "game_build_downloads_build_created_idx"
  ON "game_build_downloads" ("build_id", "created_at");

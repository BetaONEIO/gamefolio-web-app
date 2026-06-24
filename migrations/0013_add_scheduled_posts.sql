-- Scheduled posts: clips/screenshots queued to publish at a future time.
-- The post is fully processed (thumbnails, transcode, Supabase upload) at
-- schedule time; `payload` holds the validated insert data and the background
-- worker promotes it into the real clips/screenshots table at scheduled_at.

CREATE TABLE IF NOT EXISTS "scheduled_posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content_type" text NOT NULL,
  "scheduled_at" timestamp NOT NULL,
  "status" text DEFAULT 'scheduled' NOT NULL,
  "payload" json NOT NULL,
  "title" text NOT NULL,
  "thumbnail_url" text,
  "video_type" text,
  "published_at" timestamp,
  "published_content_id" integer,
  "error_message" text,
  "attempts" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "scheduled_posts_due_idx" ON "scheduled_posts" ("status", "scheduled_at");
CREATE INDEX IF NOT EXISTS "scheduled_posts_user_idx" ON "scheduled_posts" ("user_id", "status");

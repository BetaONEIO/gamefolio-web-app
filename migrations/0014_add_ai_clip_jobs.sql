-- AI VOD-clip generation (POC): a user picks a past Twitch broadcast, the
-- server transcribes it locally (Whisper) and has Claude pick highlight-worthy
-- windows, then cuts and stages candidate clips for manual review/publish.

-- One row per "generate clips from this VOD" run.
CREATE TABLE IF NOT EXISTS "ai_clip_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "twitch_vod_id" text NOT NULL,
  "vod_title" text NOT NULL,
  "vod_duration_seconds" integer NOT NULL,
  "vod_thumbnail_url" text,
  -- queued | downloading | transcribing | analyzing | cutting | completed | failed
  "status" text DEFAULT 'queued' NOT NULL,
  "stage_progress" integer DEFAULT 0 NOT NULL,
  "error_reason" text,
  "candidate_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp
);
CREATE INDEX IF NOT EXISTS "ai_clip_jobs_user_idx" ON "ai_clip_jobs" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_clip_jobs_status_idx" ON "ai_clip_jobs" ("status");

-- Candidate highlight clips produced by a job, staged for review before
-- (optionally) being published into the real `clips` table.
CREATE TABLE IF NOT EXISTS "ai_clip_candidates" (
  "id" serial PRIMARY KEY NOT NULL,
  "job_id" integer NOT NULL REFERENCES "ai_clip_jobs" ("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "reasoning" text,
  "start_time" real NOT NULL,
  "end_time" real NOT NULL,
  "duration_seconds" real NOT NULL,
  "rank" integer DEFAULT 0 NOT NULL,
  "draft_video_path" text NOT NULL,
  "draft_video_url" text NOT NULL,
  "draft_thumbnail_path" text,
  "draft_thumbnail_url" text,
  -- pending | published | discarded
  "status" text DEFAULT 'pending' NOT NULL,
  "published_clip_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ai_clip_candidates_job_idx" ON "ai_clip_candidates" ("job_id");

-- Clip provenance, so AI-generated clips can be distinguished from manual
-- uploads / the (parked) Twitch clip-import feature.
ALTER TABLE "clips" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'upload';
ALTER TABLE "clips" ADD COLUMN IF NOT EXISTS "ai_job_id" integer REFERENCES "ai_clip_jobs" ("id");

-- Deferred FK: ai_clip_candidates.published_clip_id -> clips.id. Added after
-- both tables exist so table-creation order above doesn't matter.
DO $$ BEGIN
  ALTER TABLE "ai_clip_candidates"
    ADD CONSTRAINT "ai_clip_candidates_published_clip_id_fkey"
    FOREIGN KEY ("published_clip_id") REFERENCES "clips" ("id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

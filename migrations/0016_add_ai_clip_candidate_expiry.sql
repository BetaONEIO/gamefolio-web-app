-- Draft AI-generated clips are temporary storage, not a permanent home —
-- unpublished candidates expire and get cleaned up automatically so
-- abandoned generations don't accumulate in Supabase storage indefinitely.
-- Default backfills any existing rows; the app always sets an explicit
-- value on insert going forward.
ALTER TABLE "ai_clip_candidates"
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp DEFAULT (now() + interval '7 days') NOT NULL;

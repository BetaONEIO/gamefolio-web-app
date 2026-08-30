-- Background processing state for clips/reels.
--
-- Clip rows are now created immediately after the raw upload finishes
-- (status "processing", videoUrl pointing at the unprocessed raw file)
-- instead of waiting for ffmpeg trim/transcode/thumbnail work to complete.
-- A background worker finishes processing and flips status to "ready" (or
-- "failed"), so the upload UI can report 100% right away and the profile
-- page can show a thumbnail + "processing" badge in the meantime.

ALTER TABLE clips ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready';
ALTER TABLE clips ADD COLUMN IF NOT EXISTS processing_error text;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS raw_upload_path text;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS processing_attempts integer NOT NULL DEFAULT 0;

-- The reconciler scans for stuck "processing" rows on an interval; index it.
CREATE INDEX IF NOT EXISTS clips_status_idx ON clips (status) WHERE status != 'ready';

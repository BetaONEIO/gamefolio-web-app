-- A browser can lose the process-video response after the server has already
-- accepted an upload. Keep an authenticated client attempt key on the created
-- content so retries can acknowledge that record rather than make another one.

ALTER TABLE clips ADD COLUMN IF NOT EXISTS upload_attempt_id text;
CREATE UNIQUE INDEX IF NOT EXISTS clips_user_upload_attempt_idx
  ON clips (user_id, upload_attempt_id);

ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS upload_attempt_id text;
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_posts_user_upload_attempt_idx
  ON scheduled_posts (user_id, upload_attempt_id);
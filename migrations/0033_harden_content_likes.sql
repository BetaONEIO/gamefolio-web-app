-- Collapse duplicate likes, then enforce one row per account/content pair.
-- Safe to re-run. Only extra copies of the same pair are deleted, and the
-- earliest row is kept, so a visible like count changes only where duplicates
-- had inflated it.
--
-- This does not run on Railway deploy. Apply it manually with `bun run db:migrate`
-- after the idempotent like insert is deployed. The application inserts likes
-- without ON CONFLICT, so liking works before this file runs.
--
-- SHARE ROW EXCLUSIVE blocks writes and still allows reads. The same
-- transaction then builds the unique indexes, so a concurrent insert cannot
-- land a new duplicate between the delete and the index.

BEGIN;

SET LOCAL lock_timeout = '120s';

LOCK TABLE likes IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE screenshot_likes IN SHARE ROW EXCLUSIVE MODE;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, clip_id ORDER BY created_at, id) AS row_num
  FROM likes
)
DELETE FROM likes
WHERE id IN (SELECT id FROM ranked WHERE row_num > 1);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, screenshot_id ORDER BY created_at, id) AS row_num
  FROM screenshot_likes
)
DELETE FROM screenshot_likes
WHERE id IN (SELECT id FROM ranked WHERE row_num > 1);

CREATE UNIQUE INDEX IF NOT EXISTS likes_user_clip_unique
  ON likes (user_id, clip_id);

CREATE UNIQUE INDEX IF NOT EXISTS screenshot_likes_user_screenshot_unique
  ON screenshot_likes (user_id, screenshot_id);

COMMIT;

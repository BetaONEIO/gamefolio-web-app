-- Remove historical duplicates before enforcing one like per account/content pair.
-- Keep the earliest row so existing counts and timestamps change only where data was invalid.
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

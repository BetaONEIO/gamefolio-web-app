-- Authoritative XP system:
--   clip/reel upload: 250 XP
--   screenshot upload: 100 XP
--   valid view: 1 XP
--   unique fire received: 50 XP to the creator
--   lootbox: 1000 / 500 / 250 / 100 / 50 XP

ALTER TABLE "user_xp_history"
  ADD COLUMN IF NOT EXISTS "content_type" text,
  ADD COLUMN IF NOT EXISTS "content_id" integer,
  ADD COLUMN IF NOT EXISTS "reactor_id" integer REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "dedupe_key" text;

CREATE UNIQUE INDEX IF NOT EXISTS "user_xp_history_dedupe_key_unique"
  ON "user_xp_history" ("dedupe_key")
  WHERE "dedupe_key" IS NOT NULL;

-- The old fire records were awarded to the reactor and did not retain reactor
-- identity in a structured field, so they cannot be safely reattributed.
DELETE FROM "user_xp_history"
WHERE "source" = 'other'
  AND "description" ILIKE '%fire reaction%';

-- Reconstruct one creator award for each currently retained fire reaction.
-- DISTINCT ON also handles historical duplicate reaction rows for the same
-- reactor/content pair. The dedupe index protects concurrent runtime awards.
INSERT INTO "user_xp_history"
  ("user_id", "clip_id", "content_type", "content_id", "reactor_id",
   "dedupe_key", "xp_amount", "source", "description")
SELECT DISTINCT ON (r."clip_id", r."user_id")
  c."user_id",
  r."clip_id",
  'clip',
  r."clip_id",
  r."user_id",
  'fire_received:clip:' || r."clip_id" || ':' || r."user_id",
  50,
  'fire_received',
  'Received 50 XP for a fire reaction from user #' || r."user_id" ||
    ' on clip #' || r."clip_id"
FROM "clip_reactions" r
JOIN "clips" c ON c."id" = r."clip_id"
WHERE r."emoji" = '🔥'
  AND r."user_id" <> c."user_id"
ORDER BY r."clip_id", r."user_id", r."id"
ON CONFLICT DO NOTHING;

INSERT INTO "user_xp_history"
  ("content_type", "content_id", "reactor_id", "dedupe_key",
   "user_id", "xp_amount", "source", "description")
SELECT DISTINCT ON (r."screenshot_id", r."user_id")
  'screenshot',
  r."screenshot_id",
  r."user_id",
  'fire_received:screenshot:' || r."screenshot_id" || ':' || r."user_id",
  s."user_id",
  50,
  'fire_received',
  'Received 50 XP for a fire reaction from user #' || r."user_id" ||
    ' on screenshot #' || r."screenshot_id"
FROM "screenshot_reactions" r
JOIN "screenshots" s ON s."id" = r."screenshot_id"
WHERE r."emoji" = '🔥'
  AND r."user_id" <> s."user_id"
ORDER BY r."screenshot_id", r."user_id", r."id"
ON CONFLICT DO NOTHING;

-- Revalue the previous temporary upload backfill.
UPDATE "user_xp_history"
SET
  "xp_amount" = 100,
  "description" = regexp_replace("description", 'Earned (5|10) XP', 'Earned 100 XP')
WHERE "source" = 'upload'
  AND "description" ILIKE '%uploading a screenshot%'
  AND "xp_amount" IN (5, 10);

UPDATE "user_xp_history"
SET
  "xp_amount" = 250,
  "description" = regexp_replace("description", 'Earned (5|10) XP', 'Earned 250 XP')
WHERE "source" = 'upload'
  AND ("description" ILIKE '%uploading a clip%' OR "description" ILIKE '%uploading a reel%')
  AND "xp_amount" IN (5, 10);

UPDATE "user_xp_history"
SET
  "xp_amount" = CASE "xp_amount"
    WHEN 2000 THEN 1000
    WHEN 1000 THEN 500
    WHEN 500 THEN 250
    ELSE "xp_amount"
  END,
  "description" = CASE
    WHEN "xp_amount" = 2000 THEN regexp_replace("description", 'Earned 2000 XP', 'Earned 1000 XP')
    WHEN "xp_amount" = 1000 THEN regexp_replace("description", 'Earned 1000 XP', 'Earned 500 XP')
    WHEN "xp_amount" = 500 THEN regexp_replace("description", 'Earned 500 XP', 'Earned 250 XP')
    ELSE "description"
  END
WHERE "source" = 'lootbox'
  AND "xp_amount" IN (500, 1000, 2000);

UPDATE "asset_rewards"
SET "reward_value" = 1000, "name" = '1000 XP'
WHERE "id" = 16 AND "asset_type" = 'xp_reward';

UPDATE "asset_rewards"
SET "reward_value" = 500, "name" = '500 XP'
WHERE "id" = 15 AND "asset_type" = 'xp_reward';

UPDATE "asset_rewards"
SET "reward_value" = 250, "name" = '250 XP'
WHERE "id" = 13 AND "asset_type" = 'xp_reward';

UPDATE "asset_rewards"
SET "reward_value" = 100, "name" = '100 XP'
WHERE "id" = 12 AND "asset_type" = 'xp_reward';

UPDATE "asset_rewards"
SET "reward_value" = 50, "name" = '50 XP'
WHERE "id" = 14 AND "asset_type" = 'xp_reward';

-- total_xp historically included legacy points and temporary backfills.
-- Rebuild it from the authoritative XP ledger and refresh levels.
UPDATE "users" u
SET "total_xp" = COALESCE((
  SELECT SUM(h."xp_amount") FROM "user_xp_history" h
  WHERE h."user_id" = u."id"
), 0);
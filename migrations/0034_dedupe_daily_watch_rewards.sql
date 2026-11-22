-- Repair the historical watch-challenge bug and make the daily awards unique.
--
-- Before 2026-08-13 the application checked user_xp_history for awards that
-- were actually written to user_points_history. Every counted view after the
-- threshold could therefore award the same daily bonus again. The application
-- check was later corrected, but remained vulnerable to concurrent requests.
--
-- Keep the earliest positive award for each UTC calendar day, archive every
-- removed row for reversibility, correct cached totals/leaderboards, then add
-- a partial unique index as the durable concurrency guard.

BEGIN;

SELECT pg_advisory_xact_lock(184721, 20261122);

CREATE TABLE IF NOT EXISTS "user_points_history_duplicate_archive" (
  "original_id" integer PRIMARY KEY,
  "user_id" integer NOT NULL,
  "action" text NOT NULL,
  "points" real NOT NULL,
  "description" text,
  "created_at" timestamp NOT NULL,
  "archived_at" timestamp DEFAULT now() NOT NULL,
  "reason" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_points_history_duplicate_archive_user_idx"
  ON "user_points_history_duplicate_archive" ("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "watch_reward_repair_audit" (
  "repair_batch" text NOT NULL,
  "user_id" integer NOT NULL,
  "duplicate_rows" integer NOT NULL,
  "xp_removed" real NOT NULL,
  "total_xp_before" real NOT NULL,
  "level_before" integer NOT NULL,
  "total_xp_after" real,
  "level_after" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("repair_batch", "user_id")
);

-- Block award/cache writes for the short repair window so a concurrent award
-- cannot land between duplicate discovery and index creation.
LOCK TABLE "user_points_history", "users", "monthly_leaderboard", "weekly_leaderboard"
  IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE "_duplicate_daily_watch_rewards" ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    h."id",
    h."user_id",
    h."action",
    h."points",
    h."description",
    h."created_at",
    row_number() OVER (
      PARTITION BY h."user_id", h."action", h."created_at"::date
      ORDER BY h."created_at", h."id"
    ) AS award_number
  FROM "user_points_history" h
  WHERE h."action" IN ('watch_5_clips', 'watch_20_clips')
    AND h."points" > 0
)
SELECT "id", "user_id", "action", "points", "description", "created_at"
FROM ranked
WHERE award_number > 1;

INSERT INTO "watch_reward_repair_audit" (
  "repair_batch", "user_id", "duplicate_rows", "xp_removed",
  "total_xp_before", "level_before"
)
SELECT
  'watch-daily-dedupe-2026-11-22',
  d."user_id",
  COUNT(*)::integer,
  SUM(d."points"),
  u."total_xp",
  u."level"
FROM "_duplicate_daily_watch_rewards" d
JOIN "users" u ON u."id" = d."user_id"
GROUP BY d."user_id", u."total_xp", u."level"
ON CONFLICT ("repair_batch", "user_id") DO NOTHING;

INSERT INTO "user_points_history_duplicate_archive" (
  "original_id", "user_id", "action", "points", "description", "created_at", "reason"
)
SELECT
  "id", "user_id", "action", "points", "description", "created_at",
  'duplicate daily watch reward: retained earliest user/action/UTC-day award'
FROM "_duplicate_daily_watch_rewards"
ON CONFLICT ("original_id") DO NOTHING;

DELETE FROM "user_points_history" h
USING "_duplicate_daily_watch_rewards" d
WHERE h."id" = d."id";

-- total_xp is an incrementally maintained cache. Reverse exactly the awards
-- removed above while leaving unrelated historical cache drift untouched.
WITH corrections AS (
  SELECT "user_id", SUM("points") AS excess_xp
  FROM "_duplicate_daily_watch_rewards"
  GROUP BY "user_id"
)
UPDATE "users" u
SET
  "total_xp" = GREATEST(0, u."total_xp" - c.excess_xp),
  "updated_at" = now()
FROM corrections c
WHERE u."id" = c."user_id";

-- Refresh levels for affected users from their corrected cached total.
UPDATE "users" u
SET "level" = CASE
  WHEN u."total_xp" >= 995000
    THEN 50 + FLOOR((u."total_xp" - 995000) / 50000)
  WHEN u."total_xp" >= 951000 THEN 49
  WHEN u."total_xp" >= 908000 THEN 48
  WHEN u."total_xp" >= 866000 THEN 47
  WHEN u."total_xp" >= 825000 THEN 46
  WHEN u."total_xp" >= 785000 THEN 45
  WHEN u."total_xp" >= 746000 THEN 44
  WHEN u."total_xp" >= 708000 THEN 43
  WHEN u."total_xp" >= 671000 THEN 42
  WHEN u."total_xp" >= 635000 THEN 41
  WHEN u."total_xp" >= 600000 THEN 40
  WHEN u."total_xp" >= 566000 THEN 39
  WHEN u."total_xp" >= 533000 THEN 38
  WHEN u."total_xp" >= 501000 THEN 37
  WHEN u."total_xp" >= 470000 THEN 36
  WHEN u."total_xp" >= 440000 THEN 35
  WHEN u."total_xp" >= 411000 THEN 34
  WHEN u."total_xp" >= 383000 THEN 33
  WHEN u."total_xp" >= 356000 THEN 32
  WHEN u."total_xp" >= 330000 THEN 31
  WHEN u."total_xp" >= 305000 THEN 30
  WHEN u."total_xp" >= 281000 THEN 29
  WHEN u."total_xp" >= 258000 THEN 28
  WHEN u."total_xp" >= 236000 THEN 27
  WHEN u."total_xp" >= 215000 THEN 26
  WHEN u."total_xp" >= 195000 THEN 25
  WHEN u."total_xp" >= 176000 THEN 24
  WHEN u."total_xp" >= 158000 THEN 23
  WHEN u."total_xp" >= 141000 THEN 22
  WHEN u."total_xp" >= 125000 THEN 21
  WHEN u."total_xp" >= 110000 THEN 20
  WHEN u."total_xp" >= 96000 THEN 19
  WHEN u."total_xp" >= 83000 THEN 18
  WHEN u."total_xp" >= 71000 THEN 17
  WHEN u."total_xp" >= 60000 THEN 16
  WHEN u."total_xp" >= 50000 THEN 15
  WHEN u."total_xp" >= 41000 THEN 14
  WHEN u."total_xp" >= 33000 THEN 13
  WHEN u."total_xp" >= 26000 THEN 12
  WHEN u."total_xp" >= 20000 THEN 11
  WHEN u."total_xp" >= 15000 THEN 10
  WHEN u."total_xp" >= 11000 THEN 9
  WHEN u."total_xp" >= 8000 THEN 8
  WHEN u."total_xp" >= 5500 THEN 7
  WHEN u."total_xp" >= 3500 THEN 6
  WHEN u."total_xp" >= 2000 THEN 5
  WHEN u."total_xp" >= 1000 THEN 4
  WHEN u."total_xp" >= 500 THEN 3
  WHEN u."total_xp" >= 100 THEN 2
  ELSE 1
END
WHERE u."id" IN (
  SELECT DISTINCT "user_id" FROM "_duplicate_daily_watch_rewards"
);

UPDATE "watch_reward_repair_audit" a
SET
  "total_xp_after" = u."total_xp",
  "level_after" = u."level"
FROM "users" u
WHERE a."repair_batch" = 'watch-daily-dedupe-2026-11-22'
  AND a."user_id" = u."id";

-- Reverse the same rows from the incremental leaderboard caches.
WITH monthly_corrections AS (
  SELECT
    "user_id",
    to_char("created_at", 'YYYY-MM') AS month,
    extract(year FROM "created_at")::integer AS year,
    SUM("points") AS excess_xp
  FROM "_duplicate_daily_watch_rewards"
  GROUP BY "user_id", to_char("created_at", 'YYYY-MM'), extract(year FROM "created_at")
)
UPDATE "monthly_leaderboard" m
SET
  "total_points" = GREATEST(0, m."total_points" - c.excess_xp),
  "updated_at" = now()
FROM monthly_corrections c
WHERE m."user_id" = c."user_id"
  AND m."month" = c.month
  AND m."year" = c.year;

WITH weekly_corrections AS (
  SELECT
    "user_id",
    to_char("created_at", 'IYYY-"W"IW') AS week,
    extract(isoyear FROM "created_at")::integer AS year,
    SUM("points") AS excess_xp
  FROM "_duplicate_daily_watch_rewards"
  GROUP BY "user_id", to_char("created_at", 'IYYY-"W"IW'), extract(isoyear FROM "created_at")
)
UPDATE "weekly_leaderboard" w
SET
  "total_points" = GREATEST(0, w."total_points" - c.excess_xp),
  "updated_at" = now()
FROM weekly_corrections c
WHERE w."user_id" = c."user_id"
  AND w."week" = c.week
  AND w."year" = c.year;

-- Re-rank every period touched by a correction, including unaffected users in
-- that period so rank values remain globally consistent.
WITH affected_periods AS (
  SELECT DISTINCT
    to_char("created_at", 'YYYY-MM') AS month,
    extract(year FROM "created_at")::integer AS year
  FROM "_duplicate_daily_watch_rewards"
), ranked AS (
  SELECT
    m."id",
    row_number() OVER (
      PARTITION BY m."month", m."year"
      ORDER BY m."total_points" DESC, m."user_id" ASC
    ) AS new_rank
  FROM "monthly_leaderboard" m
  JOIN affected_periods p ON p.month = m."month" AND p.year = m."year"
)
UPDATE "monthly_leaderboard" m
SET "rank" = r.new_rank
FROM ranked r
WHERE m."id" = r."id";

WITH affected_periods AS (
  SELECT DISTINCT
    to_char("created_at", 'IYYY-"W"IW') AS week,
    extract(isoyear FROM "created_at")::integer AS year
  FROM "_duplicate_daily_watch_rewards"
), ranked AS (
  SELECT
    w."id",
    row_number() OVER (
      PARTITION BY w."week", w."year"
      ORDER BY w."total_points" DESC, w."user_id" ASC
    ) AS new_rank
  FROM "weekly_leaderboard" w
  JOIN affected_periods p ON p.week = w."week" AND p.year = w."year"
)
UPDATE "weekly_leaderboard" w
SET "rank" = r.new_rank
FROM ranked r
WHERE w."id" = r."id";

-- The application uses on-conflict-do-nothing for watch awards. This partial
-- unique index is the authoritative concurrency guard behind that operation.
CREATE UNIQUE INDEX IF NOT EXISTS "user_points_history_watch_daily_unique"
  ON "user_points_history" ("user_id", "action", (("created_at")::date))
  WHERE "action" IN ('watch_5_clips', 'watch_20_clips')
    AND "points" > 0;

COMMIT;


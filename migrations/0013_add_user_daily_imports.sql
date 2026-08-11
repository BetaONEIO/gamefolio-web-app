-- Daily Twitch-clip import allowance tracking (mirrors user_daily_fires).
-- Free users: 2 imports/day, Pro users: 10/day, reset by UTC day. The count is
-- incremented only when an imported clip is successfully posted.
--
-- Constraints are inlined so that on a DB that already has the table the whole
-- statement is skipped (IF NOT EXISTS) — avoiding a duplicate FK — while a fresh
-- DB gets the table, FK and unique constraint atomically.

CREATE TABLE IF NOT EXISTS "user_daily_imports" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "import_date" text NOT NULL,
  "imports_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE ("user_id", "import_date")
);

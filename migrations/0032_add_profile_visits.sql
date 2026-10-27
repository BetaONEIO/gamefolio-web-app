CREATE TABLE IF NOT EXISTS "profile_visits" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "visitor_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "visit_day" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "profile_visits_profile_visitor_day_unique"
  ON "profile_visits" ("profile_id", "visitor_id", "visit_day");
CREATE INDEX IF NOT EXISTS "profile_visits_profile_created_idx"
  ON "profile_visits" ("profile_id", "created_at");

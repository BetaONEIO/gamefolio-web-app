-- Admin on/off control for AI VOD-clip generation, so the feature can be
-- paused (e.g. if the local Whisper/Claude pipeline is overloaded) without a
-- deploy. Singleton row, same shape as banner_settings.

CREATE TABLE IF NOT EXISTS "ai_clip_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "disabled_message" text,
  "updated_by" integer REFERENCES "users" ("id"),
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Migration: Add indie_game_profiles and indie_game_field_overrides tables
-- These tables power the Indie Game Profile store integration system.

CREATE TABLE IF NOT EXISTS "indie_game_profiles" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "game_name" text,
  "short_description" text,
  "full_description" text,
  "header_image_url" text,
  "capsule_image_url" text,
  "trailer_url" text,
  "screenshot_urls" text[],
  "key_features" text[],
  "genres" text[],
  "tags" text[],
  "platforms" text[],
  "release_status" text,
  "release_date" text,
  "price" text,
  "studio_name" text,
  "studio_founded_year" integer,
  "studio_team_size" text,
  "studio_website" text,
  "studio_country" text,
  "website_url" text,
  "twitter_url" text,
  "discord_url" text,
  "steam_app_id" text,
  "steam_url" text,
  "steam_last_imported_at" timestamp,
  "epic_slug" text,
  "epic_url" text,
  "epic_last_imported_at" timestamp,
  "itch_url" text,
  "itch_last_imported_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "indie_game_profiles_user_id_unique" UNIQUE ("user_id")
);

CREATE INDEX IF NOT EXISTS "indie_game_profiles_user_id_idx" ON "indie_game_profiles" ("user_id");

CREATE TABLE IF NOT EXISTS "indie_game_field_overrides" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "field_name" text NOT NULL,
  "imported_value" text,
  "import_source" text,
  "is_manual_override" boolean DEFAULT false NOT NULL,
  "last_imported_at" timestamp,
  "last_edited_at" timestamp,
  CONSTRAINT "indie_game_field_overrides_user_field_unique" UNIQUE ("user_id", "field_name")
);

CREATE INDEX IF NOT EXISTS "indie_game_field_overrides_user_id_idx" ON "indie_game_field_overrides" ("user_id");

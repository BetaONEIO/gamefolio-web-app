-- Migration: Add indie_game_profiles and indie_game_field_overrides tables
-- These tables power the Indie Game Profile store integration system.

CREATE TABLE IF NOT EXISTS "indie_game_profiles" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,

  -- Section 1: Basic Info
  "game_name" text,
  "release_status" text DEFAULT 'coming_soon',
  "release_date" text,
  "price" text,
  "is_free" boolean DEFAULT false,

  -- Section 2: Studio
  "studio_name" text,
  "studio_founded_year" text,
  "studio_team_size" text,
  "studio_website" text,
  "studio_country" text,

  -- Section 3: Description
  "short_description" text,
  "full_description" text,

  -- Section 4: Features & Genre
  "key_features" text[],
  "genres" text[],
  "tags" text[],

  -- Section 5: Media
  "header_image_url" text,
  "capsule_image_url" text,
  "trailer_url" text,
  "screenshot_urls" text[],

  -- Section 6: Platforms
  "platforms" text[],

  -- Section 7: Store Links
  "steam_url" text,
  "steam_app_id" text,
  "epic_url" text,
  "epic_slug" text,
  "itch_url" text,

  -- Section 8: Social & Contact
  "website_url" text,
  "twitter_url" text,
  "discord_url" text,

  -- Store import tracking
  "steam_last_imported_at" timestamp,
  "epic_last_imported_at" timestamp,
  "itch_last_imported_at" timestamp,

  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "indie_game_profiles_user_id_idx" ON "indie_game_profiles" ("user_id");

-- Per-field import/override metadata
CREATE TABLE IF NOT EXISTS "indie_game_field_overrides" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "field_name" text NOT NULL,
  "imported_value" text,
  "import_source" text,
  "is_manual_override" boolean DEFAULT false NOT NULL,
  "use_imported" boolean DEFAULT false NOT NULL,
  "last_imported_at" timestamp,
  "last_edited_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "indie_game_field_overrides_user_field_unique" UNIQUE ("user_id", "field_name")
);

CREATE INDEX IF NOT EXISTS "indie_game_field_overrides_user_id_idx" ON "indie_game_field_overrides" ("user_id");

-- Add new columns idempotently (for existing deployments)
ALTER TABLE "indie_game_profiles" ADD COLUMN IF NOT EXISTS "age_rating" text;
ALTER TABLE "indie_game_profiles" ADD COLUMN IF NOT EXISTS "supported_languages" text[];
ALTER TABLE "indie_game_profiles" ADD COLUMN IF NOT EXISTS "content_descriptors" text[];
ALTER TABLE "indie_game_profiles" ADD COLUMN IF NOT EXISTS "auto_sync_enabled" boolean DEFAULT false;
ALTER TABLE "indie_game_profiles" ADD COLUMN IF NOT EXISTS "preferred_sync_source" text;
ALTER TABLE "indie_game_field_overrides" ADD COLUMN IF NOT EXISTS "use_imported" boolean DEFAULT false NOT NULL;

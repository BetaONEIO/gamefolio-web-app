-- Allow users to save a CSS gradient string as their profile background.
-- Used by the "Mayhem" preset theme and any future gradient presets.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_background_gradient_css" text;

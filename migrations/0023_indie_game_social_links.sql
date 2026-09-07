-- Game profiles need their own social links rather than inheriting the
-- developer's personal accounts. All fields are optional for compatibility
-- with existing profiles.

ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS twitch_url text;
ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS tiktok_url text;
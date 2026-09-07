-- Optional game-owned social links. Existing profiles remain valid with NULL
-- values, while developers can connect the channels players expect.

ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS twitch_url text;
ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS tiktok_url text;
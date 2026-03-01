-- Migration to add Xbox achievement fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS xbox_xuid TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_xbox_achievements BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xbox_achievements JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xbox_achievements_last_sync TIMESTAMP;

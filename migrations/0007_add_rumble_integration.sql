-- Migration to add Rumble streaming integration fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS rumble_channel_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rumble_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rumble_verified BOOLEAN DEFAULT FALSE;

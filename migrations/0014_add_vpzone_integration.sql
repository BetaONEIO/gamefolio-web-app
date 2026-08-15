-- Migration to add VPZone streaming integration fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS vpzone_channel_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vpzone_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vpzone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vpzone_show_on_profile BOOLEAN DEFAULT TRUE;

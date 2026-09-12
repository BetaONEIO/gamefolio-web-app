
-- Migration to add Streamer Partner columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_featured_stream_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_streamer_visible BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_applied_at TIMESTAMP;

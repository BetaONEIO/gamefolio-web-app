
-- Migration to add isPrivate column to users table
ALTER TABLE users ADD COLUMN is_private BOOLEAN DEFAULT FALSE;

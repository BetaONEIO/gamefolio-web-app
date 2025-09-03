-- Add authentication provider fields to users table
ALTER TABLE users 
ADD COLUMN auth_provider TEXT DEFAULT 'local',
ADD COLUMN external_id TEXT;
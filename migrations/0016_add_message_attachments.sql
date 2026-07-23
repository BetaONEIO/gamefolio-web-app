-- Adds GIF attachment support to messages. attachment_url holds a Tenor CDN
-- URL; attachment_type is "gif" (only value for now). content stays NOT NULL
-- and is sent as an empty string for GIF-only messages.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;

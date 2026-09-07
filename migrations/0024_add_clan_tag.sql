-- Optional COD-style clan tag shown before a user's display name.
ALTER TABLE users ADD COLUMN IF NOT EXISTS clan_tag text;
ALTER TABLE indie_game_profiles
  ADD COLUMN IF NOT EXISTS available_regions text[];
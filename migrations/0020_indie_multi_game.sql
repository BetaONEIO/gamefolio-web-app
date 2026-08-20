-- Multi-game support for indie developers.
--
-- indie_game_profiles previously carried UNIQUE (user_id), hard-limiting each
-- developer to a single game. Every read/write keyed off user_id alone. This
-- migration lifts that limit while keeping existing behaviour intact:
--   * each user's existing row becomes their primary game
--   * a partial unique index keeps exactly one primary per user
--   * dependent rows (field overrides, updates) gain a game_id and are
--     backfilled onto that primary game
--
-- Endpoints treat a missing gameId as "the primary game", so callers that
-- predate multi-game keep working unchanged.

-- 1. Drop the one-game-per-user constraint.
ALTER TABLE indie_game_profiles DROP CONSTRAINT IF EXISTS indie_game_profiles_user_id_key;

-- 2. Primary-game flag + explicit ordering for the game switcher.
ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;
ALTER TABLE indie_game_profiles ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 3. Backfill: the oldest row per user becomes that user's primary game.
UPDATE indie_game_profiles p
   SET is_primary = true
  FROM (
    SELECT DISTINCT ON (user_id) id
      FROM indie_game_profiles
     ORDER BY user_id, created_at ASC, id ASC
  ) first_rows
 WHERE p.id = first_rows.id
   AND NOT EXISTS (
     SELECT 1 FROM indie_game_profiles q
      WHERE q.user_id = p.user_id AND q.is_primary
   );

-- 4. At most one primary per user. Partial index so non-primary rows are unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS indie_game_profiles_one_primary_per_user
    ON indie_game_profiles (user_id)
 WHERE is_primary;

-- 5. Field overrides become per-game rather than per-user.
ALTER TABLE indie_game_field_overrides
  ADD COLUMN IF NOT EXISTS game_id integer REFERENCES indie_game_profiles(id) ON DELETE CASCADE;

UPDATE indie_game_field_overrides o
   SET game_id = p.id
  FROM indie_game_profiles p
 WHERE o.game_id IS NULL
   AND p.user_id = o.user_id
   AND p.is_primary;

-- Replace the per-user uniqueness with per-game uniqueness.
ALTER TABLE indie_game_field_overrides
  DROP CONSTRAINT IF EXISTS indie_game_field_overrides_user_id_field_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS indie_game_field_overrides_game_field_key
    ON indie_game_field_overrides (game_id, field_name)
 WHERE game_id IS NOT NULL;

-- 6. Updates become attributable to a specific game (nullable: studio-wide
--    announcements are still valid with no game attached).
ALTER TABLE indie_game_updates
  ADD COLUMN IF NOT EXISTS game_id integer REFERENCES indie_game_profiles(id) ON DELETE CASCADE;

UPDATE indie_game_updates u
   SET game_id = p.id
  FROM indie_game_profiles p
 WHERE u.game_id IS NULL
   AND p.user_id = u.user_id
   AND p.is_primary;

-- 7. Lookup index for the switcher / list endpoint.
CREATE INDEX IF NOT EXISTS indie_game_profiles_user_sort_idx
    ON indie_game_profiles (user_id, sort_order, id);

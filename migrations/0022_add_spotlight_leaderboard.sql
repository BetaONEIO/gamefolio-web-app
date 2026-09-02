-- POC: "Spotlight Leaderboard" — an outbid.lol-style pay-to-rank feature.
-- Members spend GFT (their off-chain gf_token_balance on the users table) to
-- hold the #1 spot in a category. Outbidding someone does NOT refund their
-- GFT — that's what makes the ladder self-funding, mirroring the outbid.lol
-- mechanic this is prototyping.
--
-- The ladder is split across three boards — 'gamers', 'streamers' and 'games'
-- — each with its own independent ranking. On the gamers/streamers boards the
-- claiming user is the subject, so game_id is NULL; only the games board
-- points at an indie_game_profiles row.
--
-- Written to be re-runnable: the ALTERs below bring an earlier, games-only
-- version of this table (game_id NOT NULL, no board column) up to date, so it
-- is safe to apply whether or not a previous revision already ran.

CREATE TABLE IF NOT EXISTS spotlight_claims (
  id serial PRIMARY KEY,
  board text NOT NULL DEFAULT 'games',
  game_id integer REFERENCES indie_game_profiles(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'overall',
  gft_amount integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Upgrade path from the games-only revision.
ALTER TABLE spotlight_claims ADD COLUMN IF NOT EXISTS board text NOT NULL DEFAULT 'games';
ALTER TABLE spotlight_claims ALTER COLUMN game_id DROP NOT NULL;

-- The hot query is "active #1 for this board + category".
DROP INDEX IF EXISTS spotlight_claims_category_active_idx;
CREATE INDEX IF NOT EXISTS spotlight_claims_board_category_active_idx
  ON spotlight_claims (board, category, is_active);

-- A board's category can only have one active #1 at a time. Enforced in the
-- DB as well as the route so a race between two claims can't seat two winners.
CREATE UNIQUE INDEX IF NOT EXISTS spotlight_claims_one_active_per_slot_idx
  ON spotlight_claims (board, category) WHERE is_active;

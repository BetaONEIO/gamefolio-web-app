-- POC: "Spotlight Leaderboard" — an outbid.lol-style pay-to-rank feature.
-- Indie devs spend GFT (their off-chain gf_token_balance on the users table)
-- to hold the #1 spot for their game in a category. Outbidding someone does
-- NOT refund their GFT — that's what makes the ladder self-funding, mirroring
-- the outbid.lol mechanic this is prototyping.

CREATE TABLE IF NOT EXISTS spotlight_claims (
  id serial PRIMARY KEY,
  game_id integer NOT NULL REFERENCES indie_game_profiles(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'overall',
  gft_amount integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spotlight_claims_category_active_idx
  ON spotlight_claims (category, is_active);

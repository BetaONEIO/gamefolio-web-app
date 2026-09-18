-- Preserve the referral code used during registration separately from the
-- mutable post-registration referral field. Existing rows are intentionally
-- not backfilled because referred_by cannot distinguish signup from later use.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS original_signup_referral_code TEXT;

-- The theme is one collection item. It is not a lootbox drop or an avatar
-- border, and is claimed automatically only for users who used a referral at
-- signup.
INSERT INTO asset_rewards (
  name,
  image_url,
  asset_type,
  category,
  rarity,
  unlock_chance,
  times_rewarded,
  is_active,
  available_in_lootbox,
  available_in_store,
  pro_only,
  free_item,
  redeemable,
  reward_category,
  source_path
)
SELECT
  'Towerdog Pixel Surge',
  '/attached_assets/red-blue-pixel-waves-border.png',
  'profile_theme',
  'static',
  'legendary',
  0,
  0,
  true,
  false,
  false,
  false,
  false,
  false,
  'other',
  'towerdog_pixel_surge'
WHERE NOT EXISTS (
  SELECT 1
  FROM asset_rewards
  WHERE source_path = 'towerdog_pixel_surge'
);
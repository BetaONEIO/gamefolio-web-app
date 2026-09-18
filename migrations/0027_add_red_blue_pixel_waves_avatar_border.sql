-- Register the red-and-blue pixel-wave avatar border in the existing
-- asset-reward catalog. The local public URL keeps the transparent PNG
-- available everywhere the shared CustomAvatar renderer is used.
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
  'Red Blue Pixel Waves',
  '/attached_assets/red-blue-pixel-waves-border.png',
  'avatar_border',
  'static',
  'legendary',
  0,
  0,
  true,
  true,
  false,
  false,
  false,
  false,
  'lootbox',
  'red_blue_pixel_waves'
WHERE NOT EXISTS (
  SELECT 1
  FROM asset_rewards
  WHERE source_path = 'red_blue_pixel_waves'
     OR name = 'Red Blue Pixel Waves'
);
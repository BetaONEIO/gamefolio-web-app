ALTER TABLE clips ADD COLUMN IF NOT EXISTS campaign_upload boolean NOT NULL DEFAULT false;
ALTER TABLE screenshots ADD COLUMN IF NOT EXISTS campaign_upload boolean NOT NULL DEFAULT false;
ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS game_page_rights jsonb;

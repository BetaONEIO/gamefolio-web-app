ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS confirmed_terms JSONB;
ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS management_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS draft_setup JSONB;
UPDATE campaign_instances SET status='live', lifecycle_state='accepting' WHERE status='in_progress';

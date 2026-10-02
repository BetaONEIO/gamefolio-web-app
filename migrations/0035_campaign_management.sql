ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS applications_paused BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS campaign_management_events (
 id SERIAL PRIMARY KEY, instance_id INTEGER NOT NULL REFERENCES campaign_instances(id),
 event_type TEXT NOT NULL, actor_user_id INTEGER, detail TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

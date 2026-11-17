-- Durable per-recipient deduplication for uploads and season announcements.
-- Claims survive inbox deletion; the claim and notification are inserted in
-- one transaction so a failed insert can be retried safely.
CREATE TABLE IF NOT EXISTS notification_event_claims (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_event_claims_user_event_unique UNIQUE (user_id, event_key)
);

-- Media moderation: per-row status on clips, screenshots, and user avatars,
-- plus review queue and appeal tables for admin oversight.

-- Clips
ALTER TABLE clips
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE clips
  ADD COLUMN IF NOT EXISTS moderation_labels JSON;
ALTER TABLE clips
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP;
ALTER TABLE clips
  ADD COLUMN IF NOT EXISTS moderation_provider TEXT;

-- Existing rows predate moderation — mark them approved so feeds keep working.
UPDATE clips SET moderation_status = 'approved', moderated_at = NOW()
  WHERE moderation_status = 'pending' AND created_at < NOW();

CREATE INDEX IF NOT EXISTS clips_moderation_status_idx ON clips (moderation_status);

-- Screenshots
ALTER TABLE screenshots
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE screenshots
  ADD COLUMN IF NOT EXISTS moderation_labels JSON;
ALTER TABLE screenshots
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP;
ALTER TABLE screenshots
  ADD COLUMN IF NOT EXISTS moderation_provider TEXT;

UPDATE screenshots SET moderation_status = 'approved', moderated_at = NOW()
  WHERE moderation_status = 'pending' AND created_at < NOW();

CREATE INDEX IF NOT EXISTS screenshots_moderation_status_idx ON screenshots (moderation_status);

-- Users (avatar only)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_moderation_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_moderation_labels JSON;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_moderated_at TIMESTAMP;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_moderation_provider TEXT;

-- Review queue
CREATE TABLE IF NOT EXISTS media_moderation_queue (
  id SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  auto_action TEXT NOT NULL,
  labels JSON,
  confidence_max NUMERIC,
  provider TEXT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_decision TEXT,
  reviewer_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_moderation_queue_status_idx
  ON media_moderation_queue (status, created_at);
CREATE INDEX IF NOT EXISTS media_moderation_queue_user_id_idx
  ON media_moderation_queue (user_id);
CREATE INDEX IF NOT EXISTS media_moderation_queue_content_idx
  ON media_moderation_queue (content_type, content_id);

-- Appeals
CREATE TABLE IF NOT EXISTS media_moderation_appeals (
  id SERIAL PRIMARY KEY,
  queue_id INTEGER NOT NULL REFERENCES media_moderation_queue(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_moderation_appeals_status_idx
  ON media_moderation_appeals (status, created_at);
CREATE INDEX IF NOT EXISTS media_moderation_appeals_user_id_idx
  ON media_moderation_appeals (user_id);

-- Tunable thresholds per label (admins edit via API)
CREATE TABLE IF NOT EXISTS media_moderation_thresholds (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  reject_threshold NUMERIC NOT NULL,
  flag_threshold NUMERIC NOT NULL,
  gaming_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed sensible defaults. Service falls back to these if the table is empty.
INSERT INTO media_moderation_thresholds (label, reject_threshold, flag_threshold, gaming_suppressed) VALUES
  ('Explicit Nudity',        90, 60, FALSE),
  ('Nudity',                 90, 60, FALSE),
  ('Suggestive',             95, 70, FALSE),
  ('Graphic Violence Or Gore', 90, 60, FALSE),
  ('Violence',               95, 80, TRUE),
  ('Weapons',                95, 85, TRUE),
  ('Weapon Violence',        95, 80, TRUE),
  ('Hate Symbols',           85, 55, FALSE),
  ('Visually Disturbing',    90, 65, FALSE),
  ('Drugs & Tobacco',        92, 70, FALSE),
  ('Gambling',               92, 70, FALSE)
ON CONFLICT (label) DO NOTHING;

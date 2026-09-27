-- Campaign lifecycle/security hardening.  All changes are additive so
-- launched and completed campaigns retain their original snapshots.

-- The programme tables predate the migration runner and are normally created
-- during server boot. Creating their existing shape here keeps a fresh
-- database migratable before that boot-time setup runs.
CREATE TABLE IF NOT EXISTS campaign_templates (
  id serial PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
  category text NOT NULL, description text, best_use_case text,
  artwork_url text, duration integer NOT NULL, participant_capacity integer NOT NULL DEFAULT 0,
  demo_keys_required integer NOT NULL DEFAULT 0, full_keys_required integer NOT NULL DEFAULT 0,
  completion_reward text DEFAULT 'full_game_key', completion_reward_description text,
  campaign_price integer DEFAULT 0, estimated_clips integer DEFAULT 0,
  estimated_reels integer DEFAULT 0, estimated_screenshots integer DEFAULT 0,
  estimated_feedback integer DEFAULT 0, estimated_views_min integer DEFAULT 0,
  estimated_views_max integer DEFAULT 0, bounty_xp_reward integer DEFAULT 0,
  completion_bonus_xp integer DEFAULT 0, reward_config jsonb, status text DEFAULT 'available',
  featured boolean DEFAULT false, recommended boolean DEFAULT false,
  display_order integer DEFAULT 0, created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE TABLE IF NOT EXISTS campaign_template_bounties (
  id serial PRIMARY KEY, template_id integer NOT NULL REFERENCES campaign_templates(id) ON DELETE CASCADE,
  title text NOT NULL, description text, mandatory boolean DEFAULT true, quantity integer DEFAULT 1,
  completion_order integer DEFAULT 0, xp_reward integer DEFAULT 500,
  validation_method text DEFAULT 'manual_review', content_type text
);
CREATE TABLE IF NOT EXISTS campaign_instances (
  id serial PRIMARY KEY, template_id integer NOT NULL REFERENCES campaign_templates(id),
  developer_user_id integer, campaign_title text, description text,
  regions text DEFAULT 'worldwide', platforms text[], game_id integer, game_name text,
  game_artwork_url text, game_steam_app_id text, game_itch_url text, game_epic_slug text,
  artwork_url text, start_type text DEFAULT 'asap', scheduled_start timestamp,
  actual_start timestamp, end_date timestamp, auto_campaign boolean DEFAULT false,
  auto_campaign_settings jsonb, status text DEFAULT 'draft', admin_notes text,
  rejection_reason text, submitted_at timestamp, approved_at timestamp,
  created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now(),
  bounty_xp_reward integer, completion_bonus_xp integer, reward_config jsonb,
  gamefolio_managed boolean DEFAULT false, xp_event_multiplier real DEFAULT 1
);
CREATE TABLE IF NOT EXISTS game_key_batches (
  id serial PRIMARY KEY, instance_id integer REFERENCES campaign_instances(id) ON DELETE CASCADE,
  key_type text NOT NULL, total_keys integer DEFAULT 0, valid_keys integer DEFAULT 0,
  duplicate_keys integer DEFAULT 0, invalid_keys integer DEFAULT 0,
  distributed_keys integer DEFAULT 0, created_at timestamp DEFAULT now(),
  developer_user_id integer
);
CREATE TABLE IF NOT EXISTS game_keys (
  id serial PRIMARY KEY, batch_id integer REFERENCES game_key_batches(id) ON DELETE CASCADE,
  instance_id integer REFERENCES campaign_instances(id) ON DELETE SET NULL,
  developer_user_id integer, key_type text NOT NULL, key_value text,
  status text DEFAULT 'available', assigned_user_id integer, assigned_at timestamp,
  created_at timestamp DEFAULT now()
);
CREATE TABLE IF NOT EXISTS campaign_participants (
  id serial PRIMARY KEY, instance_id integer NOT NULL REFERENCES campaign_instances(id),
  user_id integer NOT NULL, status text DEFAULT 'enrolled',
  demo_key_id integer REFERENCES game_keys(id), full_key_id integer REFERENCES game_keys(id),
  joined_at timestamp DEFAULT now(), completed_at timestamp,
  deadline timestamp, notes text, UNIQUE(instance_id, user_id)
);
CREATE TABLE IF NOT EXISTS campaign_bounty_submissions (
  id serial PRIMARY KEY, instance_id integer NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
  participant_id integer NOT NULL, bounty_id integer NOT NULL REFERENCES campaign_template_bounties(id),
  content_type text NOT NULL, clip_id integer, screenshot_id integer, reel_id integer,
  content_url text, content_data jsonb, status text DEFAULT 'pending',
  review_notes text, submitted_at timestamp DEFAULT now(), reviewed_at timestamp,
  xp_awarded integer DEFAULT 0
);

ALTER TABLE campaign_templates
  ADD COLUMN IF NOT EXISTS access_method text NOT NULL DEFAULT 'demo_to_full',
  ADD COLUMN IF NOT EXISTS application_period_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS completion_deadline_days integer,
  ADD COLUMN IF NOT EXISTS objective_config jsonb,
  ADD COLUMN IF NOT EXISTS max_places integer,
  ADD COLUMN IF NOT EXISTS requires_access_key boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_thresholds_hours integer[] NOT NULL DEFAULT ARRAY[72,48,24,6];

-- Legacy game-bounty routes use these tables too. New writes store encrypted
-- key envelopes in the existing pool columns and never expose them directly.
CREATE TABLE IF NOT EXISTS game_bounty_acceptances (
  id serial PRIMARY KEY, bounty_id integer NOT NULL, user_id integer NOT NULL,
  status text DEFAULT 'active', demo_key text, full_key text,
  clips_uploaded integer DEFAULT 0, reels_uploaded integer DEFAULT 0,
  screenshots_uploaded integer DEFAULT 0, total_views integer DEFAULT 0,
  xp_earned integer DEFAULT 0, progress_percent integer DEFAULT 0,
  joined_at timestamp DEFAULT now(), completed_at timestamp,
  completed_badge_awarded boolean DEFAULT false, created_at timestamp DEFAULT now()
);
ALTER TABLE game_bounty_acceptances
  ADD COLUMN IF NOT EXISTS demo_key_ciphertext text,
  ADD COLUMN IF NOT EXISTS demo_key_iv text,
  ADD COLUMN IF NOT EXISTS demo_key_auth_tag text,
  ADD COLUMN IF NOT EXISTS full_key_ciphertext text,
  ADD COLUMN IF NOT EXISTS full_key_iv text,
  ADD COLUMN IF NOT EXISTS full_key_auth_tag text,
  ADD COLUMN IF NOT EXISTS demo_key_version text,
  ADD COLUMN IF NOT EXISTS demo_keyring_id text,
  ADD COLUMN IF NOT EXISTS full_key_version text,
  ADD COLUMN IF NOT EXISTS full_keyring_id text;

ALTER TABLE campaign_instances
  ADD COLUMN IF NOT EXISTS access_method text,
  ADD COLUMN IF NOT EXISTS access_instructions text,
  ADD COLUMN IF NOT EXISTS completion_reward_type text,
  ADD COLUMN IF NOT EXISTS completion_reward_key_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS application_period_days integer,
  ADD COLUMN IF NOT EXISTS creator_deadline_days integer,
  ADD COLUMN IF NOT EXISTS max_places integer,
  ADD COLUMN IF NOT EXISTS capacity_source text,
  ADD COLUMN IF NOT EXISTS estimate_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS objective_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS manual_approval_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_game_verification_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_access_key boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_thresholds_hours integer[];
UPDATE campaign_instances
SET reminder_thresholds_hours = NULL
WHERE reminder_thresholds_hours = ARRAY[72,48,24,6];

CREATE TABLE IF NOT EXISTS campaign_participant_reminder_events (
  id serial PRIMARY KEY,
  participant_id integer NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
  instance_id integer NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
  threshold_hours integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  claimed_at timestamp,
  sent_at timestamp,
  last_error text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (participant_id, threshold_hours)
);

CREATE TABLE IF NOT EXISTS campaign_applications (
  id serial PRIMARY KEY,
  instance_id integer NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
  user_id integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by integer,
  reviewed_at timestamp,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (instance_id, user_id)
);

CREATE TABLE IF NOT EXISTS campaign_keyrings (
  id serial PRIMARY KEY,
  keyring_id text NOT NULL,
  key_version text NOT NULL,
  provider text NOT NULL DEFAULT 'environment',
  status text NOT NULL DEFAULT 'active',
  created_at timestamp NOT NULL DEFAULT now(),
  retired_at timestamp,
  UNIQUE (keyring_id, key_version)
);

CREATE TABLE IF NOT EXISTS legacy_bounty_reward_events (
  id serial PRIMARY KEY,
  bounty_id integer NOT NULL,
  user_id integer NOT NULL,
  reward_type text NOT NULL,
  reward_key text NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  last_error text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (bounty_id, user_id, reward_type, reward_key)
);

-- Do not remove key_value yet: this permits a controlled, reversible
-- migration of legacy rows. New rows use only the encrypted columns.
ALTER TABLE game_keys
  ALTER COLUMN key_value DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS key_pool text NOT NULL DEFAULT 'access',
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS key_ciphertext text,
  ADD COLUMN IF NOT EXISTS key_iv text,
  ADD COLUMN IF NOT EXISTS key_auth_tag text,
  ADD COLUMN IF NOT EXISTS key_version text,
  ADD COLUMN IF NOT EXISTS keyring_id text,
  ADD COLUMN IF NOT EXISTS key_hash text,
  ADD COLUMN IF NOT EXISTS revealed_at timestamp,
  ADD COLUMN IF NOT EXISTS rewarded_at timestamp,
  ADD COLUMN IF NOT EXISTS removed_at timestamp;

-- Legacy full-key columns represented completion rewards, not participant
-- access. Preserve that meaning while leaving explicit new pool assignments
-- untouched.
UPDATE game_keys
SET key_pool = 'reward'
WHERE key_type = 'full' AND key_pool = 'access' AND key_value IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS game_keys_key_hash_unique
  ON game_keys (developer_user_id, key_type, key_hash)
  WHERE key_hash IS NOT NULL AND status <> 'removed';
CREATE INDEX IF NOT EXISTS game_keys_pool_status_idx
  ON game_keys (instance_id, key_pool, key_type, status);

ALTER TABLE campaign_participants
  ADD COLUMN IF NOT EXISTS access_key_id integer REFERENCES game_keys(id),
  ADD COLUMN IF NOT EXISTS access_accepted_at timestamp,
  ADD COLUMN IF NOT EXISTS access_revealed_at timestamp,
  ADD COLUMN IF NOT EXISTS completion_deadline timestamp,
  ADD COLUMN IF NOT EXISTS extension_requested_at timestamp,
  ADD COLUMN IF NOT EXISTS extension_hours integer,
  ADD COLUMN IF NOT EXISTS extension_status text,
  ADD COLUMN IF NOT EXISTS grace_period_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_game_declared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_game_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_bonus_awarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_reward_key_id integer REFERENCES game_keys(id),
  ADD COLUMN IF NOT EXISTS expired_at timestamp;

CREATE INDEX IF NOT EXISTS campaign_participants_deadline_idx
  ON campaign_participants (status, completion_deadline);

CREATE TABLE IF NOT EXISTS campaign_key_events (
  id serial PRIMARY KEY,
  key_id integer NOT NULL REFERENCES game_keys(id) ON DELETE CASCADE,
  instance_id integer REFERENCES campaign_instances(id) ON DELETE SET NULL,
  participant_id integer REFERENCES campaign_participants(id) ON DELETE SET NULL,
  actor_user_id integer,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaign_key_events_key_idx
  ON campaign_key_events (key_id, created_at);

ALTER TABLE campaign_bounty_submissions
  ADD COLUMN IF NOT EXISTS creator_id integer,
  ADD COLUMN IF NOT EXISTS participation_id integer,
  ADD COLUMN IF NOT EXISTS game_id integer,
  ADD COLUMN IF NOT EXISTS objective_id integer,
  ADD COLUMN IF NOT EXISTS content_id integer,
  ADD COLUMN IF NOT EXISTS submission_type text,
  ADD COLUMN IF NOT EXISTS validation_state text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS objective_state text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS validation_details jsonb;
CREATE INDEX IF NOT EXISTS campaign_submissions_participant_objective_idx
  ON campaign_bounty_submissions (participant_id, bounty_id, objective_state);

CREATE TABLE IF NOT EXISTS campaign_reward_events (
  id serial PRIMARY KEY,
  instance_id integer NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
  participant_id integer NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  reward_key text NOT NULL,
  amount integer,
  key_id integer REFERENCES game_keys(id),
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (participant_id, reward_type, reward_key)
);
ALTER TABLE campaign_reward_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();

-- Historical rows are intentionally not reinterpreted. These defaults only
-- make the new lifecycle fields meaningful for future participants.
UPDATE campaign_instances
SET lifecycle_state = CASE
  WHEN status IN ('live', 'approved') THEN 'accepting'
  WHEN status IN ('completed', 'cancelled', 'rejected') THEN status
  ELSE 'draft'
END
WHERE lifecycle_state = 'draft';
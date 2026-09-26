ALTER TABLE campaign_instances
  ADD COLUMN IF NOT EXISTS stream_config JSONB;

COMMENT ON COLUMN campaign_instances.stream_config IS
  'Developer-defined livestream requirements. Frozen when participation begins.';
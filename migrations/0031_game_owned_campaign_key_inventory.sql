-- Game-owned key inventory. Untagged developer pools remain unassigned because
-- their game ownership cannot be proven from the stored data.
ALTER TABLE game_keys
  ADD COLUMN IF NOT EXISTS game_id integer,
  ADD COLUMN IF NOT EXISTS assigned_participant_id integer;

UPDATE game_keys gk
SET game_id = ci.game_id
FROM campaign_instances ci
WHERE gk.instance_id = ci.id
  AND gk.game_id IS NULL
  AND ci.game_id IS NOT NULL
  AND (
    gk.developer_user_id = ci.developer_user_id
    OR (
      gk.developer_user_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM game_key_batches gkb
        WHERE gkb.id = gk.batch_id
          AND gkb.developer_user_id = ci.developer_user_id
      )
    )
  );

-- Do not reclassify or delete legacy full keys here. In particular, encrypted
-- legacy keys have a NULL key_value; approval recognizes those as reward keys
-- from their instance-bound provenance without treating them as access keys.

CREATE INDEX IF NOT EXISTS game_keys_game_inventory_idx
  ON game_keys (game_id, key_pool, key_type, status)
  WHERE game_id IS NOT NULL;

-- Terminal campaign transitions return only unclaimed reservations. The game
-- tag guard intentionally leaves ambiguous historical reservations untouched.
CREATE OR REPLACE FUNCTION release_unused_game_campaign_keys() RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('rejected', 'cancelled', 'completed')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE game_keys
    SET instance_id = NULL, status = 'available'
    WHERE instance_id = NEW.id
      AND game_id IS NOT NULL
      AND status = 'reserved'
      AND revealed_at IS NULL
      AND assigned_user_id IS NULL
      AND assigned_participant_id IS NULL
      AND rewarded_at IS NULL
      AND removed_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_release_unused_game_keys ON campaign_instances;
CREATE TRIGGER campaign_release_unused_game_keys
AFTER UPDATE OF status ON campaign_instances
FOR EACH ROW EXECUTE FUNCTION release_unused_game_campaign_keys();
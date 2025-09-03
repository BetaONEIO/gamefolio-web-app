
-- Add shareCode column to clips table
ALTER TABLE clips ADD COLUMN share_code text;
CREATE UNIQUE INDEX clips_share_code_unique ON clips (share_code);

-- Add shareCode column to screenshots table  
ALTER TABLE screenshots ADD COLUMN share_code text;
CREATE UNIQUE INDEX screenshots_share_code_unique ON screenshots (share_code);

-- Update existing clips with generated share codes
UPDATE clips SET share_code = SUBSTR(MD5(RANDOM()::text), 1, 8) WHERE share_code IS NULL;

-- Update existing screenshots with generated share codes
UPDATE screenshots SET share_code = SUBSTR(MD5(RANDOM()::text), 1, 8) WHERE share_code IS NULL;

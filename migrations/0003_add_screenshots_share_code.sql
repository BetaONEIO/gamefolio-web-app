
-- Add share_code column to screenshots table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='screenshots' 
        AND column_name='share_code'
    ) THEN
        ALTER TABLE screenshots ADD COLUMN share_code TEXT;
        
        -- Generate share codes for existing screenshots
        UPDATE screenshots 
        SET share_code = UPPER(SUBSTR(MD5(RANDOM()::TEXT || id::TEXT), 1, 8))
        WHERE share_code IS NULL;
        
        -- Add unique constraint
        ALTER TABLE screenshots ADD CONSTRAINT screenshots_share_code_unique UNIQUE (share_code);
        
        -- Add not null constraint
        ALTER TABLE screenshots ALTER COLUMN share_code SET NOT NULL;
    END IF;
END $$;


-- Update existing clips and screenshots with alphanumeric share codes

-- Function to generate alphanumeric string
CREATE OR REPLACE FUNCTION generate_alphanumeric(length INTEGER)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update clips with alphanumeric share codes
DO $$
DECLARE
    clip_record RECORD;
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    FOR clip_record IN SELECT id FROM clips LOOP
        LOOP
            new_code := generate_alphanumeric(8);
            
            -- Check if code already exists
            SELECT EXISTS(SELECT 1 FROM clips WHERE share_code = new_code) INTO code_exists;
            
            IF NOT code_exists THEN
                UPDATE clips SET share_code = new_code WHERE id = clip_record.id;
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Update screenshots with alphanumeric share codes  
DO $$
DECLARE
    screenshot_record RECORD;
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    FOR screenshot_record IN SELECT id FROM screenshots LOOP
        LOOP
            new_code := generate_alphanumeric(8);
            
            -- Check if code already exists
            SELECT EXISTS(SELECT 1 FROM screenshots WHERE share_code = new_code) INTO code_exists;
            
            IF NOT code_exists THEN
                UPDATE screenshots SET share_code = new_code WHERE id = screenshot_record.id;
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Drop the helper function
DROP FUNCTION generate_alphanumeric(INTEGER);

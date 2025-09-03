-- Create storage bucket policies for gamefolio-media
-- Run EACH of these statements ONE AT A TIME in your Supabase SQL Editor

-- STEP 1: Run this first
CREATE POLICY "Allow public uploads to gamefolio-media" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'gamefolio-media');

-- STEP 2: Run this second  
CREATE POLICY "Allow public downloads from gamefolio-media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'gamefolio-media');

-- STEP 3: Run this third
CREATE POLICY "Allow public deletes from gamefolio-media" ON storage.objects
FOR DELETE TO public
USING (bucket_id = 'gamefolio-media');

-- STEP 4: Run this fourth
CREATE POLICY "Allow public updates to gamefolio-media" ON storage.objects
FOR UPDATE TO public
USING (bucket_id = 'gamefolio-media')
WITH CHECK (bucket_id = 'gamefolio-media');
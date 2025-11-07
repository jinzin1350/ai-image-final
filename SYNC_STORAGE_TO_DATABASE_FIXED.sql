-- ============================================
-- Sync Storage files to content_library table
-- FIXED VERSION - Simple and clean
-- ============================================

-- Add storage tracking columns if they don't exist
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS storage_bucket TEXT;

ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS storage_filename TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_library_storage
ON content_library(storage_bucket, storage_filename);

-- Add unique constraint to prevent duplicates
ALTER TABLE content_library
DROP CONSTRAINT IF EXISTS unique_storage_file;

ALTER TABLE content_library
ADD CONSTRAINT unique_storage_file
UNIQUE (storage_bucket, storage_filename);

-- Add comments
COMMENT ON COLUMN content_library.storage_bucket IS 'Supabase Storage bucket name (admin-content or garments)';
COMMENT ON COLUMN content_library.storage_filename IS 'Filename in Storage bucket';

-- Simple verification
SELECT 'Migration complete!' as status;
SELECT 'storage_bucket column added' as step1;
SELECT 'storage_filename column added' as step2;
SELECT 'Indexes created' as step3;
SELECT 'Ready to sync files!' as next_step;

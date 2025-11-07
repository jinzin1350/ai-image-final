-- ============================================
-- Sync Storage files to content_library table
-- ============================================

-- Add storage tracking columns if they don't exist
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
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

COMMENT ON COLUMN content_library.storage_bucket IS 'Supabase Storage bucket name (admin-content or garments)';
COMMENT ON COLUMN content_library.storage_filename IS 'Filename in Storage bucket';

/*
✅ What this does:
- Adds storage_bucket and storage_filename columns
- Creates index for performance
- Ensures no duplicate entries for same file
- Now you can edit metadata while keeping files in Storage!

Next step: Run the backend sync endpoint to populate this table
*/

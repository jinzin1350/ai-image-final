-- Add content_type column to generated_images table
-- This column helps categorize different types of image generations
-- e.g., 'nanobanana', 'scene-recreation', 'accessories-only', etc.

-- Add content_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_images' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE generated_images ADD COLUMN content_type TEXT;
    RAISE NOTICE '✅ Added content_type column to generated_images';
  ELSE
    RAISE NOTICE 'ℹ️  content_type column already exists in generated_images';
  END IF;
END $$;

-- Create index for faster filtering by content_type
CREATE INDEX IF NOT EXISTS idx_generated_images_content_type
  ON generated_images(content_type);

-- Verify the column was added
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_images' AND column_name = 'content_type'
  ) INTO column_exists;

  IF column_exists THEN
    RAISE NOTICE '✅ Verification successful: content_type column exists';
  ELSE
    RAISE EXCEPTION '❌ Verification failed: content_type column does not exist';
  END IF;
END $$;

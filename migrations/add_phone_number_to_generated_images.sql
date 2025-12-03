-- ============================================
-- Migration: Add Phone Number to Generated Images
-- ============================================
-- This migration adds a phone number field to track user contact info
-- for garment uploads and generated images
-- ============================================

-- Add phone_number column to generated_images table
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_generated_images_user_phone
ON generated_images(user_phone);

-- Add comment to explain the column
COMMENT ON COLUMN generated_images.user_phone IS 'User phone number for contact purposes';

-- ============================================
-- Verification
-- ============================================
DO $$
DECLARE
  column_exists BOOLEAN;
  index_exists BOOLEAN;
BEGIN
  -- Check if column was added
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_images' AND column_name = 'user_phone'
  ) INTO column_exists;

  -- Check if index was created
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'generated_images' AND indexname = 'idx_generated_images_user_phone'
  ) INTO index_exists;

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║   PHONE NUMBER FIELD MIGRATION                 ║';
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF column_exists THEN
    RAISE NOTICE '✅ user_phone column added successfully';
  ELSE
    RAISE NOTICE '❌ Failed to add user_phone column';
  END IF;

  IF index_exists THEN
    RAISE NOTICE '✅ Phone number index created successfully';
  ELSE
    RAISE NOTICE '❌ Failed to create phone number index';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Current generated_images columns:';
  RAISE NOTICE '   ├─ user_id (UUID)';
  RAISE NOTICE '   ├─ user_email (TEXT)';
  RAISE NOTICE '   ├─ user_phone (TEXT) ✨ NEW';
  RAISE NOTICE '   ├─ garment_path (TEXT)';
  RAISE NOTICE '   ├─ generated_image_url (TEXT)';
  RAISE NOTICE '   └─ ... (other fields)';
  RAISE NOTICE '';

  IF column_exists AND index_exists THEN
    RAISE NOTICE '🎉 Migration completed successfully!';
  ELSE
    RAISE NOTICE '⚠️  Migration completed with warnings';
  END IF;
  RAISE NOTICE '';
END $$;

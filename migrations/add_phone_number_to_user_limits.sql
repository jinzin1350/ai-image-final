-- ============================================
-- Migration: Add Phone Number to User Limits
-- ============================================
-- This migration adds a phone number field to user_limits table
-- to track user contact information
-- ============================================

-- Add phone_number column to user_limits table
ALTER TABLE user_limits
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_user_limits_phone_number
ON user_limits(phone_number);

-- Add comment to explain the column
COMMENT ON COLUMN user_limits.phone_number IS 'User phone number for contact and verification';

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
    WHERE table_name = 'user_limits' AND column_name = 'phone_number'
  ) INTO column_exists;

  -- Check if index was created
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'user_limits' AND indexname = 'idx_user_limits_phone_number'
  ) INTO index_exists;

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║   USER LIMITS PHONE NUMBER MIGRATION           ║';
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF column_exists THEN
    RAISE NOTICE '✅ phone_number column added successfully';
  ELSE
    RAISE NOTICE '❌ Failed to add phone_number column';
  END IF;

  IF index_exists THEN
    RAISE NOTICE '✅ Phone number index created successfully';
  ELSE
    RAISE NOTICE '❌ Failed to create phone number index';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Current user_limits columns:';
  RAISE NOTICE '   ├─ user_id (UUID)';
  RAISE NOTICE '   ├─ email (TEXT)';
  RAISE NOTICE '   ├─ phone_number (TEXT) ✨ NEW';
  RAISE NOTICE '   ├─ tier (TEXT)';
  RAISE NOTICE '   ├─ credits_limit (INTEGER)';
  RAISE NOTICE '   └─ ... (other fields)';
  RAISE NOTICE '';

  IF column_exists AND index_exists THEN
    RAISE NOTICE '🎉 Migration completed successfully!';
  ELSE
    RAISE NOTICE '⚠️  Migration completed with warnings';
  END IF;
  RAISE NOTICE '';
END $$;

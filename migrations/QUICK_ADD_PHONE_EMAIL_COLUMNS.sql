-- =============================================
-- QUICK FIX: Add Email & Phone Columns
-- =============================================
-- Run this in Supabase SQL Editor
-- =============================================

-- Add user_phone column to generated_images (if doesn't exist)
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- Add user_email column to generated_images (if doesn't exist)
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_generated_images_user_phone
ON generated_images(user_phone);

CREATE INDEX IF NOT EXISTS idx_generated_images_user_email
ON generated_images(user_email);

-- Verify columns exist
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'generated_images'
  AND column_name IN ('user_phone', 'user_email')
ORDER BY column_name;

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Columns added successfully!';
  RAISE NOTICE '   - user_email (TEXT)';
  RAISE NOTICE '   - user_phone (TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Now you need to UPDATE existing rows with email/phone data';
  RAISE NOTICE '   Or wait for new images to be generated with contact info';
  RAISE NOTICE '';
END $$;

-- =============================================
-- FIX: Add email/phone to OLD generated images
-- =============================================
-- This updates existing images with user contact info
-- =============================================

-- Update generated_images with email and phone from user_limits
-- Based on user_id match
UPDATE generated_images gi
SET
  user_email = ul.email,
  user_phone = ul.phone_number
FROM user_limits ul
WHERE gi.user_id = ul.user_id
  AND (gi.user_email IS NULL OR gi.user_phone IS NULL);

-- Show how many rows were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Updated % images with contact info', updated_count;
  RAISE NOTICE '';
END $$;

-- Verify the updates
SELECT
  COUNT(*) as total_images,
  COUNT(user_email) as with_email,
  COUNT(user_phone) as with_phone,
  COUNT(*) - COUNT(user_email) as missing_email,
  COUNT(*) - COUNT(user_phone) as missing_phone
FROM generated_images;

-- Show sample of updated images
SELECT
  id,
  user_email,
  user_phone,
  LEFT(generated_image_url, 50) as image_url_preview,
  created_at
FROM generated_images
WHERE user_email IS NOT NULL OR user_phone IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

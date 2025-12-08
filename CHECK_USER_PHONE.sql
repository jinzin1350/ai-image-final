-- =============================================
-- CHECK: Does user have phone number?
-- =============================================
-- Run this in Supabase SQL Editor to check
-- =============================================

-- Check if user_limits table has phone_number column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_limits'
  AND column_name IN ('phone_number', 'user_phone');

-- Check users and their phone numbers
SELECT
  user_id,
  email,
  phone_number,
  tier,
  created_at
FROM user_limits
ORDER BY created_at DESC
LIMIT 10;

-- Check generated_images table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'generated_images'
  AND column_name IN ('user_email', 'user_phone');

-- Check recent generated images with contact info
SELECT
  id,
  user_id,
  user_email,
  user_phone,
  generated_image_url,
  created_at
FROM generated_images
ORDER BY created_at DESC
LIMIT 5;

-- Count images with/without contact info
SELECT
  COUNT(*) as total_images,
  COUNT(user_email) as with_email,
  COUNT(user_phone) as with_phone,
  COUNT(*) - COUNT(user_email) as missing_email,
  COUNT(*) - COUNT(user_phone) as missing_phone
FROM generated_images;

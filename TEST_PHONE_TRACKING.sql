-- ============================================
-- TEST PHONE TRACKING - Safe Test Queries
-- ============================================
-- This file contains safe test queries that work with
-- foreign key constraints
-- ============================================

-- ============================================
-- METHOD 1: Test with existing user
-- ============================================
-- First, find an existing user ID from auth.users
SELECT
  id as user_id,
  email,
  created_at
FROM auth.users
LIMIT 5;

-- Copy a real user_id from above, then use it here:
-- Replace 'PASTE_REAL_USER_ID_HERE' with actual UUID from above query

INSERT INTO generated_images (
  user_id,
  user_email,
  user_phone,
  garment_path,
  generated_image_url,
  prompt
)
VALUES (
  'PASTE_REAL_USER_ID_HERE'::UUID,  -- ← Replace with real user ID
  'test@example.com',
  '+1234567890',
  '/garments/test_shirt.jpg',
  '/generated/test_output.jpg',
  'Test image generation'
);

-- ============================================
-- METHOD 2: Test with NULL user_id (if allowed)
-- ============================================
-- Check if generated_images allows NULL user_id
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'generated_images'
  AND column_name = 'user_id';

-- If is_nullable = 'YES', you can insert with NULL:
-- (Skip if NOT NULL)
INSERT INTO generated_images (
  user_id,
  user_email,
  user_phone,
  garment_path,
  generated_image_url
)
VALUES (
  NULL,  -- NULL user_id if allowed
  'guest@example.com',
  '+0987654321',
  '/garments/guest_upload.jpg',
  '/generated/guest_output.jpg'
);

-- ============================================
-- METHOD 3: Query existing data to verify phone field
-- ============================================
-- Check if phone field exists and is working
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'generated_images'
  AND column_name IN ('user_email', 'user_phone');

-- Expected output:
-- user_email | text | YES
-- user_phone | text | YES

-- ============================================
-- METHOD 4: Update existing records with phone
-- ============================================
-- If you have existing generated_images, add phone to them
UPDATE generated_images
SET user_phone = '+1234567890'
WHERE id = (
  SELECT id FROM generated_images
  WHERE user_email = 'existing@email.com'
    AND user_phone IS NULL
  LIMIT 1
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- 1. Check how many images have phone numbers
SELECT
  COUNT(*) as total_images,
  COUNT(user_phone) as images_with_phone,
  COUNT(*) - COUNT(user_phone) as images_without_phone
FROM generated_images;

-- 2. Show recent images with contact info
SELECT
  id,
  user_email,
  user_phone,
  garment_path,
  created_at
FROM generated_images
ORDER BY created_at DESC
LIMIT 10;

-- 3. Find images by phone number
SELECT
  id,
  user_email,
  user_phone,
  garment_path,
  generated_image_url,
  created_at
FROM generated_images
WHERE user_phone = '+1234567890';

-- 4. Group by phone to see upload counts
SELECT
  user_phone,
  user_email,
  COUNT(*) as upload_count,
  MAX(created_at) as last_upload
FROM generated_images
WHERE user_phone IS NOT NULL
GROUP BY user_phone, user_email
ORDER BY upload_count DESC;

-- ============================================
-- SAFE TEST DATA INSERTION (with real user)
-- ============================================
-- This creates test data safely by using the first real user

DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get first real user ID
  SELECT id INTO test_user_id
  FROM auth.users
  LIMIT 1;

  -- Check if we found a user
  IF test_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No users found in auth.users table';
    RAISE NOTICE '   Please create a user first through authentication';
  ELSE
    -- Insert test data
    INSERT INTO generated_images (
      user_id,
      user_email,
      user_phone,
      garment_path,
      generated_image_url,
      prompt
    )
    VALUES (
      test_user_id,
      'test_phone@example.com',
      '+1234567890',
      '/garments/test_garment.jpg',
      '/generated/test_result.jpg',
      'Test prompt for phone tracking'
    );

    RAISE NOTICE '✅ Test data inserted successfully!';
    RAISE NOTICE '   User ID: %', test_user_id;
    RAISE NOTICE '   Phone: +1234567890';
  END IF;
END $$;

-- Verify the insertion
SELECT
  'Test completed!' as status,
  user_email,
  user_phone,
  garment_path
FROM generated_images
WHERE user_phone = '+1234567890'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- CLEANUP (Optional - run if you want to remove test data)
-- ============================================
-- Uncomment to delete test data:
-- DELETE FROM generated_images WHERE user_phone = '+1234567890';

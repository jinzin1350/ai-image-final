-- ============================================
-- URGENT: Run this in Supabase SQL Editor NOW!
-- Fix default tier for new users
-- ============================================

-- Change default tier from 'bronze' to 'testlimit'
ALTER TABLE user_limits
ALTER COLUMN tier SET DEFAULT 'testlimit';

-- Change default credits from 50 to 5
ALTER TABLE user_limits
ALTER COLUMN credits_limit SET DEFAULT 5;

-- Verify the changes
SELECT
    column_name,
    column_default,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_limits'
  AND column_name IN ('tier', 'credits_limit')
ORDER BY column_name;

/*
Expected output after running:
  column_name    | column_default   | data_type
  ---------------|------------------|----------
  credits_limit  | 5                | integer
  tier           | 'testlimit'::text| text

✅ This ensures:
- New users will start with 'testlimit' tier
- New users will get 5 credits for testing
- Existing users are NOT affected
*/

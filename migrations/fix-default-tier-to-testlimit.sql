-- ============================================
-- Fix Default Tier for New Users
-- Change default from 'bronze' to 'testlimit'
-- ============================================

-- 1. Change the default value for tier column
ALTER TABLE user_limits
ALTER COLUMN tier SET DEFAULT 'testlimit';

-- 2. Change the default value for credits_limit column to match testlimit (5 credits)
ALTER TABLE user_limits
ALTER COLUMN credits_limit SET DEFAULT 5;

-- 3. Verify the changes
SELECT
    column_name,
    column_default,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_limits'
  AND column_name IN ('tier', 'credits_limit')
ORDER BY column_name;

-- ============================================
-- VERIFICATION COMPLETE
-- ============================================

/*
Expected output:
  column_name    | column_default   | data_type
  ---------------|------------------|----------
  credits_limit  | 5                | integer
  tier           | 'testlimit'      | text

✅ After running this:
- New users will get tier = 'testlimit'
- New users will get credits_limit = 5
- Existing users are NOT affected

Note: This only changes the default for NEW rows.
Existing users keep their current tier.
*/

-- ============================================
-- Add testlimit tier for new user testing
-- ============================================

-- 1. Drop the old tier constraint
ALTER TABLE user_limits DROP CONSTRAINT IF EXISTS user_limits_tier_check;

-- 2. Add new constraint with testlimit included
ALTER TABLE user_limits ADD CONSTRAINT user_limits_tier_check
  CHECK (tier IN ('testlimit', 'bronze', 'silver', 'gold'));

-- 3. Update all existing bronze users to testlimit (5 credits)
-- Keep their current credits_used so they don't lose progress
UPDATE user_limits
SET
  tier = 'testlimit',
  credits_limit = 5
WHERE tier = 'bronze' AND credits_used = 0;

-- 4. Update comment
COMMENT ON COLUMN user_limits.tier IS 'User tier: testlimit (5 for testing), bronze (50), silver (100), gold (130)';

-- Verification
SELECT
  tier,
  COUNT(*) as user_count,
  AVG(credits_limit) as avg_credits,
  SUM(CASE WHEN credits_used = 0 THEN 1 ELSE 0 END) as unused_users
FROM user_limits
GROUP BY tier
ORDER BY
  CASE tier
    WHEN 'testlimit' THEN 1
    WHEN 'bronze' THEN 2
    WHEN 'silver' THEN 3
    WHEN 'gold' THEN 4
  END;

/*
  ✅ testlimit Tier Added!

  Features:
  - New users get 5 credits for testing
  - Existing bronze users with 0 credits used → moved to testlimit
  - When credits reach 0, they need to upgrade

  Tier Limits:
  • testlimit: 5 credits (for testing)
  • Bronze: 50 credits/month
  • Silver: 100 credits/month
  • Gold: 130 credits/month
*/

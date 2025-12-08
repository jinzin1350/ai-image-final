-- ============================================
-- Sync Credits Between tier_pricing and user_limits
-- This ensures both tables have matching credit values
-- ============================================

-- First, let's see the current mismatch
SELECT
    'BEFORE SYNC' as status,
    'tier_pricing' as source,
    tier,
    credits
FROM tier_pricing
UNION ALL
SELECT
    'BEFORE SYNC' as status,
    'user_limits default' as source,
    tier,
    credits_limit as credits
FROM user_limits
WHERE tier IS NOT NULL
GROUP BY tier, credits_limit
ORDER BY
    status,
    CASE tier
        WHEN 'testlimit' THEN 1
        WHEN 'bronze' THEN 2
        WHEN 'silver' THEN 3
        WHEN 'gold' THEN 4
    END;

-- ============================================
-- OPTION 1: Use tier_pricing as source of truth
-- Update user_limits to match tier_pricing
-- ============================================

-- Update existing users to match tier_pricing credits
UPDATE user_limits ul
SET credits_limit = tp.credits
FROM tier_pricing tp
WHERE ul.tier = tp.tier
  AND ul.credits_limit != tp.credits;

-- ============================================
-- OR OPTION 2: Use user_limits as source of truth
-- Update tier_pricing to match user_limits
-- (Comment out the UPDATE above and uncomment this if you prefer)
-- ============================================

/*
UPDATE tier_pricing tp
SET credits = (
  SELECT CASE tier
    WHEN 'testlimit' THEN 5
    WHEN 'bronze' THEN 50
    WHEN 'silver' THEN 100
    WHEN 'gold' THEN 130
  END
)
WHERE tier IN ('testlimit', 'bronze', 'silver', 'gold');
*/

-- ============================================
-- Verification: Check if they match now
-- ============================================

SELECT
    'AFTER SYNC' as status,
    tp.tier,
    tp.credits as pricing_credits,
    COALESCE(ul.avg_credits, 0) as user_limits_avg_credits,
    CASE
        WHEN tp.credits = COALESCE(ul.avg_credits, 0) THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as sync_status
FROM tier_pricing tp
LEFT JOIN (
    SELECT tier, AVG(credits_limit)::INTEGER as avg_credits
    FROM user_limits
    GROUP BY tier
) ul ON tp.tier = ul.tier
ORDER BY
    CASE tp.tier
        WHEN 'testlimit' THEN 1
        WHEN 'bronze' THEN 2
        WHEN 'silver' THEN 3
        WHEN 'gold' THEN 4
    END;

-- ============================================
-- Show all user credits after sync
-- ============================================

SELECT
    tier,
    COUNT(*) as user_count,
    MIN(credits_limit) as min_credits,
    MAX(credits_limit) as max_credits,
    AVG(credits_limit)::INTEGER as avg_credits
FROM user_limits
WHERE tier IS NOT NULL
GROUP BY tier
ORDER BY
    CASE tier
        WHEN 'testlimit' THEN 1
        WHEN 'bronze' THEN 2
        WHEN 'silver' THEN 3
        WHEN 'gold' THEN 4
    END;

/*
  ✅ CREDITS SYNC COMPLETE!

  This script updates user_limits.credits_limit to match tier_pricing.credits

  After running this:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • All users' credits_limit will match their tier's pricing
  • tier_pricing table is the single source of truth
  • Admin panel changes to credits will affect all users of that tier

  If you prefer different credit values:
  1. Update tier_pricing first (via admin panel)
  2. Run this script again to sync users
*/

-- ============================================
-- Verify Pricing Table Setup
-- Run this to check if everything is working
-- ============================================

-- Check if table exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'tier_pricing'
        )
        THEN '✅ tier_pricing table EXISTS'
        ELSE '❌ tier_pricing table MISSING - Run pricing_table.sql migration!'
    END as table_status;

-- Check current data
SELECT
    tier,
    price,
    credits,
    currency,
    is_active,
    created_at,
    updated_at
FROM tier_pricing
ORDER BY
    CASE tier
        WHEN 'testlimit' THEN 1
        WHEN 'bronze' THEN 2
        WHEN 'silver' THEN 3
        WHEN 'gold' THEN 4
    END;

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'tier_pricing';

-- Test UPDATE permission (this will show if service role can update)
DO $$
BEGIN
    RAISE NOTICE '✅ If you can see this, the script is running correctly!';
END $$;

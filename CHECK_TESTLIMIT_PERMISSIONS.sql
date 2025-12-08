-- ============================================
-- Check testlimit tier permissions
-- Run this to see what testlimit tier can access
-- ============================================

SELECT
    tier,
    service_key,
    has_access,
    CASE service_key
        WHEN 'complete-outfit' THEN '✅ Should be TRUE for testing'
        ELSE '❌ Should be FALSE'
    END as expected_value
FROM tier_service_permissions
WHERE tier = 'testlimit'
ORDER BY service_key;

-- If this returns NO ROWS, then the permissions were never inserted!
-- If complete-outfit is FALSE, then it needs to be fixed!

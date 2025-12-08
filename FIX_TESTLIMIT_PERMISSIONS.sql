-- ============================================
-- FIX: Enable complete-outfit for testlimit tier
-- Run this to give testlimit users access to testing
-- ============================================

-- Enable complete-outfit for testlimit tier
UPDATE tier_service_permissions
SET has_access = true, updated_at = NOW()
WHERE tier = 'testlimit'
  AND service_key = 'complete-outfit';

-- If the row doesn't exist, insert it
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES ('testlimit', 'complete-outfit', true)
ON CONFLICT (tier, service_key)
DO UPDATE SET has_access = true, updated_at = NOW();

-- Verify the fix
SELECT
    tier,
    service_key,
    has_access,
    updated_at,
    CASE
        WHEN has_access = true THEN '✅ ENABLED - Users can test'
        ELSE '❌ DISABLED - Still broken!'
    END as status
FROM tier_service_permissions
WHERE tier = 'testlimit'
  AND service_key = 'complete-outfit';

-- Show all testlimit permissions
SELECT
    tier,
    service_key,
    has_access,
    CASE service_key
        WHEN 'complete-outfit' THEN 'عکاسی استایل کامل'
        WHEN 'accessories-only' THEN 'عکاسی اکسسوری محصول'
        WHEN 'color-collection' THEN 'نمایش کالکشن رنگی'
        WHEN 'flat-lay' THEN 'عکاسی Flat Lay'
        WHEN 'scene-recreation' THEN 'الهام از عکس مرجع'
        WHEN 'style-transfer' THEN 'انتقال استایل'
    END as service_name_fa
FROM tier_service_permissions
WHERE tier = 'testlimit'
ORDER BY service_key;

/*
Expected result:
- complete-outfit should be TRUE (enabled for testing)
- All other services should be FALSE

✅ After running this, testlimit users can use complete-outfit service!
*/

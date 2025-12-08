-- ============================================
-- Check User Permissions for engi.alireza@gmail.com
-- ============================================

-- 1. Check user's tier
SELECT
    user_id,
    email,
    tier,
    credits_limit,
    credits_used
FROM user_limits
WHERE email = 'engi.alireza@gmail.com';

-- 2. Check all permissions for this user's tier
-- First, let's see what tier they have, then check permissions
WITH user_tier AS (
    SELECT tier
    FROM user_limits
    WHERE email = 'engi.alireza@gmail.com'
)
SELECT
    tsp.tier,
    tsp.service_key,
    tsp.has_access,
    CASE
        WHEN tsp.service_key = 'complete-outfit' THEN '👗 عکاسی استایل کامل'
        WHEN tsp.service_key = 'accessories-only' THEN '👜 عکاسی اکسسوری محصول'
        WHEN tsp.service_key = 'color-collection' THEN '🎨 نمایش کالکشن رنگی'
        WHEN tsp.service_key = 'flat-lay' THEN '📸 عکاسی Flat Lay حرفه‌ای'
        WHEN tsp.service_key = 'scene-recreation' THEN '🎬 الهام از عکس مرجع'
        WHEN tsp.service_key = 'style-transfer' THEN '🎨 انتقال استایل'
    END as service_name
FROM tier_service_permissions tsp
INNER JOIN user_tier ut ON tsp.tier = ut.tier
ORDER BY
    CASE tsp.service_key
        WHEN 'complete-outfit' THEN 1
        WHEN 'accessories-only' THEN 2
        WHEN 'color-collection' THEN 3
        WHEN 'flat-lay' THEN 4
        WHEN 'scene-recreation' THEN 5
        WHEN 'style-transfer' THEN 6
    END;

-- 3. Check if user has access to style-transfer specifically
WITH user_tier AS (
    SELECT tier
    FROM user_limits
    WHERE email = 'engi.alireza@gmail.com'
)
SELECT
    'style-transfer' as service,
    tsp.has_access,
    CASE
        WHEN tsp.has_access = true THEN '✅ User HAS access'
        ELSE '❌ User DOES NOT have access'
    END as status
FROM tier_service_permissions tsp
INNER JOIN user_tier ut ON tsp.tier = ut.tier
WHERE tsp.service_key = 'style-transfer';

-- 4. Show summary of all tiers and their style-transfer access
SELECT
    tier,
    has_access as style_transfer_access,
    CASE
        WHEN has_access = true THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as status
FROM tier_service_permissions
WHERE service_key = 'style-transfer'
ORDER BY
    CASE tier
        WHEN 'testlimit' THEN 1
        WHEN 'bronze' THEN 2
        WHEN 'silver' THEN 3
        WHEN 'gold' THEN 4
    END;

-- Check bronze tier permissions
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
WHERE tier = 'bronze'
ORDER BY service_key;

-- Check user tier
SELECT user_id, email, tier, credits_limit, credits_used
FROM user_limits
WHERE email = 'engi.alireza@gmail.com';

-- If bronze should have access to these services, run this:
/*
UPDATE tier_service_permissions
SET has_access = true
WHERE tier = 'bronze'
  AND service_key IN ('complete-outfit', 'accessories-only');

-- Verify
SELECT tier, service_key, has_access
FROM tier_service_permissions
WHERE tier = 'bronze'
ORDER BY service_key;
*/

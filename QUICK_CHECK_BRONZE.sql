-- ============================================
-- QUICK CHECK: Bronze Tier Permissions
-- Simple query to see bronze tier status
-- ============================================

-- Check bronze tier permissions
SELECT
    tier,
    service_key,
    has_access,
    CASE service_key
        WHEN 'complete-outfit' THEN '👗 عکاسی استایل کامل'
        WHEN 'accessories-only' THEN '👜 عکاسی اکسسوری'
        WHEN 'color-collection' THEN '🎨 کالکشن رنگی'
        WHEN 'flat-lay' THEN '📸 Flat Lay'
        WHEN 'scene-recreation' THEN '🎬 الهام از عکس'
        WHEN 'style-transfer' THEN '🎨 انتقال استایل'
    END as service_name,
    CASE
        WHEN has_access = true THEN '✅ فعال'
        ELSE '❌ غیرفعال'
    END as status,
    updated_at
FROM tier_service_permissions
WHERE tier = 'bronze'
ORDER BY service_key;

-- Check user tier
SELECT
    email,
    tier,
    credits_limit,
    credits_used,
    (credits_limit - credits_used) as credits_remaining
FROM user_limits
WHERE email = 'engi.alireza@gmail.com';

/*
  این query ساده فقط نشون میده:

  1️⃣ همه permissions مربوط به bronze tier
  2️⃣ tier کاربر engi.alireza@gmail.com

  اگر has_access برای complete-outfit و accessories-only
  برابر با true نبود، پس مشکل از database هستش.
*/

-- ============================================
-- CHECK ALL PERMISSIONS - Complete Overview
-- Run this to see current state of all permissions
-- ============================================

-- 1. Show all permissions in a nice table format
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
        WHEN has_access = true THEN '✅ YES'
        ELSE '❌ NO'
    END as access_status,
    updated_at
FROM tier_service_permissions
ORDER BY
    CASE tier
        WHEN 'testlimit' THEN 1
        WHEN 'bronze' THEN 2
        WHEN 'silver' THEN 3
        WHEN 'gold' THEN 4
    END,
    service_key;

-- 2. Summary by tier
SELECT
    '═══════════════════════════════════════' as separator,
    'SUMMARY BY TIER' as report_section;

SELECT
    tier,
    COUNT(*) as total_services,
    SUM(CASE WHEN has_access = true THEN 1 ELSE 0 END) as enabled_services,
    SUM(CASE WHEN has_access = false THEN 1 ELSE 0 END) as disabled_services,
    ROUND(SUM(CASE WHEN has_access = true THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100, 1) as percent_enabled
FROM tier_service_permissions
GROUP BY tier
ORDER BY
    CASE tier
        WHEN 'testlimit' THEN 1
        WHEN 'bronze' THEN 2
        WHEN 'silver' THEN 3
        WHEN 'gold' THEN 4
    END;

-- 3. Permissions matrix (easier to read)
SELECT
    '═══════════════════════════════════════' as separator,
    'PERMISSIONS MATRIX' as report_section;

WITH permissions_pivot AS (
    SELECT
        service_key,
        BOOL_OR(CASE WHEN tier = 'testlimit' THEN has_access ELSE false END) as testlimit,
        BOOL_OR(CASE WHEN tier = 'bronze' THEN has_access ELSE false END) as bronze,
        BOOL_OR(CASE WHEN tier = 'silver' THEN has_access ELSE false END) as silver,
        BOOL_OR(CASE WHEN tier = 'gold' THEN has_access ELSE false END) as gold
    FROM tier_service_permissions
    GROUP BY service_key
)
SELECT
    CASE service_key
        WHEN 'complete-outfit' THEN '👗 Complete Outfit'
        WHEN 'accessories-only' THEN '👜 Accessories'
        WHEN 'color-collection' THEN '🎨 Color Collection'
        WHEN 'flat-lay' THEN '📸 Flat Lay'
        WHEN 'scene-recreation' THEN '🎬 Scene Recreation'
        WHEN 'style-transfer' THEN '🎨 Style Transfer'
    END as service,
    CASE WHEN testlimit THEN '✅' ELSE '❌' END as testlimit,
    CASE WHEN bronze THEN '✅' ELSE '❌' END as bronze,
    CASE WHEN silver THEN '✅' ELSE '❌' END as silver,
    CASE WHEN gold THEN '✅' ELSE '❌' END as gold
FROM permissions_pivot
ORDER BY service_key;

-- 4. Check specific user (engi.alireza@gmail.com)
SELECT
    '═══════════════════════════════════════' as separator,
    'USER: engi.alireza@gmail.com' as report_section;

SELECT
    ul.email,
    ul.tier,
    ul.credits_limit,
    ul.credits_used,
    CASE
        WHEN ul.tier = 'testlimit' THEN '🧪 Test Limit'
        WHEN ul.tier = 'bronze' THEN '🥉 Bronze'
        WHEN ul.tier = 'silver' THEN '🥈 Silver'
        WHEN ul.tier = 'gold' THEN '🥇 Gold'
    END as tier_name
FROM user_limits ul
WHERE ul.email = 'engi.alireza@gmail.com';

-- 5. What services can this user access?
SELECT
    '═══════════════════════════════════════' as separator,
    'SERVICES AVAILABLE TO engi.alireza@gmail.com' as report_section;

SELECT
    tsp.service_key,
    CASE tsp.service_key
        WHEN 'complete-outfit' THEN '👗 عکاسی استایل کامل'
        WHEN 'accessories-only' THEN '👜 عکاسی اکسسوری'
        WHEN 'color-collection' THEN '🎨 کالکشن رنگی'
        WHEN 'flat-lay' THEN '📸 Flat Lay'
        WHEN 'scene-recreation' THEN '🎬 الهام از عکس'
        WHEN 'style-transfer' THEN '🎨 انتقال استایل'
    END as service_name,
    CASE
        WHEN tsp.has_access = true THEN '✅ دسترسی دارد'
        ELSE '❌ دسترسی ندارد'
    END as access_status
FROM user_limits ul
JOIN tier_service_permissions tsp ON ul.tier = tsp.tier
WHERE ul.email = 'engi.alireza@gmail.com'
ORDER BY tsp.service_key;

-- 6. Recent updates
SELECT
    '═══════════════════════════════════════' as separator,
    'RECENT PERMISSION UPDATES' as report_section;

SELECT
    tier,
    service_key,
    has_access,
    updated_at,
    AGE(NOW(), updated_at) as time_ago
FROM tier_service_permissions
WHERE updated_at > NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC
LIMIT 10;

/*
  ═══════════════════════════════════════════════════════════

  این query به شما نشون میده:

  1️⃣ لیست کامل همه permissions
  2️⃣ خلاصه به تفکیک tier
  3️⃣ جدول ماتریس (راحت تر برای خوندن)
  4️⃣ اطلاعات کاربر engi.alireza@gmail.com
  5️⃣ سرویس‌هایی که این کاربر میتونه استفاده کنه
  6️⃣ آخرین تغییرات (24 ساعت اخیر)

  ═══════════════════════════════════════════════════════════
*/

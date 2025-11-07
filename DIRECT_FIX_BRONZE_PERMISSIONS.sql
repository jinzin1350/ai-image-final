-- ============================================
-- DIRECT FIX: Enable Bronze Permissions
-- Run this NOW to fix the immediate problem
-- ============================================

-- Update bronze tier permissions
UPDATE tier_service_permissions
SET has_access = true, updated_at = NOW()
WHERE tier = 'bronze'
  AND service_key IN ('complete-outfit', 'accessories-only');

-- Verify the update
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
    END as service_name_persian,
    CASE
        WHEN has_access = true THEN '✅ دسترسی دارد'
        ELSE '❌ دسترسی ندارد'
    END as status
FROM tier_service_permissions
WHERE tier = 'bronze'
ORDER BY service_key;

/*
  این query مستقیم permissions bronze رو فعال میکنه:

  ✅ complete-outfit (عکاسی استایل کامل)
  ✅ accessories-only (عکاسی اکسسوری محصول)

  بعد از اجرا:
  1. Logout کن
  2. Login کن دوباره با engi.alireza@gmail.com
  3. تست کن - باید کار کنه!
*/

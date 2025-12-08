-- ============================================
-- Fix Bronze Tier Permissions
-- Enable access to the services you mentioned
-- ============================================

-- Update bronze tier to have access to:
-- 1. عکاسی استایل کامل (complete-outfit)
-- 2. عکاسی اکسسوری محصول (accessories-only)

UPDATE tier_service_permissions
SET has_access = true, updated_at = NOW()
WHERE tier = 'bronze'
  AND service_key IN ('complete-outfit', 'accessories-only');

-- Verify the changes
SELECT
    tier,
    service_key,
    has_access,
    CASE service_key
        WHEN 'complete-outfit' THEN '✅ عکاسی استایل کامل'
        WHEN 'accessories-only' THEN '✅ عکاسی اکسسوری محصول'
        WHEN 'color-collection' THEN '❌ نمایش کالکشن رنگی'
        WHEN 'flat-lay' THEN '❌ عکاسی Flat Lay'
        WHEN 'scene-recreation' THEN '❌ الهام از عکس مرجع'
        WHEN 'style-transfer' THEN '❌ انتقال استایل'
    END as service_status
FROM tier_service_permissions
WHERE tier = 'bronze'
ORDER BY service_key;

/*
  ✅ Bronze tier permissions updated!

  Now bronze users can access:
  • عکاسی استایل کامل (complete-outfit)
  • عکاسی اکسسوری محصول (accessories-only)

  They cannot access (need upgrade):
  • نمایش کالکشن رنگی (color-collection)
  • عکاسی Flat Lay (flat-lay)
  • الهام از عکس مرجع (scene-recreation)
  • انتقال استایل (style-transfer)
*/

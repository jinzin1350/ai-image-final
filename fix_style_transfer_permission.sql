-- ============================================
-- Fix Style Transfer Permission
-- Give access to style-transfer for specific tiers
-- ============================================

-- Option 1: Enable style-transfer for ALL tiers
UPDATE tier_service_permissions
SET has_access = true, updated_at = NOW()
WHERE service_key = 'style-transfer';

-- Option 2: Enable style-transfer only for GOLD tier
-- UPDATE tier_service_permissions
-- SET has_access = true, updated_at = NOW()
-- WHERE service_key = 'style-transfer' AND tier = 'gold';

-- Option 3: Enable style-transfer for SILVER and GOLD tiers
-- UPDATE tier_service_permissions
-- SET has_access = true, updated_at = NOW()
-- WHERE service_key = 'style-transfer' AND tier IN ('silver', 'gold');

-- Option 4: Enable style-transfer for BRONZE, SILVER, and GOLD (not testlimit)
-- UPDATE tier_service_permissions
-- SET has_access = true, updated_at = NOW()
-- WHERE service_key = 'style-transfer' AND tier IN ('bronze', 'silver', 'gold');

-- Verify the changes
SELECT
    tier,
    service_key,
    has_access,
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

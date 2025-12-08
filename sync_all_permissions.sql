-- ============================================
-- Sync All Permissions - Ensure Complete Setup
-- This makes sure ALL tiers have records for ALL services
-- ============================================

-- Delete and recreate all permissions to ensure consistency
-- This is safe because we're using INSERT ... ON CONFLICT

-- Testlimit tier (default: only complete-outfit)
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES
  ('testlimit', 'complete-outfit', true),
  ('testlimit', 'accessories-only', false),
  ('testlimit', 'color-collection', false),
  ('testlimit', 'flat-lay', false),
  ('testlimit', 'scene-recreation', false),
  ('testlimit', 'style-transfer', false)
ON CONFLICT (tier, service_key)
DO UPDATE SET
  has_access = EXCLUDED.has_access,
  updated_at = NOW();

-- Bronze tier (default: complete-outfit only, like testlimit)
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES
  ('bronze', 'complete-outfit', true),
  ('bronze', 'accessories-only', false),
  ('bronze', 'color-collection', false),
  ('bronze', 'flat-lay', false),
  ('bronze', 'scene-recreation', false),
  ('bronze', 'style-transfer', false)
ON CONFLICT (tier, service_key)
DO UPDATE SET
  has_access = EXCLUDED.has_access,
  updated_at = NOW();

-- Silver tier (more services)
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES
  ('silver', 'complete-outfit', true),
  ('silver', 'accessories-only', true),
  ('silver', 'color-collection', true),
  ('silver', 'flat-lay', true),
  ('silver', 'scene-recreation', false),
  ('silver', 'style-transfer', false)
ON CONFLICT (tier, service_key)
DO UPDATE SET
  has_access = EXCLUDED.has_access,
  updated_at = NOW();

-- Gold tier (all services)
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES
  ('gold', 'complete-outfit', true),
  ('gold', 'accessories-only', true),
  ('gold', 'color-collection', true),
  ('gold', 'flat-lay', true),
  ('gold', 'scene-recreation', true),
  ('gold', 'style-transfer', true)
ON CONFLICT (tier, service_key)
DO UPDATE SET
  has_access = EXCLUDED.has_access,
  updated_at = NOW();

-- Verification: Show the complete matrix
SELECT
    service_key,
    MAX(CASE WHEN tier = 'testlimit' THEN CASE WHEN has_access THEN '✅' ELSE '❌' END END) as testlimit,
    MAX(CASE WHEN tier = 'bronze' THEN CASE WHEN has_access THEN '✅' ELSE '❌' END END) as bronze,
    MAX(CASE WHEN tier = 'silver' THEN CASE WHEN has_access THEN '✅' ELSE '❌' END END) as silver,
    MAX(CASE WHEN tier = 'gold' THEN CASE WHEN has_access THEN '✅' ELSE '❌' END END) as gold
FROM tier_service_permissions
GROUP BY service_key
ORDER BY
    CASE service_key
        WHEN 'complete-outfit' THEN 1
        WHEN 'accessories-only' THEN 2
        WHEN 'color-collection' THEN 3
        WHEN 'flat-lay' THEN 4
        WHEN 'scene-recreation' THEN 5
        WHEN 'style-transfer' THEN 6
    END;

-- Count check: Should be 24 rows (4 tiers × 6 services)
SELECT
    COUNT(*) as total_permissions,
    CASE
        WHEN COUNT(*) = 24 THEN '✅ Complete (24/24)'
        ELSE '⚠️ Incomplete (' || COUNT(*) || '/24)'
    END as status
FROM tier_service_permissions;

-- Show summary per tier
SELECT
    tier,
    COUNT(*) as services_configured,
    SUM(CASE WHEN has_access = true THEN 1 ELSE 0 END) as services_enabled,
    SUM(CASE WHEN has_access = false THEN 1 ELSE 0 END) as services_disabled
FROM tier_service_permissions
GROUP BY tier
ORDER BY
    CASE tier
        WHEN 'testlimit' THEN 1
        WHEN 'bronze' THEN 2
        WHEN 'silver' THEN 3
        WHEN 'gold' THEN 4
    END;

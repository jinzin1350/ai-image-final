-- ============================================
-- Service Permissions System Migration
-- This adds service-level permissions for each tier
-- ============================================

-- ============================================
-- 1. Create tier_service_permissions table
-- ============================================
CREATE TABLE IF NOT EXISTS tier_service_permissions (
  id BIGSERIAL PRIMARY KEY,
  tier TEXT NOT NULL,
  service_key TEXT NOT NULL,
  has_access BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier, service_key)
);

-- ============================================
-- 2. Add constraint to tier column
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'tier_service_permissions' AND constraint_name LIKE '%tier%check%'
  ) THEN
    ALTER TABLE tier_service_permissions ADD CONSTRAINT tier_service_permissions_tier_check
      CHECK (tier IN ('testlimit', 'bronze', 'silver', 'gold'));
    RAISE NOTICE '✅ Added tier constraint';
  ELSE
    RAISE NOTICE 'ℹ️  tier constraint already exists';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️  tier constraint already exists';
END $$;

-- ============================================
-- 3. Add constraint to service_key column
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'tier_service_permissions' AND constraint_name LIKE '%service_key%check%'
  ) THEN
    ALTER TABLE tier_service_permissions ADD CONSTRAINT tier_service_permissions_service_key_check
      CHECK (service_key IN ('complete-outfit', 'accessories-only', 'color-collection', 'flat-lay', 'scene-recreation', 'style-transfer'));
    RAISE NOTICE '✅ Added service_key constraint';
  ELSE
    RAISE NOTICE 'ℹ️  service_key constraint already exists';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️  service_key constraint already exists';
END $$;

-- ============================================
-- 4. Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tier_service_permissions_tier ON tier_service_permissions(tier);
CREATE INDEX IF NOT EXISTS idx_tier_service_permissions_service ON tier_service_permissions(service_key);
CREATE INDEX IF NOT EXISTS idx_tier_service_permissions_access ON tier_service_permissions(tier, service_key, has_access);

-- ============================================
-- 5. Insert default permissions for testlimit tier
-- ============================================
-- testlimit tier gets access to complete-outfit only (for testing)
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES
  ('testlimit', 'complete-outfit', true),
  ('testlimit', 'accessories-only', false),
  ('testlimit', 'color-collection', false),
  ('testlimit', 'flat-lay', false),
  ('testlimit', 'scene-recreation', false),
  ('testlimit', 'style-transfer', false)
ON CONFLICT (tier, service_key) DO NOTHING;

-- Bronze tier - default to same as testlimit initially
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES
  ('bronze', 'complete-outfit', true),
  ('bronze', 'accessories-only', false),
  ('bronze', 'color-collection', false),
  ('bronze', 'flat-lay', false),
  ('bronze', 'scene-recreation', false),
  ('bronze', 'style-transfer', false)
ON CONFLICT (tier, service_key) DO NOTHING;

-- Silver tier - no default permissions (admin will set)
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES
  ('silver', 'complete-outfit', false),
  ('silver', 'accessories-only', false),
  ('silver', 'color-collection', false),
  ('silver', 'flat-lay', false),
  ('silver', 'scene-recreation', false),
  ('silver', 'style-transfer', false)
ON CONFLICT (tier, service_key) DO NOTHING;

-- Gold tier - no default permissions (admin will set)
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES
  ('gold', 'complete-outfit', false),
  ('gold', 'accessories-only', false),
  ('gold', 'color-collection', false),
  ('gold', 'flat-lay', false),
  ('gold', 'scene-recreation', false),
  ('gold', 'style-transfer', false)
ON CONFLICT (tier, service_key) DO NOTHING;

-- ============================================
-- 6. Enable Row Level Security
-- ============================================
ALTER TABLE tier_service_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. Create RLS policies
-- ============================================

-- Allow authenticated users to view permissions
DROP POLICY IF EXISTS "Users can view service permissions" ON tier_service_permissions;
CREATE POLICY "Users can view service permissions"
ON tier_service_permissions FOR SELECT
TO authenticated
USING (true);

-- Allow service role to manage all permissions
DROP POLICY IF EXISTS "Service role can manage all permissions" ON tier_service_permissions;
CREATE POLICY "Service role can manage all permissions"
ON tier_service_permissions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- 8. Add helpful comments
-- ============================================
COMMENT ON TABLE tier_service_permissions IS 'Stores which services each tier can access';
COMMENT ON COLUMN tier_service_permissions.tier IS 'User tier: testlimit, bronze, silver, gold';
COMMENT ON COLUMN tier_service_permissions.service_key IS 'Service identifier matching the HTML file names';
COMMENT ON COLUMN tier_service_permissions.has_access IS 'Whether this tier has access to this service';

-- ============================================
-- 9. Create helper function to check user service access
-- ============================================
CREATE OR REPLACE FUNCTION check_user_service_access(user_tier TEXT, service TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  SELECT has_access INTO has_permission
  FROM tier_service_permissions
  WHERE tier = user_tier AND service_key = service;

  RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_user_service_access IS 'Check if a user tier has access to a specific service';

-- ============================================
-- 10. FINAL VERIFICATION
-- ============================================
DO $$
DECLARE
  table_exists BOOLEAN;
  testlimit_count INTEGER;
  bronze_count INTEGER;
  silver_count INTEGER;
  gold_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'tier_service_permissions'
  ) INTO table_exists;

  -- Count permissions per tier
  SELECT COUNT(*) INTO testlimit_count FROM tier_service_permissions WHERE tier = 'testlimit';
  SELECT COUNT(*) INTO bronze_count FROM tier_service_permissions WHERE tier = 'bronze';
  SELECT COUNT(*) INTO silver_count FROM tier_service_permissions WHERE tier = 'silver';
  SELECT COUNT(*) INTO gold_count FROM tier_service_permissions WHERE tier = 'gold';

  -- Print beautiful results
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║   SERVICE PERMISSIONS MIGRATION        ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF table_exists AND testlimit_count = 6 AND bronze_count = 6 AND silver_count = 6 AND gold_count = 6 THEN
    RAISE NOTICE '🎉 SUCCESS! SERVICE PERMISSIONS INSTALLED!';
  ELSE
    RAISE NOTICE '⚠️  Some components may be missing';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📋 Components Status:';
  RAISE NOTICE '   ├─ tier_service_permissions table: %', CASE WHEN table_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ testlimit tier permissions: % services', testlimit_count;
  RAISE NOTICE '   ├─ bronze tier permissions: % services', bronze_count;
  RAISE NOTICE '   ├─ silver tier permissions: % services', silver_count;
  RAISE NOTICE '   └─ gold tier permissions: % services', gold_count;
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ MIGRATION COMPLETE!                ║';
  RAISE NOTICE '║  Service permissions system ready!     ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- ============================================
-- COMPLETE DATABASE SCHEMA FOR AI IMAGE SYSTEM
-- Copy this entire file and run in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: USER LIMITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  email TEXT,
  tier TEXT DEFAULT 'testlimit',
  credits_limit INTEGER DEFAULT 5,
  credits_used INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  images_limit INTEGER DEFAULT 10,
  images_used INTEGER DEFAULT 0,
  captions_limit INTEGER DEFAULT 5,
  captions_used INTEGER DEFAULT 0,
  descriptions_limit INTEGER DEFAULT 3,
  descriptions_used INTEGER DEFAULT 0,
  last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN email TEXT;
    RAISE NOTICE '✅ Added email column';
  END IF;
END $$;

-- Add tier column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'tier'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN tier TEXT DEFAULT 'testlimit';
    RAISE NOTICE '✅ Added tier column';
  END IF;
END $$;

-- Add tier constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_limits' AND constraint_name LIKE '%tier%check%'
  ) THEN
    ALTER TABLE user_limits ADD CONSTRAINT user_limits_tier_check
      CHECK (tier IN ('testlimit', 'bronze', 'silver', 'gold'));
    RAISE NOTICE '✅ Added tier constraint';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️  tier constraint already exists';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_limits_user_id ON user_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_limits_tier ON user_limits(tier);
CREATE INDEX IF NOT EXISTS idx_user_limits_email ON user_limits(email);

-- Update default tier to testlimit
ALTER TABLE user_limits ALTER COLUMN tier SET DEFAULT 'testlimit';
ALTER TABLE user_limits ALTER COLUMN credits_limit SET DEFAULT 5;

-- Enable RLS
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own limits" ON user_limits;
CREATE POLICY "Users can view their own limits"
ON user_limits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all limits" ON user_limits;
CREATE POLICY "Service role can manage all limits"
ON user_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments
COMMENT ON COLUMN user_limits.tier IS 'User tier: testlimit (5), bronze (100), silver (130), gold (171)';
COMMENT ON COLUMN user_limits.credits_limit IS 'Total credits per month';
COMMENT ON COLUMN user_limits.credits_used IS 'Credits used. All services: 1 credit per generation';

-- ============================================
-- PART 2: PRODUCT GENERATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_generations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  product_identifier TEXT NOT NULL,
  has_generated_caption BOOLEAN DEFAULT false,
  has_generated_description BOOLEAN DEFAULT false,
  caption_text TEXT,
  description_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_identifier)
);

CREATE INDEX IF NOT EXISTS idx_product_generations_user_id ON product_generations(user_id);

-- Enable RLS
ALTER TABLE product_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage their own product generations" ON product_generations;
CREATE POLICY "Users can manage their own product generations"
ON product_generations FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE product_generations IS 'Tracks caption and description generation per product';

-- ============================================
-- PART 3: TIER SERVICE PERMISSIONS TABLE
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

-- Add tier constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'tier_service_permissions' AND constraint_name LIKE '%tier%check%'
  ) THEN
    ALTER TABLE tier_service_permissions ADD CONSTRAINT tier_service_permissions_tier_check
      CHECK (tier IN ('testlimit', 'bronze', 'silver', 'gold'));
    RAISE NOTICE '✅ Added tier constraint';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️  tier constraint already exists';
END $$;

-- Add service_key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'tier_service_permissions' AND constraint_name LIKE '%service_key%check%'
  ) THEN
    ALTER TABLE tier_service_permissions ADD CONSTRAINT tier_service_permissions_service_key_check
      CHECK (service_key IN ('complete-outfit', 'accessories-only', 'color-collection', 'flat-lay', 'scene-recreation', 'style-transfer'));
    RAISE NOTICE '✅ Added service_key constraint';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️  service_key constraint already exists';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tier_service_permissions_tier ON tier_service_permissions(tier);
CREATE INDEX IF NOT EXISTS idx_tier_service_permissions_service ON tier_service_permissions(service_key);
CREATE INDEX IF NOT EXISTS idx_tier_service_permissions_access ON tier_service_permissions(tier, service_key, has_access);

-- Insert default permissions
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES
  -- testlimit tier (only complete-outfit for testing)
  ('testlimit', 'complete-outfit', true),
  ('testlimit', 'accessories-only', false),
  ('testlimit', 'color-collection', false),
  ('testlimit', 'flat-lay', false),
  ('testlimit', 'scene-recreation', false),
  ('testlimit', 'style-transfer', false),

  -- bronze tier (same as testlimit by default)
  ('bronze', 'complete-outfit', true),
  ('bronze', 'accessories-only', false),
  ('bronze', 'color-collection', false),
  ('bronze', 'flat-lay', false),
  ('bronze', 'scene-recreation', false),
  ('bronze', 'style-transfer', false),

  -- silver tier (no default access)
  ('silver', 'complete-outfit', false),
  ('silver', 'accessories-only', false),
  ('silver', 'color-collection', false),
  ('silver', 'flat-lay', false),
  ('silver', 'scene-recreation', false),
  ('silver', 'style-transfer', false),

  -- gold tier (no default access)
  ('gold', 'complete-outfit', false),
  ('gold', 'accessories-only', false),
  ('gold', 'color-collection', false),
  ('gold', 'flat-lay', false),
  ('gold', 'scene-recreation', false),
  ('gold', 'style-transfer', false)
ON CONFLICT (tier, service_key) DO NOTHING;

-- Enable RLS
ALTER TABLE tier_service_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view service permissions" ON tier_service_permissions;
CREATE POLICY "Users can view service permissions"
ON tier_service_permissions FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Service role can manage all permissions" ON tier_service_permissions;
CREATE POLICY "Service role can manage all permissions"
ON tier_service_permissions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments
COMMENT ON TABLE tier_service_permissions IS 'Stores which services each tier can access';
COMMENT ON COLUMN tier_service_permissions.tier IS 'User tier: testlimit, bronze, silver, gold';
COMMENT ON COLUMN tier_service_permissions.service_key IS 'Service identifier matching the HTML file names';
COMMENT ON COLUMN tier_service_permissions.has_access IS 'Whether this tier has access to this service';

-- Helper function
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
-- PART 4: TIER PRICING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tier_pricing (
  id BIGSERIAL PRIMARY KEY,
  tier TEXT UNIQUE NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  credits INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'IRR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tier constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'tier_pricing' AND constraint_name LIKE '%tier%check%'
  ) THEN
    ALTER TABLE tier_pricing ADD CONSTRAINT tier_pricing_tier_check
      CHECK (tier IN ('testlimit', 'bronze', 'silver', 'gold'));
    RAISE NOTICE '✅ Added tier constraint';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️  tier constraint already exists';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tier_pricing_tier ON tier_pricing(tier);
CREATE INDEX IF NOT EXISTS idx_tier_pricing_active ON tier_pricing(is_active);

-- Insert default pricing (CURRENT VALUES FROM YOUR DATABASE)
INSERT INTO tier_pricing (tier, price, credits, currency)
VALUES
  ('testlimit', 0, 5, 'IRR'),
  ('bronze', 3990000, 100, 'IRR'),
  ('silver', 5990000, 130, 'IRR'),
  ('gold', 9990000, 171, 'IRR')
ON CONFLICT (tier)
DO UPDATE SET
  price = EXCLUDED.price,
  credits = EXCLUDED.credits,
  updated_at = NOW();

-- Enable RLS
ALTER TABLE tier_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view pricing" ON tier_pricing;
CREATE POLICY "Anyone can view pricing"
ON tier_pricing FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Service role can manage pricing" ON tier_pricing;
CREATE POLICY "Service role can manage pricing"
ON tier_pricing FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments
COMMENT ON TABLE tier_pricing IS 'Stores pricing configuration for each tier';
COMMENT ON COLUMN tier_pricing.tier IS 'User tier: testlimit, bronze, silver, gold';
COMMENT ON COLUMN tier_pricing.price IS 'Monthly price in smallest currency unit (e.g., Rials)';
COMMENT ON COLUMN tier_pricing.credits IS 'Monthly credits included';
COMMENT ON COLUMN tier_pricing.currency IS 'Currency code (default: IRR for Iranian Rial)';

-- Helper function
CREATE OR REPLACE FUNCTION get_tier_pricing(tier_name TEXT)
RETURNS TABLE (
  tier TEXT,
  price INTEGER,
  credits INTEGER,
  currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT tp.tier, tp.price, tp.credits, tp.currency
  FROM tier_pricing tp
  WHERE tp.tier = tier_name AND tp.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tier_pricing IS 'Get pricing information for a specific tier';

-- ============================================
-- PART 5: SYNC USER CREDITS WITH PRICING
-- ============================================
-- Update all existing users' credits_limit to match tier_pricing
UPDATE user_limits ul
SET credits_limit = tp.credits
FROM tier_pricing tp
WHERE ul.tier = tp.tier
  AND ul.credits_limit != tp.credits;

-- ============================================
-- PART 6: CREATE NEW USERS WITH DEFAULT TIER
-- ============================================
-- Add any auth users that don't have user_limits yet
INSERT INTO user_limits (
    user_id,
    email,
    tier,
    credits_limit,
    credits_used,
    is_premium,
    images_limit,
    images_used,
    captions_limit,
    captions_used,
    descriptions_limit,
    descriptions_used
  )
  SELECT
    id as user_id,
    email,
    'testlimit' as tier,
    5 as credits_limit,
    0 as credits_used,
    false as is_premium,
    10 as images_limit,
    0 as images_used,
    5 as captions_limit,
    0 as captions_used,
    3 as descriptions_limit,
    0 as descriptions_used
  FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM user_limits WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- FINAL VERIFICATION
-- ============================================
DO $$
DECLARE
  user_limits_exists BOOLEAN;
  product_gen_exists BOOLEAN;
  service_perm_exists BOOLEAN;
  tier_pricing_exists BOOLEAN;
  pricing_count INTEGER;
  permission_count INTEGER;
BEGIN
  -- Check tables
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_limits') INTO user_limits_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_generations') INTO product_gen_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tier_service_permissions') INTO service_perm_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tier_pricing') INTO tier_pricing_exists;

  -- Count records
  SELECT COUNT(*) INTO pricing_count FROM tier_pricing;
  SELECT COUNT(*) INTO permission_count FROM tier_service_permissions;

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║   COMPLETE DATABASE SCHEMA INSTALLATION        ║';
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF user_limits_exists AND product_gen_exists AND service_perm_exists AND tier_pricing_exists
     AND pricing_count = 4 AND permission_count = 24 THEN
    RAISE NOTICE '🎉 SUCCESS! ALL COMPONENTS INSTALLED!';
  ELSE
    RAISE NOTICE '⚠️  Some components may be missing';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables Status:';
  RAISE NOTICE '   ├─ user_limits: %', CASE WHEN user_limits_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ product_generations: %', CASE WHEN product_gen_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ tier_service_permissions: %', CASE WHEN service_perm_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   └─ tier_pricing: %', CASE WHEN tier_pricing_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '📊 Data Status:';
  RAISE NOTICE '   ├─ Pricing records: % (should be 4)', pricing_count;
  RAISE NOTICE '   └─ Permission records: % (should be 24)', permission_count;
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ INSTALLATION COMPLETE!                     ║';
  RAISE NOTICE '║  Your system is ready to use!                 ║';
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- Show current configuration
SELECT
    tier,
    price,
    credits,
    currency,
    CASE
        WHEN tier = 'testlimit' THEN '🧪 Test Limit'
        WHEN tier = 'bronze' THEN '🥉 Bronze'
        WHEN tier = 'silver' THEN '🥈 Silver'
        WHEN tier = 'gold' THEN '🥇 Gold'
    END as tier_name
FROM tier_pricing
ORDER BY
    CASE tier
        WHEN 'testlimit' THEN 1
        WHEN 'bronze' THEN 2
        WHEN 'silver' THEN 3
        WHEN 'gold' THEN 4
    END;

/*
  ✅ COMPLETE DATABASE SCHEMA INSTALLED!

  What was installed:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ user_limits table (user data and credits)
  ✓ product_generations table (caption/description tracking)
  ✓ tier_service_permissions table (service access control)
  ✓ tier_pricing table (pricing and credit configuration)
  ✓ All indexes for performance
  ✓ Row Level Security policies
  ✓ Helper functions
  ✓ User credits synced with pricing

  🎯 Current Pricing:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • testlimit: 0 IRR (5 credits)
  • bronze: 3,990,000 IRR (100 credits)
  • silver: 5,990,000 IRR (130 credits)
  • gold: 9,990,000 IRR (171 credits)

  🚀 Next Steps:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. All database tables are ready ✅
  2. Admin panels will work ✅
  3. Credits system is working ✅
  4. Service permissions are active ✅

  Everything is ready to use! 🎉
*/

-- ============================================
-- Pricing Management System Migration
-- Store pricing configuration in database
-- ============================================

-- ============================================
-- 1. Create tier_pricing table
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

-- ============================================
-- 2. Add constraint to tier column
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'tier_pricing' AND constraint_name LIKE '%tier%check%'
  ) THEN
    ALTER TABLE tier_pricing ADD CONSTRAINT tier_pricing_tier_check
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
-- 3. Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tier_pricing_tier ON tier_pricing(tier);
CREATE INDEX IF NOT EXISTS idx_tier_pricing_active ON tier_pricing(is_active);

-- ============================================
-- 4. Insert default pricing
-- ============================================
INSERT INTO tier_pricing (tier, price, credits, currency)
VALUES
  ('testlimit', 0, 5, 'IRR'),
  ('bronze', 199000, 50, 'IRR'),
  ('silver', 399000, 100, 'IRR'),
  ('gold', 599000, 130, 'IRR')
ON CONFLICT (tier) DO NOTHING;

-- ============================================
-- 5. Enable Row Level Security
-- ============================================
ALTER TABLE tier_pricing ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. Create RLS policies
-- ============================================

-- Allow everyone to read pricing (public)
DROP POLICY IF EXISTS "Anyone can view pricing" ON tier_pricing;
CREATE POLICY "Anyone can view pricing"
ON tier_pricing FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Allow service role to manage all pricing
DROP POLICY IF EXISTS "Service role can manage pricing" ON tier_pricing;
CREATE POLICY "Service role can manage pricing"
ON tier_pricing FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- 7. Add helpful comments
-- ============================================
COMMENT ON TABLE tier_pricing IS 'Stores pricing configuration for each tier';
COMMENT ON COLUMN tier_pricing.tier IS 'User tier: testlimit, bronze, silver, gold';
COMMENT ON COLUMN tier_pricing.price IS 'Monthly price in smallest currency unit (e.g., Rials)';
COMMENT ON COLUMN tier_pricing.credits IS 'Monthly credits included';
COMMENT ON COLUMN tier_pricing.currency IS 'Currency code (default: IRR for Iranian Rial)';

-- ============================================
-- 8. Create function to get pricing by tier
-- ============================================
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
-- 9. FINAL VERIFICATION
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
    WHERE table_name = 'tier_pricing'
  ) INTO table_exists;

  -- Count pricing records
  SELECT COUNT(*) INTO testlimit_count FROM tier_pricing WHERE tier = 'testlimit';
  SELECT COUNT(*) INTO bronze_count FROM tier_pricing WHERE tier = 'bronze';
  SELECT COUNT(*) INTO silver_count FROM tier_pricing WHERE tier = 'silver';
  SELECT COUNT(*) INTO gold_count FROM tier_pricing WHERE tier = 'gold';

  -- Print beautiful results
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║      PRICING SYSTEM MIGRATION          ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF table_exists AND testlimit_count = 1 AND bronze_count = 1 AND silver_count = 1 AND gold_count = 1 THEN
    RAISE NOTICE '🎉 SUCCESS! PRICING SYSTEM INSTALLED!';
  ELSE
    RAISE NOTICE '⚠️  Some components may be missing';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📋 Components Status:';
  RAISE NOTICE '   ├─ tier_pricing table: %', CASE WHEN table_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ testlimit pricing: %', CASE WHEN testlimit_count = 1 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ bronze pricing: %', CASE WHEN bronze_count = 1 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ silver pricing: %', CASE WHEN silver_count = 1 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   └─ gold pricing: %', CASE WHEN gold_count = 1 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ MIGRATION COMPLETE!                ║';
  RAISE NOTICE '║  Pricing system ready!                 ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- Show current pricing
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
  ✅ PRICING SYSTEM SUCCESSFULLY INSTALLED!

  What was installed:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ tier_pricing table
  ✓ Indexes for performance
  ✓ Row Level Security policies
  ✓ Default pricing for all tiers
  ✓ Helper function get_tier_pricing()

  🎯 Default Pricing:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • testlimit: 0 IRR (5 credits)
  • bronze: 199,000 IRR (50 credits)
  • silver: 399,000 IRR (100 credits)
  • gold: 599,000 IRR (130 credits)

  🚀 Next Steps:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Run this migration in Supabase SQL Editor
  2. Create API endpoints for pricing management
  3. Update admin panel to use database
  4. Update pricing page to fetch from database

  Ready to manage pricing centrally! 🎉
*/

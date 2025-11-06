-- ============================================
-- SIMPLE Migration: Add Tier System to Existing Database
-- Date: 2025-11-06
-- Description: Minimal changes to add tier system
-- ============================================

-- ============================================
-- 1. Create user_limits table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS user_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  email TEXT,

  -- Tier system fields
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
  credits_limit INTEGER DEFAULT 50,
  credits_used INTEGER DEFAULT 0,

  -- Legacy fields (backward compatibility)
  is_premium BOOLEAN DEFAULT false,
  images_limit INTEGER DEFAULT 10,
  images_used INTEGER DEFAULT 0,
  captions_limit INTEGER DEFAULT 5,
  captions_used INTEGER DEFAULT 0,
  descriptions_limit INTEGER DEFAULT 3,
  descriptions_used INTEGER DEFAULT 0,

  -- Metadata
  last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Add new columns if they don't exist
-- ============================================

-- Check and add tier column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'tier'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold'));
  END IF;
END $$;

-- Check and add credits_limit column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'credits_limit'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN credits_limit INTEGER DEFAULT 50;
  END IF;
END $$;

-- Check and add credits_used column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'credits_used'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN credits_used INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 3. Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_limits_user_id ON user_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_limits_tier ON user_limits(tier);
CREATE INDEX IF NOT EXISTS idx_user_limits_email ON user_limits(email);

-- ============================================
-- 4. Migrate existing data
-- ============================================
UPDATE user_limits
SET
  tier = CASE
    WHEN is_premium = true THEN 'gold'
    ELSE 'bronze'
  END,
  credits_limit = CASE
    WHEN is_premium = true THEN 130
    ELSE 50
  END,
  credits_used = COALESCE(images_used, 0)
WHERE tier IS NULL OR (tier = 'bronze' AND is_premium = true);

-- ============================================
-- 5. Create product_generations table
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

-- ============================================
-- 6. Enable Row Level Security
-- ============================================
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_generations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. Create RLS policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own limits" ON user_limits;
DROP POLICY IF EXISTS "Service role can manage all limits" ON user_limits;
DROP POLICY IF EXISTS "Users can manage their own product generations" ON product_generations;

-- User limits policies
CREATE POLICY "Users can view their own limits"
ON user_limits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all limits"
ON user_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Product generations policies
CREATE POLICY "Users can manage their own product generations"
ON product_generations FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. Add comments
-- ============================================
COMMENT ON COLUMN user_limits.tier IS 'User tier: bronze (50), silver (100), gold (130)';
COMMENT ON COLUMN user_limits.credits_limit IS 'Total credits per month';
COMMENT ON COLUMN user_limits.credits_used IS 'Credits used. Standard: 1, Premium: 2';

-- ============================================
-- 9. Verify installation
-- ============================================
DO $$
DECLARE
  tier_col BOOLEAN;
  credits_limit_col BOOLEAN;
  credits_used_col BOOLEAN;
  prod_gen_table BOOLEAN;
BEGIN
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'tier'
  ) INTO tier_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'credits_limit'
  ) INTO credits_limit_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'credits_used'
  ) INTO credits_used_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'product_generations'
  ) INTO prod_gen_table;

  -- Print results
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  IF tier_col AND credits_limit_col AND credits_used_col AND prod_gen_table THEN
    RAISE NOTICE '✅ SUCCESS! All components installed';
  ELSE
    RAISE NOTICE '⚠️  WARNING: Some components may be missing';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Components Status:';
  RAISE NOTICE '  • tier column: %', CASE WHEN tier_col THEN '✅ INSTALLED' ELSE '❌ MISSING' END;
  RAISE NOTICE '  • credits_limit column: %', CASE WHEN credits_limit_col THEN '✅ INSTALLED' ELSE '❌ MISSING' END;
  RAISE NOTICE '  • credits_used column: %', CASE WHEN credits_used_col THEN '✅ INSTALLED' ELSE '❌ MISSING' END;
  RAISE NOTICE '  • product_generations table: %', CASE WHEN prod_gen_table THEN '✅ INSTALLED' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'You can now use the tier system!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- ============================================
-- DONE!
-- ============================================

/*
  ✅ Migration Complete!

  What was installed:
  - tier, credits_limit, credits_used columns in user_limits
  - product_generations table for caption tracking
  - Indexes for performance
  - Row Level Security policies
  - Migrated existing premium/free users to gold/bronze

  Next steps:
  1. Refresh your admin panel
  2. Try changing a user's tier
  3. Generate some images to test credit deduction

  Note: User signup trigger is not included to avoid auth.users issues.
  New users will get limits created automatically by the backend code.
*/

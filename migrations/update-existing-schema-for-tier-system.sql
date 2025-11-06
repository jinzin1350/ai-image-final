-- ============================================
-- Migration: Update Existing Schema for Tier System
-- Date: 2025-11-06
-- Description: Adds tier system to existing database without breaking current setup
-- ============================================

-- ============================================
-- 1. Create user_limits table if it doesn't exist
-- ============================================
CREATE TABLE IF NOT EXISTS user_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,

  -- NEW: Tier system fields
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
  credits_limit INTEGER DEFAULT 50,
  credits_used INTEGER DEFAULT 0,

  -- Legacy fields (kept for backward compatibility)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================
-- 2. Add new columns to existing user_limits table (if they don't exist)
-- ============================================
DO $$
BEGIN
  -- Add tier column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'tier'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold'));
    RAISE NOTICE 'Added tier column';
  END IF;

  -- Add credits_limit column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'credits_limit'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN credits_limit INTEGER DEFAULT 50;
    RAISE NOTICE 'Added credits_limit column';
  END IF;

  -- Add credits_used column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'credits_used'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN credits_used INTEGER DEFAULT 0;
    RAISE NOTICE 'Added credits_used column';
  END IF;
END $$;

-- ============================================
-- 3. Create indexes for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_limits_user_id ON user_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_limits_tier ON user_limits(tier);
CREATE INDEX IF NOT EXISTS idx_user_limits_email ON user_limits(email);

-- ============================================
-- 4. Migrate existing data
-- ============================================
-- Convert existing premium users to gold tier, free users to bronze
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
WHERE tier IS NULL OR tier = 'bronze';

-- ============================================
-- 5. Create product_generations table for caption/description tracking
-- ============================================
CREATE TABLE IF NOT EXISTS product_generations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_identifier TEXT NOT NULL, -- Hash or unique identifier for the product
  has_generated_caption BOOLEAN DEFAULT false,
  has_generated_description BOOLEAN DEFAULT false,
  caption_text TEXT,
  description_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_identifier)
);

CREATE INDEX IF NOT EXISTS idx_product_generations_user_id ON product_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_product_generations_identifier ON product_generations(product_identifier);

-- ============================================
-- 6. Update or create trigger for new user signup
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_user_limits_on_signup_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_user_limits_on_signup();

-- Create new trigger function
CREATE OR REPLACE FUNCTION create_user_limits_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_limits (
    user_id,
    email,
    tier,
    credits_limit,
    credits_used,
    is_premium
  )
  VALUES (
    NEW.id,
    NEW.email,
    'bronze',  -- Default tier
    50,        -- Default credits for bronze
    0,         -- No credits used initially
    false      -- Not premium by default
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER create_user_limits_on_signup_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_limits_on_signup();

-- ============================================
-- 7. Enable Row Level Security on new tables
-- ============================================
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_generations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. Create RLS policies
-- ============================================

-- User limits policies (admin can see all, users can see their own)
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

-- Product generations policies
DROP POLICY IF EXISTS "Users can manage their own product generations" ON product_generations;
CREATE POLICY "Users can manage their own product generations"
ON product_generations FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 9. Add helpful comments to columns
-- ============================================
COMMENT ON COLUMN user_limits.tier IS 'User tier: bronze (50 credits), silver (100 credits), gold (130 credits)';
COMMENT ON COLUMN user_limits.credits_limit IS 'Total credits available per billing cycle';
COMMENT ON COLUMN user_limits.credits_used IS 'Credits consumed this cycle. Standard services: 1 credit, Premium services: 2 credits';
COMMENT ON TABLE product_generations IS 'Tracks caption and description generation per product to enforce one-time-per-product limit';

-- ============================================
-- 10. Verify the migration
-- ============================================
DO $$
DECLARE
  tier_exists BOOLEAN;
  credits_limit_exists BOOLEAN;
  credits_used_exists BOOLEAN;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'tier'
  ) INTO tier_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'credits_limit'
  ) INTO credits_limit_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'credits_used'
  ) INTO credits_used_exists;

  -- Print results
  IF tier_exists AND credits_limit_exists AND credits_used_exists THEN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '✅ All tier system columns are in place';
  ELSE
    RAISE WARNING '⚠️ Some columns may be missing. Please check manually.';
  END IF;

  -- Show summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   - tier column: %', CASE WHEN tier_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - credits_limit column: %', CASE WHEN credits_limit_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   - credits_used column: %', CASE WHEN credits_used_exists THEN '✅' ELSE '❌' END;
END $$;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================

/*
  📝 What was added:

  1. ✅ user_limits table (created if didn't exist)
  2. ✅ tier, credits_limit, credits_used columns
  3. ✅ product_generations table for caption tracking
  4. ✅ Indexes for better performance
  5. ✅ Migrated existing premium/free users to gold/bronze
  6. ✅ Trigger for auto-creating limits on user signup
  7. ✅ Row Level Security policies

  🎯 Default Tier Limits:
  - Bronze: 50 credits/month
  - Silver: 100 credits/month
  - Gold: 130 credits/month

  💰 Service Costs:
  - Standard services: 1 credit per image
  - Premium services (Style Transfer, Brand Theme): 2 credits per image

  ✅ You can now:
  - Use the admin panel to manage user tiers
  - Track credit usage automatically
  - Enforce usage limits

  🔍 To verify everything worked, run:

  SELECT
    column_name,
    data_type,
    column_default
  FROM information_schema.columns
  WHERE table_name = 'user_limits'
  ORDER BY ordinal_position;
*/

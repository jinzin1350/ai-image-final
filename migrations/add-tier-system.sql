-- Migration: Add Tier System (Bronze, Silver, Gold)
-- Date: 2025-11-05
-- Description: Upgrades user_limits table to support Bronze/Silver/Gold tiers with credit-based usage

-- ============================================
-- 1. Add new tier column to user_limits
-- ============================================
ALTER TABLE user_limits
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold'));

-- ============================================
-- 2. Add credits column (replaces images_limit/images_used)
-- ============================================
ALTER TABLE user_limits
ADD COLUMN IF NOT EXISTS credits_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0;

-- ============================================
-- 3. Create index on tier column
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_limits_tier ON user_limits(tier);

-- ============================================
-- 4. Migrate existing data
-- ============================================
-- Convert existing premium users to gold, free users to bronze
UPDATE user_limits
SET tier = CASE
  WHEN is_premium = true THEN 'gold'
  ELSE 'bronze'
END
WHERE tier IS NULL OR tier = 'bronze';

-- Migrate existing images_used to credits_used (1:1 ratio for now)
UPDATE user_limits
SET credits_used = COALESCE(images_used, 0),
    credits_limit = COALESCE(images_limit, 10)
WHERE credits_used = 0;

-- ============================================
-- 5. Create product_generations table for tracking caption/description usage
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
-- 6. Update trigger function for new user signup
-- ============================================
CREATE OR REPLACE FUNCTION create_user_limits_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_limits (user_id, email, tier, credits_limit, credits_used, is_premium)
  VALUES (
    NEW.id,
    NEW.email,
    'bronze', -- Default tier
    50,       -- Default credits for bronze
    0,        -- No credits used initially
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Add comments for documentation
-- ============================================
COMMENT ON COLUMN user_limits.tier IS 'User tier: bronze (50 credits), silver (100 credits), gold (130 credits)';
COMMENT ON COLUMN user_limits.credits_limit IS 'Total credits available per billing cycle';
COMMENT ON COLUMN user_limits.credits_used IS 'Credits consumed this cycle. Standard services: 1 credit, Premium services: 2 credits';
COMMENT ON TABLE product_generations IS 'Tracks caption and description generation per product to enforce one-time-per-product limit';

-- ============================================
-- 8. Default tier limits (for reference - set in application)
-- ============================================
-- Bronze: 50 credits/month
-- Silver: 100 credits/month
-- Gold: 130 credits/month
--
-- Service costs:
-- - Standard (Flat Lay, Catalog, Product Luxury, Professional Modeling): 1 credit
-- - Premium (Style Transfer, Brand Theme): 2 credits
-- - Caption generation: Free (but only once per product)
-- - Description generation: Free (but only once per product)

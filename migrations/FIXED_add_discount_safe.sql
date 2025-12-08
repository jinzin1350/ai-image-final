-- ========================================
-- SAFE: Add Discount System to Pricing Table
-- This checks if columns exist before adding
-- ========================================

-- Add discount_percentage column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tier_pricing' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE tier_pricing
    ADD COLUMN discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
    RAISE NOTICE '✅ Added discount_percentage column';
  ELSE
    RAISE NOTICE 'ℹ️  discount_percentage column already exists';
  END IF;
END $$;

-- Add discount_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tier_pricing' AND column_name = 'discount_active'
  ) THEN
    ALTER TABLE tier_pricing
    ADD COLUMN discount_active BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added discount_active column';
  ELSE
    RAISE NOTICE 'ℹ️  discount_active column already exists';
  END IF;
END $$;

-- Add comments for clarity
COMMENT ON COLUMN tier_pricing.discount_percentage IS 'Discount percentage (0-100). Example: 20 means 20% off';
COMMENT ON COLUMN tier_pricing.discount_active IS 'Whether the discount is currently active and should be shown to users';

-- Create a helper function to calculate discounted price (FIXED SYNTAX)
CREATE OR REPLACE FUNCTION get_discounted_price(original_price INTEGER, discount_pct INTEGER, is_active BOOLEAN)
RETURNS INTEGER AS $$
BEGIN
    IF is_active AND discount_pct > 0 THEN
        RETURN original_price - (original_price * discount_pct / 100);
    ELSE
        RETURN original_price;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_discounted_price IS 'Calculate discounted price based on original price, discount percentage, and active status';

-- Update existing rows to have default discount values (0% discount, inactive)
UPDATE tier_pricing
SET discount_percentage = COALESCE(discount_percentage, 0),
    discount_active = COALESCE(discount_active, FALSE)
WHERE discount_percentage IS NULL OR discount_active IS NULL;

-- Create an index for faster queries on active discounts (safely)
CREATE INDEX IF NOT EXISTS idx_tier_pricing_discount_active
ON tier_pricing(discount_active)
WHERE discount_active = TRUE;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  discount_pct_col BOOLEAN;
  discount_active_col BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tier_pricing' AND column_name = 'discount_percentage'
  ) INTO discount_pct_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tier_pricing' AND column_name = 'discount_active'
  ) INTO discount_active_col;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_discounted_price'
  ) INTO function_exists;

  -- Print results
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║   DISCOUNT SYSTEM VERIFICATION         ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF discount_pct_col AND discount_active_col AND function_exists THEN
    RAISE NOTICE '🎉 SUCCESS! DISCOUNT SYSTEM INSTALLED!';
  ELSE
    RAISE NOTICE '⚠️  Some components may be missing';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📋 Components Status:';
  RAISE NOTICE '   ├─ discount_percentage column: %', CASE WHEN discount_pct_col THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ discount_active column: %', CASE WHEN discount_active_col THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   └─ get_discounted_price function: %', CASE WHEN function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ DISCOUNT MIGRATION COMPLETE!       ║';
  RAISE NOTICE '║  You can now set discounts in admin!  ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- Success message
SELECT 'Discount system added successfully to tier_pricing table!' as status;

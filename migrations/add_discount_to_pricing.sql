-- ========================================
-- Add Discount System to Pricing Table
-- ========================================
-- This migration adds discount functionality to the tier_pricing table
-- allowing admins to set percentage discounts on subscription tiers

-- Add discount columns
ALTER TABLE tier_pricing
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS discount_active BOOLEAN DEFAULT FALSE;

-- Add comments for clarity
COMMENT ON COLUMN tier_pricing.discount_percentage IS 'Discount percentage (0-100). Example: 20 means 20% off';
COMMENT ON COLUMN tier_pricing.discount_active IS 'Whether the discount is currently active and should be shown to users';

-- Create a helper function to calculate discounted price
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
SET discount_percentage = 0,
    discount_active = FALSE
WHERE discount_percentage IS NULL OR discount_active IS NULL;

-- Create an index for faster queries on active discounts
CREATE INDEX IF NOT EXISTS idx_tier_pricing_discount_active
ON tier_pricing(discount_active)
WHERE discount_active = TRUE;

-- Success message
SELECT 'Discount system added successfully to tier_pricing table!' as status;

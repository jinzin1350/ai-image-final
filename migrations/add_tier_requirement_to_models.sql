-- ================================================
-- Add tier_requirement column to models table
-- ================================================
-- This allows hierarchical access control:
-- - testlimit: can see all tiers (like gold)
-- - bronze: can only see bronze models
-- - silver: can see silver + bronze models
-- - gold: can see gold + silver + bronze models
-- ================================================

-- Add tier_requirement column
ALTER TABLE models
ADD COLUMN IF NOT EXISTS tier_requirement VARCHAR(20) DEFAULT 'bronze';

-- Add check constraint
ALTER TABLE models
ADD CONSTRAINT models_tier_requirement_check
CHECK (tier_requirement IN ('testlimit', 'bronze', 'silver', 'gold'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_models_tier_requirement ON models(tier_requirement);

-- Update existing models: if visibility is 'premium', set to 'gold', otherwise 'bronze'
UPDATE models
SET tier_requirement = CASE
  WHEN visibility = 'premium' THEN 'gold'
  WHEN visibility = 'private' THEN 'gold'
  ELSE 'bronze'
END
WHERE tier_requirement IS NULL OR tier_requirement = 'bronze';

-- Add comment
COMMENT ON COLUMN models.tier_requirement IS 'Minimum tier required to view this model. Access is hierarchical: bronze sees bronze only, silver sees silver+bronze, gold sees all, testlimit sees all.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added tier_requirement column to models table';
    RAISE NOTICE '📊 Tier hierarchy: testlimit=all, bronze=bronze only, silver=silver+bronze, gold=all';
    RAISE NOTICE '🔄 Updated existing models based on visibility';
END $$;

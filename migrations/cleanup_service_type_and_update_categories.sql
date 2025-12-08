-- ================================================
-- Clean up service_type and update categories
-- ================================================
-- Remove service_type field and use category-based approach
-- ================================================

-- Drop service_type column and related constraints/indexes
ALTER TABLE models DROP CONSTRAINT IF EXISTS models_service_type_check;
DROP INDEX IF EXISTS idx_models_service_type;
DROP INDEX IF EXISTS idx_models_category_service;
ALTER TABLE models DROP COLUMN IF EXISTS service_type;

-- Update category check constraint to include new brand categories
ALTER TABLE models DROP CONSTRAINT IF EXISTS models_category_check;
ALTER TABLE models
ADD CONSTRAINT models_category_check
CHECK (category IN (
    'woman', 'man', 'girl', 'boy', 'plus-size',
    'brand-woman', 'brand-man', 'brand-girl', 'brand-boy', 'brand-plus-size',
    'accessory', 'underwear'
));

-- Create index for category (since we removed the combined index)
CREATE INDEX IF NOT EXISTS idx_models_category ON models(category);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Removed service_type column from models table';
    RAISE NOTICE '📋 Updated categories to include brand categories';
    RAISE NOTICE '🗑️ Cleaned up old indexes and constraints';
    RAISE NOTICE '✨ Models table is now cleaner and simpler';
END $$;

-- ================================================
-- Add accessory-man category to models table
-- ================================================
-- Add support for male accessory models
-- ================================================

-- Update category check constraint to include accessory-man
ALTER TABLE models DROP CONSTRAINT IF EXISTS models_category_check;
ALTER TABLE models
ADD CONSTRAINT models_category_check
CHECK (category IN (
    'woman', 'man', 'girl', 'boy', 'plus-size',
    'brand-woman', 'brand-man', 'brand-girl', 'brand-boy', 'brand-plus-size',
    'accessory', 'accessory-man', 'underwear'
));

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added accessory-man category to models table';
    RAISE NOTICE '💍 Male accessory models can now be saved';
END $$;

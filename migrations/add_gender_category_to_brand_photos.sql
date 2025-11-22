-- ================================================
-- Add gender_category to brand_reference_photos table
-- ================================================
-- Allow categorizing brand photos by gender (woman, man, child)
-- ================================================

-- Add gender_category column
ALTER TABLE brand_reference_photos
ADD COLUMN IF NOT EXISTS gender_category TEXT DEFAULT 'woman' CHECK (gender_category IN ('woman', 'man', 'child'));

-- Set all existing photos to 'woman' category
UPDATE brand_reference_photos
SET gender_category = 'woman'
WHERE gender_category IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_brand_reference_photos_gender_category ON brand_reference_photos(gender_category);

-- Create composite index for brand_id + gender_category + photo_type (common query pattern)
CREATE INDEX IF NOT EXISTS idx_brand_reference_photos_brand_gender_type ON brand_reference_photos(brand_id, gender_category, photo_type);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added gender_category column to brand_reference_photos';
    RAISE NOTICE '👗 Categories: woman (default), man, child';
    RAISE NOTICE '📊 All existing photos set to woman category';
    RAISE NOTICE '🔍 Created indexes for faster queries';
END $$;

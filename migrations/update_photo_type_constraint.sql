-- ================================================
-- Update photo_type check constraint to include all service types
-- ================================================
-- This migration updates the check constraint to allow:
-- recreation, style-transfer, accessories, flat-lay
-- ================================================

-- Drop the old constraint
ALTER TABLE brand_reference_photos
DROP CONSTRAINT IF EXISTS brand_reference_photos_photo_type_check;

-- Add new constraint with all photo types
ALTER TABLE brand_reference_photos
ADD CONSTRAINT brand_reference_photos_photo_type_check
CHECK (
    photo_type IS NULL
    OR photo_type IN ('recreation', 'style-transfer', 'accessories', 'flat-lay')
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ photo_type constraint updated successfully!';
    RAISE NOTICE '📋 Valid types: recreation, style-transfer, accessories, flat-lay';
END $$;

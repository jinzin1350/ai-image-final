-- ================================================
-- Add accessory_type column to brand_reference_photos table
-- ================================================
-- This migration adds support for different accessory types
-- (ring, earrings, bracelet, necklace, anklet, watch)
-- ================================================

-- Add accessory_type column as TEXT
ALTER TABLE brand_reference_photos
ADD COLUMN IF NOT EXISTS accessory_type TEXT;

-- Add check constraint to ensure valid accessory types
ALTER TABLE brand_reference_photos
ADD CONSTRAINT valid_accessory_type
CHECK (
    accessory_type IS NULL
    OR accessory_type IN ('ring', 'earrings', 'bracelet', 'necklace', 'anklet', 'watch')
);

-- Create index for better performance when filtering by accessory type
CREATE INDEX IF NOT EXISTS idx_brand_photos_accessory_type ON brand_reference_photos(accessory_type);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ accessory_type column added to brand_reference_photos table!';
    RAISE NOTICE '📋 Valid types: ring, earrings, bracelet, necklace, anklet, watch';
    RAISE NOTICE '🔍 Index created for efficient filtering';
END $$;

-- ================================================
-- Add service_types column to brands table
-- ================================================
-- This migration adds support for multiple service types per brand
-- (recreation, style-transfer, accessories, flat-lay)
-- ================================================

-- Add service_types column as TEXT array
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS service_types TEXT[] DEFAULT '{}';

-- Update existing brands to have all service types by default
-- (You can customize this based on your needs)
UPDATE brands
SET service_types = ARRAY['recreation', 'style-transfer', 'accessories', 'flat-lay']
WHERE service_types = '{}' OR service_types IS NULL;

-- Create index for better performance when filtering by service type
CREATE INDEX IF NOT EXISTS idx_brands_service_types ON brands USING GIN (service_types);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ service_types column added to brands table!';
    RAISE NOTICE '📋 Existing brands updated with all service types';
    RAISE NOTICE '🔍 GIN index created for efficient filtering';
END $$;

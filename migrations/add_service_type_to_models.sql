-- ================================================
-- Add service_type to content_library table
-- ================================================
-- This allows different models for different services
-- (complete-outfit vs scene-recreation)
-- ================================================

-- Add service_type column to content_library table
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'both';

-- Add check constraint to ensure valid service types
ALTER TABLE content_library
ADD CONSTRAINT content_library_service_type_check
CHECK (service_type IN ('complete-outfit', 'scene-recreation', 'both'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_content_library_service_type ON content_library(service_type);

-- Create index for combined category + service_type queries
CREATE INDEX IF NOT EXISTS idx_content_library_category_service ON content_library(category, service_type);

-- Update existing models to 'both' so they appear in both services
UPDATE content_library SET service_type = 'both' WHERE service_type IS NULL OR content_type = 'model';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added service_type column to content_library table';
    RAISE NOTICE '📋 Valid values: complete-outfit, scene-recreation, both';
    RAISE NOTICE '🔍 Created indexes for performance';
    RAISE NOTICE '📊 Existing models set to "both"';
END $$;

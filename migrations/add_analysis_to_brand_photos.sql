-- Add AI analysis columns to brand_reference_photos table
-- This enables caching of AI analysis to avoid re-analyzing photos

ALTER TABLE brand_reference_photos
ADD COLUMN IF NOT EXISTS ai_analysis TEXT,
ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS analysis_retry_count INTEGER DEFAULT 0;

-- Add index for faster queries on analysis_status
CREATE INDEX IF NOT EXISTS idx_brand_reference_photos_analysis_status
ON brand_reference_photos(analysis_status);

-- Add comment explaining status values
COMMENT ON COLUMN brand_reference_photos.analysis_status IS
'Status values: pending (not analyzed yet), analyzing (currently being analyzed), analyzed (successfully analyzed), failed (analysis failed after retries)';

-- Update existing photos to have 'pending' status
UPDATE brand_reference_photos
SET analysis_status = 'pending'
WHERE analysis_status IS NULL;

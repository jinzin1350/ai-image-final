-- Add photo_type column to brand_reference_photos table
-- This distinguishes between 'recreation' (single model) and 'style-transfer' (2-person) photos

ALTER TABLE brand_reference_photos
ADD COLUMN photo_type VARCHAR(50) DEFAULT 'recreation';

-- Add check constraint to ensure only valid values
ALTER TABLE brand_reference_photos
ADD CONSTRAINT brand_reference_photos_photo_type_check
CHECK (photo_type IN ('recreation', 'style-transfer'));

-- Create index for better performance when filtering by photo_type
CREATE INDEX idx_brand_reference_photos_photo_type ON brand_reference_photos(photo_type);

-- Update existing photos to be 'recreation' type (default behavior)
UPDATE brand_reference_photos SET photo_type = 'recreation' WHERE photo_type IS NULL;

COMMENT ON COLUMN brand_reference_photos.photo_type IS 'Type of brand photo: recreation (single model for scene recreation) or style-transfer (2-person modeling for style transfer)';

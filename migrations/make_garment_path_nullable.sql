-- Make garment_path column nullable in generated_images table
-- This allows services like Nano Banana that don't use garments to save images

-- Remove NOT NULL constraint from garment_path
ALTER TABLE generated_images
  ALTER COLUMN garment_path DROP NOT NULL;

-- Verify the change
DO $$
DECLARE
  is_nullable BOOLEAN;
BEGIN
  SELECT is_nullable = 'YES'
  FROM information_schema.columns
  WHERE table_name = 'generated_images'
    AND column_name = 'garment_path'
  INTO is_nullable;

  IF is_nullable THEN
    RAISE NOTICE '✅ Verification successful: garment_path is now nullable';
  ELSE
    RAISE EXCEPTION '❌ Verification failed: garment_path is still NOT NULL';
  END IF;
END $$;

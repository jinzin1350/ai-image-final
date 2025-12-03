-- ============================================
-- Create Table to Track Garment Storage Uploads
-- ============================================
-- This table tracks uploads to the 'garments' storage bucket
-- with user contact information
-- ============================================

CREATE TABLE IF NOT EXISTS garment_uploads (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  user_phone TEXT,
  storage_bucket TEXT DEFAULT 'garments',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  is_processed BOOLEAN DEFAULT false
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_garment_uploads_user_id
ON garment_uploads(user_id);

CREATE INDEX IF NOT EXISTS idx_garment_uploads_email
ON garment_uploads(user_email);

CREATE INDEX IF NOT EXISTS idx_garment_uploads_phone
ON garment_uploads(user_phone);

CREATE INDEX IF NOT EXISTS idx_garment_uploads_path
ON garment_uploads(storage_path);

CREATE INDEX IF NOT EXISTS idx_garment_uploads_date
ON garment_uploads(upload_date DESC);

-- Add comments
COMMENT ON TABLE garment_uploads IS 'Tracks all garment uploads to storage with user contact info';
COMMENT ON COLUMN garment_uploads.storage_path IS 'Full path in Supabase storage bucket';
COMMENT ON COLUMN garment_uploads.user_email IS 'Email of user who uploaded';
COMMENT ON COLUMN garment_uploads.user_phone IS 'Phone of user who uploaded';

-- Enable RLS
ALTER TABLE garment_uploads ENABLE ROW LEVEL SECURITY;

-- Users can view their own uploads
DROP POLICY IF EXISTS "Users can view own uploads" ON garment_uploads;
CREATE POLICY "Users can view own uploads"
ON garment_uploads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can manage all
DROP POLICY IF EXISTS "Service role can manage all uploads" ON garment_uploads;
CREATE POLICY "Service role can manage all uploads"
ON garment_uploads FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view all
DROP POLICY IF EXISTS "Admins can view all uploads" ON garment_uploads;
CREATE POLICY "Admins can view all uploads"
ON garment_uploads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_limits
    WHERE user_id = auth.uid()
    AND email = 'engi.alireza@gmail.com'
  )
);

-- ============================================
-- Verification
-- ============================================
DO $$
DECLARE
  table_exists BOOLEAN;
  index_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'garment_uploads'
  ) INTO table_exists;

  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'garment_uploads';

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║   GARMENT UPLOADS TABLE CREATED                ║';
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF table_exists THEN
    RAISE NOTICE '✅ garment_uploads table created successfully';
    RAISE NOTICE '✅ % indexes created', index_count;
  ELSE
    RAISE NOTICE '❌ Failed to create garment_uploads table';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Table Structure:';
  RAISE NOTICE '   ├─ user_id (UUID)';
  RAISE NOTICE '   ├─ user_email (TEXT) ✨ Contact info';
  RAISE NOTICE '   ├─ user_phone (TEXT) ✨ Contact info';
  RAISE NOTICE '   ├─ storage_path (TEXT) - Path in storage';
  RAISE NOTICE '   ├─ file_name (TEXT)';
  RAISE NOTICE '   ├─ file_size (INTEGER)';
  RAISE NOTICE '   └─ upload_date (TIMESTAMP)';
  RAISE NOTICE '';

  IF table_exists THEN
    RAISE NOTICE '🎉 Ready to track garment uploads!';
  END IF;
  RAISE NOTICE '';
END $$;

-- Show sample query
DO $$
BEGIN
  RAISE NOTICE '📝 Example Usage:';
  RAISE NOTICE '';
  RAISE NOTICE '-- Save upload with contact info:';
  RAISE NOTICE 'INSERT INTO garment_uploads (user_id, user_email, user_phone, storage_path, file_name)';
  RAISE NOTICE 'VALUES (user_uuid, ''user@email.com'', ''+1234567890'', ''/garments/file.jpg'', ''file.jpg'');';
  RAISE NOTICE '';
  RAISE NOTICE '-- Find all uploads by phone:';
  RAISE NOTICE 'SELECT * FROM garment_uploads WHERE user_phone = ''+1234567890'';';
  RAISE NOTICE '';
  RAISE NOTICE '-- Find all uploads by email:';
  RAISE NOTICE 'SELECT * FROM garment_uploads WHERE user_email = ''user@email.com'';';
  RAISE NOTICE '';
END $$;

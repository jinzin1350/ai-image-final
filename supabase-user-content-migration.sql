-- ========================================
-- User-Specific Content Migration
-- ========================================
-- This allows premium users to upload their own models and backgrounds
-- Run this in Supabase SQL Editor
-- ========================================

-- Step 1: Add owner_user_id column to content_library
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add index for fast queries
CREATE INDEX IF NOT EXISTS idx_content_library_owner ON content_library(owner_user_id);

-- Step 3: Add visibility field (public/private)
ALTER TABLE content_library
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private'));

CREATE INDEX IF NOT EXISTS idx_content_library_visibility ON content_library(visibility);

-- Step 4: Update RLS policies to support user-owned content

-- Drop old policy
DROP POLICY IF EXISTS "Anyone can view active content" ON content_library;

-- New policy: Users can see public content OR their own private content
CREATE POLICY "Users can view public or own content" ON content_library
  FOR SELECT USING (
    is_active = true AND (
      visibility = 'public'
      OR owner_user_id = auth.uid()
      OR owner_user_id IS NULL
    )
  );

-- Policy: Users can insert their own content
DROP POLICY IF EXISTS "Users can insert their own content" ON content_library;
CREATE POLICY "Users can insert their own content" ON content_library
  FOR INSERT WITH CHECK (
    auth.uid() = owner_user_id OR auth.uid() IS NOT NULL
  );

-- Policy: Users can update their own content
DROP POLICY IF EXISTS "Users can update their own content" ON content_library;
CREATE POLICY "Users can update their own content" ON content_library
  FOR UPDATE USING (
    owner_user_id = auth.uid() OR owner_user_id IS NULL
  );

-- Policy: Users can delete their own content
DROP POLICY IF EXISTS "Users can delete their own content" ON content_library;
CREATE POLICY "Users can delete their own content" ON content_library
  FOR DELETE USING (
    owner_user_id = auth.uid()
  );

-- Keep admin policies
DROP POLICY IF EXISTS "Admins can manage all content" ON content_library;
CREATE POLICY "Admins can manage all content" ON content_library
  FOR ALL USING (true);

-- ========================================
-- Verification
-- ========================================

SELECT '✅ User Content Migration Complete!' as status;
SELECT 'Users can now upload their own models and backgrounds' as info;
SELECT 'Premium users will be able to upload private content' as feature;

-- Show structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'content_library'
  AND column_name IN ('owner_user_id', 'visibility')
ORDER BY ordinal_position;

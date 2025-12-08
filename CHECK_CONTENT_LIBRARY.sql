-- ============================================
-- Check what's in content_library table
-- ============================================

-- Check if table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'content_library'
) as table_exists;

-- Count all records
SELECT COUNT(*) as total_records
FROM content_library;

-- Count by content_type
SELECT
  content_type,
  COUNT(*) as count
FROM content_library
GROUP BY content_type;

-- Show all records (limit 10)
SELECT
  id,
  content_type,
  name,
  category,
  visibility,
  owner_user_id,
  created_at
FROM content_library
ORDER BY created_at DESC
LIMIT 10;

-- Check for NULL content_type
SELECT COUNT(*) as null_content_type_count
FROM content_library
WHERE content_type IS NULL;

-- ============================================
-- Create content_library table for models and backgrounds
-- ============================================

CREATE TABLE IF NOT EXISTS content_library (
  id BIGSERIAL PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('model', 'background', 'accessory')),
  name TEXT NOT NULL,
  category TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'premium')),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  metadata JSONB,
  owner_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_library_type ON content_library(content_type);
CREATE INDEX IF NOT EXISTS idx_content_library_owner ON content_library(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_content_library_visibility ON content_library(visibility);
CREATE INDEX IF NOT EXISTS idx_content_library_category ON content_library(category);
CREATE INDEX IF NOT EXISTS idx_content_library_active ON content_library(is_active);

-- Enable RLS
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view public and their own content" ON content_library;
CREATE POLICY "Users can view public and their own content"
ON content_library FOR SELECT
TO authenticated
USING (
  visibility = 'public'
  OR owner_user_id = auth.uid()
  OR (visibility = 'premium' AND EXISTS (
    SELECT 1 FROM user_limits
    WHERE user_id = auth.uid() AND is_premium = true
  ))
);

DROP POLICY IF EXISTS "Users can manage their own content" ON content_library;
CREATE POLICY "Users can manage their own content"
ON content_library FOR ALL
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage all content" ON content_library;
CREATE POLICY "Service role can manage all content"
ON content_library FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Comments
COMMENT ON TABLE content_library IS 'Stores AI-generated models, backgrounds, and accessories';
COMMENT ON COLUMN content_library.content_type IS 'Type of content: model, background, or accessory';
COMMENT ON COLUMN content_library.visibility IS 'Who can see this: public (everyone), private (owner only), premium (premium users)';
COMMENT ON COLUMN content_library.metadata IS 'Additional metadata in JSON format';

/*
✅ What this creates:
- content_library table for storing AI models and backgrounds
- Proper indexes for performance
- RLS policies for security
- Support for public, private, and premium content

After creating this table, you can save models to database!
*/

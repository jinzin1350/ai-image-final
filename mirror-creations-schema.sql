-- ============================================
-- MIRROR CREATIONS TABLE
-- ============================================
-- Feature: Mirror competitor's photo style with user's own product
-- Flow: Upload reference → AI analyzes style → Select model → Upload garment → Generate

CREATE TABLE IF NOT EXISTS mirror_creations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Reference image (competitor's photo to mirror)
  reference_image_url TEXT NOT NULL,
  reference_image_storage_path TEXT,
  reference_analysis JSONB, -- AI analysis: {lighting, angle, mood, colors, background, pose}

  -- Selected model from content_library
  model_id BIGINT REFERENCES content_library(id), -- BIGINT to match content_library.id
  model_image_url TEXT, -- Cache the model URL

  -- User's garment
  garment_url TEXT NOT NULL,
  garment_storage_path TEXT,
  garment_removed_bg_url TEXT, -- Optional: background-removed version

  -- Generated result
  result_image_url TEXT,
  result_storage_path TEXT,

  -- Generation metadata
  prompt TEXT, -- Full prompt sent to AI
  generation_params JSONB, -- {model: 'imagen-3', style_strength: 0.8, etc}
  credits_used INTEGER DEFAULT 1,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'generating', 'completed', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER, -- Track generation time

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_mirror_creations_user_id ON mirror_creations(user_id);
CREATE INDEX IF NOT EXISTS idx_mirror_creations_status ON mirror_creations(status);
CREATE INDEX IF NOT EXISTS idx_mirror_creations_created ON mirror_creations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mirror_creations_model ON mirror_creations(model_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE mirror_creations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own mirror creations" ON mirror_creations;
DROP POLICY IF EXISTS "Users can create mirror creations" ON mirror_creations;
DROP POLICY IF EXISTS "Users can update own mirror creations" ON mirror_creations;
DROP POLICY IF EXISTS "Users can delete own mirror creations" ON mirror_creations;

-- Users can only see their own mirror creations
CREATE POLICY "Users can view own mirror creations"
  ON mirror_creations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create mirror creations
CREATE POLICY "Users can create mirror creations"
  ON mirror_creations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own mirror creations
CREATE POLICY "Users can update own mirror creations"
  ON mirror_creations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own mirror creations
CREATE POLICY "Users can delete own mirror creations"
  ON mirror_creations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_mirror_creations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mirror_creations_updated_at ON mirror_creations;
CREATE TRIGGER mirror_creations_updated_at
  BEFORE UPDATE ON mirror_creations
  FOR EACH ROW
  EXECUTE FUNCTION update_mirror_creations_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE mirror_creations IS 'Stores mirror creation requests where users recreate competitor photo styles with their own products';
COMMENT ON COLUMN mirror_creations.reference_image_url IS 'URL of the competitor/reference photo to mirror';
COMMENT ON COLUMN mirror_creations.reference_analysis IS 'AI-extracted style attributes from reference image: lighting, angle, mood, colors, background, pose';
COMMENT ON COLUMN mirror_creations.model_id IS 'Selected model from content_library (BIGINT foreign key)';
COMMENT ON COLUMN mirror_creations.garment_url IS 'User uploaded garment/product image';
COMMENT ON COLUMN mirror_creations.result_image_url IS 'Final generated image matching reference style';
COMMENT ON COLUMN mirror_creations.status IS 'pending → analyzing → generating → completed/failed';
COMMENT ON COLUMN mirror_creations.credits_used IS 'Number of credits deducted for this generation';
COMMENT ON COLUMN mirror_creations.processing_time_ms IS 'Time taken to generate image in milliseconds';

-- ============================================
-- EXAMPLE USAGE
-- ============================================

-- Insert a new mirror creation request
-- INSERT INTO mirror_creations (
--   user_id,
--   reference_image_url,
--   reference_analysis,
--   model_id,
--   garment_url,
--   status
-- ) VALUES (
--   auth.uid(),
--   'https://example.com/zara-reference.jpg',
--   '{"lighting": "soft natural", "angle": "45 degrees", "mood": "minimalist", "colors": "warm beige"}'::jsonb,
--   123, -- model_id from content_library
--   'https://example.com/my-garment.jpg',
--   'pending'
-- );

-- Query user's mirror creations
-- SELECT * FROM mirror_creations
-- WHERE user_id = auth.uid()
-- ORDER BY created_at DESC;

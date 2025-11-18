-- ================================================
-- Create separate models table
-- ================================================
-- This table will store all model photos separately
-- from garments and other content
-- ================================================

-- Create models table
CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    service_type VARCHAR(50) NOT NULL DEFAULT 'both',
    image_url TEXT NOT NULL,
    storage_path TEXT,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private',
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add check constraints
ALTER TABLE models
ADD CONSTRAINT models_category_check
CHECK (category IN ('woman', 'man', 'girl', 'boy', 'child', 'couple', 'group', 'elderly', 'teen', 'plus-size', 'accessory', 'underwear'));

ALTER TABLE models
ADD CONSTRAINT models_service_type_check
CHECK (service_type IN ('complete-outfit', 'scene-recreation', 'both'));

ALTER TABLE models
ADD CONSTRAINT models_visibility_check
CHECK (visibility IN ('private', 'public'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_models_category ON models(category);
CREATE INDEX IF NOT EXISTS idx_models_service_type ON models(service_type);
CREATE INDEX IF NOT EXISTS idx_models_category_service ON models(category, service_type);
CREATE INDEX IF NOT EXISTS idx_models_owner ON models(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_models_visibility ON models(visibility);
CREATE INDEX IF NOT EXISTS idx_models_active ON models(is_active);
CREATE INDEX IF NOT EXISTS idx_models_created_at ON models(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own private models + all public models
CREATE POLICY "Users can view their own and public models"
ON models FOR SELECT
USING (
    visibility = 'public'
    OR owner_user_id = auth.uid()
);

-- RLS Policy: Users can insert their own models
CREATE POLICY "Users can insert their own models"
ON models FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- RLS Policy: Users can update their own models
CREATE POLICY "Users can update their own models"
ON models FOR UPDATE
USING (owner_user_id = auth.uid());

-- RLS Policy: Users can delete their own models
CREATE POLICY "Users can delete their own models"
ON models FOR DELETE
USING (owner_user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_models_updated_at
BEFORE UPDATE ON models
FOR EACH ROW
EXECUTE FUNCTION update_models_updated_at();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Created models table successfully';
    RAISE NOTICE '📋 Categories: woman, man, girl, boy, child, couple, group, elderly, teen, plus-size, accessory, underwear';
    RAISE NOTICE '🔧 Service types: complete-outfit, scene-recreation, both';
    RAISE NOTICE '🔒 Row Level Security (RLS) enabled';
    RAISE NOTICE '🔍 Performance indexes created';
    RAISE NOTICE '📊 Ready to use!';
END $$;

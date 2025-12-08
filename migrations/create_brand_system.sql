-- ================================================
-- Brand Reference Photo System Migration
-- ================================================
-- This creates tables for brand management and brand reference photos
-- Used in "الهام از عکس مرجع" (Scene Recreation) feature
-- ================================================

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    logo TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create brand_reference_photos table
CREATE TABLE IF NOT EXISTS brand_reference_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_photos_brand_id ON brand_reference_photos(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_photos_is_active ON brand_reference_photos(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_photos_display_order ON brand_reference_photos(display_order);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_reference_photos_updated_at
    BEFORE UPDATE ON brand_reference_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_reference_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for brands table
-- Anyone can read active brands
CREATE POLICY "Anyone can view active brands"
    ON brands FOR SELECT
    USING (is_active = true);

-- Only authenticated users can view all brands (including inactive)
CREATE POLICY "Authenticated users can view all brands"
    ON brands FOR SELECT
    TO authenticated
    USING (true);

-- Only authenticated users can insert/update/delete brands
CREATE POLICY "Authenticated users can insert brands"
    ON brands FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update brands"
    ON brands FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete brands"
    ON brands FOR DELETE
    TO authenticated
    USING (true);

-- Create policies for brand_reference_photos table
-- Anyone can read active photos from active brands
CREATE POLICY "Anyone can view active brand photos"
    ON brand_reference_photos FOR SELECT
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = brand_reference_photos.brand_id
            AND brands.is_active = true
        )
    );

-- Only authenticated users can view all photos
CREATE POLICY "Authenticated users can view all brand photos"
    ON brand_reference_photos FOR SELECT
    TO authenticated
    USING (true);

-- Only authenticated users can insert/update/delete photos
CREATE POLICY "Authenticated users can insert brand photos"
    ON brand_reference_photos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update brand photos"
    ON brand_reference_photos FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete brand photos"
    ON brand_reference_photos FOR DELETE
    TO authenticated
    USING (true);

-- Insert some sample brands (optional - for testing)
-- You can delete these after testing
INSERT INTO brands (name, description, is_active) VALUES
    ('Nike Sportswear', 'Athletic and casual sportswear brand', true),
    ('Zara Collection', 'Contemporary fashion and lifestyle', true),
    ('Local Brand', 'Local fashion photography style', true)
ON CONFLICT (name) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Brand system tables created successfully!';
    RAISE NOTICE '📋 Tables created: brands, brand_reference_photos';
    RAISE NOTICE '🔒 RLS policies enabled for security';
    RAISE NOTICE '📸 Ready to upload brand reference photos!';
END $$;

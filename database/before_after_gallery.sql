-- ============================================
-- Before/After Gallery Table
-- ============================================
-- This table stores before/after image pairs for the portfolio page

CREATE TABLE IF NOT EXISTS before_after_gallery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    before_image_url TEXT NOT NULL,
    after_image_url TEXT NOT NULL,
    service_type TEXT,
    category TEXT,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_before_after_gallery_service_type ON before_after_gallery(service_type);
CREATE INDEX IF NOT EXISTS idx_before_after_gallery_featured ON before_after_gallery(is_featured);
CREATE INDEX IF NOT EXISTS idx_before_after_gallery_order ON before_after_gallery(display_order);

-- Enable Row Level Security (RLS)
ALTER TABLE before_after_gallery ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view gallery)
CREATE POLICY "Public read access" ON before_after_gallery
    FOR SELECT
    USING (true);

-- Only authenticated users can insert/update/delete
CREATE POLICY "Authenticated users can insert" ON before_after_gallery
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON before_after_gallery
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete" ON before_after_gallery
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- Storage Bucket for Before/After Images
-- ============================================
-- Run this in Supabase SQL Editor or create bucket manually in Storage UI

-- Create storage bucket (if not exists via UI)
INSERT INTO storage.buckets (id, name, public)
VALUES ('before-after-images', 'before-after-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read access for before-after images" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'before-after-images');

CREATE POLICY "Authenticated users can upload before-after images" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'before-after-images');

CREATE POLICY "Authenticated users can update before-after images" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'before-after-images');

CREATE POLICY "Authenticated users can delete before-after images" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'before-after-images');

-- ============================================
-- Instructions:
-- ============================================
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
-- 5. Verify table and bucket are created
-- ============================================

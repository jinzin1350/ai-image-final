-- Create angle_references table for storing angle reference images
-- This table stores example images showing different camera angles for photography

CREATE TABLE IF NOT EXISTS public.angle_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    angle_key TEXT NOT NULL UNIQUE,
    title_en TEXT NOT NULL,
    title_fa TEXT NOT NULL,
    description_en TEXT,
    description_fa TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_angle_references_angle_key ON public.angle_references(angle_key);
CREATE INDEX IF NOT EXISTS idx_angle_references_display_order ON public.angle_references(display_order);
CREATE INDEX IF NOT EXISTS idx_angle_references_is_active ON public.angle_references(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE public.angle_references ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to active angles (drop if exists first)
DROP POLICY IF EXISTS "Allow public read access to active angles" ON public.angle_references;
CREATE POLICY "Allow public read access to active angles"
ON public.angle_references
FOR SELECT
USING (is_active = true);

-- Seed initial data with the 9 angle options
INSERT INTO public.angle_references (angle_key, title_en, title_fa, description_en, description_fa, display_order, is_active) VALUES
('front', 'Front View', 'نمای جلو', 'Full frontal view - Hero shot showing complete front of garment', 'نمایش کامل جلوی لباس - تصویر اصلی محصول', 1, true),
('back', 'Back View', 'نمای پشت', 'Complete back view showing garment from behind', 'نمایش کامل پشت لباس', 2, true),
('right-side', 'Right Side View', 'نمای راست', 'Side profile from the right showing garment silhouette', 'نمای کناری از سمت راست - نمایش سیلوئت لباس', 3, true),
('three-quarter-left', 'Over-the-Shoulder (3/4 Left)', 'سه‌ربع چپ', '45-degree angle over the shoulder showing back details', 'زاویه ۴۵ درجه از پشت شانه - نمایش جزئیات پشت', 4, true),
('three-quarter-right', '45° Front-Right', 'سه‌ربع راست', '45-degree front angle from the right side', 'زاویه ۴۵ درجه از جلو سمت راست', 5, true),
('close-up', 'Close-Up Details', 'نمای نزدیک', 'Detailed close-up showing neckline, fabric texture and embellishments', 'نمای نزدیک جزئیات - بافت پارچه و تزئینات یقه', 6, true),
('left-side', 'Left Side View', 'نمای چپ', 'Side profile from the left showing garment silhouette', 'نمای کناری از سمت چپ - نمایش سیلوئت لباس', 7, true),
('full-body', 'Full Body Shot', 'تمام قد', 'Complete full-length view from head to toe', 'نمایش کامل از سر تا پا - تصویر تمام قد', 8, true),
('waist-up', 'Waist-Up Shot', 'نیم‌تنه', 'Upper body shot from waist upward', 'نمای نیم‌تنه - از کمر به بالا', 9, true)
ON CONFLICT (angle_key) DO NOTHING;

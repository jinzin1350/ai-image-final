-- ========================================
-- Schema کامل Supabase برای پروژه AI Fashion Photography
-- ========================================
-- این فایل شامل تمام جداول، policies، و storage buckets مورد نیاز است
-- می‌توانید این فایل را مستقیماً در Supabase SQL Editor اجرا کنید

-- ========================================
-- بخش ۱: ایجاد/بروزرسانی جدول اصلی
-- ========================================

-- اگر جدول generations وجود دارد، نام آن را تغییر دهید
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'generations')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'generated_images') THEN
        ALTER TABLE generations RENAME TO generated_images;
        RAISE NOTICE 'Table renamed from generations to generated_images';
    END IF;
END $$;

-- ایجاد جدول generated_images (اگر وجود ندارد)
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  garment_path TEXT NOT NULL,
  model_id TEXT NOT NULL,
  background_id TEXT NOT NULL,
  prompt TEXT,
  description TEXT,
  generated_image_url TEXT,
  instagram_caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- اضافه کردن ستون instagram_caption (اگر وجود ندارد)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'generated_images'
        AND column_name = 'instagram_caption'
    ) THEN
        ALTER TABLE generated_images ADD COLUMN instagram_caption TEXT;
        RAISE NOTICE 'Column instagram_caption added';
    ELSE
        RAISE NOTICE 'Column instagram_caption already exists';
    END IF;
END $$;

-- اضافه کردن ستون generated_image_url (اگر result_image_url وجود دارد)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'generated_images'
        AND column_name = 'result_image_url'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'generated_images'
        AND column_name = 'generated_image_url'
    ) THEN
        ALTER TABLE generated_images RENAME COLUMN result_image_url TO generated_image_url;
        RAISE NOTICE 'Column renamed from result_image_url to generated_image_url';
    END IF;
END $$;

-- ========================================
-- بخش ۲: ایجاد ایندکس‌ها
-- ========================================

CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);

-- ========================================
-- بخش ۳: فعال‌سازی Row Level Security
-- ========================================

ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- ========================================
-- بخش ۴: حذف و ایجاد مجدد Policies
-- ========================================

-- حذف policies قدیمی
DROP POLICY IF EXISTS "Users can view their own generations" ON generated_images;
DROP POLICY IF EXISTS "Users can insert their own generations" ON generated_images;
DROP POLICY IF EXISTS "Users can delete their own generations" ON generated_images;
DROP POLICY IF EXISTS "Users can update their own generations" ON generated_images;

-- ایجاد policies جدید
CREATE POLICY "Users can view their own generations"
  ON generated_images
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
  ON generated_images
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
  ON generated_images
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations"
  ON generated_images
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ========================================
-- بخش ۵: ایجاد Storage Bucket
-- ========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('garments', 'garments', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- بخش ۶: حذف و ایجاد مجدد Storage Policies
-- ========================================

-- حذف policies قدیمی
DROP POLICY IF EXISTS "Anyone can upload garment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can download garment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update garment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete garment images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload to garments bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can read from garments bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can update garments bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete from garments bucket" ON storage.objects;

-- ایجاد policies جدید
CREATE POLICY "Public can upload to garments bucket"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'garments');

CREATE POLICY "Public can read from garments bucket"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'garments');

CREATE POLICY "Public can update garments bucket"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'garments');

CREATE POLICY "Public can delete from garments bucket"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'garments');

-- ========================================
-- بخش ۷: نمایش اطلاعات
-- ========================================

-- نمایش ساختار جدول
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'generated_images'
ORDER BY ordinal_position;

-- نمایش پیغام موفقیت
SELECT '✅ Schema setup completed successfully!' as status;

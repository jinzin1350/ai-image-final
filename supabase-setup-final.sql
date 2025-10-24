-- ========================================
-- AI Fashion Photo Generator - Complete Supabase Setup
-- ========================================
-- این فایل را در SQL Editor کپی کنید و RUN کنید
-- تمام خطاها رفع شده و کاملاً تست شده است
-- ========================================

-- قدم ۱: حذف جدول قدیمی در صورت وجود مشکل
DROP TABLE IF EXISTS generations CASCADE;

-- قدم ۲: حذف جدول generated_images در صورت وجود (برای شروع تمیز)
DROP TABLE IF EXISTS generated_images CASCADE;

-- ========================================
-- بخش ۱: ایجاد جدول اصلی
-- ========================================

CREATE TABLE generated_images (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  garment_path TEXT NOT NULL,
  model_id TEXT,
  background_id TEXT,
  pose_id TEXT,
  camera_angle_id TEXT,
  style_id TEXT,
  lighting_id TEXT,
  prompt TEXT,
  description TEXT,
  generated_image_url TEXT NOT NULL,
  instagram_caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- اضافه کردن کامنت‌ها
COMMENT ON TABLE generated_images IS 'ذخیره تصاویر تولید شده با AI - نسخه جدید';
COMMENT ON COLUMN generated_images.garment_path IS 'مسیر عکس لباس (می‌تواند JSON array باشد برای چند لباس)';
COMMENT ON COLUMN generated_images.instagram_caption IS 'کپشن اینستاگرام تولید شده توسط Gemini AI';
COMMENT ON COLUMN generated_images.pose_id IS 'شناسه حالت بدن (standing, sitting, etc.)';
COMMENT ON COLUMN generated_images.camera_angle_id IS 'شناسه زاویه دوربین';
COMMENT ON COLUMN generated_images.style_id IS 'شناسه استایل عکس';
COMMENT ON COLUMN generated_images.lighting_id IS 'شناسه نورپردازی';

-- ========================================
-- بخش ۲: ایجاد ایندکس‌ها
-- ========================================

CREATE INDEX idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX idx_generated_images_created_at ON generated_images(created_at DESC);
CREATE INDEX idx_generated_images_model_id ON generated_images(model_id);
CREATE INDEX idx_generated_images_background_id ON generated_images(background_id);

-- ========================================
-- بخش ۳: Row Level Security (RLS)
-- ========================================

ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- حذف Policy‌های قبلی
DROP POLICY IF EXISTS "Users can view their own generations" ON generated_images;
DROP POLICY IF EXISTS "Users can insert their own generations" ON generated_images;
DROP POLICY IF EXISTS "Users can update their own generations" ON generated_images;
DROP POLICY IF EXISTS "Users can delete their own generations" ON generated_images;
DROP POLICY IF EXISTS "Public can view all generations" ON generated_images;
DROP POLICY IF EXISTS "Public can insert generations" ON generated_images;

-- Policy برای مشاهده (بدون احراز هویت هم بشه)
CREATE POLICY "Public can view all generations"
  ON generated_images
  FOR SELECT
  TO public
  USING (true);

-- Policy برای درج (بدون احراز هویت هم بشه)
CREATE POLICY "Public can insert generations"
  ON generated_images
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy برای بروزرسانی (فقط صاحب رکورد یا بدون user_id)
CREATE POLICY "Users can update their own generations"
  ON generated_images
  FOR UPDATE
  TO public
  USING (user_id IS NULL OR auth.uid() = user_id);

-- Policy برای حذف (فقط صاحب رکورد یا بدون user_id)
CREATE POLICY "Users can delete their own generations"
  ON generated_images
  FOR DELETE
  TO public
  USING (user_id IS NULL OR auth.uid() = user_id);

-- ========================================
-- بخش ۴: Storage Bucket
-- ========================================

-- ایجاد bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('garments', 'garments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- حذف Policy‌های قبلی Storage
DROP POLICY IF EXISTS "Anyone can upload garment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can download garment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update garment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete garment images" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Download" ON storage.objects;

-- Policy برای آپلود
CREATE POLICY "Public Upload"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'garments');

-- Policy برای دانلود
CREATE POLICY "Public Download"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'garments');

-- Policy برای بروزرسانی
CREATE POLICY "Anyone can update garment images"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'garments');

-- Policy برای حذف
CREATE POLICY "Anyone can delete garment images"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'garments');

-- ========================================
-- بخش ۵: تست و بررسی
-- ========================================

-- نمایش تعداد رکوردها
SELECT
  '✅ Setup completed successfully!' as status,
  COUNT(*) as total_images
FROM generated_images;

-- نمایش ساختار جدول
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'generated_images'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- نمایش Policy‌ها
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'generated_images';

-- نمایش Bucket
SELECT
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE id = 'garments';

-- ========================================
-- پایان نصب
-- ========================================

-- اگر همه چیز درست بود، باید پیغام زیر را ببینید:
SELECT '🎉 نصب کامل شد! حالا می‌توانید از برنامه استفاده کنید.' as message;

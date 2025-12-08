-- ========================================
-- AI Fashion Photo Generator - Supabase Setup کامل
-- ========================================
-- این فایل شامل تمام تنظیمات لازم برای راه‌اندازی پروژه در Supabase است
-- فقط کافیه این فایل رو در SQL Editor کپی کنید و RUN کنید

-- ========================================
-- قسمت ۱: ایجاد جدول اصلی
-- ========================================

-- ایجاد جدول برای ذخیره تاریخچه تولید عکس‌ها
CREATE TABLE IF NOT EXISTS generated_images (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  garment_path TEXT NOT NULL,
  model_id TEXT,
  background_id TEXT,
  prompt TEXT,
  description TEXT,
  generated_image_url TEXT NOT NULL,
  instagram_caption TEXT,  -- فیلد کپشن اینستاگرام
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- اضافه کردن کامنت‌ها برای توضیح فیلدها
COMMENT ON TABLE generated_images IS 'ذخیره تصاویر تولید شده با AI';
COMMENT ON COLUMN generated_images.instagram_caption IS 'کپشن اینستاگرام تولید شده با AI';

-- ========================================
-- قسمت ۲: ایجاد ایندکس‌ها برای جستجوی سریع‌تر
-- ========================================

CREATE INDEX IF NOT EXISTS idx_generated_images_user_id
  ON generated_images(user_id);

CREATE INDEX IF NOT EXISTS idx_generated_images_created_at
  ON generated_images(created_at DESC);

-- ========================================
-- قسمت ۳: فعال‌سازی Row Level Security (RLS)
-- ========================================

ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- حذف Policy‌های قبلی اگر وجود دارند
DROP POLICY IF EXISTS "Users can view their own generations" ON generated_images;
DROP POLICY IF EXISTS "Users can insert their own generations" ON generated_images;
DROP POLICY IF EXISTS "Users can update their own generations" ON generated_images;
DROP POLICY IF EXISTS "Users can delete their own generations" ON generated_images;

-- Policy: کاربران فقط رکوردهای خودشان را ببینند
CREATE POLICY "Users can view their own generations"
  ON generated_images
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: کاربران بتوانند رکورد جدید اضافه کنند
CREATE POLICY "Users can insert their own generations"
  ON generated_images
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: کاربران بتوانند رکوردهای خودشان را ویرایش کنند
CREATE POLICY "Users can update their own generations"
  ON generated_images
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: کاربران بتوانند رکوردهای خودشان را حذف کنند
CREATE POLICY "Users can delete their own generations"
  ON generated_images
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ========================================
-- قسمت ۴: ایجاد Storage Bucket برای عکس‌ها
-- ========================================

-- ایجاد bucket برای عکس‌های لباس و تصاویر تولید شده
INSERT INTO storage.buckets (id, name, public)
VALUES ('garments', 'garments', true)
ON CONFLICT (id) DO NOTHING;

-- حذف Policy‌های قبلی Storage در صورت وجود
DROP POLICY IF EXISTS "Anyone can upload garment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can download garment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update garment images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete garment images" ON storage.objects;

-- Policy برای آپلود به bucket (INSERT)
CREATE POLICY "Anyone can upload garment images"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'garments');

-- Policy برای دانلود از bucket (SELECT)
CREATE POLICY "Anyone can download garment images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'garments');

-- Policy برای بروزرسانی (UPDATE)
CREATE POLICY "Anyone can update garment images"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'garments');

-- Policy برای حذف (DELETE)
CREATE POLICY "Anyone can delete garment images"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'garments');

-- ========================================
-- قسمت ۵: مایگریشن جدول قدیمی (اگر دارید)
-- ========================================

-- اگر جدول قدیمی به نام "generations" دارید، این بخش اون رو migrate می‌کنه
DO $$
BEGIN
  -- اگر جدول generations وجود دارد و generated_images وجود ندارد
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'generations'
  ) THEN
    -- کپی کردن داده‌ها از جدول قدیمی به جدید
    INSERT INTO generated_images (
      user_id,
      garment_path,
      model_id,
      background_id,
      prompt,
      description,
      generated_image_url,
      created_at
    )
    SELECT
      user_id,
      garment_path,
      model_id,
      background_id,
      prompt,
      description,
      result_image_url,  -- نام قدیمی فیلد
      created_at
    FROM generations
    ON CONFLICT DO NOTHING;

    -- حذف جدول قدیمی (اختیاری - اگر می‌خواهید نگه دارید، این خط رو کامنت کنید)
    -- DROP TABLE generations;

    RAISE NOTICE 'Data migrated from generations to generated_images successfully!';
  END IF;
END $$;

-- ========================================
-- پایان - بررسی نتیجه
-- ========================================

-- نمایش اطلاعات جدول ایجاد شده
SELECT
  'Setup completed successfully!' as status,
  COUNT(*) as total_images
FROM generated_images;

-- نمایش ستون‌های جدول
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'generated_images'
ORDER BY ordinal_position;

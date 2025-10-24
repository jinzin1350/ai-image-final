-- Migration: Add instagram_caption field to generated_images table
-- این فیلد برای ذخیره کپشن‌های اینستاگرام تولید شده استفاده می‌شود

-- اضافه کردن ستون instagram_caption به جدول generated_images
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS instagram_caption TEXT;

-- اضافه کردن کامنت برای توضیح فیلد
COMMENT ON COLUMN generated_images.instagram_caption IS 'AI-generated Instagram caption for the image';

-- اختیاری: ایجاد ایندکس برای جستجوی سریعتر (اگر نیاز دارید)
-- CREATE INDEX IF NOT EXISTS idx_generated_images_caption ON generated_images(instagram_caption);

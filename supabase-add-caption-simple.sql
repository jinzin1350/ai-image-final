-- Simple Migration: Just add instagram_caption column
-- اگر جدول generated_images دارید، فقط این اسکریپت رو اجرا کنید

-- اضافه کردن ستون instagram_caption (اگر وجود نداره)
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS instagram_caption TEXT;

-- پیغام موفقیت
SELECT 'Column instagram_caption added successfully!' as result;

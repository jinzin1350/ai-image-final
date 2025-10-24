-- Migration: Add instagram_caption field to generated_images table
-- این فیلد برای ذخیره کپشن‌های اینستاگرام تولید شده استفاده می‌شود

-- اول چک کنیم که جدول generated_images وجود داره یا نه
-- اگر جدول generations وجود داشت، به generated_images تغییر نام بدیم
DO $$
BEGIN
    -- اگر جدول generations وجود داره و generated_images وجود نداره، تغییر نام بده
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'generations')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'generated_images') THEN
        ALTER TABLE generations RENAME TO generated_images;
        RAISE NOTICE 'Table renamed from generations to generated_images';
    END IF;

    -- اضافه کردن ستون instagram_caption
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'generated_images'
        AND column_name = 'instagram_caption'
    ) THEN
        ALTER TABLE generated_images ADD COLUMN instagram_caption TEXT;
        RAISE NOTICE 'Column instagram_caption added successfully';
    ELSE
        RAISE NOTICE 'Column instagram_caption already exists';
    END IF;
END $$;

-- اضافه کردن کامنت برای توضیح فیلد
COMMENT ON COLUMN generated_images.instagram_caption IS 'AI-generated Instagram caption for the image';

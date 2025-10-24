# راهنمای به‌روزرسانی Schema Supabase

## اضافه کردن فیلد Instagram Caption

برای استفاده از قابلیت ذخیره کپشن اینستاگرام، باید فیلد جدیدی به جدول `generated_images` در Supabase اضافه کنید.

### مراحل به‌روزرسانی:

#### روش ۱: استفاده از SQL Editor (ساده‌ترین روش) ⭐

**اگر جدول `generated_images` دارید:**

1. به [Supabase Dashboard](https://app.supabase.com) بروید
2. پروژه خود را باز کنید
3. از منوی سمت چپ، روی **SQL Editor** کلیک کنید
4. محتوای فایل **`supabase-add-caption-simple.sql`** را کپی کنید
5. در SQL Editor پیست کنید
6. روی **Run** کلیک کنید

**اگر جدول `generations` دارید (نام قدیمی):**

1. همان مراحل بالا اما از فایل **`supabase-migration-add-caption.sql`** استفاده کنید
2. این اسکریپت خودکار جدول رو به `generated_images` تغییر نام می‌ده و ستون رو اضافه می‌کنه

#### روش ۲: استفاده از Table Editor

1. به Supabase Dashboard بروید
2. روی **Table Editor** کلیک کنید
3. جدول `generated_images` را باز کنید
4. روی دکمه **+** (Add Column) کلیک کنید
5. تنظیمات زیر را وارد کنید:
   - **Name**: `instagram_caption`
   - **Type**: `text`
   - **Default Value**: (خالی بگذارید)
   - **Is Nullable**: ✅ بله
6. روی **Save** کلیک کنید

### بررسی موفقیت‌آمیز بودن

برای اطمینان از اینکه فیلد با موفقیت اضافه شده، این کوئری را اجرا کنید:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'generated_images'
AND column_name = 'instagram_caption';
```

اگر یک ردیف با نام `instagram_caption` و نوع `text` دیدید، به‌روزرسانی موفق بوده است! ✅

### نکته مهم

⚠️ اگر از Supabase استفاده نمی‌کنید و فقط localStorage دارید، نیازی به این مایگریشن ندارید. سیستم به صورت خودکار با localStorage کار می‌کند.

### ساختار کامل جدول generated_images (بعد از به‌روزرسانی)

```sql
CREATE TABLE generated_images (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  garment_path TEXT NOT NULL,
  model_id TEXT,
  background_id TEXT,
  prompt TEXT,
  description TEXT,
  generated_image_url TEXT NOT NULL,
  instagram_caption TEXT,  -- 👈 فیلد جدید
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### پشتیبانی

اگر مشکلی داشتید، لاگ‌های سرور را چک کنید:
- ✅ "کپشن در دیتابیس ذخیره شد" = موفق
- ❌ "خطا در ذخیره کپشن در دیتابیس" = مشکل در schema

---

**تاریخ ایجاد**: 2025-10-24
**نسخه**: 1.0.0

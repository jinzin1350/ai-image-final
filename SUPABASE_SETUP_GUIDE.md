# 🚀 راهنمای نصب کامل Supabase

## 📋 فهرست

1. [ایجاد پروژه Supabase](#step-1)
2. [اجرای Setup Script](#step-2)
3. [پیکربندی Environment Variables](#step-3)
4. [تست اتصال](#step-4)
5. [عیب‌یابی](#troubleshooting)

---

## <a name="step-1"></a>مرحله ۱: ایجاد پروژه Supabase

### ۱.۱ ثبت نام یا ورود
1. به https://app.supabase.com وارد شوید
2. اگر اکانت ندارید، با GitHub یا ایمیل ثبت نام کنید

### ۱.۲ ایجاد پروژه جدید
1. روی دکمه **"New Project"** کلیک کنید
2. اطلاعات زیر را وارد کنید:
   - **Name**: `ai-fashion-photo` (یا هر نام دلخواه)
   - **Database Password**: یک پسورد قوی انتخاب کنید و ذخیره کنید ⚠️
   - **Region**: نزدیک‌ترین منطقه به کاربران (مثلاً Frankfurt برای ایران)
3. روی **"Create new project"** کلیک کنید
4. صبر کنید تا پروژه ایجاد شود (۲-۳ دقیقه)

---

## <a name="step-2"></a>مرحله ۲: اجرای Setup Script

### ۲.۱ باز کردن SQL Editor
1. در Dashboard پروژه، از منوی سمت چپ روی **"SQL Editor"** کلیک کنید
2. یک Query جدید ایجاد کنید

### ۲.۲ اجرای Script
1. فایل **`supabase-setup-complete.sql`** را باز کنید
2. **تمام** محتوای فایل را کپی کنید (`Ctrl+A` → `Ctrl+C`)
3. در SQL Editor پیست کنید (`Ctrl+V`)
4. روی دکمه **"Run"** یا `Ctrl+Enter` کلیک کنید

### ۲.۳ بررسی نتیجه
✅ اگر موفق بود، باید پیغام‌های زیر را ببینید:
```
Setup completed successfully!
```

و لیستی از ستون‌های جدول `generated_images`:
- id
- user_id
- garment_path
- model_id
- background_id
- prompt
- description
- generated_image_url
- instagram_caption ✨
- created_at

---

## <a name="step-3"></a>مرحله ۳: پیکربندی Environment Variables

### ۳.۱ دریافت API Keys

1. در Dashboard، به **"Settings"** → **"API"** بروید
2. اطلاعات زیر را کپی کنید:
   - **Project URL** (مثلاً: `https://xxxxx.supabase.co`)
   - **anon public** key (کلید طولانی که با `eyJ` شروع می‌شود)

### ۳.۲ ویرایش فایل `.env`

فایل `.env` در ریشه پروژه را باز کنید و این مقادیر را پر کنید:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=5000
```

⚠️ **نکته مهم**:
- مقادیر واقعی خود را جایگزین کنید
- فایل `.env` را در Git commit نکنید!

---

## <a name="step-4"></a>مرحله ۴: تست اتصال

### ۴.۱ راه‌اندازی سرور
```bash
node index.js
```

### ۴.۲ بررسی لاگ‌ها
باید پیغام‌های زیر را ببینید:
```
🚀 سرور در حال اجرا است: http://0.0.0.0:5000
📸 برنامه عکاسی مد با هوش مصنوعی آماده است!
🔐 Supabase: Connected ✅
🤖 Gemini AI: Connected ✅
```

اگر `Supabase: Connected` را دیدید، یعنی همه چیز درست است! 🎉

### ۴.۳ تست عملکرد
1. یک تصویر تولید کنید
2. به صفحه Gallery بروید
3. کپشن اینستاگرام تولید کنید
4. در Supabase Dashboard → Table Editor → `generated_images` باید رکورد جدید را ببینید

---

## <a name="troubleshooting"></a>🔧 عیب‌یابی

### مشکل ۱: خطای "Policy already exists"
**راه حل:**
- اسکریپت `supabase-setup-complete.sql` خودکار این خطا را رفع می‌کند
- اگر باز هم خطا داد، ابتدا Policy‌ها را دستی حذف کنید:
```sql
DROP POLICY IF EXISTS "Users can view their own generations" ON generated_images;
```

### مشکل ۲: خطای "Table already exists"
**راه حل:**
این عادی است! اسکریپت از `CREATE TABLE IF NOT EXISTS` استفاده می‌کند و جدول موجود را نگه می‌دارد.

### مشکل ۳: "Supabase: Not configured"
**راه حل:**
1. بررسی کنید فایل `.env` در مسیر صحیح باشد
2. مطمئن شوید `SUPABASE_URL` و `SUPABASE_ANON_KEY` به درستی تنظیم شده‌اند
3. سرور را restart کنید

### مشکل ۴: خطای "instagram_caption" column does not exist
**راه حل:**
فقط این کوئری را اجرا کنید:
```sql
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS instagram_caption TEXT;
```

### مشکل ۵: داده‌های قدیمی در جدول "generations"
**راه حل:**
اسکریپت کامل خودکار داده‌ها را migrate می‌کند. اگر نشد، این کوئری را اجرا کنید:
```sql
INSERT INTO generated_images (
  user_id, garment_path, model_id, background_id,
  prompt, description, generated_image_url, created_at
)
SELECT
  user_id, garment_path, model_id, background_id,
  prompt, description, result_image_url, created_at
FROM generations;
```

---

## 📊 ساختار کامل Database

### جدول: `generated_images`
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | شناسه یکتا (Primary Key) |
| user_id | UUID | شناسه کاربر (Foreign Key) |
| garment_path | TEXT | مسیر عکس لباس آپلود شده |
| model_id | TEXT | شناسه مدل انتخابی |
| background_id | TEXT | شناسه پس‌زمینه انتخابی |
| prompt | TEXT | Prompt ارسالی به AI |
| description | TEXT | توضیحات تولید شده |
| generated_image_url | TEXT | URL تصویر نهایی |
| instagram_caption | TEXT | کپشن اینستاگرام (جدید ✨) |
| created_at | TIMESTAMP | تاریخ ایجاد |

### Storage Bucket: `garments`
- **نام**: garments
- **Public**: بله ✅
- **محتوا**:
  - عکس‌های لباس آپلود شده
  - تصاویر تولید شده

---

## ✅ Checklist نصب

- [ ] پروژه Supabase ایجاد شد
- [ ] فایل `supabase-setup-complete.sql` اجرا شد
- [ ] فایل `.env` تنظیم شد
- [ ] سرور با موفقیت متصل شد
- [ ] تست تولید تصویر انجام شد
- [ ] کپشن اینستاگرام کار می‌کند
- [ ] داده‌ها در Supabase ذخیره می‌شوند

---

## 🎯 مراحل بعدی

پس از نصب موفق:
1. ✅ Gemini API Key را از Google AI Studio دریافت کنید
2. ✅ مدل‌های AI را تولید کنید: `POST /api/generate-models`
3. ✅ اولین تصویر را تولید کنید
4. ✅ کپشن اینستاگرام بسازید

---

**تاریخ ایجاد**: 2025-10-24
**نسخه**: 2.0.0
**وضعیت**: آماده برای Production ✅

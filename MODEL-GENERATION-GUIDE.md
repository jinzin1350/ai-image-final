# راهنمای تولید مدل‌های AI

این سیستم برای تولید تصاویر مدل‌های مد با استفاده از هوش مصنوعی Gemini طراحی شده است.

## تنظیمات اولیه

### 1. تنظیم فایل .env

فایل `.env` را ویرایش کنید و مقادیر زیر را وارد کنید:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Google Gemini API for AI Image Generation
GEMINI_API_KEY=your-gemini-api-key
```

#### دریافت کلید Gemini API:
1. به [Google AI Studio](https://aistudio.google.com/app/apikey) بروید
2. یک API key جدید ایجاد کنید
3. کلید را در `GEMINI_API_KEY` قرار دهید

#### تنظیم Supabase:
1. به [Supabase Dashboard](https://app.supabase.com) بروید
2. یک پروژه جدید ایجاد کنید
3. از قسمت Settings > API، URL و Anon Key را کپی کنید
4. یک Storage Bucket با نام `garments` ایجاد کنید و آن را Public کنید

### 2. اجرای سرور

```bash
npm install
node index.js
```

### 3. تولید تصاویر مدل‌ها

برای تولید تصاویر مدل‌ها، یک درخواست POST به endpoint زیر ارسال کنید:

```bash
curl -X POST http://localhost:5000/api/generate-models
```

یا از Postman:
- Method: POST
- URL: http://localhost:5000/api/generate-models

این عملیات حدود 2-3 دقیقه طول می‌کشد و تصاویر زیر را تولید می‌کند:
- 2 مدل زن
- 2 مدل مرد
- 2 مدل کودک

### 4. نتیجه

پس از اتمام، تصاویر تولید شده در:
- **Supabase Storage**: bucket `garments` ذخیره می‌شوند
- **فایل محلی**: `generated-models.json` ذخیره می‌شوند

## نکات مهم

1. **تولید یکبار**: پس از تولید اولیه، تصاویر در فایل `generated-models.json` ذخیره می‌شوند و در بارگذاری بعدی سرور، از همان تصاویر استفاده می‌شود.

2. **هزینه API**: هر تصویر مدل از API Gemini استفاده می‌کند. برای 6 مدل، حدود 6 درخواست به API ارسال می‌شود.

3. **تولید مجدد**: برای تولید مجدد تصاویر، فایل `generated-models.json` را حذف کنید و دوباره `/api/generate-models` را فراخوانی کنید.

## استفاده در برنامه

پس از تولید مدل‌ها، برنامه به صورت خودکار از تصاویر تولید شده برای عملیات virtual try-on استفاده می‌کند:

1. کاربر لباس خود را آپلود می‌کند
2. یکی از مدل‌های تولید شده را انتخاب می‌کند
3. یک پس‌زمینه انتخاب می‌کند
4. سیستم تصویری حرفه‌ای از مدل با لباس انتخابی در پس‌زمینه مورد نظر تولید می‌کند

## عیب‌یابی

### خطا: "Supabase is not configured"
- مطمئن شوید که `.env` را به درستی تنظیم کرده‌اید
- URL و Key را دوباره چک کنید

### خطا: "No image was generated"
- API Key Gemini را چک کنید
- مطمئن شوید که از مدل `gemini-2.5-flash-image` استفاده می‌کنید

### مدل‌ها نمایش داده نمی‌شوند
- مطمئن شوید که `/api/generate-models` با موفقیت اجرا شده
- فایل `generated-models.json` را چک کنید
- لاگ‌های سرور را بررسی کنید

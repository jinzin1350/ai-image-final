const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = 5000;

// تنظیمات Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// تنظیمات Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// تنظیمات Multer برای آپلود موقت
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|avif/;
    const allowedMimetypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];

    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.includes(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error(`فقط فایل‌های تصویری (JPG, PNG, WEBP, AVIF) مجاز هستند. فرمت فایل شما: ${file.mimetype}`));
  }
});

app.use(express.json());
app.use(express.static('public'));

// لیست مدل‌ها
const models = [
  { id: 'woman-1', name: 'مدل زن ۱', type: 'female', description: 'زن جوان با موهای بلند' },
  { id: 'woman-2', name: 'مدل زن ۲', type: 'female', description: 'زن با استایل مدرن' },
  { id: 'man-1', name: 'مدل مرد ۱', type: 'male', description: 'مرد جوان ورزشکار' },
  { id: 'man-2', name: 'مدل مرد ۲', type: 'male', description: 'مرد با استایل رسمی' },
  { id: 'child-1', name: 'مدل کودک ۱', type: 'child', description: 'کودک شاد' },
  { id: 'child-2', name: 'مدل کودک ۲', type: 'child', description: 'نوجوان' }
];

// لیست پس‌زمینه‌ها
const backgrounds = [
  { id: 'studio', name: 'استودیو حرفه‌ای', description: 'پس‌زمینه سفید استودیو' },
  { id: 'beach', name: 'ساحل', description: 'ساحل زیبا در روز آفتابی' },
  { id: 'street', name: 'خیابان شهری', description: 'خیابان مدرن شهری' },
  { id: 'park', name: 'پارک', description: 'پارک سرسبز' },
  { id: 'cafe', name: 'کافه', description: 'کافه مدرن' },
  { id: 'rooftop', name: 'پشت‌بام', description: 'پشت‌بام با منظره شهری' }
];

// Middleware برای احراز هویت
const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    // برای demo، اجازه دسترسی بدون احراز هویت
    req.user = null;
    return next();
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// ثبت نام کاربر
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) throw error;
    res.json({ success: true, user: data.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ورود کاربر
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;
    res.json({ success: true, session: data.session });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// خروج کاربر
app.post('/api/auth/signout', authenticateUser, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// دریافت لیست مدل‌ها
app.get('/api/models', (req, res) => {
  res.json(models);
});

// دریافت لیست پس‌زمینه‌ها
app.get('/api/backgrounds', (req, res) => {
  res.json(backgrounds);
});

// آپلود عکس لباس به Supabase Storage
app.post('/api/upload', upload.single('garment'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لطفاً یک عکس آپلود کنید' });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const fileBuffer = req.file.buffer;

    // آپلود به Supabase Storage
    const { data, error } = await supabase.storage
      .from('garments')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // دریافت URL عمومی فایل
    const { data: urlData } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    res.json({ 
      success: true, 
      filePath: urlData.publicUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('خطا در آپلود:', error);
    res.status(500).json({ error: 'خطا در آپلود فایل' });
  }
});

// تولید عکس با Gemini AI
app.post('/api/generate', authenticateUser, async (req, res) => {
  try {
    const { garmentPath, modelId, backgroundId } = req.body;

    if (!garmentPath || !modelId || !backgroundId) {
      return res.status(400).json({ error: 'لطفاً تمام فیلدها را پر کنید' });
    }

    const selectedModel = models.find(m => m.id === modelId);
    const selectedBackground = backgrounds.find(b => b.id === backgroundId);

    if (!selectedModel || !selectedBackground) {
      return res.status(400).json({ error: 'مدل یا پس‌زمینه نامعتبر است' });
    }

    // ساخت پرامپت برای Gemini
    const prompt = `Create a professional fashion photography image of a ${selectedModel.description} wearing the garment shown in the reference image. The setting is ${selectedBackground.description}. The image should be high-quality, professional studio lighting, realistic, fashionable, and suitable for e-commerce product photography.`;

    // استفاده از Gemini برای تولید متن توضیحی
    // توجه: Gemini فعلاً قابلیت تولید تصویر ندارد، ولی می‌تونیم از imagen یا سرویس‌های دیگر استفاده کنیم
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const description = response.text();

    // ذخیره اطلاعات در Supabase Database
    const { data: generationData, error: dbError } = await supabase
      .from('generations')
      .insert([
        {
          user_id: req.user?.id || null,
          garment_path: garmentPath,
          model_id: modelId,
          background_id: backgroundId,
          prompt: prompt,
          description: description,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (dbError) {
      console.error('خطا در ذخیره در دیتابیس:', dbError);
    }

    res.json({
      success: true,
      imagePath: garmentPath, // در نسخه واقعی، URL تصویر تولید شده
      model: selectedModel.name,
      background: selectedBackground.name,
      description: description,
      message: 'درخواست شما پردازش شد!',
      note: 'برای تولید تصویر واقعی، از سرویس‌هایی مانند Replicate (SDXL) یا Stability AI استفاده کنید'
    });

  } catch (error) {
    console.error('خطا در تولید تصویر:', error);
    res.status(500).json({ error: 'خطا در تولید تصویر' });
  }
});

// دریافت تاریخچه تولیدها
app.get('/api/generations', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, generations: data || [] });
  } catch (error) {
    console.error('خطا در دریافت تاریخچه:', error);
    res.status(500).json({ error: 'خطا در دریافت تاریخچه' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سرور در حال اجرا است: http://0.0.0.0:${PORT}`);
  console.log(`📸 برنامه عکاسی مد با هوش مصنوعی آماده است!`);
  console.log(`🔐 Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Connected' : 'Not configured'}`);
});
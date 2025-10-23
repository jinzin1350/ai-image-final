
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 5000;

// تنظیمات Multer برای آپلود فایل
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('فقط فایل‌های تصویری مجاز هستند!'));
  }
});

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/generated', express.static('generated'));

// لیست مدل‌ها
const models = [
  { id: 'woman-1', name: 'مدل زن ۱', type: 'female' },
  { id: 'woman-2', name: 'مدل زن ۲', type: 'female' },
  { id: 'man-1', name: 'مدل مرد ۱', type: 'male' },
  { id: 'man-2', name: 'مدل مرد ۲', type: 'male' },
  { id: 'child-1', name: 'مدل کودک ۱', type: 'child' },
  { id: 'child-2', name: 'مدل کودک ۲', type: 'child' }
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

// دریافت لیست مدل‌ها
app.get('/api/models', (req, res) => {
  res.json(models);
});

// دریافت لیست پس‌زمینه‌ها
app.get('/api/backgrounds', (req, res) => {
  res.json(backgrounds);
});

// آپلود عکس لباس
app.post('/api/upload', upload.single('garment'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'لطفاً یک عکس آپلود کنید' });
  }
  res.json({ 
    success: true, 
    filePath: `/uploads/${req.file.filename}`,
    fileName: req.file.filename
  });
});

// تولید عکس با هوش مصنوعی
app.post('/api/generate', async (req, res) => {
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

    // شبیه‌سازی تولید تصویر با هوش مصنوعی
    // در نسخه واقعی، باید از API مانند Stable Diffusion، Replicate، یا سرویس‌های مشابه استفاده کنید
    
    // ایجاد پوشه generated در صورت عدم وجود
    const generatedDir = './generated';
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir);
    }

    // شبیه‌سازی تاخیر پردازش
    await new Promise(resolve => setTimeout(resolve, 2000));

    // در نسخه واقعی، اینجا باید تصویر را با API هوش مصنوعی تولید کنید
    // مثال: از Replicate API با مدل Virtual Try-On
    
    const generatedFileName = `generated-${Date.now()}.jpg`;
    const generatedPath = `/generated/${generatedFileName}`;

    // برای نمایش، یک تصویر ساختگی ایجاد می‌کنیم
    // در production باید از API واقعی استفاده شود
    
    res.json({
      success: true,
      imagePath: generatedPath,
      model: selectedModel.name,
      background: selectedBackground.name,
      message: 'تصویر با موفقیت تولید شد!',
      note: 'برای استفاده واقعی، نیاز به تنظیم API هوش مصنوعی دارید'
    });

  } catch (error) {
    console.error('خطا در تولید تصویر:', error);
    res.status(500).json({ error: 'خطا در تولید تصویر' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سرور در حال اجرا است: http://0.0.0.0:${PORT}`);
  console.log(`📸 برنامه عکاسی مد با هوش مصنوعی آماده است!`);
});

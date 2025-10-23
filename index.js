const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
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
  {
    id: 'woman-1',
    name: 'مدل زن ۱',
    type: 'female',
    description: 'زن جوان با موهای بلند',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop'
  },
  {
    id: 'woman-2',
    name: 'مدل زن ۲',
    type: 'female',
    description: 'زن با استایل مدرن',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop'
  },
  {
    id: 'man-1',
    name: 'مدل مرد ۱',
    type: 'male',
    description: 'مرد جوان ورزشکار',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop'
  },
  {
    id: 'man-2',
    name: 'مدل مرد ۲',
    type: 'male',
    description: 'مرد با استایل رسمی',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop'
  },
  {
    id: 'child-1',
    name: 'مدل کودک ۱',
    type: 'child',
    description: 'کودک شاد',
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=600&fit=crop'
  },
  {
    id: 'child-2',
    name: 'مدل کودک ۲',
    type: 'child',
    description: 'نوجوان',
    image: 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=400&h=600&fit=crop'
  }
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

    // بررسی تنظیمات Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Supabase تنظیم نشده است!');
      return res.status(500).json({
        error: 'خطا در تنظیمات سرور',
        details: 'لطفاً فایل .env را با اطلاعات Supabase تنظیم کنید'
      });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const fileBuffer = req.file.buffer;

    console.log(`📤 در حال آپلود فایل: ${fileName}`);

    // آپلود به Supabase Storage
    const { data, error } = await supabase.storage
      .from('garments')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('❌ خطای Supabase Storage:', error);
      return res.status(500).json({
        error: 'خطا در آپلود به Supabase',
        details: error.message,
        hint: 'مطمئن شوید که bucket با نام "garments" ساخته شده و public است'
      });
    }

    // دریافت URL عمومی فایل
    const { data: urlData } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    console.log(`✅ آپلود موفق: ${urlData.publicUrl}`);

    res.json({
      success: true,
      filePath: urlData.publicUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('❌ خطای سرور:', error);
    res.status(500).json({
      error: 'خطا در آپلود فایل',
      details: error.message
    });
  }
});

// تابع دانلود تصویر از URL و تبدیل به base64
async function imageUrlToBase64(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return base64;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// تولید عکس با Gemini 2.5 Flash
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

    console.log('🎨 Generating image with Gemini 2.5 Flash...');
    console.log('📸 Garment URL:', garmentPath);

    // دانلود عکس لباس و تبدیل به base64
    const garmentBase64 = await imageUrlToBase64(garmentPath);

    // ساخت پرامپت برای Gemini
    const prompt = `Create a professional fashion photography image.

Requirements:
- Model: ${selectedModel.description}
- The model should be wearing the exact garment/clothing shown in the reference image
- Setting: ${selectedBackground.description}
- Style: High-quality professional studio photography
- Lighting: Professional studio lighting, soft and flattering
- Quality: Realistic, detailed, sharp focus, 4K resolution
- Suitable for e-commerce product photography

Important: Make sure the clothing from the reference image is accurately represented on the model in the generated image.`;

    console.log('📝 Prompt:', prompt);

    // استفاده از Gemini 2.5 Flash Image برای تولید تصویر
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["Image"] // Enable image generation
      }
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: garmentBase64,
          mimeType: 'image/jpeg'
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;

    console.log('📦 Response structure:', JSON.stringify({
      candidates: response.candidates?.length,
      hasParts: !!response.candidates?.[0]?.content?.parts
    }));

    // Extract generated image from response
    let generatedImageBase64 = null;
    let generatedText = '';

    if (!response.candidates || !response.candidates[0] || !response.candidates[0].content || !response.candidates[0].content.parts) {
      console.error('❌ Invalid response structure:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response from Gemini API');
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        // This is the generated image
        generatedImageBase64 = part.inlineData.data;
        console.log('✅ Image generated successfully!');
      } else if (part.text) {
        generatedText += part.text;
      }
    }

    if (!generatedImageBase64) {
      console.error('❌ No image in response. Parts:', JSON.stringify(response.candidates[0].content.parts, null, 2));
      throw new Error('No image was generated by Gemini. Response only contains text.');
    }

    // تبدیل base64 به buffer
    const imageBuffer = Buffer.from(generatedImageBase64, 'base64');
    const fileName = `generated-${Date.now()}.png`;

    // آپلود تصویر تولید شده به Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('garments')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading generated image:', uploadError);
      throw uploadError;
    }

    // دریافت URL عمومی
    const { data: urlData } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    const generatedImageUrl = urlData.publicUrl;

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
          description: generatedText,
          generated_image_url: generatedImageUrl,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (dbError) {
      console.error('خطا در ذخیره در دیتابیس:', dbError);
    }

    console.log('✅ Image generated and uploaded successfully!');

    res.json({
      success: true,
      imagePath: generatedImageUrl,
      model: selectedModel.name,
      background: selectedBackground.name,
      description: generatedText,
      prompt: prompt,
      message: 'تصویر با موفقیت تولید شد!'
    });

  } catch (error) {
    console.error('❌ خطا در تولید تصویر:', error);
    res.status(500).json({
      error: 'خطا در تولید تصویر',
      details: error.message
    });
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
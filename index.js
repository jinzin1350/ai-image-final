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
let supabase = null;
try {
  if (process.env.SUPABASE_URL &&
      process.env.SUPABASE_URL !== 'your_supabase_project_url' &&
      process.env.SUPABASE_ANON_KEY &&
      process.env.SUPABASE_ANON_KEY !== 'your_supabase_anon_key') {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }
} catch (error) {
  console.error('⚠️  خطا در اتصال به Supabase:', error.message);
}

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

// لیست مدل‌ها - تعریف model prompts برای تولید تصویر
const modelPrompts = [
  {
    id: 'woman-1',
    name: 'مدل زن ۱',
    type: 'female',
    description: 'زن جوان با موهای بلند',
    prompt: 'A professional fashion model portrait, young woman with long hair, standing in neutral pose, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'woman-2',
    name: 'مدل زن ۲',
    type: 'female',
    description: 'زن با استایل مدرن',
    prompt: 'A professional fashion model portrait, stylish young woman with modern hairstyle, standing in neutral pose, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'man-1',
    name: 'مدل مرد ۱',
    type: 'male',
    description: 'مرد جوان ورزشکار',
    prompt: 'A professional fashion model portrait, athletic young man with fit physique, standing in neutral pose, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'man-2',
    name: 'مدل مرد ۲',
    type: 'male',
    description: 'مرد با استایل رسمی',
    prompt: 'A professional fashion model portrait, professional businessman look, young man with formal appearance, standing in neutral pose, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'child-1',
    name: 'مدل کودک ۱',
    type: 'child',
    description: 'کودک شاد',
    prompt: 'A professional fashion model portrait, happy child with friendly smile, standing in neutral pose, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on, age 8-10 years'
  },
  {
    id: 'child-2',
    name: 'مدل کودک ۲',
    type: 'child',
    description: 'نوجوان',
    prompt: 'A professional fashion model portrait, teenager with confident pose, standing in neutral pose, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on, age 13-15 years'
  }
];

// لیست مدل‌های پیش‌فرض (fallback) - تا زمانی که مدل‌های AI تولید شوند
const fallbackModels = [
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

// لیست مدل‌ها با URL‌های تولید شده (در ابتدا از fallback استفاده می‌شود)
let models = [...fallbackModels];

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
    if (!supabase) {
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

// تابع تولید تصاویر مدل‌ها با Gemini AI
async function generateModelImages() {
  console.log('🎨 شروع تولید تصاویر مدل‌ها با Gemini AI...');

  if (!supabase) {
    console.error('❌ Supabase تنظیم نشده است. امکان آپلود تصاویر وجود ندارد.');
    throw new Error('Supabase is not configured');
  }

  // پاک کردن مدل‌های قبلی (fallback یا قدیمی)
  models = [];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image",
    generationConfig: {
      responseModalities: ["Image"]
    }
  });

  for (const modelPrompt of modelPrompts) {
    try {
      console.log(`📸 در حال تولید تصویر برای: ${modelPrompt.name}`);

      const result = await model.generateContent([
        { text: modelPrompt.prompt }
      ]);

      const response = await result.response;

      if (!response.candidates || !response.candidates[0] || !response.candidates[0].content || !response.candidates[0].content.parts) {
        console.error(`❌ خطا در تولید تصویر ${modelPrompt.name}`);
        continue;
      }

      let generatedImageBase64 = null;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImageBase64 = part.inlineData.data;
          break;
        }
      }

      if (!generatedImageBase64) {
        console.error(`❌ تصویری برای ${modelPrompt.name} تولید نشد`);
        continue;
      }

      // تبدیل base64 به buffer و آپلود به Supabase
      const imageBuffer = Buffer.from(generatedImageBase64, 'base64');
      const fileName = `model-${modelPrompt.id}-${Date.now()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('garments')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error(`❌ خطا در آپلود ${modelPrompt.name}:`, uploadError);
        continue;
      }

      // دریافت URL عمومی
      const { data: urlData } = supabase.storage
        .from('garments')
        .getPublicUrl(fileName);

      // افزودن به لیست مدل‌ها
      models.push({
        id: modelPrompt.id,
        name: modelPrompt.name,
        type: modelPrompt.type,
        description: modelPrompt.description,
        image: urlData.publicUrl
      });

      console.log(`✅ تصویر ${modelPrompt.name} با موفقیت تولید و آپلود شد`);

      // تاخیر کوتاه بین درخواست‌ها برای جلوگیری از rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ خطا در تولید ${modelPrompt.name}:`, error.message);
    }
  }

  console.log(`✅ تولید مدل‌ها تمام شد. تعداد: ${models.length}`);

  // ذخیره مدل‌ها در فایل برای استفاده بعدی
  try {
    fs.writeFileSync(
      path.join(__dirname, 'generated-models.json'),
      JSON.stringify(models, null, 2)
    );
    console.log('💾 مدل‌ها در فایل ذخیره شدند');
  } catch (error) {
    console.error('❌ خطا در ذخیره فایل:', error);
  }
}

// بارگذاری مدل‌های ذخیره شده (اگر وجود دارند)
function loadSavedModels() {
  const modelsFilePath = path.join(__dirname, 'generated-models.json');
  if (fs.existsSync(modelsFilePath)) {
    try {
      const savedModels = JSON.parse(fs.readFileSync(modelsFilePath, 'utf8'));
      models = savedModels;
      console.log(`✅ ${models.length} مدل از فایل بارگذاری شد`);
      return true;
    } catch (error) {
      console.error('❌ خطا در بارگذاری مدل‌ها از فایل:', error);
      return false;
    }
  }
  return false;
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
    console.log('👤 Model:', selectedModel.name);
    console.log('📍 Location:', selectedBackground.name);

    // دانلود عکس لباس و مدل و تبدیل به base64
    const garmentBase64 = await imageUrlToBase64(garmentPath);
    const modelBase64 = await imageUrlToBase64(selectedModel.image);

    // ساخت پرامپت برای Virtual Try-On
    const prompt = `You are a professional fashion photographer and image editor. Create a realistic virtual try-on image.

TASK: Place the garment/clothing from the first image onto the model shown in the second image.

REQUIREMENTS:
1. The model from the second image should wear the exact garment/clothing from the first image
2. Location/Setting: ${selectedBackground.description}
3. Keep the model's pose, face, and overall appearance from the reference image
4. The clothing must fit naturally on the model's body
5. Maintain realistic shadows, wrinkles, and fabric draping
6. Professional studio lighting - soft and flattering
7. High-quality, sharp focus, 4K resolution
8. Suitable for e-commerce product photography

IMPORTANT:
- Do NOT change the model's appearance, just dress them in the garment from the first image
- Make sure the clothing looks natural and realistic on the model
- Blend the clothing seamlessly with the model's body
- Use the specified location/background setting`;

    console.log('📝 Prompt:', prompt);

    // استفاده از Gemini 2.5 Flash Image برای تولید تصویر
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["Image"] // Enable image generation
      }
    });

    const result = await model.generateContent([
      { text: "GARMENT/CLOTHING IMAGE:" },
      {
        inlineData: {
          data: garmentBase64,
          mimeType: 'image/jpeg'
        }
      },
      { text: "MODEL IMAGE:" },
      {
        inlineData: {
          data: modelBase64,
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

// تولید تصاویر مدل‌ها (endpoint برای اجرای دستی)
app.post('/api/generate-models', async (req, res) => {
  try {
    if (models.length > 0) {
      return res.json({
        success: true,
        message: 'مدل‌ها قبلاً تولید شده‌اند',
        models: models
      });
    }

    // اجرای تولید مدل‌ها در پس‌زمینه
    generateModelImages().then(() => {
      console.log('✅ تولید مدل‌ها کامل شد');
    });

    res.json({
      success: true,
      message: 'تولید مدل‌ها شروع شد. لطفاً چند دقیقه صبر کنید...'
    });
  } catch (error) {
    console.error('خطا در شروع تولید مدل‌ها:', error);
    res.status(500).json({ error: 'خطا در شروع تولید مدل‌ها' });
  }
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 سرور در حال اجرا است: http://0.0.0.0:${PORT}`);
  console.log(`📸 برنامه عکاسی مد با هوش مصنوعی آماده است!`);
  console.log(`🔐 Supabase: ${supabase ? 'Connected' : 'Not configured'}`);
  console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key' ? 'Connected' : 'Not configured'}`);

  // بارگذاری مدل‌های ذخیره شده یا تولید مدل‌های جدید
  const modelsLoaded = loadSavedModels();

  if (!modelsLoaded) {
    console.log(`⚠️  از ${models.length} مدل پیش‌فرض (Unsplash) استفاده می‌شود`);
    console.log('💡 برای استفاده از مدل‌های AI، به /api/generate-models درخواست POST ارسال کنید');
    if (!supabase) {
      console.log('⚠️  توجه: برای تولید مدل‌های AI، باید Supabase را در .env تنظیم کنید');
    }
  } else {
    console.log(`✅ ${models.length} مدل AI آماده استفاده است`);
  }
});
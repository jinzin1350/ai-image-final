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
// Static files
app.use(express.static('public'));

// Landing page route
app.get('/landing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// لیست مدل‌ها - تعریف model prompts برای تولید تصویر
const modelPrompts = [
  // زنان (35 ساله)
  {
    id: 'woman-1',
    name: 'مدل ۱',
    category: 'woman',
    categoryName: 'زن',
    description: 'زن 35 ساله با موهای بلند',
    prompt: 'A professional fashion model portrait, 35 year old woman with long hair, elegant appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'woman-2',
    name: 'مدل ۲',
    category: 'woman',
    categoryName: 'زن',
    description: 'زن 35 ساله با استایل مدرن',
    prompt: 'A professional fashion model portrait, 35 year old stylish woman with modern hairstyle, confident pose, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'woman-3',
    name: 'مدل ۳',
    category: 'woman',
    categoryName: 'زن',
    description: 'زن 35 ساله با موهای کوتاه',
    prompt: 'A professional fashion model portrait, 35 year old woman with short hair, professional appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'woman-4',
    name: 'مدل ۴',
    category: 'woman',
    categoryName: 'زن',
    description: 'زن 35 ساله با موهای فر',
    prompt: 'A professional fashion model portrait, 35 year old woman with curly hair, natural beauty, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'woman-5',
    name: 'مدل ۵',
    category: 'woman',
    categoryName: 'زن',
    description: 'زن 35 ساله با استایل کلاسیک',
    prompt: 'A professional fashion model portrait, 35 year old woman with classic style, sophisticated look, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },

  // مردان (35 ساله)
  {
    id: 'man-1',
    name: 'مدل ۱',
    category: 'man',
    categoryName: 'مرد',
    description: 'مرد 35 ساله ورزشکار',
    prompt: 'A professional fashion model portrait, 35 year old athletic man with fit physique, confident posture, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'man-2',
    name: 'مدل ۲',
    category: 'man',
    categoryName: 'مرد',
    description: 'مرد 35 ساله با ظاهر رسمی',
    prompt: 'A professional fashion model portrait, 35 year old professional businessman, formal appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'man-3',
    name: 'مدل ۳',
    category: 'man',
    categoryName: 'مرد',
    description: 'مرد 35 ساله با ریش',
    prompt: 'A professional fashion model portrait, 35 year old man with beard, casual confident style, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'man-4',
    name: 'مدل ۴',
    category: 'man',
    categoryName: 'مرد',
    description: 'مرد 35 ساله با موهای کوتاه',
    prompt: 'A professional fashion model portrait, 35 year old man with short hair, modern style, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'man-5',
    name: 'مدل ۵',
    category: 'man',
    categoryName: 'مرد',
    description: 'مرد 35 ساله با استایل اسپرت',
    prompt: 'A professional fashion model portrait, 35 year old sporty man, athletic casual style, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },

  // دختران (13-15 ساله)
  {
    id: 'girl-1',
    name: 'مدل ۱',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله',
    prompt: 'A professional fashion model portrait, teenage girl age 13-15 years old, friendly smile, youthful appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'girl-2',
    name: 'مدل ۲',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با موهای بلند',
    prompt: 'A professional fashion model portrait, teenage girl age 13-15 years old with long hair, cheerful expression, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'girl-3',
    name: 'مدل ۳',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با استایل مدرن',
    prompt: 'A professional fashion model portrait, teenage girl age 13-15 years old, modern style, confident pose, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'girl-4',
    name: 'مدل ۴',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با موهای کوتاه',
    prompt: 'A professional fashion model portrait, teenage girl age 13-15 years old with short hair, sporty look, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'girl-5',
    name: 'مدل ۵',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با لبخند',
    prompt: 'A professional fashion model portrait, teenage girl age 13-15 years old, happy smile, natural beauty, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },

  // پسران (13-15 ساله)
  {
    id: 'boy-1',
    name: 'مدل ۱',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله',
    prompt: 'A professional fashion model portrait, teenage boy age 13-15 years old, friendly expression, youthful appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'boy-2',
    name: 'مدل ۲',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله ورزشکار',
    prompt: 'A professional fashion model portrait, teenage boy age 13-15 years old, athletic build, sporty appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'boy-3',
    name: 'مدل ۳',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله با موهای کوتاه',
    prompt: 'A professional fashion model portrait, teenage boy age 13-15 years old with short hair, casual style, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'boy-4',
    name: 'مدل ۴',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله با لبخند',
    prompt: 'A professional fashion model portrait, teenage boy age 13-15 years old, happy smile, confident pose, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'boy-5',
    name: 'مدل ۵',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله با استایل مدرن',
    prompt: 'A professional fashion model portrait, teenage boy age 13-15 years old, modern casual style, friendly appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  }
];

// لیست مدل‌های پیش‌فرض (fallback) - تا زمانی که مدل‌های AI تولید شوند
const fallbackModels = [
  // زنان
  { id: 'woman-1', name: 'مدل ۱', category: 'woman', categoryName: 'زن', description: 'زن 35 ساله', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop' },
  { id: 'woman-2', name: 'مدل ۲', category: 'woman', categoryName: 'زن', description: 'زن 35 ساله', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop' },
  { id: 'woman-3', name: 'مدل ۳', category: 'woman', categoryName: 'زن', description: 'زن 35 ساله', image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop' },
  { id: 'woman-4', name: 'مدل ۴', category: 'woman', categoryName: 'زن', description: 'زن 35 ساله', image: 'https://images.unsplash.com/photo-1524504388940-8e864400a348?w=400&h=600&fit=crop' },
  { id: 'woman-5', name: 'مدل ۵', category: 'woman', categoryName: 'زن', description: 'زن 35 ساله', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop' },

  // مردان
  { id: 'man-1', name: 'مدل ۱', category: 'man', categoryName: 'مرد', description: 'مرد 35 ساله', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop' },
  { id: 'man-2', name: 'مدل ۲', category: 'man', categoryName: 'مرد', description: 'مرد 35 ساله', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop' },
  { id: 'man-3', name: 'مدل ۳', category: 'man', categoryName: 'مرد', description: 'مرد 35 ساله', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop' },
  { id: 'man-4', name: 'مدل ۴', category: 'man', categoryName: 'مرد', description: 'مرد 35 ساله', image: 'https://images.unsplash.com/photo-1519085360753-5a69c17a67c6?w=400&h=600&fit=crop' },
  { id: 'man-5', name: 'مدل ۵', category: 'man', categoryName: 'مرد', description: 'مرد 35 ساله', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=600&fit=crop' },

  // دختران
  { id: 'girl-1', name: 'مدل ۱', category: 'girl', categoryName: 'دختر', description: 'دختر 13-15 ساله', image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=600&fit=crop' },
  { id: 'girl-2', name: 'مدل ۲', category: 'girl', categoryName: 'دختر', description: 'دختر 13-15 ساله', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop' },
  { id: 'girl-3', name: 'مدل ۳', category: 'girl', categoryName: 'دختر', description: 'دختر 13-15 ساله', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=600&fit=crop' },
  { id: 'girl-4', name: 'مدل ۴', category: 'girl', categoryName: 'دختر', description: 'دختر 13-15 ساله', image: 'https://images.unsplash.com/photo-1554080353-a576cf80bda?w=400&h=600&fit=crop' },
  { id: 'girl-5', name: 'مدل ۵', category: 'girl', categoryName: 'دختر', description: 'دختر 13-15 ساله', image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop' },

  // پسران
  { id: 'boy-1', name: 'مدل ۱', category: 'boy', categoryName: 'پسر', description: 'پسر 13-15 ساله', image: 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=400&h=600&fit=crop' },
  { id: 'boy-2', name: 'مدل ۲', category: 'boy', categoryName: 'پسر', description: 'پسر 13-15 ساله', image: 'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=400&h=600&fit=crop' },
  { id: 'boy-3', name: 'مدل ۳', category: 'boy', categoryName: 'پسر', description: 'پسر 13-15 ساله', image: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=600&fit=crop' },
  { id: 'boy-4', name: 'مدل ۴', category: 'boy', categoryName: 'پسر', description: 'پسر 13-15 ساله', image: 'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=400&h=600&fit=crop' },
  { id: 'boy-5', name: 'مدل ۵', category: 'boy', categoryName: 'پسر', description: 'پسر 13-15 ساله', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=600&fit=crop' }
];

// لیست مدل‌ها با URL‌های تولید شده (در ابتدا از fallback استفاده می‌شود)
let models = [...fallbackModels];

// لیست پس‌زمینه‌ها - 20 موقعیت واقعی و متنوع
const backgrounds = [
  // استودیو و داخلی (Indoor)
  { id: 'studio-white', name: 'استودیو سفید', description: 'Professional white studio background, clean minimalist photography studio', image: 'https://images.unsplash.com/photo-1606146485010-7e2e2f72027e?w=800&h=600&fit=crop' },
  { id: 'studio-gray', name: 'استودیو خاکستری', description: 'Modern gray studio background with professional lighting', image: 'https://images.unsplash.com/photo-1554844453-7ea2a562a6c8?w=800&h=600&fit=crop' },
  { id: 'luxury-hotel', name: 'هتل لوکس', description: 'Luxury hotel lobby with elegant interior design', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop' },
  { id: 'modern-office', name: 'دفتر مدرن', description: 'Modern minimalist office with glass walls', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop' },
  { id: 'art-gallery', name: 'گالری هنری', description: 'Contemporary art gallery with white walls', image: 'https://images.unsplash.com/photo-1567281880862-4c3d9c1c4e88?w=800&h=600&fit=crop' },

  // کافه و رستوران (Cafe & Restaurant)
  { id: 'cafe-modern', name: 'کافه مدرن', description: 'Trendy modern cafe with large windows and natural light', image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop' },
  { id: 'cafe-vintage', name: 'کافه وینتیج', description: 'Vintage style cafe with warm lighting and cozy atmosphere', image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&h=600&fit=crop' },
  { id: 'restaurant-elegant', name: 'رستوران شیک', description: 'Elegant fine dining restaurant interior', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop' },

  // فضای باز شهری (Urban Outdoor)
  { id: 'street-urban', name: 'خیابان شهری', description: 'Modern city street with contemporary architecture', image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop' },
  { id: 'rooftop-city', name: 'پشت‌بام شهری', description: 'Rooftop terrace with city skyline view', image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&h=600&fit=crop' },
  { id: 'downtown-night', name: 'مرکز شهر شب', description: 'Downtown city at night with bright lights', image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&h=600&fit=crop' },
  { id: 'alley-brick', name: 'کوچه آجری', description: 'Charming brick alley with urban character', image: 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=800&h=600&fit=crop' },

  // طبیعت (Nature)
  { id: 'beach-sunset', name: 'ساحل غروب', description: 'Beautiful beach at sunset with golden light', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop' },
  { id: 'park-green', name: 'پارک سبز', description: 'Lush green park with trees and natural lighting', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop' },
  { id: 'garden-flower', name: 'باغ گل', description: 'Colorful flower garden with blooming plants', image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&h=600&fit=crop' },
  { id: 'forest-path', name: 'جنگل', description: 'Forest path with natural greenery and soft light', image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop' },

  // معماری و ساختمان (Architecture)
  { id: 'building-modern', name: 'ساختمان مدرن', description: 'Modern architectural building with geometric design', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop' },
  { id: 'stairs-marble', name: 'پله‌های مرمر', description: 'Elegant marble staircase in modern building', image: 'https://images.unsplash.com/photo-1505798577917-a65157d3320a?w=800&h=600&fit=crop' },
  { id: 'plaza-public', name: 'میدان عمومی', description: 'Open public plaza with contemporary design', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop' },
  { id: 'bridge-urban', name: 'پل شهری', description: 'Modern urban bridge with architectural interest', image: 'https://images.unsplash.com/photo-1470114716159-e389f8712fda?w=800&h=600&fit=crop' }
];

// لیست حالت‌های بدن (Poses)
const poses = [
  { id: 'standing-front', name: 'ایستاده رو به جلو', description: 'Standing straight facing camera' },
  { id: 'standing-side', name: 'ایستاده نیمرخ', description: 'Standing with side profile, 45 degree angle' },
  { id: 'walking', name: 'در حال راه رفتن', description: 'Walking pose, natural movement' },
  { id: 'sitting', name: 'نشسته', description: 'Sitting pose, relaxed position' },
  { id: 'casual-lean', name: 'تکیه داده کژوال', description: 'Casual leaning pose, one hand in pocket' },
  { id: 'hands-on-hips', name: 'دست به کمر', description: 'Confident pose with hands on hips' },
  { id: 'crossed-arms', name: 'دست به سینه', description: 'Arms crossed, confident stance' },
  { id: 'dynamic', name: 'پویا و متحرک', description: 'Dynamic, energetic pose with movement' }
];

// لیست زاویه‌های دوربین
const cameraAngles = [
  { id: 'eye-level', name: 'هم‌سطح چشم', description: 'Camera at eye level, straight on' },
  { id: 'slightly-low', name: 'کمی از پایین', description: 'Slightly low angle, looking up' },
  { id: 'slightly-high', name: 'کمی از بالا', description: 'Slightly high angle, looking down' },
  { id: 'three-quarter', name: 'سه‌چهارم', description: 'Three-quarter view, 45 degree angle' }
];

// لیست استایل‌ها و حال و هوا
const styles = [
  { id: 'professional', name: 'حرفه‌ای', description: 'Professional, business style, formal' },
  { id: 'casual', name: 'کژوال روزمره', description: 'Casual everyday style, relaxed' },
  { id: 'elegant', name: 'شیک و اِلِگانت', description: 'Elegant, sophisticated, classy' },
  { id: 'sporty', name: 'اسپرت', description: 'Sporty, athletic, dynamic' },
  { id: 'trendy', name: 'مد روز', description: 'Trendy, modern, fashionable' },
  { id: 'artistic', name: 'هنری', description: 'Artistic, creative, unique' }
];

// لیست نورپردازی
const lightings = [
  { id: 'natural', name: 'طبیعی روز', description: 'Natural daylight, soft shadows' },
  { id: 'studio', name: 'استودیو حرفه‌ای', description: 'Professional studio lighting, balanced' },
  { id: 'golden-hour', name: 'طلایی (Golden Hour)', description: 'Golden hour, warm sunset light' },
  { id: 'dramatic', name: 'دراماتیک', description: 'Dramatic lighting, strong contrasts' },
  { id: 'soft-diffused', name: 'نرم و پخش شده', description: 'Soft diffused light, minimal shadows' },
  { id: 'backlit', name: 'نور پشت', description: 'Backlit, rim lighting effect' }
];

// PHASE 1: Critical Quality Parameters

// دمای رنگ (Color Temperature)
const colorTemperatures = [
  { id: 'warm', name: '🔥 گرم (2700K-3500K)', description: 'Warm color temperature 2700K-3500K, cozy sunset feel, golden orange tones' },
  { id: 'neutral', name: '☀️ خنثی (5000K-5500K)', description: 'Neutral color temperature 5000K-5500K, natural daylight, true-to-life colors' },
  { id: 'cool', name: '❄️ سرد (6000K-7000K)', description: 'Cool color temperature 6000K-7000K, modern crisp look, blue-tinted highlights' },
  { id: 'auto', name: '🎨 خودکار', description: 'Auto white balance matched to location and lighting for natural look' }
];

// عمق میدان (Depth of Field)
const depthOfFields = [
  { id: 'shallow', name: '🎯 کم (f/1.4-2.8)', description: 'Shallow depth of field f/1.4-f/2.8, blurred background bokeh, subject pops out, professional portrait look' },
  { id: 'medium', name: '⚖️ متوسط (f/4-5.6)', description: 'Medium depth of field f/4-f/5.6, balanced focus, slight background blur, versatile' },
  { id: 'deep', name: '📐 زیاد (f/8-16)', description: 'Deep depth of field f/8-f/16, everything sharp and in focus, product photography style' }
];

// بافت پارچه (Fabric Texture)
const fabricTypes = [
  { id: 'cotton', name: '👕 نخی (Cotton)', description: 'Cotton fabric: matte finish, soft texture, natural wrinkles, breathable appearance' },
  { id: 'denim', name: '👖 جین (Denim)', description: 'Denim fabric: rugged texture, visible weave pattern, structured folds, indigo color depth' },
  { id: 'silk', name: '👗 ابریشم (Silk)', description: 'Silk fabric: lustrous sheen, smooth drape, fluid movement, reflective highlights' },
  { id: 'wool', name: '🧥 پشمی (Wool)', description: 'Wool fabric: textured surface, warm appearance, structured shape, subtle fiber detail' },
  { id: 'leather', name: '🧥 چرم (Leather)', description: 'Leather material: glossy or matte finish, natural grain texture, firm structure, environmental reflections' },
  { id: 'synthetic', name: '🏃 مصنوعی (Synthetic)', description: 'Synthetic fabric: smooth surface, consistent texture, slight sheen, athletic appearance' },
  { id: 'linen', name: '🌾 کتان (Linen)', description: 'Linen fabric: natural creases, textured weave, relaxed drape, casual elegance' },
  { id: 'auto', name: '🤖 تشخیص خودکار', description: 'Auto-detect fabric type from garment image and render appropriate texture' }
];

// کیفیت سایه (Shadow Quality)
const shadowQualities = [
  { id: 'hard', name: '⚫ سخت', description: 'Hard shadows: sharp edges, high contrast, direct light source, dramatic effect' },
  { id: 'medium', name: '🌗 متوسط', description: 'Medium shadows: moderately soft edges, balanced contrast, natural appearance' },
  { id: 'soft', name: '⚪ نرم', description: 'Soft shadows: diffused edges, low contrast, gentle transitions, flattering look' },
  { id: 'studio', name: '🎬 استودیو', description: 'Studio shadows: controlled density, proper direction, color temperature shifted cooler, professional quality' }
];

// PHASE 2: Professional Touch Parameters

// نسبت تصویر (Aspect Ratio)
const aspectRatios = [
  { id: '1:1', name: '⬜ مربع 1:1', description: 'Square 1:1 ratio, perfect for Instagram feed posts', width: 1024, height: 1024 },
  { id: '4:5', name: '📱 پرتره 4:5', description: 'Portrait 4:5 ratio, ideal for Instagram portrait posts', width: 1024, height: 1280 },
  { id: '16:9', name: '🖥️ افقی 16:9', description: 'Landscape 16:9 ratio, widescreen for websites and banners', width: 1920, height: 1080 },
  { id: '9:16', name: '📲 استوری 9:16', description: 'Vertical 9:16 ratio, Instagram/TikTok stories and reels', width: 1080, height: 1920 },
  { id: '3:4', name: '📸 کلاسیک 3:4', description: 'Classic 3:4 portrait ratio, traditional photography', width: 1536, height: 2048 }
];

// نسبت نوری (Lighting Ratio)
const lightingRatios = [
  { id: 'low', name: '📉 کم (2:1)', description: 'Low contrast 2:1 lighting ratio, flat even lighting, minimal shadows, commercial look' },
  { id: 'medium', name: '⚖️ متوسط (4:1)', description: 'Medium contrast 4:1 lighting ratio, balanced shadows and highlights, natural depth' },
  { id: 'high', name: '📈 زیاد (8:1)', description: 'High contrast 8:1 lighting ratio, dramatic shadows, strong depth, editorial style' },
  { id: 'rembrandt', name: '🎨 رامبراند', description: 'Rembrandt lighting, triangular highlight on cheek, artistic portrait style, 6:1 ratio' }
];

// تاری پس‌زمینه (Background Blur)
const backgroundBlurs = [
  { id: 'none', name: '⛔ بدون تاری', description: 'No background blur, everything sharp, product photography' },
  { id: 'subtle', name: '🌫️ ملایم (20%)', description: 'Subtle background blur 20%, slight separation, natural look' },
  { id: 'medium', name: '🌁 متوسط (50%)', description: 'Medium background blur 50%, clear subject focus, professional portraits' },
  { id: 'heavy', name: '☁️ زیاد (80%)', description: 'Heavy background blur 80%, strong bokeh effect, subject isolation' },
  { id: 'cinematic', name: '🎬 سینمایی (100%)', description: 'Cinematic blur 100%, creamy bokeh, hexagonal highlights, film-like quality' }
];

// برازش لباس (Garment Fit)
const garmentFits = [
  { id: 'tight', name: '⚡ تنگ/Fitted', description: 'Tight fitted garment, body-hugging, minimal fabric slack, athletic fit' },
  { id: 'regular', name: '👔 معمولی/Regular', description: 'Regular fit garment, natural comfort, standard proportions, everyday wear' },
  { id: 'loose', name: '🌊 گشاد/Loose', description: 'Loose oversized fit, relaxed drape, extra fabric, streetwear style' },
  { id: 'tailored', name: '✂️ خیاطی شده/Tailored', description: 'Tailored custom fit, precise measurements, structured shape, luxury appearance' }
];

// PHASE 3: Advanced Features

// پیش‌تنظیم پردازش (Post-Processing Presets)
const postProcessingPresets = [
  { id: 'natural', name: '🌿 طبیعی', description: 'Natural processing, true colors, minimal editing, authentic look' },
  { id: 'editorial', name: '📰 ادیتوریال', description: 'Editorial magazine style, high contrast, vibrant colors, punchy saturation, Vogue aesthetic' },
  { id: 'ecommerce', name: '🛍️ فروشگاهی', description: 'E-commerce clean look, neutral accurate colors, even lighting, product-focused' },
  { id: 'vintage', name: '📼وینتیج', description: 'Vintage retro film look, faded colors, grain texture, nostalgic 70s-90s aesthetic' },
  { id: 'cinematic', name: '🎬 سینمایی', description: 'Cinematic color grading, teal and orange, film-like contrast, movie poster quality' },
  { id: 'portra', name: '🎞️ کداک پرترا', description: 'Kodak Portra 400 film emulation, warm skin tones, soft pastels, professional portrait film' },
  { id: 'velvia', name: '🌄 فوجی ولویا', description: 'Fuji Velvia film emulation, hyper-saturated, rich colors, landscape film aesthetic' },
  { id: 'bw-classic', name: '⬛ سیاه‌سفید کلاسیک', description: 'Classic black and white, rich tones, proper contrast, timeless monochrome' }
];

// بازتاب محیط (Environmental Reflections)
const environmentalReflections = [
  { id: 'none', name: '⛔ بدون بازتاب', description: 'No environmental reflections, isolated subject' },
  { id: 'subtle', name: '✨ ملایم', description: 'Subtle environmental reflections, slight color cast from surroundings, natural integration' },
  { id: 'realistic', name: '🌍 واقع‌گرایانه', description: 'Realistic environmental reflections, ambient light influence, proper color temperature shift, location-based lighting' },
  { id: 'enhanced', name: '💎 تقویت شده', description: 'Enhanced environmental reflections, visible on reflective materials like silk and leather, strong ambient occlusion' }
];

// جلوه‌های آب و هوا (Weather Effects)
const weatherEffects = [
  { id: 'clear', name: '☀️ صاف', description: 'Clear weather, bright sunlight, crisp shadows, perfect visibility' },
  { id: 'overcast', name: '☁️ ابری', description: 'Overcast cloudy day, soft diffused light, gentle shadows, even illumination' },
  { id: 'mist', name: '🌫️ مه ملایم', description: 'Light mist or fog, atmospheric depth, soft focus on background, dreamy mood' },
  { id: 'golden', name: '🌅 طلایی', description: 'Golden hour atmosphere, warm sunlight, long shadows, magical quality' },
  { id: 'dramatic', name: '⛈️ دراماتیک', description: 'Dramatic stormy atmosphere, moody clouds, dynamic contrast, editorial impact' }
];

// حرکت و پویایی (Motion Elements)
const motionElements = [
  { id: 'static', name: '🗿 ثابت', description: 'Static pose, no motion, perfectly sharp, classic studio shot' },
  { id: 'hair', name: '💨 حرکت مو', description: 'Hair movement from gentle wind, natural flow, adds life and energy' },
  { id: 'fabric', name: '🌊 حرکت پارچه', description: 'Fabric flow and movement, dynamic draping, flowing garments, editorial drama' },
  { id: 'action', name: '⚡ اکشن', description: 'Action photography feel, slight motion blur, frozen movement, dynamic energy' },
  { id: 'wind', name: '🌬️ باد قوی', description: 'Strong wind effect, dramatic fabric and hair movement, high-energy fashion editorial' }
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

// دریافت لیست حالت‌های بدن
app.get('/api/poses', (req, res) => {
  res.json(poses);
});

// دریافت لیست زاویه‌های دوربین
app.get('/api/camera-angles', (req, res) => {
  res.json(cameraAngles);
});

// دریافت لیست استایل‌ها
app.get('/api/styles', (req, res) => {
  res.json(styles);


// دریافت تنظیمات Supabase برای frontend
app.get('/api/supabase-config', (req, res) => {
  if (!supabase || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({ 
      error: 'Supabase is not configured',
      configured: false 
    });
  }
  
  res.json({
    configured: true,
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  });
});

});

// دریافت لیست نورپردازی
app.get('/api/lightings', (req, res) => {
  res.json(lightings);
});

// PHASE 1: New API endpoints for critical quality parameters
app.get('/api/color-temperatures', (req, res) => {
  res.json(colorTemperatures);
});

app.get('/api/depth-of-fields', (req, res) => {
  res.json(depthOfFields);
});

app.get('/api/fabric-types', (req, res) => {
  res.json(fabricTypes);
});

app.get('/api/shadow-qualities', (req, res) => {
  res.json(shadowQualities);
});

// PHASE 2: Professional touch parameters
app.get('/api/aspect-ratios', (req, res) => {
  res.json(aspectRatios);
});

app.get('/api/lighting-ratios', (req, res) => {
  res.json(lightingRatios);
});

app.get('/api/background-blurs', (req, res) => {
  res.json(backgroundBlurs);
});

app.get('/api/garment-fits', (req, res) => {
  res.json(garmentFits);
});

// PHASE 3: Advanced features
app.get('/api/post-processing-presets', (req, res) => {
  res.json(postProcessingPresets);
});

app.get('/api/environmental-reflections', (req, res) => {
  res.json(environmentalReflections);
});

app.get('/api/weather-effects', (req, res) => {
  res.json(weatherEffects);
});

app.get('/api/motion-elements', (req, res) => {
  res.json(motionElements);
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
    const {
      garmentPath,      // For backward compatibility (single garment)
      garmentPaths,     // New: array of garment paths
      modelId,
      backgroundId,
      poseId = 'standing-front',
      cameraAngleId = 'eye-level',
      styleId = 'professional',
      lightingId = 'studio',
      // PHASE 1: Critical quality parameters
      colorTemperatureId = 'auto',
      depthOfFieldId = 'medium',
      fabricTypeId = 'auto',
      shadowQualityId = 'medium',
      // PHASE 2: Professional touch
      aspectRatioId = '1:1',
      lightingRatioId = 'medium',
      backgroundBlurId = 'medium',
      garmentFitId = 'regular',
      // PHASE 3: Advanced features
      postProcessingId = 'natural',
      environmentalReflectionId = 'subtle',
      weatherEffectId = 'clear',
      motionElementId = 'static'
    } = req.body;

    // Support both single garment (old) and multiple garments (new)
    const garments = garmentPaths || (garmentPath ? [garmentPath] : []);

    if (!garments.length || !modelId || !backgroundId) {
      return res.status(400).json({ error: 'لطفاً تمام فیلدها را پر کنید' });
    }

    const selectedModel = models.find(m => m.id === modelId);
    const selectedBackground = backgrounds.find(b => b.id === backgroundId);
    const selectedPose = poses.find(p => p.id === poseId) || poses[0];
    const selectedCameraAngle = cameraAngles.find(c => c.id === cameraAngleId) || cameraAngles[0];
    const selectedStyle = styles.find(s => s.id === styleId) || styles[0];
    const selectedLighting = lightings.find(l => l.id === lightingId) || lightings[0];

    // PHASE 1: Select critical quality parameters
    const selectedColorTemp = colorTemperatures.find(ct => ct.id === colorTemperatureId) || colorTemperatures[3]; // auto
    const selectedDoF = depthOfFields.find(d => d.id === depthOfFieldId) || depthOfFields[1]; // medium
    const selectedFabric = fabricTypes.find(f => f.id === fabricTypeId) || fabricTypes[7]; // auto
    const selectedShadow = shadowQualities.find(sq => sq.id === shadowQualityId) || shadowQualities[1]; // medium

    // PHASE 2: Select professional touch parameters
    const selectedAspectRatio = aspectRatios.find(ar => ar.id === aspectRatioId) || aspectRatios[0]; // 1:1
    const selectedLightingRatio = lightingRatios.find(lr => lr.id === lightingRatioId) || lightingRatios[1]; // medium
    const selectedBgBlur = backgroundBlurs.find(bb => bb.id === backgroundBlurId) || backgroundBlurs[2]; // medium
    const selectedFit = garmentFits.find(gf => gf.id === garmentFitId) || garmentFits[1]; // regular

    // PHASE 3: Select advanced features
    const selectedPostProcessing = postProcessingPresets.find(pp => pp.id === postProcessingId) || postProcessingPresets[0]; // natural
    const selectedEnvReflection = environmentalReflections.find(er => er.id === environmentalReflectionId) || environmentalReflections[1]; // subtle
    const selectedWeather = weatherEffects.find(we => we.id === weatherEffectId) || weatherEffects[0]; // clear
    const selectedMotion = motionElements.find(me => me.id === motionElementId) || motionElements[0]; // static

    if (!selectedModel || !selectedBackground) {
      return res.status(400).json({ error: 'مدل یا پس‌زمینه نامعتبر است' });
    }

    console.log('🎨 Generating image with Gemini 2.5 Flash...');
    console.log('📸 Garment URLs:', garments);
    console.log('👤 Model:', selectedModel.name);
    console.log('📍 Location:', selectedBackground.name);
    console.log('🎭 Pose:', selectedPose.name);
    console.log('📷 Camera:', selectedCameraAngle.name);
    console.log('✨ Style:', selectedStyle.name);
    console.log('💡 Lighting:', selectedLighting.name);

    // دانلود عکس‌های لباس (چند تایی) و مدل و تبدیل به base64
    const garmentBase64Array = await Promise.all(
      garments.map(path => imageUrlToBase64(path))
    );
    const modelBase64 = await imageUrlToBase64(selectedModel.image);

    // ساخت پرامپت برای Virtual Try-On با پارامترهای جدید
    const garmentDescription = garments.length === 1
      ? 'the garment/clothing from the first image'
      : `ALL ${garments.length} garments/clothing items from the first ${garments.length} images (combine them on the model - e.g., if there's pants, shirt, and jacket, the model should wear all of them together)`;

    const prompt = `You are a world-class professional fashion photographer and expert image editor with mastery in color science, fabric rendering, and photographic composition. Create an ultra-realistic, high-quality virtual try-on image.

TASK: Place ${garmentDescription} onto the model shown in the ${garments.length === 1 ? 'second' : 'last'} image.

CORE REQUIREMENTS:
1. The model should wear ${garmentDescription}
${garments.length > 1 ? '2. IMPORTANT: Combine and layer all garments naturally (e.g., pants + shirt + jacket all worn together by the model)\n' : ''}${garments.length > 1 ? '3' : '2'}. Keep the model's face and overall appearance from the reference image
${garments.length > 1 ? '4' : '3'}. Garment Fit: ${selectedFit.description}
${garments.length > 1 ? '5' : '4'}. The clothing must fit naturally on the model's body with realistic wrinkles and fabric draping${garments.length > 1 ? '\n7. Each garment should be clearly visible and properly layered (bottom layers like pants and shirts should be visible under jackets/coats)' : ''}

POSE & COMPOSITION:
- Pose: ${selectedPose.description}
- Camera Angle: ${selectedCameraAngle.description}
- Framing: Full body or three-quarter shot, well-composed, rule of thirds
- ${selectedMotion.description}

STYLE & MOOD:
- Overall Style: ${selectedStyle.description}
- The image should convey this mood and aesthetic
- Make it look professional and magazine-quality

===== PHASE 1: CRITICAL QUALITY PARAMETERS =====

COLOR TEMPERATURE & WHITE BALANCE:
- Color Temperature: ${selectedColorTemp.description}
- Ensure proper white balance for natural skin tones
- Color harmony between garment, model, and environment
- No unnatural color casts unless intentional for mood

DEPTH OF FIELD:
- ${selectedDoF.description}
- Create proper bokeh if shallow DoF is selected
- Ensure subject is in sharp focus while background matches DoF setting
- Natural lens characteristics and optical quality

FABRIC TEXTURE & MATERIAL RENDERING:
- ${selectedFabric.description}
- Render fabric with proper surface characteristics and texture detail
- Show natural fabric behavior: how it wrinkles, folds, reflects light
- Micro-details: stitching, weave pattern, fabric grain visible
- Material-specific properties (cotton matte vs silk sheen)
- Proper subsurface scattering for translucent fabrics

SHADOW QUALITY & DIRECTION:
- ${selectedShadow.description}
- Shadow color should be slightly cooler than highlights
- Shadows should follow light source direction logically
- Proper shadow density and transition zones
- Ambient occlusion in folds and creases

===== PHASE 2: PROFESSIONAL TOUCH =====

LIGHTING SETUP:
- Main Lighting: ${selectedLighting.description}
- Lighting Ratio: ${selectedLightingRatio.description}
- Create dimensional depth with proper key, fill, and rim lighting
- Catchlights in eyes for lifelike appearance
- Ensure lighting enhances garment texture and form

BACKGROUND TREATMENT:
- Background Blur: ${selectedBgBlur.description}
- Natural subject-background separation
- Proper bokeh characteristics if blur is applied
- Background should complement not distract from subject

IMAGE OUTPUT SPECS:
- Aspect Ratio: ${selectedAspectRatio.description}
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels
- Sharp focus on subject, proper edge sharpness
- No digital artifacts or compression issues

===== PHASE 3: ADVANCED FEATURES =====

POST-PROCESSING & COLOR GRADING:
- ${selectedPostProcessing.description}
- Professional color science and grading
- Proper contrast curves and tonal distribution
- Skin tone rendering with natural warmth
- Color harmony and palette cohesion

ENVIRONMENTAL INTERACTION:
- ${selectedEnvReflection.description}
- Ambient light from surroundings affecting subject
- Proper color temperature shift based on environment
- Reflective materials show environment (silk, leather, synthetics)
- Natural light bounce and fill from surroundings

ATMOSPHERE & WEATHER:
- ${selectedWeather.description}
- Atmospheric perspective and depth cues
- Proper haze, mist, or clarity based on conditions
- Weather-appropriate lighting characteristics

SKIN RENDERING:
- Natural skin texture with pores and detail
- Proper subsurface scattering for skin translucency
- Skin tone matched to lighting conditions
- NO over-smoothing or "plastic" appearance
- Realistic skin-to-fabric transitions

FINAL TECHNICAL SPECIFICATIONS:
- Photorealistic rendering, indistinguishable from real photography
- Professional color accuracy for e-commerce use
- Suitable for editorial, advertising, and product photography
- Film-like quality with proper grain structure if applicable
- No text, watermarks, logos, or artificial elements
- Natural lens characteristics (slight vignette if shallow DoF)

CRITICAL IMPERATIVES:
- Do NOT change the model's facial features or body type
- Preserve authentic garment colors with accurate material rendering
- Seamless clothing integration with realistic physics
- All parameters must work together harmoniously
- The final image should look like a $10,000 professional photoshoot from a top fashion photographer`;

    console.log('📝 Prompt:', prompt);

    // استفاده از Gemini 2.5 Flash Image برای تولید تصویر
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["Image"] // Enable image generation
      }
    });

    // Build content array with all garments + model
    const contentParts = [];

    // Add all garment images
    garmentBase64Array.forEach((garmentBase64, index) => {
      contentParts.push({ text: `GARMENT/CLOTHING IMAGE ${index + 1}:` });
      contentParts.push({
        inlineData: {
          data: garmentBase64,
          mimeType: 'image/jpeg'
        }
      });
    });

    // Add model image
    contentParts.push({ text: "MODEL IMAGE:" });
    contentParts.push({
      inlineData: {
        data: modelBase64,
        mimeType: 'image/jpeg'
      }
    });

    // Add prompt
    contentParts.push({ text: prompt });

    const result = await model.generateContent(contentParts);

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
    // Store garments as JSON array if multiple, or single string if one
    const garmentPathToStore = garments.length === 1 ? garments[0] : JSON.stringify(garments);

    const { data: generationData, error: dbError } = await supabase
      .from('generated_images')
      .insert([
        {
          user_id: req.user?.id || null,
          garment_path: garmentPathToStore,
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
    if (!supabase) {
      // اگر Supabase تنظیم نشده، یک آرایه خالی برمی‌گردانیم
      return res.json({ success: true, generations: [] });
    }

    const { data, error } = await supabase
      .from('generated_images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ success: true, generations: data || [] });
  } catch (error) {
    console.error('خطا در دریافت تاریخچه:', error);
    res.status(500).json({ error: 'خطا در دریافت تاریخچه' });
  }
});

// حذف یک تصویر
app.delete('/api/generations/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase تنظیم نشده است' });
    }

    // حذف از database
    const { error } = await supabase
      .from('generated_images')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'تصویر با موفقیت حذف شد' });
  } catch (error) {
    console.error('خطا در حذف تصویر:', error);
    res.status(500).json({ error: 'خطا در حذف تصویر' });
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

// تولید کپشن اینستاگرام برای تصویر
app.post('/api/generate-caption', async (req, res) => {
  try {
    const { imageUrl, imageId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'URL تصویر الزامی است' });
    }

    console.log('📝 Generating Instagram caption for image:', imageUrl);

    // دانلود تصویر و تبدیل به base64
    const imageBase64 = await imageUrlToBase64(imageUrl);

    // استفاده از Gemini برای تولید کپشن
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `شما یک متخصص بازاریابی اینستاگرامی هستید که کپشن‌های فوق‌العاده جذاب و فروش‌محور می‌نویسید.

این تصویر مد را تحلیل کن و یک کپشن اینستاگرام فارسی فوق‌العاده جذاب و غیرقابل مقاومت بنویس که مشتری را فوراً به خرید ترغیب کند.

الزامات مهم:

1. زبان: 100% فارسی - طبیعی، صمیمی، ترند
2. شروع قوی: با سوال یا جمله‌ای شروع کن که FOMO ایجاد کنه و توجه رو جلب کنه
3. احساسی: خواننده باید خودش رو با این لباس تصور کنه
4. داستان: تصویر زنده‌ای از اینکه با این لباس چقدر بهتر به نظر میاد و احساس میکنه
5. فوریت: موجودی محدود، ترند روز، همه می‌خوانش
6. منافع: تمرکز روی اعتماد به نفس، تعریف‌هایی که می‌شنوه، تحول ظاهری
7. دعوت به اقدام: قوی و فوری (محدود، تخفیف ویژه، همین الان سفارش بده، دایرکت کن)
8. ایموجی: 5-8 تا ایموجی مرتبط به صورت استراتژیک
9. طول: 80-120 کلمه - کوتاه اما قدرتمند
10. هشتگ: 10-15 هشتگ فارسی و انگلیسی پرطرفدار

لحن: هیجان‌انگیز، پرانرژی، ترغیب‌کننده، ایجاد FOMO، مستقیم با مشتری صحبت کن

اجتناب کن از: توضیحات کلیشه‌ای، لیست خسته‌کننده، زبان رسمی

هدف: کپشنی بنویس که خواننده نتونه مقاومت کنه و حتماً دکمه سفارش رو بزنه!

مثل یک کپی‌رایتر حرفه‌ای فکر کن - هر کلمه باید به فروش کمک کنه. میل و فوریت ایجاد کن!

فقط کپشن فارسی رو بنویس، بدون هیچ توضیح یا متن انگلیسی اضافه. فقط و فقط کپشن!`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const response = await result.response;
    const caption = response.text();

    console.log('✅ Instagram caption generated successfully');

    // ذخیره کپشن در دیتابیس (اگر supabase فعال باشد و imageId وجود داشته باشد)
    if (supabase && imageId) {
      try {
        const { error: updateError } = await supabase
          .from('generated_images')
          .update({ instagram_caption: caption })
          .eq('id', imageId);

        if (updateError) {
          console.error('خطا در ذخیره کپشن در دیتابیس:', updateError);
        } else {
          console.log('✅ کپشن در دیتابیس ذخیره شد');
        }
      } catch (dbError) {
        console.error('خطا در ذخیره کپشن:', dbError);
      }
    }

    res.json({
      success: true,
      caption: caption,
      imageId: imageId
    });

  } catch (error) {
    console.error('❌ خطا در تولید کپشن:', error);
    res.status(500).json({
      error: 'خطا در تولید کپشن',
      details: error.message
    });
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
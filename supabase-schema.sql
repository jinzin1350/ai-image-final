
-- ایجاد جدول برای ذخیره تاریخچه تولید عکس‌ها
CREATE TABLE IF NOT EXISTS generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  garment_path TEXT NOT NULL,
  model_id TEXT NOT NULL,
  background_id TEXT NOT NULL,
  prompt TEXT,
  description TEXT,
  result_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد ایندکس برای جستجوی سریع‌تر
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);

-- فعال‌سازی Row Level Security
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Policy: کاربران فقط رکوردهای خودشان را ببینند
CREATE POLICY "Users can view their own generations"
  ON generations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: کاربران بتوانند رکورد جدید اضافه کنند
CREATE POLICY "Users can insert their own generations"
  ON generations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ایجاد Storage bucket برای عکس‌های لباس
INSERT INTO storage.buckets (id, name, public)
VALUES ('garments', 'garments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy برای آپلود به bucket
CREATE POLICY "Anyone can upload garment images"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'garments');

-- Policy برای دانلود از bucket
CREATE POLICY "Anyone can download garment images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'garments');

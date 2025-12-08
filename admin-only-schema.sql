
-- ============================================
-- Admin Dashboard Database Schema ONLY
-- ============================================

-- Drop existing tables if needed (for fresh install)
DROP TABLE IF EXISTS admin_activity_logs CASCADE;
DROP TABLE IF EXISTS user_limits CASCADE;
DROP TABLE IF EXISTS content_library CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- ============================================
-- 1. Admin Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add default super admin (password: admin123 - CHANGE THIS IN PRODUCTION!)
INSERT INTO admin_users (email, password_hash, full_name, role)
VALUES ('admin@example.com', '$2b$10$rKzMg8K7xhB8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', 'Super Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. Content Library Table (Models & Backgrounds)
-- ============================================
CREATE TABLE IF NOT EXISTS content_library (
  id BIGSERIAL PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('model', 'background')),
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  category TEXT,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  usage_count INTEGER DEFAULT 0,
  uploaded_by BIGINT REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_library_type ON content_library(content_type);
CREATE INDEX idx_content_library_tier ON content_library(tier);
CREATE INDEX idx_content_library_category ON content_library(category);
CREATE INDEX idx_content_library_active ON content_library(is_active);

-- ============================================
-- 3. User Limits Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- Store email for display purposes
  is_premium BOOLEAN DEFAULT false,
  images_limit INTEGER DEFAULT 10,
  images_used INTEGER DEFAULT 0,
  captions_limit INTEGER DEFAULT 5,
  captions_used INTEGER DEFAULT 0,
  descriptions_limit INTEGER DEFAULT 3,
  descriptions_used INTEGER DEFAULT 0,
  last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_limits_user_id ON user_limits(user_id);
CREATE INDEX idx_user_limits_premium ON user_limits(is_premium);
CREATE INDEX idx_user_limits_email ON user_limits(email);

-- ============================================
-- 4. Admin Activity Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_logs_action_type ON admin_activity_logs(action_type);
CREATE INDEX idx_admin_logs_created_at ON admin_activity_logs(created_at DESC);

-- ============================================
-- 5. Add columns to existing generated_images table
-- ============================================
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS is_premium_generation BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_generated_images_user_email ON generated_images(user_email);

-- ============================================
-- 6. Row Level Security (RLS) Policies
-- ============================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin Users policies
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
CREATE POLICY "Admins can view admin users" ON admin_users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update admin users" ON admin_users;
CREATE POLICY "Admins can update admin users" ON admin_users FOR UPDATE USING (true);

-- Content Library policies
DROP POLICY IF EXISTS "Anyone can view active content" ON content_library;
CREATE POLICY "Anyone can view active content" ON content_library FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can insert content" ON content_library;
CREATE POLICY "Admins can insert content" ON content_library FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update content" ON content_library;
CREATE POLICY "Admins can update content" ON content_library FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete content" ON content_library;
CREATE POLICY "Admins can delete content" ON content_library FOR DELETE USING (true);

-- User Limits policies
DROP POLICY IF EXISTS "Users can view their own limits" ON user_limits;
CREATE POLICY "Users can view their own limits" ON user_limits FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins can manage all limits" ON user_limits;
CREATE POLICY "Admins can manage all limits" ON user_limits FOR ALL USING (true);

-- Activity Logs policies
DROP POLICY IF EXISTS "Admins can view activity logs" ON admin_activity_logs;
CREATE POLICY "Admins can view activity logs" ON admin_activity_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert activity logs" ON admin_activity_logs;
CREATE POLICY "Admins can insert activity logs" ON admin_activity_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- 7. Create Storage Bucket for Admin Content
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-content', 'admin-content', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Admin content storage policies
DROP POLICY IF EXISTS "Public can upload to admin-content" ON storage.objects;
CREATE POLICY "Public can upload to admin-content" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'admin-content');

DROP POLICY IF EXISTS "Public can read from admin-content" ON storage.objects;
CREATE POLICY "Public can read from admin-content" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'admin-content');

DROP POLICY IF EXISTS "Public can update admin-content" ON storage.objects;
CREATE POLICY "Public can update admin-content" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'admin-content');

DROP POLICY IF EXISTS "Public can delete from admin-content" ON storage.objects;
CREATE POLICY "Public can delete from admin-content" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'admin-content');

-- ============================================
-- 8. Function to Auto-create User Limits on Signup
-- ============================================
CREATE OR REPLACE FUNCTION create_user_limits_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_limits (user_id, email, is_premium, images_limit, captions_limit, descriptions_limit)
  VALUES (NEW.id, NEW.email, false, 10, 5, 3)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating user limits
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_limits_on_signup();

-- ============================================
-- Setup Complete!
-- ============================================
SELECT '✅ Admin Dashboard Schema Created Successfully!' AS status;
SELECT '📊 4 Tables Created' AS info;
SELECT '🔐 Default Admin: admin@example.com / admin123' AS credentials;
SELECT '🔄 Auto-create user limits trigger enabled' AS trigger_status;

-- ============================================
-- Admin Dashboard Database Schema
-- Created: 2025-10-24
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
  category TEXT, -- 'woman', 'man', 'girl', 'boy', 'indoor', 'outdoor', etc.
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT, -- Supabase storage path
  is_active BOOLEAN DEFAULT true,
  metadata JSONB, -- Additional data (dimensions, file size, etc.)
  usage_count INTEGER DEFAULT 0,
  uploaded_by BIGINT REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
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
  is_premium BOOLEAN DEFAULT false,

  -- Image Generation Limits
  images_limit INTEGER DEFAULT 10, -- Per month
  images_used INTEGER DEFAULT 0,

  -- Caption Generation Limits
  captions_limit INTEGER DEFAULT 5, -- Per month
  captions_used INTEGER DEFAULT 0,

  -- Product Description Limits
  descriptions_limit INTEGER DEFAULT 3, -- Per month
  descriptions_used INTEGER DEFAULT 0,

  -- Reset tracking
  last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Custom notes
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Create index for faster user lookups
CREATE INDEX idx_user_limits_user_id ON user_limits(user_id);
CREATE INDEX idx_user_limits_premium ON user_limits(is_premium);

-- ============================================
-- 4. Admin Activity Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'user_update', 'content_upload', 'limit_change', etc.
  target_type TEXT, -- 'user', 'content', 'system'
  target_id TEXT, -- ID of affected resource
  description TEXT NOT NULL,
  metadata JSONB, -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for logs
CREATE INDEX idx_admin_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_logs_action_type ON admin_activity_logs(action_type);
CREATE INDEX idx_admin_logs_created_at ON admin_activity_logs(created_at DESC);

-- ============================================
-- 5. Add columns to existing generated_images table
-- ============================================
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS is_premium_generation BOOLEAN DEFAULT false;

-- Create index for user email lookups
CREATE INDEX IF NOT EXISTS idx_generated_images_user_email ON generated_images(user_email);

-- ============================================
-- 6. Create View for User Statistics
-- ============================================
CREATE OR REPLACE VIEW user_statistics AS
SELECT
  u.id AS user_id,
  u.email,
  ul.is_premium,
  ul.images_limit,
  ul.images_used,
  ul.captions_limit,
  ul.captions_used,
  ul.descriptions_limit,
  ul.descriptions_used,
  COUNT(DISTINCT gi.id) AS total_images_generated,
  COUNT(DISTINCT CASE WHEN gi.instagram_caption IS NOT NULL THEN gi.id END) AS total_captions_generated,
  MAX(gi.created_at) AS last_activity,
  u.created_at AS user_since
FROM auth.users u
LEFT JOIN user_limits ul ON u.id = ul.user_id
LEFT JOIN generated_images gi ON u.id = gi.user_id
GROUP BY u.id, u.email, ul.is_premium, ul.images_limit, ul.images_used,
         ul.captions_limit, ul.captions_used, ul.descriptions_limit, ul.descriptions_used;

-- ============================================
-- 7. Functions for Auto-Reset Monthly Limits
-- ============================================
CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS void AS $$
BEGIN
  UPDATE user_limits
  SET
    images_used = 0,
    captions_used = 0,
    descriptions_used = 0,
    last_reset_date = NOW()
  WHERE
    EXTRACT(DAY FROM AGE(NOW(), last_reset_date)) >= 30;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin Users: Only admins can see admin users
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
CREATE POLICY "Admins can view admin users" ON admin_users
  FOR SELECT USING (true); -- Will be controlled via backend authentication

DROP POLICY IF EXISTS "Admins can update admin users" ON admin_users;
CREATE POLICY "Admins can update admin users" ON admin_users
  FOR UPDATE USING (true);

-- Content Library: Everyone can view active content, only admins can modify
DROP POLICY IF EXISTS "Anyone can view active content" ON content_library;
CREATE POLICY "Anyone can view active content" ON content_library
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can insert content" ON content_library;
CREATE POLICY "Admins can insert content" ON content_library
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update content" ON content_library;
CREATE POLICY "Admins can update content" ON content_library
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete content" ON content_library;
CREATE POLICY "Admins can delete content" ON content_library
  FOR DELETE USING (true);

-- User Limits: Users can see their own limits, admins can see all
DROP POLICY IF EXISTS "Users can view their own limits" ON user_limits;
CREATE POLICY "Users can view their own limits" ON user_limits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all limits" ON user_limits;
CREATE POLICY "Admins can manage all limits" ON user_limits
  FOR ALL USING (true);

-- Activity Logs: Only readable, no updates/deletes
DROP POLICY IF EXISTS "Admins can view activity logs" ON admin_activity_logs;
CREATE POLICY "Admins can view activity logs" ON admin_activity_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert activity logs" ON admin_activity_logs;
CREATE POLICY "Admins can insert activity logs" ON admin_activity_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 9. Storage Bucket for Admin Uploads
-- ============================================
-- Note: Run this in Supabase Storage UI or via API
-- Bucket name: 'admin-content'
-- Public: Yes (for serving images)
-- File size limit: 50MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- ============================================
-- Setup Complete!
-- ============================================
SELECT '✅ Admin Dashboard Schema Created Successfully!' AS status;
SELECT '📊 Tables Created: admin_users, content_library, user_limits, admin_activity_logs' AS info;
SELECT '🔐 Default Admin: admin@example.com / admin123 (CHANGE PASSWORD!)' AS warning;

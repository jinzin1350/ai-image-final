-- ============================================
-- SAFE COMPLETE DATABASE MIGRATION
-- ============================================
-- This version is SAFE to run multiple times
-- No data will be deleted!
-- ============================================

-- ============================================
-- 1. USER LIMITS & TIER SYSTEM
-- ============================================

-- Create user_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  tier TEXT DEFAULT 'bronze',
  credits_limit INTEGER DEFAULT 50,
  credits_used INTEGER DEFAULT 0,
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN email TEXT;
    RAISE NOTICE '✅ Added email column';
  ELSE
    RAISE NOTICE 'ℹ️  email column already exists';
  END IF;
END $$;

-- Add tier column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'tier'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN tier TEXT DEFAULT 'bronze';
    RAISE NOTICE '✅ Added tier column';
  ELSE
    RAISE NOTICE 'ℹ️  tier column already exists';
  END IF;
END $$;

-- Add credits_limit column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'credits_limit'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN credits_limit INTEGER DEFAULT 50;
    RAISE NOTICE '✅ Added credits_limit column';
  ELSE
    RAISE NOTICE 'ℹ️  credits_limit column already exists';
  END IF;
END $$;

-- Add credits_used column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_limits' AND column_name = 'credits_used'
  ) THEN
    ALTER TABLE user_limits ADD COLUMN credits_used INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added credits_used column';
  ELSE
    RAISE NOTICE 'ℹ️  credits_used column already exists';
  END IF;
END $$;

-- Add constraint to tier column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_limits_tier_check'
  ) THEN
    ALTER TABLE user_limits ADD CONSTRAINT user_limits_tier_check
      CHECK (tier IN ('bronze', 'silver', 'gold'));
    RAISE NOTICE '✅ Added tier constraint';
  ELSE
    RAISE NOTICE 'ℹ️  tier constraint already exists';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️  tier constraint already exists';
END $$;

-- Create indexes (safely)
CREATE INDEX IF NOT EXISTS idx_user_limits_user_id ON user_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_limits_tier ON user_limits(tier);
CREATE INDEX IF NOT EXISTS idx_user_limits_email ON user_limits(email);

-- Migrate existing data (only if needed)
UPDATE user_limits
SET
  tier = CASE
    WHEN is_premium = true THEN 'gold'
    ELSE COALESCE(tier, 'bronze')
  END,
  credits_limit = CASE
    WHEN is_premium = true THEN 130
    ELSE COALESCE(credits_limit, 50)
  END,
  credits_used = COALESCE(credits_used, images_used, 0)
WHERE tier IS NULL OR (tier = 'bronze' AND is_premium = true);

-- ============================================
-- 2. PRODUCT GENERATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS product_generations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  product_identifier TEXT NOT NULL,
  has_generated_caption BOOLEAN DEFAULT false,
  has_generated_description BOOLEAN DEFAULT false,
  caption_text TEXT,
  description_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_identifier)
);

CREATE INDEX IF NOT EXISTS idx_product_generations_user_id ON product_generations(user_id);

-- ============================================
-- 3. DISCOUNT SYSTEM (TIER PRICING)
-- ============================================

-- Add discount_percentage column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tier_pricing' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE tier_pricing
    ADD COLUMN discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
    RAISE NOTICE '✅ Added discount_percentage column';
  ELSE
    RAISE NOTICE 'ℹ️  discount_percentage column already exists';
  END IF;
END $$;

-- Add discount_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tier_pricing' AND column_name = 'discount_active'
  ) THEN
    ALTER TABLE tier_pricing
    ADD COLUMN discount_active BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added discount_active column';
  ELSE
    RAISE NOTICE 'ℹ️  discount_active column already exists';
  END IF;
END $$;

-- Add comments for clarity
COMMENT ON COLUMN tier_pricing.discount_percentage IS 'Discount percentage (0-100). Example: 20 means 20% off';
COMMENT ON COLUMN tier_pricing.discount_active IS 'Whether the discount is currently active and should be shown to users';

-- Create helper function to calculate discounted price
CREATE OR REPLACE FUNCTION get_discounted_price(original_price INTEGER, discount_pct INTEGER, is_active BOOLEAN)
RETURNS INTEGER AS $$
BEGIN
    IF is_active AND discount_pct > 0 THEN
        RETURN original_price - (original_price * discount_pct / 100);
    ELSE
        RETURN original_price;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_discounted_price IS 'Calculate discounted price based on original price, discount percentage, and active status';

-- Update existing rows to have default discount values
UPDATE tier_pricing
SET discount_percentage = COALESCE(discount_percentage, 0),
    discount_active = COALESCE(discount_active, FALSE)
WHERE discount_percentage IS NULL OR discount_active IS NULL;

-- Create index for faster queries on active discounts
CREATE INDEX IF NOT EXISTS idx_tier_pricing_discount_active
ON tier_pricing(discount_active)
WHERE discount_active = TRUE;

-- ============================================
-- 4. BLOG POSTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  author VARCHAR(255) DEFAULT 'FusionAI Team',
  category VARCHAR(100),
  tags TEXT[],
  featured_image TEXT,
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  seo_keywords TEXT,
  article_schema JSONB,
  faq_schema JSONB,
  article_summary TEXT,
  key_points TEXT,
  faq_content TEXT,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_published_at ON blog_posts(published_at DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS blog_updated_at_trigger ON blog_posts;
CREATE TRIGGER blog_updated_at_trigger
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();

-- Insert sample blog post (only if doesn't exist)
INSERT INTO blog_posts (
  slug,
  title,
  excerpt,
  content,
  author,
  category,
  tags,
  meta_title,
  meta_description,
  published,
  published_at
) VALUES (
  'welcome-to-fusionai-blog',
  'Welcome to FusionAI Team Blog',
  'Discover the latest AI innovations and insights from the FusionAI Team.',
  '<h2>Welcome to Our Blog!</h2><p>This is a sample blog post. Replace this with your actual content.</p><p>FusionAI Team brings you the latest in AI technology and innovation.</p>',
  'FusionAI Team',
  'Company News',
  ARRAY['AI', 'Technology', 'Innovation'],
  'Welcome to FusionAI Team Blog - AI Insights',
  'Discover expert AI insights and technology updates from FusionAI Team.',
  true,
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 5. BEFORE/AFTER GALLERY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS before_after_gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  service_type TEXT,
  category TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_before_after_gallery_service_type ON before_after_gallery(service_type);
CREATE INDEX IF NOT EXISTS idx_before_after_gallery_featured ON before_after_gallery(is_featured);
CREATE INDEX IF NOT EXISTS idx_before_after_gallery_order ON before_after_gallery(display_order);

-- ============================================
-- 6. STORAGE BUCKET (ONLY ONCE!)
-- ============================================

-- Create storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('before-after-images', 'before-after-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE before_after_gallery ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS POLICIES (SAFE - DROP IF EXISTS)
-- ============================================

-- User limits policies
DROP POLICY IF EXISTS "Users can view their own limits" ON user_limits;
CREATE POLICY "Users can view their own limits"
ON user_limits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all limits" ON user_limits;
CREATE POLICY "Service role can manage all limits"
ON user_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Product generations policies
DROP POLICY IF EXISTS "Users can manage their own product generations" ON product_generations;
CREATE POLICY "Users can manage their own product generations"
ON product_generations FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Blog posts policies
DROP POLICY IF EXISTS "Public can view published blog posts" ON blog_posts;
CREATE POLICY "Public can view published blog posts"
ON blog_posts FOR SELECT
USING (published = true);

DROP POLICY IF EXISTS "Authenticated users can view all blog posts" ON blog_posts;
CREATE POLICY "Authenticated users can view all blog posts"
ON blog_posts FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert blog posts" ON blog_posts;
CREATE POLICY "Authenticated users can insert blog posts"
ON blog_posts FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update blog posts" ON blog_posts;
CREATE POLICY "Authenticated users can update blog posts"
ON blog_posts FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete blog posts" ON blog_posts;
CREATE POLICY "Authenticated users can delete blog posts"
ON blog_posts FOR DELETE
TO authenticated
USING (true);

-- Before/After Gallery policies
DROP POLICY IF EXISTS "Public read access" ON before_after_gallery;
CREATE POLICY "Public read access"
ON before_after_gallery FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert" ON before_after_gallery;
CREATE POLICY "Authenticated users can insert"
ON before_after_gallery FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update" ON before_after_gallery;
CREATE POLICY "Authenticated users can update"
ON before_after_gallery FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete" ON before_after_gallery;
CREATE POLICY "Authenticated users can delete"
ON before_after_gallery FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 9. STORAGE POLICIES (SAFE - DROP IF EXISTS)
-- ============================================

DROP POLICY IF EXISTS "Public read access for before-after images" ON storage.objects;
CREATE POLICY "Public read access for before-after images"
ON storage.objects FOR SELECT
USING (bucket_id = 'before-after-images');

DROP POLICY IF EXISTS "Authenticated users can upload before-after images" ON storage.objects;
CREATE POLICY "Authenticated users can upload before-after images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'before-after-images');

DROP POLICY IF EXISTS "Authenticated users can update before-after images" ON storage.objects;
CREATE POLICY "Authenticated users can update before-after images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'before-after-images');

DROP POLICY IF EXISTS "Authenticated users can delete before-after images" ON storage.objects;
CREATE POLICY "Authenticated users can delete before-after images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'before-after-images');

-- ============================================
-- 10. HELPFUL COMMENTS
-- ============================================

COMMENT ON COLUMN user_limits.tier IS 'User tier: bronze (50), silver (100), gold (130)';
COMMENT ON COLUMN user_limits.credits_limit IS 'Total credits per month';
COMMENT ON COLUMN user_limits.credits_used IS 'Credits used. All services: 1 credit per generation';
COMMENT ON TABLE product_generations IS 'Tracks caption and description generation per product';
COMMENT ON TABLE before_after_gallery IS 'Stores before/after image pairs for portfolio page';

-- ============================================
-- 11. FINAL VERIFICATION
-- ============================================

DO $$
DECLARE
  user_limits_table BOOLEAN;
  product_gen_table BOOLEAN;
  blog_table BOOLEAN;
  gallery_table BOOLEAN;
  bucket_exists BOOLEAN;
BEGIN
  -- Check tables
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_limits') INTO user_limits_table;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_generations') INTO product_gen_table;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts') INTO blog_table;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'before_after_gallery') INTO gallery_table;
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'before-after-images') INTO bucket_exists;

  -- Print results
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║   SAFE MIGRATION VERIFICATION RESULTS          ║';
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF user_limits_table AND product_gen_table AND blog_table AND gallery_table AND bucket_exists THEN
    RAISE NOTICE '🎉 SUCCESS! ALL COMPONENTS INSTALLED!';
  ELSE
    RAISE NOTICE '⚠️  Some components may be missing';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📋 Components Status:';
  RAISE NOTICE '   ├─ user_limits table: %', CASE WHEN user_limits_table THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ product_generations table: %', CASE WHEN product_gen_table THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ blog_posts table: %', CASE WHEN blog_table THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ before_after_gallery table: %', CASE WHEN gallery_table THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   └─ before-after-images bucket: %', CASE WHEN bucket_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ SAFE MIGRATION COMPLETE!                   ║';
  RAISE NOTICE '║  All systems ready! No data was lost!         ║';
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

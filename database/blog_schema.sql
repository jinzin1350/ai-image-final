-- Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  author VARCHAR(255) DEFAULT 'VIP Promo Club Team',
  category VARCHAR(100),
  tags TEXT[], -- Array of tags
  featured_image TEXT,
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  schema_markup JSONB,
  article_summary TEXT,
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

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published posts
CREATE POLICY "Public can view published blog posts"
  ON blog_posts
  FOR SELECT
  USING (published = true);

-- Policy: Authenticated users can view all posts (for admin)
CREATE POLICY "Authenticated users can view all blog posts"
  ON blog_posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can insert posts
CREATE POLICY "Authenticated users can insert blog posts"
  ON blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can update posts
CREATE POLICY "Authenticated users can update blog posts"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can delete posts
CREATE POLICY "Authenticated users can delete blog posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (true);

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

-- Insert sample blog post for testing
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
  'welcome-to-vip-promo-club-blog',
  'Welcome to VIP Promo Club Blog',
  'Learn about SMS marketing, customer loyalty, and business growth strategies for Canadian local businesses.',
  '<h2>Welcome to Our Blog!</h2><p>This is a sample blog post. Replace this with your actual content.</p><p>VIP Promo Club helps Canadian businesses build customer loyalty through SMS marketing.</p>',
  'VIP Promo Club Team',
  'Company News',
  ARRAY['SMS Marketing', 'Customer Loyalty', 'Business Growth'],
  'Welcome to VIP Promo Club Blog - SMS Marketing Insights',
  'Discover expert SMS marketing tips and customer loyalty strategies for Canadian local businesses.',
  true,
  NOW()
) ON CONFLICT (slug) DO NOTHING;

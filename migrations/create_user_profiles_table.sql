-- ================================================
-- Create user_profiles table
-- ================================================
-- Store user preferences and settings
-- ================================================

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  image_generation_model TEXT DEFAULT 'gemini-2-flash' CHECK (image_generation_model IN ('gemini-2-flash', 'nano-banana-2')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster model lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_model ON user_profiles(image_generation_model);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can do everything (using service role)
-- This will work when using supabaseAdmin client with service_role key

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Created user_profiles table';
    RAISE NOTICE '🔐 Enabled RLS with user and admin policies';
    RAISE NOTICE '🤖 Added image_generation_model column with default gemini-2-flash';
    RAISE NOTICE '📊 Created index for faster queries';
END $$;

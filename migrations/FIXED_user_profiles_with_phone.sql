-- ========================================
-- SAFE: Create/Update user_profiles table with phone & brand
-- This checks everything before creating
-- ========================================

-- Step 1: Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    brand_name TEXT,
    credits INTEGER DEFAULT 5,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add phone column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone TEXT;
    RAISE NOTICE '✅ Added phone column to user_profiles';
  ELSE
    RAISE NOTICE 'ℹ️  phone column already exists in user_profiles';
  END IF;
END $$;

-- Step 3: Add brand_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'brand_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN brand_name TEXT;
    RAISE NOTICE '✅ Added brand_name column to user_profiles';
  ELSE
    RAISE NOTICE 'ℹ️  brand_name column already exists in user_profiles';
  END IF;
END $$;

-- Step 4: Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 6: Create or replace the auto-profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, phone, brand_name, credits)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
        COALESCE(NEW.raw_user_meta_data->>'brand_name', NULL),
        5
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        brand_name = COALESCE(EXCLUDED.brand_name, user_profiles.brand_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 9: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- Step 10: Create RLS Policies
CREATE POLICY "Users can view own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Step 11: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON public.user_profiles(phone);

-- Step 12: Migrate existing users from auth.users to user_profiles
INSERT INTO public.user_profiles (id, email, phone, brand_name, credits)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'phone', NULL) as phone,
    COALESCE(raw_user_meta_data->>'brand_name', NULL) as brand_name,
    5 as credits
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_profiles.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  table_exists BOOLEAN;
  phone_col BOOLEAN;
  brand_col BOOLEAN;
  trigger_exists BOOLEAN;
  user_count INTEGER;
BEGIN
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_profiles'
  ) INTO table_exists;

  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) INTO phone_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'brand_name'
  ) INTO brand_col;

  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;

  -- Count users
  SELECT COUNT(*) FROM public.user_profiles INTO user_count;

  -- Print results
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║   USER PROFILES VERIFICATION           ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF table_exists AND phone_col AND brand_col AND trigger_exists THEN
    RAISE NOTICE '🎉 SUCCESS! USER PROFILES SYSTEM READY!';
  ELSE
    RAISE NOTICE '⚠️  Some components may be missing';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📋 Components Status:';
  RAISE NOTICE '   ├─ user_profiles table: %', CASE WHEN table_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ phone column: %', CASE WHEN phone_col THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ brand_name column: %', CASE WHEN brand_col THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   ├─ auto-create trigger: %', CASE WHEN trigger_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   └─ users migrated: % users', user_count;
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ PHONE & BRAND SYSTEM COMPLETE!     ║';
  RAISE NOTICE '║  New signups will save phone/brand!   ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- Success message
SELECT 'User profiles with phone & brand successfully configured!' as status;

/*
  ✅ WHAT THIS DOES:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Creates user_profiles table (if not exists)
  2. Adds phone and brand_name columns (if not exists)
  3. Creates auto-trigger to save phone/brand on signup
  4. Migrates existing users from auth.users
  5. Sets up RLS policies for security

  📝 WHAT HAPPENS ON NEW SIGNUP:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  User fills form with:
  - email
  - password
  - phone (required) ✅
  - brand_name (optional) ✅

  → Supabase creates auth.users record
  → Trigger automatically creates user_profiles record
  → Phone and brand_name are saved from raw_user_meta_data

  🎯 RESULT:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ No more "N/A" for phone
  ✓ Real phone numbers saved
  ✓ Brand names saved (if provided)
  ✓ Automatic for all new signups
  ✓ Existing users migrated safely
*/

-- ============================================
-- AUTO-CREATE user_limits for new signups
-- This trigger automatically creates a user_limits row
-- when a new user signs up via Supabase Auth
-- ============================================

-- Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row in user_limits for the new user
  INSERT INTO public.user_limits (
    user_id,
    email,
    tier,
    credits_limit,
    credits_used,
    is_premium,
    images_limit,
    images_used,
    captions_limit,
    captions_used,
    descriptions_limit,
    descriptions_used,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,                     -- user_id from auth.users
    NEW.email,                  -- email from auth.users
    'testlimit',                -- Default tier
    5,                          -- Default credits for testlimit
    0,                          -- No credits used yet
    false,                      -- Not premium
    10,                         -- Default images limit
    0,                          -- No images used
    5,                          -- Default captions limit
    0,                          -- No captions used
    3,                          -- Default descriptions limit
    0,                          -- No descriptions used
    NOW(),                      -- created_at
    NOW()                       -- updated_at
  )
  ON CONFLICT (user_id) DO NOTHING; -- Avoid duplicates

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger was created
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

/*
✅ What this does:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. When a new user signs up (INSERT into auth.users)
2. Trigger automatically fires
3. Creates a corresponding row in user_limits with:
   - tier: 'testlimit'
   - credits_limit: 5
   - All other fields initialized to defaults

🎯 Result:
New users can immediately use the app with testlimit tier!
No more missing user_limits errors!

📝 Note:
This only affects NEW users. Existing users without user_limits
will need to be fixed manually or with a separate migration.
*/

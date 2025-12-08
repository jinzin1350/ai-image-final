-- ============================================
-- FIX: Add user_limits for existing users who don't have it
-- Run this to fix users who signed up before the trigger was created
-- ============================================

-- Insert user_limits for all auth.users who don't have one
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
SELECT
  au.id as user_id,
  au.email,
  'testlimit' as tier,
  5 as credits_limit,
  0 as credits_used,
  false as is_premium,
  10 as images_limit,
  0 as images_used,
  5 as captions_limit,
  0 as captions_used,
  3 as descriptions_limit,
  0 as descriptions_used,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.user_limits ul ON au.id = ul.user_id
WHERE ul.user_id IS NULL;  -- Only users without user_limits

-- Show results
SELECT
  COUNT(*) as users_fixed,
  'Users who now have user_limits created' as description
FROM auth.users au
INNER JOIN public.user_limits ul ON au.id = ul.user_id
WHERE ul.created_at > NOW() - INTERVAL '1 minute';

/*
✅ What this does:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Finds all users in auth.users who DON'T have a user_limits row
2. Creates user_limits for them with testlimit tier (5 credits)
3. Shows how many users were fixed

🎯 Use this for:
- Fixing existing users who signed up before the trigger
- One-time migration to sync auth.users with user_limits

⚠️ Safe to run multiple times:
Uses LEFT JOIN to only insert missing users, won't create duplicates
*/

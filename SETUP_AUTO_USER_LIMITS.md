# Auto-Create User Limits for New Signups

## Problem
When new users sign up, they are created in `auth.users` but NOT in `user_limits` table. This causes errors when they try to use services.

## Solution
Database trigger that automatically creates `user_limits` row when a user signs up.

## Setup Instructions

### Step 1: Create the Trigger (For New Users)
Run this in Supabase SQL Editor:

```sql
-- Copy and paste the entire content of:
migrations/auto-create-user-limits.sql
```

This creates a trigger that runs automatically whenever a new user signs up.

### Step 2: Fix Existing Users (One-time)
Run this in Supabase SQL Editor:

```sql
-- Copy and paste the entire content of:
migrations/fix-existing-users-without-limits.sql
```

This creates `user_limits` for any existing users who don't have it.

### Step 3: Verify
Check that it's working:

```sql
-- Should show the trigger
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check users have limits
SELECT
  COUNT(*) as total_users,
  SUM(CASE WHEN ul.user_id IS NOT NULL THEN 1 ELSE 0 END) as users_with_limits,
  SUM(CASE WHEN ul.user_id IS NULL THEN 1 ELSE 0 END) as users_without_limits
FROM auth.users au
LEFT JOIN user_limits ul ON au.id = ul.user_id;
```

## What Happens After Setup

### For New Users:
1. User signs up → Row created in `auth.users`
2. Trigger fires automatically
3. Row created in `user_limits` with:
   - `tier`: testlimit
   - `credits_limit`: 5
   - `credits_used`: 0
4. User can immediately use services!

### For Existing Users:
- Fixed by the second migration
- All get testlimit tier with 5 credits
- Can be upgraded later by admin

## Default Values for New Users

```
tier: testlimit
credits_limit: 5
credits_used: 0
is_premium: false
images_limit: 10
images_used: 0
captions_limit: 5
captions_used: 0
descriptions_limit: 3
descriptions_used: 0
```

## Troubleshooting

### Problem: New users still getting errors
- Check if trigger exists (Step 3 verification query)
- Make sure you ran Step 1 in Supabase
- Check Supabase logs for trigger errors

### Problem: Existing users still can't access
- Run Step 2 again (safe to run multiple times)
- Or manually add them via admin panel at `/admin/users`

## Admin Panel Management

After setup, you can still manage users via:
- `/admin/users` - View and edit user tiers
- `/admin/tier-settings` - Configure tier credits
- `/admin/service-permissions` - Manage service access

Changing a user's tier in admin panel will update their `user_limits` row.

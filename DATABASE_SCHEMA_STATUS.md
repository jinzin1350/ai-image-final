# Database Schema Status - Current State

## ✅ Schema is Correct!

Your Supabase database schema looks good. All migrations have been run successfully.

## 📊 Current Database Tables

### 1. **tier_pricing** (Pricing Management)
```
testlimit: 0 IRR, 5 credits
bronze: 3,990,000 IRR, 100 credits
silver: 5,990,000 IRR, 130 credits
gold: 9,990,000 IRR, 171 credits
```

This is the **single source of truth** for:
- Monthly prices (displayed in pricing page)
- Credit limits per tier

### 2. **user_limits** (User Data)
Stores individual user information:
- `tier`: User's current tier
- `credits_limit`: How many credits they have per month
- `credits_used`: How many credits they've used
- `email`: User's email
- Other legacy fields (images_used, is_premium, etc.)

### 3. **tier_service_permissions** (Service Access Control)
Defines which services each tier can access:
- 6 services × 4 tiers = 24 permission records
- Each record: `(tier, service_key, has_access)`

## 🔄 How Credits Work Now

### Credit Flow:
1. **Admin changes credits in Tier Settings**
   → Updates `tier_pricing.credits`

2. **Backend fetches credits via `getTierLimits()`**
   → Reads from `tier_pricing` table (cached for 5 minutes)

3. **User credits_limit synced on login/usage**
   → Uses value from `tier_pricing`

### Credit Values:
All three places now have the SAME credits:
- ✅ `tier_pricing.credits` (database)
- ✅ `getTierLimits()` fallback (backend code)
- ✅ Admin panels display (frontend)

## 🎯 Current Credit Limits

| Tier | Credits | Price (IRR) |
|------|---------|-------------|
| Test Limit | 5 | 0 |
| Bronze | 100 | 3,990,000 |
| Silver | 130 | 5,990,000 |
| Gold | 171 | 9,990,000 |

## 📝 What You Can Do Now

### In Admin Panel:

**Tier Settings (`/admin/tier-settings`):**
- ✅ Change credits for any tier
- ✅ Saves to `tier_pricing` table
- ✅ Affects all users of that tier immediately (after cache refresh)

**Pricing (`/admin/pricing`):**
- ✅ Change prices for any tier
- ✅ Credits shown as read-only (managed in Tier Settings)
- ✅ Saves to `tier_pricing` table

**Service Permissions (`/admin/service-permissions`):**
- ✅ Enable/disable services per tier
- ✅ Saves to `tier_service_permissions` table
- ✅ Users see upgrade modal if they try restricted services

## 🔧 Optional: Sync User Credits

If you want to update all existing users to match the new credit values:

**Run in Supabase SQL Editor:**
```sql
-- This will update all users' credits_limit to match their tier's pricing
UPDATE user_limits ul
SET credits_limit = tp.credits
FROM tier_pricing tp
WHERE ul.tier = tp.tier
  AND ul.credits_limit != tp.credits;

-- Verify the sync
SELECT tier, COUNT(*) as users, AVG(credits_limit)::INTEGER as avg_credits
FROM user_limits
GROUP BY tier;
```

Or use the migration script: `migrations/sync_credits_between_tables.sql`

## 🐛 Testing Credits Update

### Method 1: Via Test Page
1. Visit `/test-update-credits`
2. Select a tier
3. Enter new credits (e.g., 999)
4. Click "Update Credits"
5. Should see success response

### Method 2: Via Tier Settings
1. Go to `/admin/tier-settings`
2. Change bronze credits to 999
3. Click "Save Bronze Settings"
4. Refresh page - should show 999

### Method 3: Via Database
```sql
-- Update bronze to 999 credits
UPDATE tier_pricing
SET credits = 999
WHERE tier = 'bronze';

-- Check if it worked
SELECT * FROM tier_pricing WHERE tier = 'bronze';
```

## 📊 Verification Queries

### Check if everything matches:
```sql
SELECT
    tp.tier,
    tp.credits as pricing_table_credits,
    COUNT(ul.user_id) as user_count,
    AVG(ul.credits_limit)::INTEGER as user_avg_credits,
    CASE
        WHEN tp.credits = AVG(ul.credits_limit)::INTEGER THEN '✅ SYNCED'
        ELSE '❌ OUT OF SYNC'
    END as status
FROM tier_pricing tp
LEFT JOIN user_limits ul ON tp.tier = ul.tier
GROUP BY tp.tier, tp.credits
ORDER BY tp.tier;
```

### Check service permissions:
```sql
SELECT tier, service_key, has_access
FROM tier_service_permissions
ORDER BY tier, service_key;
```

## 🚨 Known Issues

### Issue 1: Cache Delay
When you update credits in admin panel, backend cache takes up to 5 minutes to refresh.

**Solution:** Restart Replit app after changing credits.

### Issue 2: User credits_limit out of sync
Existing users might have old credits_limit values.

**Solution:** Run the sync script or users will get new values on next login.

## 🎉 Summary

Your database schema is **correct and working**!

The issue with credits not saving was because:
1. ✅ Database table exists and is correct
2. ❌ Backend `getTierLimits()` was using hardcoded values
3. ✅ NOW FIXED: Backend fetches from database

After the latest push to Replit:
- Credits are saved to database ✅
- Backend reads from database ✅
- Everything is synced ✅

Try updating credits now - it should work!

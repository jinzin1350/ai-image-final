# 🔧 Fix Permission Check Error

## Problem

You're seeing this error in console:
```
Error checking permission: {
  code: 'PGRST116',
  details: 'The result contains 0 rows',
  message: 'Cannot coerce the result to a single JSON object'
}
```

## What This Means

The user's tier (e.g., 'bronze') doesn't have permission records in the database. When the system tries to check if they can access a service, it finds nothing.

---

## Quick Fix (Choose One)

### Option 1: Use Admin Panel (Easiest!)

1. Pull latest code: `git pull origin main`
2. Restart Replit server
3. Go to `/admin/service-permissions`
4. The page will load with toggle switches
5. Toggle any switch once (enable/disable)
6. This will create the missing records in database
7. Done! ✅

### Option 2: Run SQL Sync Script

1. Open Supabase SQL Editor
2. Copy contents of `sync_all_permissions.sql`
3. Paste and click **Run**
4. You'll see a complete permission matrix
5. Done! ✅

---

## What Got Fixed in Code

Changed in `index.js` line 5121:
```javascript
// Before (causes error when no record found)
.single();

// After (returns null when no record found)
.maybeSingle();
```

Now the system defaults to `hasAccess = false` when no record exists, instead of crashing.

---

## Verify It's Fixed

### Method 1: Check Logs
After pulling and restarting, you should NOT see the error anymore.

### Method 2: Check Database
```sql
-- Should return 24 rows (4 tiers × 6 services)
SELECT COUNT(*) FROM tier_service_permissions;

-- Should show complete matrix
SELECT
    service_key,
    MAX(CASE WHEN tier = 'testlimit' THEN CASE WHEN has_access THEN '✅' ELSE '❌' END END) as testlimit,
    MAX(CASE WHEN tier = 'bronze' THEN CASE WHEN has_access THEN '✅' ELSE '❌' END END) as bronze,
    MAX(CASE WHEN tier = 'silver' THEN CASE WHEN has_access THEN '✅' ELSE '❌' END END) as silver,
    MAX(CASE WHEN tier = 'gold' THEN CASE WHEN has_access THEN '✅' ELSE '❌' END END) as gold
FROM tier_service_permissions
GROUP BY service_key
ORDER BY service_key;
```

Expected result:
| service_key | testlimit | bronze | silver | gold |
|-------------|-----------|--------|--------|------|
| accessories-only | ❌ | ❌ | ✅ | ✅ |
| color-collection | ❌ | ❌ | ✅ | ✅ |
| complete-outfit | ✅ | ✅ | ✅ | ✅ |
| flat-lay | ❌ | ❌ | ✅ | ✅ |
| scene-recreation | ❌ | ❌ | ❌ | ✅ |
| style-transfer | ❌ | ❌ | ❌ | ✅ |

### Method 3: Test as User
1. Login as a user
2. Go to home page
3. Click on different services
4. Should see upgrade modal for restricted services
5. Should navigate normally for allowed services

---

## Steps to Deploy Fix

```bash
# 1. On Replit, pull latest code
git pull origin main

# 2. Server will auto-restart

# 3. Run sync script in Supabase (if needed)
# Copy sync_all_permissions.sql content and run in SQL Editor

# 4. Test!
```

---

## Default Permissions Setup

After sync, this is what each tier gets:

**testlimit (5 credits):**
- ✅ complete-outfit
- ❌ All others

**bronze (50 credits):**
- ✅ complete-outfit
- ❌ All others

**silver (100 credits):**
- ✅ complete-outfit
- ✅ accessories-only
- ✅ color-collection
- ✅ flat-lay
- ❌ scene-recreation
- ❌ style-transfer

**gold (130 credits):**
- ✅ All services

You can change these in `/admin/service-permissions`!

---

## Troubleshooting

**Still seeing error after pulling?**
→ Make sure server restarted (should see "Connected" in logs)

**Admin panel showing empty?**
→ Run `sync_all_permissions.sql` in Supabase

**Changes not saving?**
→ Check admin credentials in `.env` file

**User can access service they shouldn't?**
→ Check their tier in database and the permissions for that tier

---

You're all set! The error should be gone now. 🎉

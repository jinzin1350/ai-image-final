# 🔍 How to Check User Permissions

## Quick Check in Supabase

### Method 1: Check User's Tier and Permissions

```sql
-- 1. First, find the user's tier
SELECT email, tier, credits_limit, credits_used
FROM user_limits
WHERE email = 'engi.alireza@gmail.com';

-- 2. Then check what permissions that tier has
SELECT
    tier,
    service_key,
    has_access,
    CASE WHEN has_access = true THEN '✅' ELSE '❌' END as status
FROM tier_service_permissions
WHERE tier = 'testlimit'  -- Change this to the user's tier from step 1
ORDER BY service_key;
```

### Method 2: Check One User's All Permissions

```sql
SELECT
    ul.email,
    ul.tier,
    tsp.service_key,
    tsp.has_access,
    CASE WHEN tsp.has_access = true THEN '✅ YES' ELSE '❌ NO' END as can_access
FROM user_limits ul
LEFT JOIN tier_service_permissions tsp ON ul.tier = tsp.tier
WHERE ul.email = 'engi.alireza@gmail.com'
ORDER BY tsp.service_key;
```

### Method 3: Check Style Transfer Access for All Tiers

```sql
SELECT
    tier,
    has_access as style_transfer_enabled,
    CASE WHEN has_access = true THEN '✅ Enabled' ELSE '❌ Disabled' END as status
FROM tier_service_permissions
WHERE service_key = 'style-transfer'
ORDER BY
    CASE tier
        WHEN 'testlimit' THEN 1
        WHEN 'bronze' THEN 2
        WHEN 'silver' THEN 3
        WHEN 'gold' THEN 4
    END;
```

---

## 🔧 How to Fix Permissions

### Give Style Transfer Access to All Tiers

```sql
UPDATE tier_service_permissions
SET has_access = true, updated_at = NOW()
WHERE service_key = 'style-transfer';
```

### Give Style Transfer Access to Specific Tier

```sql
-- For testlimit only
UPDATE tier_service_permissions
SET has_access = true, updated_at = NOW()
WHERE service_key = 'style-transfer' AND tier = 'testlimit';

-- For gold only
UPDATE tier_service_permissions
SET has_access = true, updated_at = NOW()
WHERE service_key = 'style-transfer' AND tier = 'gold';

-- For silver and gold
UPDATE tier_service_permissions
SET has_access = true, updated_at = NOW()
WHERE service_key = 'style-transfer' AND tier IN ('silver', 'gold');
```

### Give All Services to One Tier

```sql
-- Give all services to gold tier
UPDATE tier_service_permissions
SET has_access = true, updated_at = NOW()
WHERE tier = 'gold';

-- Give all services to testlimit (for testing)
UPDATE tier_service_permissions
SET has_access = true, updated_at = NOW()
WHERE tier = 'testlimit';
```

### Remove Access

```sql
-- Remove style-transfer from testlimit
UPDATE tier_service_permissions
SET has_access = false, updated_at = NOW()
WHERE service_key = 'style-transfer' AND tier = 'testlimit';
```

---

## 🎯 Quick Fix for Your User

### Problem: User `engi.alireza@gmail.com` can access style-transfer but shouldn't

**Step 1: Check their tier**
```sql
SELECT email, tier FROM user_limits WHERE email = 'engi.alireza@gmail.com';
```

**Step 2: Remove access for that tier**
```sql
-- If they are testlimit:
UPDATE tier_service_permissions
SET has_access = false, updated_at = NOW()
WHERE service_key = 'style-transfer' AND tier = 'testlimit';

-- If they are bronze:
UPDATE tier_service_permissions
SET has_access = false, updated_at = NOW()
WHERE service_key = 'style-transfer' AND tier = 'bronze';
```

**Step 3: Verify**
```sql
SELECT
    ul.email,
    ul.tier,
    tsp.has_access as style_transfer_access
FROM user_limits ul
LEFT JOIN tier_service_permissions tsp ON ul.tier = tsp.tier
WHERE ul.email = 'engi.alireza@gmail.com'
    AND tsp.service_key = 'style-transfer';
```

---

## 📊 View All Permissions Matrix

```sql
SELECT
    tsp.service_key,
    MAX(CASE WHEN tsp.tier = 'testlimit' THEN
        CASE WHEN tsp.has_access THEN '✅' ELSE '❌' END
    END) as testlimit,
    MAX(CASE WHEN tsp.tier = 'bronze' THEN
        CASE WHEN tsp.has_access THEN '✅' ELSE '❌' END
    END) as bronze,
    MAX(CASE WHEN tsp.tier = 'silver' THEN
        CASE WHEN tsp.has_access THEN '✅' ELSE '❌' END
    END) as silver,
    MAX(CASE WHEN tsp.tier = 'gold' THEN
        CASE WHEN tsp.has_access THEN '✅' ELSE '❌' END
    END) as gold
FROM tier_service_permissions tsp
GROUP BY tsp.service_key
ORDER BY tsp.service_key;
```

This will show you a nice table like:

| service_key | testlimit | bronze | silver | gold |
|-------------|-----------|--------|--------|------|
| complete-outfit | ✅ | ✅ | ✅ | ✅ |
| accessories-only | ❌ | ❌ | ✅ | ✅ |
| style-transfer | ❌ | ❌ | ❌ | ✅ |

---

## 🚀 Using Admin Panel (Easier!)

Instead of SQL, you can use the admin panel:

1. Go to `/admin/service-permissions`
2. Login with admin credentials
3. Toggle switches for each tier/service
4. Changes save automatically!

This is much easier than running SQL queries! 😊

---

## 🔍 Using API to Check (For Testing)

```bash
# Check if user has access to style-transfer
curl -X GET "http://localhost:5000/api/check-service-access/style-transfer" \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"

# Response will show:
# {
#   "success": true,
#   "hasAccess": false,
#   "userTier": "testlimit",
#   "serviceKey": "style-transfer",
#   "requiredTiers": ["gold"]
# }
```

---

## 📝 Files Included

- `check_user_permissions.sql` - Complete queries to check user permissions
- `check_specific_user.sql` - Quick check for one user
- `fix_style_transfer_permission.sql` - Quick fixes for style-transfer access

Just copy-paste these queries into Supabase SQL Editor!

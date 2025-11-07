# Troubleshooting Credits Not Saving

## Problem
Credits are not being saved to the database when you click "Save" in the Tier Settings page.

## Diagnosis Steps

### Step 1: Check if Database Migration Was Run

**Go to Supabase SQL Editor and run:**

```sql
-- Check if tier_pricing table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'tier_pricing'
) as table_exists;
```

**If result is `false`:**
- ❌ The table doesn't exist
- ✅ **Solution:** Run `migrations/pricing_table.sql` in Supabase SQL Editor

**If result is `true`:**
- ✅ Table exists, proceed to Step 2

---

### Step 2: Verify Table Structure

**Run in Supabase SQL Editor:**

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tier_pricing'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (bigint)
- tier (text)
- price (integer)
- credits (integer)
- currency (text)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)

---

### Step 3: Check Current Data

**Run in Supabase SQL Editor:**

```sql
SELECT tier, price, credits, is_active
FROM tier_pricing
ORDER BY tier;
```

**Expected 4 rows:**
- testlimit: 0 price, 5 credits
- bronze: 199000 price, 50 credits
- silver: 399000 price, 100 credits
- gold: 599000 price, 130 credits

**If no rows exist:**
- ❌ Data wasn't inserted
- ✅ **Solution:** Run the INSERT section from `migrations/pricing_table.sql`

---

### Step 4: Test API Directly

1. Go to Replit → Visit `/test-update-credits`
2. Login to admin panel first at `/admin/dashboard`
3. Click "Get All Pricing" - Should show all 4 tiers
4. Select a tier, enter new credits (e.g., 999)
5. Click "Update Credits"

**If you see error:**
- Check browser console for details
- Check Replit logs for backend errors

**If it works but doesn't persist:**
- Proceed to Step 5

---

### Step 5: Check Row Level Security (RLS)

**Run in Supabase SQL Editor:**

```sql
-- Check if RLS is blocking updates
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'tier_pricing';
```

**Expected policies:**
1. "Anyone can view pricing" - SELECT for anon, authenticated
2. "Service role can manage pricing" - ALL for service_role

**If service_role policy is missing:**
- ❌ Service role can't update the table
- ✅ **Solution:** Run this:

```sql
CREATE POLICY "Service role can manage pricing"
ON tier_pricing FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### Step 6: Test Manual Update

**Run in Supabase SQL Editor:**

```sql
-- Try to manually update credits
UPDATE tier_pricing
SET credits = 999, updated_at = NOW()
WHERE tier = 'bronze';

-- Check if it worked
SELECT tier, credits FROM tier_pricing WHERE tier = 'bronze';
```

**If this fails:**
- ❌ Database permissions issue
- Check your Supabase service role key is correct in `.env`

**If this works:**
- ✅ Database is fine, issue is in the API

---

### Step 7: Check Backend Logs

In Replit, when you save credits, check the logs for:

```
✅ Updated pricing: bronze - 3990000 IRR, 999 credits
```

**If you see this log:**
- ✅ Backend received and processed the update
- Issue might be with how data is reloaded in frontend

**If you don't see this log:**
- ❌ Request isn't reaching the backend
- Check browser Network tab for failed requests

---

## Common Solutions

### Solution 1: Database Migration Not Run

```bash
# In Supabase SQL Editor, copy and run:
migrations/pricing_table.sql
```

### Solution 2: Service Role Key Issue

Check `.env` file in Replit:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-actual-key
```

Should be the **service_role** key, not the **anon** key!

### Solution 3: Clear Cache and Reload

After saving credits:
1. Hard refresh the page (Ctrl+Shift+R)
2. Check if credits updated

### Solution 4: Check API Response

Open browser DevTools → Network tab:
1. Save credits
2. Find the PUT request to `/api/admin/pricing/bronze`
3. Check Response shows updated credits
4. If response shows old credits, backend didn't update

---

## Quick Test Script

Run this in Supabase SQL Editor:

```sql
-- Full diagnostic
\copy (
  SELECT
    'Table exists: ' || (
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'tier_pricing'
      ) THEN 'YES ✅' ELSE 'NO ❌' END
    ) as check1
) TO STDOUT;

-- Count rows
SELECT 'Row count: ' || COUNT(*) || ' (should be 4)' as check2
FROM tier_pricing;

-- Check bronze credits
SELECT 'Bronze credits: ' || credits as check3
FROM tier_pricing WHERE tier = 'bronze';

-- Try update
UPDATE tier_pricing SET credits = 51 WHERE tier = 'bronze';

-- Verify update
SELECT 'Updated bronze credits: ' || credits as check4
FROM tier_pricing WHERE tier = 'bronze';
```

If all checks pass, the database is working correctly and the issue is in the frontend or API.

---

## Still Not Working?

1. **Check Supabase Dashboard** → Table Editor → tier_pricing
   - Manually change a value
   - Does it persist?

2. **Check Replit Environment**
   - Is `SUPABASE_SERVICE_ROLE_KEY` set?
   - Restart the Replit app

3. **Check Browser Console**
   - Any JavaScript errors?
   - Any failed network requests?

4. **Try the test page**
   - Visit `/test-update-credits`
   - Try direct update
   - Check results

---

## Need More Help?

Provide these details:
1. Result of Step 1 (table exists?)
2. Result of Step 3 (current data)
3. Result of Step 6 (manual update)
4. Browser console errors
5. Replit backend logs when saving

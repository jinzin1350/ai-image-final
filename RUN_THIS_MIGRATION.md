# ⚠️ IMPORTANT: Run This Migration First!

## The Problem
You're getting a 500 error when trying to update users in the admin panel because the database doesn't have the new `tier` and `credits` columns yet.

## The Solution
Run the migration SQL file to add these columns to your database.

---

## Step-by-Step Instructions:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open this file: `migrations/add-tier-system.sql`
6. Copy ALL the contents
7. Paste into the SQL Editor
8. Click **Run** button (bottom right)
9. Wait for "Success. No rows returned" message

### Option 2: Using Command Line (Advanced)

If you have `psql` installed:

```bash
# Get your database connection string from Supabase Dashboard > Settings > Database
# It looks like: postgres://postgres:[password]@[host]:5432/postgres

psql "your-connection-string-here" -f migrations/add-tier-system.sql
```

---

## What This Migration Does:

1. ✅ Adds `tier` column (bronze/silver/gold) to `user_limits` table
2. ✅ Adds `credits_limit` and `credits_used` columns
3. ✅ Creates `product_generations` table for tracking caption/description usage
4. ✅ Migrates existing data (premium users → gold, free users → bronze)
5. ✅ Updates the trigger for new user signup

---

## After Running the Migration:

1. Refresh your admin panel page
2. Try changing a user's tier again
3. It should work without errors! ✅

---

## Verification:

To verify the migration worked, run this query in SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_limits';
```

You should see columns like:
- `tier` (text)
- `credits_limit` (integer)
- `credits_used` (integer)

---

## Still Getting Errors?

If you still get errors after running the migration:

1. Check the browser console for the exact error message
2. Check your server logs
3. Make sure Supabase is properly configured in your `.env` file:
   ```
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

---

**IMPORTANT**: You MUST run this migration before the tier system will work!

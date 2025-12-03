# Troubleshooting: Phone Number Migration

## Common Errors and Solutions

### ❌ Error 1: Foreign Key Constraint Violation

**Error Message:**
```
ERROR: 23503: insert or update on table "generated_images"
violates foreign key constraint "generated_images_user_id_fkey"
DETAIL: Key (user_id)=(xxx-xxx-xxx) is not present in table "users".
```

**Cause:**
You're trying to insert a `user_id` that doesn't exist in the `auth.users` table.

**Solution:**
Use a real user ID from your database:

```sql
-- Step 1: Find a real user ID
SELECT id, email FROM auth.users LIMIT 5;

-- Step 2: Use that real ID in your insert
INSERT INTO generated_images (user_id, user_email, user_phone, ...)
VALUES (
  'COPY_REAL_UUID_HERE'::UUID,  -- ← Use actual UUID from step 1
  'email@example.com',
  '+1234567890',
  ...
);
```

**Or use the safe test script:**
```bash
# Run the automated safe test
# File: TEST_PHONE_TRACKING.sql
```

---

### ❌ Error 2: Column Already Exists

**Error Message:**
```
ERROR: column "user_phone" of relation "generated_images" already exists
```

**Cause:**
You already ran the migration before.

**Solution:**
This is actually fine! The migration uses `IF NOT EXISTS` so it's safe to run multiple times. The error can be ignored, or you can verify the column exists:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'generated_images'
  AND column_name = 'user_phone';
```

---

### ❌ Error 3: Permission Denied

**Error Message:**
```
ERROR: permission denied for table generated_images
```

**Cause:**
You don't have admin/service role permissions.

**Solution:**
1. Make sure you're logged into Supabase Dashboard
2. Use the SQL Editor (not the API)
3. Check you have the correct project selected
4. If using API, use the service role key, not anon key

---

### ❌ Error 4: Table Does Not Exist

**Error Message:**
```
ERROR: relation "generated_images" does not exist
```

**Cause:**
The `generated_images` table hasn't been created yet.

**Solution:**
Run the complete schema setup first:

```sql
-- Run this first to create tables
-- File: supabase-complete-schema.sql
-- OR: COMPLETE_DATABASE_SCHEMA.sql
```

Then run the phone migrations.

---

### ❌ Error 5: Index Already Exists

**Error Message:**
```
ERROR: relation "idx_generated_images_user_phone" already exists
```

**Cause:**
The index was already created from a previous migration run.

**Solution:**
Safe to ignore! The index exists and is working. Or you can verify:

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname = 'idx_generated_images_user_phone';
```

---

## Verification Checklist

### ✅ Check 1: Columns Exist
```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('generated_images', 'user_limits')
  AND column_name LIKE '%phone%';
```

Expected output:
```
generated_images | user_phone     | text | YES
user_limits      | phone_number   | text | YES
```

### ✅ Check 2: Indexes Exist
```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_generated_images_user_phone',
  'idx_user_limits_phone_number'
);
```

Expected: 2 rows returned

### ✅ Check 3: Can Insert Data
```sql
-- This uses the automated safe test
-- Run: TEST_PHONE_TRACKING.sql
```

Should complete without errors.

### ✅ Check 4: Can Query by Phone
```sql
SELECT COUNT(*) FROM generated_images WHERE user_phone IS NOT NULL;
```

Should return a number (even if 0).

---

## Migration Rollback

If you need to completely remove the phone fields:

```sql
-- Remove phone from generated_images
ALTER TABLE generated_images DROP COLUMN IF EXISTS user_phone CASCADE;
DROP INDEX IF EXISTS idx_generated_images_user_phone;

-- Remove phone from user_limits
ALTER TABLE user_limits DROP COLUMN IF EXISTS phone_number CASCADE;
DROP INDEX IF EXISTS idx_user_limits_phone_number;

-- Verify removal
SELECT column_name
FROM information_schema.columns
WHERE table_name IN ('generated_images', 'user_limits')
  AND column_name LIKE '%phone%';
-- Should return 0 rows
```

---

## Still Having Issues?

### Debug Steps:

1. **Check Supabase connection:**
```sql
SELECT current_database(), current_user;
```

2. **Check table permissions:**
```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'generated_images';
```

3. **Check foreign key constraints:**
```sql
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid = 'generated_images'::regclass;
```

4. **List all columns in generated_images:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'generated_images'
ORDER BY ordinal_position;
```

---

## Quick Fix Commands

### Reset and Re-run Migration:
```sql
-- 1. Drop phone columns if they exist (with errors)
DO $$
BEGIN
  ALTER TABLE generated_images DROP COLUMN IF EXISTS user_phone;
  ALTER TABLE user_limits DROP COLUMN IF EXISTS phone_number;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Columns may not exist yet: %', SQLERRM;
END $$;

-- 2. Drop indexes if they exist
DROP INDEX IF EXISTS idx_generated_images_user_phone;
DROP INDEX IF EXISTS idx_user_limits_phone_number;

-- 3. Re-run the migrations fresh
-- Run: migrations/add_phone_number_to_generated_images.sql
-- Run: migrations/add_phone_number_to_user_limits.sql
```

---

## Contact Info for Debugging

If you're stuck, provide this info:

1. **Error message** (full text)
2. **SQL query** you ran
3. **Output of verification check:**
```sql
SELECT
  table_name,
  column_name
FROM information_schema.columns
WHERE table_name IN ('generated_images', 'user_limits', 'auth.users')
ORDER BY table_name, ordinal_position;
```

4. **Supabase version** (check dashboard)

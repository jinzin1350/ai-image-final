# Quick Start: Add Phone Tracking to Garment Uploads

## What You Want
Track **email and phone number** of users who upload garment images in Supabase Storage.

## What I Created For You

### ✅ Migration Files (Ready to Run)
1. `migrations/add_phone_number_to_generated_images.sql` - Adds phone to images table
2. `migrations/add_phone_number_to_user_limits.sql` - Adds phone to user limits table
3. `migrations/README_PHONE_NUMBER_MIGRATION.md` - Detailed instructions

### ✅ Documentation Files
1. `PHONE_EMAIL_TRACKING_SUMMARY.md` - Complete implementation guide
2. `database_phone_tracking.txt` - Visual architecture diagram
3. `QUICK_START_PHONE_TRACKING.md` - This file

## 3-Step Quick Start

### Step 1: Run Migrations in Supabase (5 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste this first migration:

```sql
-- From: migrations/add_phone_number_to_generated_images.sql
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS user_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_generated_images_user_phone
ON generated_images(user_phone);
```

3. Click **Run** ✅

4. Copy and paste this second migration:

```sql
-- From: migrations/add_phone_number_to_user_limits.sql
ALTER TABLE user_limits
ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE INDEX IF NOT EXISTS idx_user_limits_phone_number
ON user_limits(phone_number);
```

5. Click **Run** ✅

### Step 2: Verify It Worked (1 minute)

Run this verification query:

```sql
-- Check columns exist
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('generated_images', 'user_limits')
  AND column_name LIKE '%phone%';
```

Expected output:
```
generated_images | user_phone     | text
user_limits      | phone_number   | text
```

### Step 3: Update Your Backend Code (10 minutes)

Find where you save generated images in `index.js` and add phone:

**BEFORE:**
```javascript
const { data, error } = await supabase
  .from('generated_images')
  .insert({
    user_id: userId,
    user_email: userEmail,
    garment_path: garmentPath,
    generated_image_url: imageUrl
  });
```

**AFTER:**
```javascript
const { data, error } = await supabase
  .from('generated_images')
  .insert({
    user_id: userId,
    user_email: userEmail,
    user_phone: userPhone,  // ✨ ADD THIS LINE
    garment_path: garmentPath,
    generated_image_url: imageUrl
  });
```

## Done! 🎉

Now when users upload garments:
- ✅ Email is saved to `generated_images.user_email`
- ✅ Phone is saved to `generated_images.user_phone`
- ✅ You can search by phone number
- ✅ You can track who uploaded what

## Query Examples

### Find all uploads by phone number:
```sql
SELECT * FROM generated_images
WHERE user_phone = '+1234567890';
```

### Find all uploads by email:
```sql
SELECT * FROM generated_images
WHERE user_email = 'user@example.com';
```

### Get user stats:
```sql
SELECT
  user_email,
  user_phone,
  COUNT(*) as total_uploads,
  MAX(created_at) as last_upload
FROM generated_images
WHERE user_phone IS NOT NULL
GROUP BY user_email, user_phone
ORDER BY total_uploads DESC;
```

## Testing the Migration

After running migrations, test with the safe test script:

**Use the automated test file:** `TEST_PHONE_TRACKING.sql`

This script will:
1. Find a real user from `auth.users` table
2. Insert test data with phone number
3. Verify the phone field is working

**Important:** Don't try to insert with random UUID! The `user_id` has a foreign key constraint and must exist in `auth.users` table.

## Need More Details?

- **Complete Guide:** `PHONE_EMAIL_TRACKING_SUMMARY.md`
- **Architecture Diagram:** `database_phone_tracking.txt`
- **Migration Details:** `migrations/README_PHONE_NUMBER_MIGRATION.md`
- **Test Script:** `TEST_PHONE_TRACKING.sql` ← Safe testing queries

## Rollback (If Needed)

If something goes wrong, you can remove the fields:

```sql
ALTER TABLE generated_images DROP COLUMN IF EXISTS user_phone;
ALTER TABLE user_limits DROP COLUMN IF EXISTS phone_number;
```

## Support

If you get stuck, check:
1. Supabase logs for error messages
2. Make sure tables exist: `generated_images`, `user_limits`
3. Verify you have admin access to run migrations

# Phone Number Field Migration

## Overview
This migration adds phone number tracking to your database so you can identify users who upload garment images and generate AI photos.

## What Gets Added

### 1. `generated_images` Table
- **New Field:** `user_phone` (TEXT)
- **Purpose:** Track phone number of users who generated images
- **Indexed:** Yes, for fast lookups

### 2. `user_limits` Table
- **New Field:** `phone_number` (TEXT)
- **Purpose:** Store user contact phone number in their profile
- **Indexed:** Yes, for fast lookups

## Migration Files

1. `add_phone_number_to_generated_images.sql` - Adds phone to generated_images table
2. `add_phone_number_to_user_limits.sql` - Adds phone to user_limits table

## How to Run (Option 1: Supabase Dashboard)

### Step 1: Run First Migration
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste contents of `migrations/add_phone_number_to_generated_images.sql`
5. Click **Run** button
6. You should see success messages like:
   ```
   ✅ user_phone column added successfully
   ✅ Phone number index created successfully
   🎉 Migration completed successfully!
   ```

### Step 2: Run Second Migration
1. In SQL Editor, click **New Query** again
2. Copy and paste contents of `migrations/add_phone_number_to_user_limits.sql`
3. Click **Run** button
4. You should see success messages like:
   ```
   ✅ phone_number column added successfully
   ✅ Phone number index created successfully
   🎉 Migration completed successfully!
   ```

## How to Run (Option 2: Using Migration Script)

```bash
# Run migration for generated_images table
node run-migration.js migrations/add_phone_number_to_generated_images.sql

# Run migration for user_limits table
node run-migration.js migrations/add_phone_number_to_user_limits.sql
```

## Verification

After running migrations, verify they worked:

```sql
-- Check generated_images table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'generated_images'
  AND column_name IN ('user_email', 'user_phone');

-- Check user_limits table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_limits'
  AND column_name IN ('email', 'phone_number');
```

You should see:
```
generated_images:
  - user_email  | text
  - user_phone  | text

user_limits:
  - email        | text
  - phone_number | text
```

## Backend Code Updates Needed

After running migrations, you need to update your `index.js` to save phone numbers:

### Example: When saving generated image
```javascript
// When saving a generated image
const { data, error } = await supabase
  .from('generated_images')
  .insert({
    user_id: userId,
    user_email: userEmail,
    user_phone: userPhone,  // ✨ NEW FIELD
    garment_path: garmentPath,
    generated_image_url: imageUrl,
    // ... other fields
  });
```

### Example: When updating user limits
```javascript
// When creating/updating user profile
const { data, error } = await supabase
  .from('user_limits')
  .update({
    email: email,
    phone_number: phoneNumber  // ✨ NEW FIELD
  })
  .eq('user_id', userId);
```

## Rollback (If Needed)

If you need to remove the phone number fields:

```sql
-- Remove from generated_images
ALTER TABLE generated_images DROP COLUMN IF EXISTS user_phone;
DROP INDEX IF EXISTS idx_generated_images_user_phone;

-- Remove from user_limits
ALTER TABLE user_limits DROP COLUMN IF EXISTS phone_number;
DROP INDEX IF EXISTS idx_user_limits_phone_number;
```

## Questions?

- Email and phone number are both **optional** (can be NULL)
- Phone numbers are stored as TEXT (no validation at database level)
- You can add validation in your backend code
- Indexes ensure fast searches by phone number

## Next Steps

1. ✅ Run both migration files
2. ✅ Verify columns exist
3. ✅ Update backend code to save phone numbers
4. ✅ Update frontend forms to collect phone numbers
5. ✅ Test uploading garments with phone number

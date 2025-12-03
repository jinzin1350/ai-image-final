# Phone & Email Tracking for Garment Uploads - Complete Summary

## Current Database Structure

You have **3 tables** that can store user contact information:

### 1. `user_profiles` Table ✅ (Already Has Phone)
- **Status:** Already configured with phone support
- **Fields:**
  - `email` (TEXT) - User email
  - `phone` (TEXT) - User phone number
  - `brand_name` (TEXT) - Optional brand name
  - `credits` (INTEGER) - User credits
- **Migration File:** `migrations/FIXED_user_profiles_with_phone.sql` (already exists)

### 2. `user_limits` Table (Needs Phone)
- **Status:** Has email, needs phone
- **Current Fields:**
  - `user_id` (UUID)
  - `email` (TEXT)
  - `tier` (TEXT)
  - `credits_limit` (INTEGER)
- **NEW Field to Add:**
  - `phone_number` (TEXT) ← Need to add this
- **Migration File:** `migrations/add_phone_number_to_user_limits.sql` ✅ Created

### 3. `generated_images` Table (Needs Phone)
- **Status:** Has email, needs phone
- **Current Fields:**
  - `user_id` (UUID)
  - `user_email` (TEXT)
  - `garment_path` (TEXT) - Path to uploaded garment
  - `generated_image_url` (TEXT)
- **NEW Field to Add:**
  - `user_phone` (TEXT) ← Need to add this
- **Migration File:** `migrations/add_phone_number_to_generated_images.sql` ✅ Created

---

## Storage Structure

### Supabase Storage Buckets

1. **`garments` bucket**
   - Stores user-uploaded garment images
   - Public access enabled
   - Path format: `/user_id/timestamp_filename.jpg`

2. **`admin-content` bucket**
   - Stores admin-uploaded models and backgrounds
   - Used by content_library table

---

## Migration Plan

### Step 1: Run Migrations in Supabase

Go to **Supabase Dashboard → SQL Editor** and run these in order:

#### Migration 1: Add phone to `generated_images`
```bash
File: migrations/add_phone_number_to_generated_images.sql
```

Run this SQL to add `user_phone` field to track phone numbers for each generated image.

#### Migration 2: Add phone to `user_limits`
```bash
File: migrations/add_phone_number_to_user_limits.sql
```

Run this SQL to add `phone_number` field to user limits/profile table.

### Step 2: Verify Migrations

After running both migrations, verify:

```sql
-- Check generated_images has phone field
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'generated_images'
  AND column_name IN ('user_email', 'user_phone');

-- Check user_limits has phone field
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_limits'
  AND column_name IN ('email', 'phone_number');

-- Check user_profiles has phone field (should already exist)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('email', 'phone');
```

Expected results:
```
✅ generated_images.user_email (text)
✅ generated_images.user_phone (text)
✅ user_limits.email (text)
✅ user_limits.phone_number (text)
✅ user_profiles.email (text)
✅ user_profiles.phone (text)
```

---

## Backend Code Updates (index.js)

After running migrations, update your backend to save phone numbers:

### Example 1: When user uploads garment and generates image

```javascript
// Save generated image with phone number
app.post('/api/generate-image', async (req, res) => {
  const { userId, userEmail, userPhone, garmentPath } = req.body;

  // Generate image using AI...
  const generatedImageUrl = await generateImage(...);

  // Save to database with phone number
  const { data, error } = await supabase
    .from('generated_images')
    .insert({
      user_id: userId,
      user_email: userEmail,
      user_phone: userPhone,  // ✨ NEW - Save phone number
      garment_path: garmentPath,
      generated_image_url: generatedImageUrl,
      prompt: prompt,
      created_at: new Date()
    });

  if (error) {
    console.error('Error saving image:', error);
    return res.status(500).json({ error: 'Failed to save image' });
  }

  res.json({ success: true, imageUrl: generatedImageUrl });
});
```

### Example 2: Update user limits with phone

```javascript
// Update user profile/limits with phone number
app.post('/api/user/update-profile', async (req, res) => {
  const { userId, email, phoneNumber } = req.body;

  const { data, error } = await supabase
    .from('user_limits')
    .update({
      email: email,
      phone_number: phoneNumber  // ✨ NEW - Save phone number
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  res.json({ success: true });
});
```

### Example 3: Query images by phone number

```javascript
// Find all images uploaded by a specific phone number
app.get('/api/admin/images-by-phone', async (req, res) => {
  const { phone } = req.query;

  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('user_phone', phone)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Query failed' });
  }

  res.json({ images: data });
});
```

---

## Frontend Form Updates

Add phone input to your upload forms:

### HTML Example
```html
<form id="uploadForm">
  <input type="email" id="userEmail" placeholder="Email" required>
  <input type="tel" id="userPhone" placeholder="Phone Number" required>
  <input type="file" id="garmentImage" accept="image/*" required>
  <button type="submit">Upload & Generate</button>
</form>

<script>
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('userEmail').value;
  const phone = document.getElementById('userPhone').value;
  const file = document.getElementById('garmentImage').files[0];

  // Upload garment and generate image
  const formData = new FormData();
  formData.append('email', email);
  formData.append('phone', phone);  // ✨ NEW - Include phone
  formData.append('garment', file);

  const response = await fetch('/api/generate-image', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  console.log('Generated image:', result.imageUrl);
});
</script>
```

---

## Summary Checklist

- [ ] Run `migrations/add_phone_number_to_generated_images.sql` in Supabase
- [ ] Run `migrations/add_phone_number_to_user_limits.sql` in Supabase
- [ ] Verify columns exist using verification SQL
- [ ] Update `index.js` to save phone numbers when generating images
- [ ] Update frontend forms to collect phone numbers
- [ ] Test uploading garment with email and phone
- [ ] Verify data is saved correctly in database

---

## Quick Migration Command

If you prefer using the migration runner script:

```bash
# Run both migrations
node run-migration.js migrations/add_phone_number_to_generated_images.sql
node run-migration.js migrations/add_phone_number_to_user_limits.sql
```

---

## Database Schema Overview

```
user_profiles                generated_images           user_limits
├─ id (UUID)                ├─ id                      ├─ id
├─ email ✅                  ├─ user_id                 ├─ user_id
├─ phone ✅                  ├─ user_email ✅           ├─ email ✅
├─ brand_name               ├─ user_phone ✨ NEW       ├─ phone_number ✨ NEW
├─ credits                  ├─ garment_path            ├─ tier
└─ ...                      ├─ generated_image_url     ├─ credits_limit
                            └─ ...                     └─ ...

Storage: garments bucket
└─ User uploaded garment images
   Format: /user_id/timestamp_filename.jpg
```

---

## Need Help?

Check the migration README:
- `migrations/README_PHONE_NUMBER_MIGRATION.md`

Migration files:
- `migrations/add_phone_number_to_generated_images.sql`
- `migrations/add_phone_number_to_user_limits.sql`
- `migrations/FIXED_user_profiles_with_phone.sql` (already exists)

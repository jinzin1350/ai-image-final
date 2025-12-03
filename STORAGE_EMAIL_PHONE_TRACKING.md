# Track Email & Phone for Supabase Storage Uploads

## Your Question:
> "I want to add email and phone columns in Supabase Storage where garment images are uploaded"

## The Answer:
**Supabase Storage buckets cannot have custom columns.** Storage only stores files, not structured data.

**Solution:** Use a database table to track storage uploads with email & phone.

---

## ✅ Recommended Solution: `garment_uploads` Table

### Database Table Structure:
```
garment_uploads
├─ id (primary key)
├─ user_id (UUID)
├─ user_email (TEXT) ← Email of uploader
├─ user_phone (TEXT) ← Phone of uploader
├─ storage_bucket (TEXT) = 'garments'
├─ storage_path (TEXT) ← Path in storage
├─ file_name (TEXT)
├─ file_size (INTEGER)
├─ upload_date (TIMESTAMP)
```

### How It Works:

```
User uploads garment image
         ↓
1. Save file to Storage bucket: garments/user_123/image.jpg
         ↓
2. Save record to garment_uploads table:
   {
     user_email: "user@example.com",
     user_phone: "+1234567890",
     storage_path: "garments/user_123/image.jpg"
   }
         ↓
3. Query table to find email & phone for any storage file
```

---

## 📋 Implementation Steps

### Step 1: Create Table (Run in Supabase)
```sql
-- Run the migration file:
migrations/create_garment_uploads_table.sql
```

This creates the `garment_uploads` table with email & phone columns.

### Step 2: Update Backend (index.js)

When user uploads garment, save to both storage AND database:

```javascript
// Example: Upload garment endpoint
app.post('/api/upload-garment', upload.single('garment'), async (req, res) => {
  const { email, phone } = req.body;
  const file = req.file;

  // 1. Upload to Supabase Storage
  const fileName = `${Date.now()}_${file.originalname}`;
  const storagePath = `garments/${userId}/${fileName}`;

  const { data: storageData, error: storageError } = await supabase
    .storage
    .from('garments')
    .upload(storagePath, file.buffer);

  if (storageError) {
    return res.status(500).json({ error: 'Upload failed' });
  }

  // 2. Save metadata to database with email & phone
  const { data: dbData, error: dbError } = await supabase
    .from('garment_uploads')
    .insert({
      user_id: userId,
      user_email: email,           // ✨ Save email
      user_phone: phone,           // ✨ Save phone
      storage_bucket: 'garments',
      storage_path: storagePath,
      file_name: fileName,
      file_size: file.size,
      file_type: file.mimetype
    });

  if (dbError) {
    console.error('Failed to save upload metadata:', dbError);
  }

  res.json({
    success: true,
    path: storagePath,
    url: supabase.storage.from('garments').getPublicUrl(storagePath).data.publicUrl
  });
});
```

### Step 3: Query Uploads by Email or Phone

```javascript
// Find all uploads by phone number
app.get('/api/admin/uploads-by-phone', async (req, res) => {
  const { phone } = req.query;

  const { data, error } = await supabase
    .from('garment_uploads')
    .select('*')
    .eq('user_phone', phone)
    .order('upload_date', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, uploads: data });
});

// Find all uploads by email
app.get('/api/admin/uploads-by-email', async (req, res) => {
  const { email } = req.query;

  const { data, error } = await supabase
    .from('garment_uploads')
    .select('*')
    .eq('user_email', email)
    .order('upload_date', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, uploads: data });
});
```

---

## 📊 Display in Admin Panel

Create an admin page to view all storage uploads with contact info:

```html
<!-- admin-storage-uploads.html -->
<table>
  <thead>
    <tr>
      <th>File Name</th>
      <th>Email</th>
      <th>Phone</th>
      <th>Upload Date</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody id="uploadsTable">
    <!-- JavaScript will populate this -->
  </tbody>
</table>

<script>
async function loadStorageUploads() {
  const response = await fetch('/api/admin/storage-uploads');
  const data = await response.json();

  const tbody = document.getElementById('uploadsTable');

  tbody.innerHTML = data.uploads.map(upload => `
    <tr>
      <td>${upload.file_name}</td>
      <td>${upload.user_email}</td>
      <td>${upload.user_phone}</td>
      <td>${new Date(upload.upload_date).toLocaleString()}</td>
      <td>
        <button onclick="viewFile('${upload.storage_path}')">View</button>
      </td>
    </tr>
  `).join('');
}

function viewFile(path) {
  // Get public URL and open
  const url = supabase.storage.from('garments').getPublicUrl(path).data.publicUrl;
  window.open(url, '_blank');
}

loadStorageUploads();
</script>
```

---

## 🔍 Query Examples

### Find all uploads by phone:
```sql
SELECT
  file_name,
  user_email,
  user_phone,
  storage_path,
  upload_date
FROM garment_uploads
WHERE user_phone = '+1234567890'
ORDER BY upload_date DESC;
```

### Find all uploads by email:
```sql
SELECT * FROM garment_uploads
WHERE user_email = 'user@example.com';
```

### Get storage stats by user:
```sql
SELECT
  user_email,
  user_phone,
  COUNT(*) as total_uploads,
  SUM(file_size) as total_size_bytes,
  MAX(upload_date) as last_upload
FROM garment_uploads
GROUP BY user_email, user_phone
ORDER BY total_uploads DESC;
```

### Link storage uploads to generated images:
```sql
SELECT
  gu.file_name,
  gu.user_email,
  gu.user_phone,
  gi.generated_image_url,
  gi.created_at
FROM garment_uploads gu
LEFT JOIN generated_images gi ON gu.storage_path = gi.garment_path
WHERE gu.user_phone = '+1234567890';
```

---

## 🎯 Summary

**Problem:** Supabase Storage doesn't support custom columns

**Solution:** Create `garment_uploads` table to track:
- Which file in storage
- Who uploaded it (email & phone)
- When it was uploaded

**Benefit:**
- ✅ Search storage files by email
- ✅ Search storage files by phone
- ✅ Track all uploads with contact info
- ✅ Generate reports on storage usage

---

## 📁 Migration File

Run this in Supabase SQL Editor:
```
migrations/create_garment_uploads_table.sql
```

This will create the tracking table with all necessary columns and indexes.

---

## 🚀 Next Steps

1. Run migration to create `garment_uploads` table
2. Update your upload endpoint to save email & phone
3. Create admin page to view uploads
4. Test searching by email/phone

Total implementation time: ~20 minutes

# Where to Display Phone & Email After Migration

After running the phone number migrations, you need to update your admin pages to display the new contact information.

## 📍 3 Places to Show Phone & Email

---

## 1️⃣ Admin Users Page (`public/admin-users.html`)

**Status:** ✅ Already shows phone!
**Line 96:** Already has a "Phone" column

### What to Check:
The backend API at `/api/admin/users` should already return phone numbers from `user_limits` or `user_profiles` table.

**No changes needed here!** ✅

---

## 2️⃣ User Images Gallery (`/api/user-images` endpoint)

**Status:** ❌ Needs update to include phone & email
**File:** `index.js` line 5686

### Current Code (line 5686-5735):
```javascript
app.get('/api/user-images', authenticateUser, async (req, res) => {
  // ...
  let query = supabase
    .from('generated_images')
    .select('id, generated_image_url, created_at, user_id')  // ← Missing email and phone
    .order('created_at', { ascending: false })
    .limit(100);
  // ...
});
```

### ✨ Updated Code (Add email and phone):
```javascript
app.get('/api/user-images', authenticateUser, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ success: true, images: [] });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const userId = req.user.id;
    const userEmail = req.user.email;

    // Check if user is admin
    const ADMIN_EMAIL = 'engi.alireza@gmail.com';
    const isAdmin = userEmail === ADMIN_EMAIL;

    // ✨ UPDATED: Now includes user_email and user_phone
    let query = supabase
      .from('generated_images')
      .select('id, generated_image_url, created_at, user_id, user_email, user_phone')  // ✨ ADDED
      .order('created_at', { ascending: false })
      .limit(100);

    // If not admin, filter by user_id
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Database error fetching images:', error);
      throw error;
    }

    console.log(`📸 Found ${data?.length || 0} images for ${isAdmin ? 'admin (all users)' : `user ${userId}`}`);

    // ✨ UPDATED: Include email and phone in response
    const images = data ? data.map(img => ({
      id: img.id,
      image_url: img.generated_image_url,
      created_at: img.created_at,
      user_email: img.user_email,        // ✨ ADDED
      user_phone: img.user_phone         // ✨ ADDED
    })) : [];

    console.log(`✅ Returning ${images.length} images to frontend`);

    res.json({
      success: true,
      images: images
    });

  } catch (error) {
    console.error('❌ Error in /api/user-images:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

---

## 3️⃣ Admin Gallery Page (Display in UI)

**File:** `public/my-content.html` or create new `public/admin-user-images.html`

### Option A: Add to My Content Page

If you want users to see their own contact info on uploaded images:

```html
<!-- In public/my-content.html -->
<div class="image-card">
  <img src="${image.image_url}" alt="Generated image">
  <div class="image-info">
    <p><strong>Email:</strong> ${image.user_email || 'N/A'}</p>
    <p><strong>Phone:</strong> ${image.user_phone || 'N/A'}</p>
    <p><strong>Created:</strong> ${new Date(image.created_at).toLocaleString()}</p>
  </div>
</div>
```

### Option B: Create Admin Images Page

Create a new admin page to view all user uploads with contact info:

**File:** `public/admin-user-uploads.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>User Uploads | Admin Dashboard</title>
    <link rel="stylesheet" href="/admin-style.css">
</head>
<body>
    <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <div class="logo">
                <span>Admin Panel</span>
            </div>
        </div>
        <div class="sidebar-nav-container" data-active-page="uploads"></div>
    </aside>

    <main class="main-content">
        <header class="page-header">
            <div>
                <h1>📸 User Uploads</h1>
                <p>View all user-uploaded garments with contact info</p>
            </div>
            <div class="header-actions">
                <button class="btn-refresh" onclick="loadUploads()">
                    Refresh
                </button>
            </div>
        </header>

        <div class="content-section">
            <div class="gallery-table">
                <table>
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Upload Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="uploadsTableBody">
                        <!-- Populated by JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <script src="/admin-common.js"></script>
    <script>
        async function loadUploads() {
            try {
                const response = await fetchWithAuth('/api/user-images');
                const data = await response.json();

                if (data.success && data.images) {
                    const tbody = document.getElementById('uploadsTableBody');

                    if (data.images.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">No uploads yet</td></tr>';
                        return;
                    }

                    tbody.innerHTML = data.images.map(img => `
                        <tr>
                            <td>
                                <img src="${img.image_url}"
                                     alt="Upload"
                                     style="width:80px; height:80px; object-fit:cover; border-radius:8px;">
                            </td>
                            <td>
                                <strong>${img.user_email || 'N/A'}</strong>
                            </td>
                            <td>
                                <strong>${img.user_phone || 'N/A'}</strong>
                            </td>
                            <td>
                                ${new Date(img.created_at).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </td>
                            <td>
                                <button class="btn-sm btn-view" onclick="viewImage('${img.image_url}')">
                                    View
                                </button>
                                <button class="btn-sm btn-delete" onclick="deleteImage(${img.id})">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `).join('');
                } else {
                    console.error('Failed to load uploads:', data);
                }
            } catch (error) {
                console.error('Error loading uploads:', error);
                alert('Failed to load uploads');
            }
        }

        function viewImage(url) {
            window.open(url, '_blank');
        }

        async function deleteImage(id) {
            if (!confirm('Delete this upload?')) return;

            try {
                // Add delete endpoint if needed
                alert('Delete functionality - implement in backend');
            } catch (error) {
                console.error('Error deleting:', error);
            }
        }

        // Load on page load
        window.addEventListener('DOMContentLoaded', loadUploads);
    </script>
</body>
</html>
```

---

## 4️⃣ Backend: When Saving New Images

**File:** `index.js` - Find where you save generated images

### Search for image save operations:
```bash
grep -n "insert.*generated_images" index.js
```

### Update to save phone number:

**Current code (example):**
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

**Updated code:**
```javascript
const { data, error } = await supabase
  .from('generated_images')
  .insert({
    user_id: userId,
    user_email: userEmail,
    user_phone: userPhone,        // ✨ ADD THIS
    garment_path: garmentPath,
    generated_image_url: imageUrl
  });
```

**Where to get userPhone:**
- From request body: `req.body.phone`
- From user profile: Query `user_limits` or `user_profiles` table by `user_id`

---

## 📊 Summary: Where Phone & Email Appear

| Location | File | Status | Action Needed |
|----------|------|--------|---------------|
| Admin Users List | `admin-users.html` | ✅ Ready | Already shows phone |
| User Images API | `index.js:5686` | ❌ Needs update | Add `user_email, user_phone` to SELECT |
| Image Save | `index.js` (multiple places) | ❌ Needs update | Add `user_phone` to INSERT |
| Admin Uploads Page | Create new file | ❌ Create | New page to view uploads with contact |

---

## 🚀 Quick Implementation Checklist

- [ ] Run phone migrations in Supabase
- [ ] Update `/api/user-images` to SELECT phone & email
- [ ] Update image INSERT operations to save phone
- [ ] Create `admin-user-uploads.html` page
- [ ] Add menu item to admin sidebar for uploads page
- [ ] Test viewing images with contact info

---

## 🔍 Testing

After implementing, test with:

```javascript
// In browser console on admin page
fetch('/api/user-images', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Images with contact info:', data.images);
  // Should see user_email and user_phone fields
});
```

---

## 📞 Example Display Formats

### Compact View:
```
📧 user@example.com | 📱 +1234567890
```

### Card View:
```
┌────────────────────────────┐
│ [Image Thumbnail]          │
├────────────────────────────┤
│ 📧 Email: user@example.com │
│ 📱 Phone: +1234567890      │
│ 📅 Date: Dec 3, 2025       │
└────────────────────────────┘
```

### Table View (Admin):
```
| Thumbnail | Email              | Phone          | Date        |
|-----------|-------------------|----------------|-------------|
| [img]     | user@example.com  | +1234567890    | 2025-12-03  |
```

---

Need help implementing any of these? Let me know which page you want to update first!

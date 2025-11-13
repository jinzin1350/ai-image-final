# Before/After Gallery Feature - Setup Guide

## 📋 Overview

This feature adds a complete before/after gallery system to showcase AI photography transformations on your website.

### What's Included:
- ✅ Admin panel for managing before/after images
- ✅ Public portfolio page with filtering
- ✅ Supabase storage integration
- ✅ Complete CRUD API endpoints
- ✅ Persian/Farsi RTL support

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Database Setup

1. Go to your **Supabase Project Dashboard**
2. Navigate to **SQL Editor**
3. Open the file: `database/before_after_gallery.sql`
4. Copy the entire SQL content
5. Paste into Supabase SQL Editor
6. Click **Run** to execute

This will create:
- `before_after_gallery` table
- `before-after-images` storage bucket
- Row Level Security policies

### Step 2: Verify Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Verify that `before-after-images` bucket exists
3. Make sure it's set to **Public** (so images can be displayed)

### Step 3: Update Your .env File

Make sure your `.env` file has these values configured:

```env
SUPABASE_URL=your_actual_supabase_project_url
SUPABASE_ANON_KEY=your_actual_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_supabase_service_role_key
```

**Important:** Replace the placeholder values with your actual Supabase credentials!

### Step 4: Restart Your Server

```bash
# Stop the server (Ctrl+C)
# Start it again
node index.js
```

### Step 5: Access the Admin Panel

1. Go to: `http://localhost:5000/admin/gallery`
2. Login with your admin credentials
3. Start uploading before/after images!

---

## 📸 How to Use

### Adding Before/After Examples

1. **Login to Admin Panel**
   - Navigate to `/admin/gallery`
   - Click "➕ Add New Example"

2. **Fill in the Form**
   - **Title**: عنوان نمونه کار (in Persian)
   - **Description**: توضیحات (optional)
   - **Before Image**: Upload the original photo
   - **After Image**: Upload the AI-transformed photo
   - **Service Type**: Select which service was used
   - **Display Order**: Set order number (0 = first)
   - **Is Featured**: Check to highlight this example

3. **Upload Images**
   - Drag & drop or click to browse
   - Supported formats: JPG, PNG, WEBP, AVIF
   - Max file size: 10MB per image
   - Images auto-upload to Supabase storage

4. **Save**
   - Click "Save Gallery Item"
   - Images are stored in Supabase
   - URLs saved to database

### Viewing the Portfolio

Users can view examples at: `http://localhost:5000/portfolio.html`

Features:
- Filter by service type
- Side-by-side before/after display
- Click to view full-screen
- Persian RTL layout
- Responsive design

---

## 🗂️ File Structure

```
ai-image-final/
├── database/
│   └── before_after_gallery.sql      # Database schema
├── public/
│   ├── admin-gallery.html            # Admin management page
│   ├── portfolio.html                # Public gallery page
│   ├── admin-menu.js                 # Navigation (updated)
│   └── index.html                    # Main page (updated with link)
└── index.js                          # API endpoints (updated)
```

---

## 🔧 API Endpoints

### Public Endpoints
- `GET /api/gallery` - Fetch all gallery items (public)

### Admin Endpoints (Require Authentication)
- `GET /api/admin/gallery` - Get all items (admin view)
- `GET /api/admin/gallery/:id` - Get single item
- `POST /api/admin/gallery` - Create new item
- `PUT /api/admin/gallery/:id` - Update item
- `DELETE /api/admin/gallery/:id` - Delete item
- `POST /api/admin/gallery/upload` - Upload image to storage

---

## 📊 Database Schema

```sql
Table: before_after_gallery
├── id (UUID, primary key)
├── title (TEXT, required)
├── description (TEXT, optional)
├── before_image_url (TEXT, required)
├── after_image_url (TEXT, required)
├── service_type (TEXT, optional)
├── category (TEXT, optional)
├── is_featured (BOOLEAN, default false)
├── display_order (INTEGER, default 0)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

---

## 🎨 Service Types Available

1. **Complete Outfit** - استایل کامل
2. **Accessories Only** - اکسسوری
3. **Color Collection** - کالکشن رنگی
4. **Flat Lay** - فلت لی
5. **Scene Recreation** - بازآفرینی صحنه
6. **Style Transfer** - انتقال استایل
7. **Other** - سایر

---

## 🔐 Security Features

- ✅ Row Level Security (RLS) enabled
- ✅ Public read access for gallery items
- ✅ Admin-only write access
- ✅ Image uploads require authentication
- ✅ File type validation
- ✅ File size limits (10MB)

---

## 🐛 Troubleshooting

### Problem: Can't upload images
**Solution:**
1. Check Supabase storage bucket exists
2. Verify bucket is set to Public
3. Check `.env` has `SUPABASE_SERVICE_ROLE_KEY`
4. Restart server

### Problem: Gallery page shows no items
**Solution:**
1. Check database table created successfully
2. Verify you've added at least one item
3. Check browser console for errors
4. Verify Supabase URL in `.env`

### Problem: Images don't display
**Solution:**
1. Make sure storage bucket is **Public**
2. Check image URLs in database are valid
3. Test URL directly in browser
4. Verify CORS settings in Supabase

### Problem: Admin panel shows 403 error
**Solution:**
1. Make sure you're logged in
2. Check admin credentials in `.env`
3. Clear browser cache and cookies
4. Try logging in again

---

## 📱 Navigation Updates

### Main Site (index.html)
New button added: **"✨ نمونه کارها"** (Portfolio Examples)

### Admin Dashboard
New menu item in **Content** section: **"Before/After Gallery"**

---

## 💡 Tips for Best Results

1. **Image Quality**
   - Use high-resolution images (recommended: 1920x1080+)
   - Maintain consistent aspect ratios
   - Optimize file sizes for web

2. **Naming Convention**
   - Use descriptive Persian titles
   - Add relevant descriptions
   - Tag with correct service type

3. **Organization**
   - Use display_order to control sequence
   - Mark best examples as "Featured"
   - Keep portfolio updated with latest work

4. **Performance**
   - Compress images before upload
   - Use WEBP format when possible
   - Limit to 50-100 total examples

---

## 📞 Support

If you encounter any issues:

1. Check this README first
2. Review console logs (browser & server)
3. Verify Supabase configuration
4. Check database table structure

---

## ✅ Testing Checklist

Before going live, test:

- [ ] Database table created successfully
- [ ] Storage bucket is public
- [ ] Can upload images in admin panel
- [ ] Images display on portfolio page
- [ ] Filters work correctly
- [ ] Lightbox modal opens/closes
- [ ] Responsive design works on mobile
- [ ] Delete functionality works
- [ ] Edit functionality works
- [ ] Featured badge shows correctly

---

## 🎉 You're Done!

Your before/after gallery is now ready to showcase your AI photography transformations!

Visit `/portfolio.html` to see it in action! 📸✨

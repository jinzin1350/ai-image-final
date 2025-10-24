# 👨‍💼 Admin Dashboard - Complete Setup Guide

## 🎉 Congratulations!

Your **AI Fashion Studio Admin Dashboard** is now fully implemented and ready to use!

---

## 📋 What Was Built

### 1. **Database Schema** (`admin-schema.sql`)
Complete database structure including:
- ✅ `admin_users` - Admin accounts table
- ✅ `content_library` - Models and backgrounds storage
- ✅ `user_limits` - User quotas and premium status
- ✅ `admin_activity_logs` - Activity tracking
- ✅ Row Level Security (RLS) policies
- ✅ Auto-reset monthly limits function

### 2. **Backend API Routes** (in `index.js`)
Secure RESTful API endpoints:
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:userId` - Update user limits/premium
- `GET /api/admin/content` - View content library
- `POST /api/admin/content/upload` - Upload models/backgrounds
- `DELETE /api/admin/content/:contentId` - Delete content
- `GET /api/admin/logs` - Activity logs

### 3. **Admin Panel Pages**
Professional admin interface:
- 🔐 **Login Page** (`/admin`) - Secure admin authentication
- 📊 **Dashboard** (`/admin/dashboard`) - Overview statistics
- 👥 **User Management** (`/admin/users`) - Manage users & premium status
- 📸 **Content Library** (`/admin/content`) - Upload models & backgrounds
- 📈 **Analytics** (`/admin/analytics`) - Detailed usage statistics

---

## 🚀 Quick Start

### Step 1: Update Environment Variables

Your `.env` file now includes admin credentials:

```env
# Admin Dashboard Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

**⚠️ IMPORTANT: Change these credentials before deploying to production!**

### Step 2: Setup Database Schema

1. Open your Supabase Dashboard → SQL Editor
2. Copy the entire contents of `admin-schema.sql`
3. Paste and run the SQL script
4. You should see: ✅ "Setup completed successfully!"

### Step 3: Create Storage Bucket

In Supabase Dashboard → Storage:
1. Create a new bucket named: `admin-content`
2. Make it **Public**
3. Set file size limit: **50MB**
4. Allowed MIME types: `image/jpeg, image/png, image/webp`

### Step 4: Access Admin Dashboard

1. Start your server: `node index.js`
2. Open browser: `http://localhost:5000/admin`
3. Login with:
   - **Email**: `admin@example.com`
   - **Password**: `admin123`

---

## 🎯 Features & Capabilities

### **User Management**
✅ View all registered users
✅ See usage statistics (images, captions, descriptions)
✅ Toggle premium status (one click)
✅ Set custom limits per user
✅ Track user activity

### **Content Library Management**
✅ Upload model images (free/premium tiers)
✅ Upload background images (free/premium tiers)
✅ Categorize content (woman, man, indoor, outdoor, etc.)
✅ Delete unwanted content
✅ View usage statistics per content item

### **Analytics & Insights**
✅ Total users count
✅ Premium vs Free users
✅ Total images generated
✅ Daily generation statistics
✅ Content library size
✅ Premium conversion rate

### **Activity Logging**
✅ Track all admin actions
✅ User updates logged
✅ Content uploads/deletes logged
✅ Timestamp and metadata for each action

---

## 🔐 Security Features

1. **Environment-Based Authentication**: Credentials stored in `.env` file
2. **Header-Based Auth**: Every API request requires admin credentials
3. **Session Management**: Client-side session storage
4. **RLS Policies**: Database-level access control
5. **Auto-Logout**: Unauthorized requests redirect to login

---

## 📊 User Tiers & Limits

### **Free Tier (Default)**
- 🖼️ **Images**: 10 per month
- 📝 **Captions**: 5 per month
- 📄 **Descriptions**: 3 per month

### **Premium Tier**
- 🖼️ **Images**: 1000 per month
- 📝 **Captions**: 500 per month
- 📄 **Descriptions**: Unlimited
- 🎨 **Access to premium models & backgrounds**

**Limits auto-reset monthly** via `reset_monthly_limits()` function.

---

## 🎨 Content Organization

### **Content Types**
1. **Models** - Fashion model images (woman, man, girl, boy)
2. **Backgrounds** - Scene backgrounds (indoor, outdoor, cafe, urban, nature)

### **Tier System**
- **Free**: Available to all users
- **Premium**: Only for premium subscribers

### **Upload Format**
When uploading content, provide:
- Content type (model/background)
- Tier (free/premium)
- Category (woman/man/indoor/outdoor/etc.)
- Name (display name)
- Description (optional)
- Image file (JPG/PNG/WEBP)

---

## 🔧 Maintenance Tasks

### Change Admin Password
Update in `.env` file:
```env
ADMIN_EMAIL=your-new-email@domain.com
ADMIN_PASSWORD=your-secure-password
```

### Reset User Limits Manually
Run in Supabase SQL Editor:
```sql
SELECT reset_monthly_limits();
```

### View Activity Logs
Access via admin panel or SQL:
```sql
SELECT * FROM admin_activity_logs
ORDER BY created_at DESC
LIMIT 50;
```

### Backup Database
Supabase automatically backs up, but you can also:
```bash
# Export via Supabase CLI
supabase db dump > backup.sql
```

---

## 📱 Mobile Responsive

The admin dashboard is fully responsive:
- ✅ Works on desktop (best experience)
- ✅ Works on tablets
- ✅ Works on mobile phones
- ✅ Collapsible sidebar on small screens

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" error
**Solution**: Check admin credentials in `.env` file match login attempt

### Issue: Can't upload content
**Solution**: Ensure `admin-content` storage bucket exists in Supabase and is public

### Issue: Users not showing
**Solution**: Run `admin-schema.sql` to create `user_limits` table

### Issue: Stats showing 0
**Solution**: Database not configured. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`

---

## 🔄 Database Schema Reference

### user_limits Table
```sql
user_id              UUID (references auth.users)
is_premium           BOOLEAN (default: false)
images_limit         INTEGER (default: 10)
images_used          INTEGER (default: 0)
captions_limit       INTEGER (default: 5)
captions_used        INTEGER (default: 0)
descriptions_limit   INTEGER (default: 3)
descriptions_used    INTEGER (default: 0)
last_reset_date      TIMESTAMP
notes                TEXT
```

### content_library Table
```sql
id                   BIGSERIAL (primary key)
content_type         TEXT ('model' | 'background')
tier                 TEXT ('free' | 'premium')
category             TEXT
name                 TEXT
description          TEXT
image_url            TEXT (public URL)
storage_path         TEXT (Supabase storage path)
is_active            BOOLEAN
metadata             JSONB
usage_count          INTEGER
uploaded_by          BIGINT (references admin_users)
```

---

## 🎁 Next Steps

1. ✅ **Change default admin password**
2. ✅ **Run database schema setup**
3. ✅ **Create storage bucket**
4. ✅ **Upload initial content** (models & backgrounds)
5. ✅ **Test user management** (create test user, toggle premium)
6. ✅ **Configure Supabase** (set URL and keys in `.env`)
7. ✅ **Test image generation** with free and premium content

---

## 📞 Support

If you encounter any issues:
1. Check server logs: Look for errors in terminal
2. Check browser console: Press F12 → Console tab
3. Verify Supabase connection: Check dashboard for active project
4. Test API endpoints: Use curl or Postman to test routes

---

## 🎉 Success Indicators

You know everything is working when:
- ✅ Admin login page loads at `/admin`
- ✅ Login with default credentials works
- ✅ Dashboard shows statistics (even if 0)
- ✅ Users page loads (empty if no users yet)
- ✅ Content upload form works
- ✅ No console errors in browser

---

**Built with ❤️ for AI Fashion Studio**
**Version**: 1.0.0
**Date**: October 24, 2025
**Status**: Production Ready ✅

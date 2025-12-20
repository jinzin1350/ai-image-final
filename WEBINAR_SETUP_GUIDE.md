# Webinar Landing Page Setup Guide

## Overview
I've created a complete webinar registration system for your Yalda Night webinar. Here's what was built:

## Files Created/Modified

### 1. Landing Page
- **File**: `public/webinar.html`
- **URL**: `http://localhost:5000/webinar`
- **Features**:
  - Beautiful Yalda-themed design (purple/violet colors)
  - Banner image display (`/aks/baner.PNG`)
  - Persian/Farsi language with RTL layout
  - Registration form (name + phone number)
  - Form validation (phone format: 09XXXXXXXXX)
  - Success/error message displays
  - Fully responsive design

### 2. Database Schema
- **File**: `webinar-schema.sql`
- **Table**: `webinar_registrations`
- **Fields**:
  - `id` (UUID, primary key)
  - `name` (TEXT)
  - `phone` (TEXT)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

### 3. API Endpoints
Added to `index.js`:

#### Public Endpoint
- **POST** `/api/webinar/register`
  - Registers new user for webinar
  - Validates phone format
  - Prevents duplicate registrations
  - Returns success/error messages

#### Admin Endpoint
- **GET** `/api/admin/webinar/registrations`
  - Requires admin authentication
  - Returns all registrations with count
  - Ordered by newest first

## Setup Instructions

### Step 1: Create Database Table
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `webinar-schema.sql`
4. Run the SQL script
5. Verify the table was created in the Table Editor

### Step 2: Restart the Server
```bash
# Stop current server (Ctrl+C)
# Start server again
node index.js
```

### Step 3: Test the Landing Page
1. Open browser and go to: `http://localhost:5000/webinar`
2. You should see the beautiful Yalda-themed landing page
3. The banner image should be displayed
4. Fill out the form with:
   - Name: Test User
   - Phone: 09123456789
5. Submit and verify success message

### Step 4: View Registrations (Admin)
To view all registrations, you'll need to create an admin page or use Supabase directly:

**Option 1: Supabase Dashboard**
- Go to Table Editor
- Select `webinar_registrations` table
- View all entries

**Option 2: API Call (with admin auth)**
```javascript
GET /api/admin/webinar/registrations
Headers: {
  Authorization: Bearer YOUR_ADMIN_TOKEN
}
```

## Features & Validation

### Form Validation
- **Name**: Required field
- **Phone**:
  - Required field
  - Must match format: 09XXXXXXXXX (11 digits starting with 09)
  - Auto-removes non-numeric characters
  - Prevents duplicate registrations (same phone number)

### Security
- Row Level Security (RLS) enabled on database
- Anyone can INSERT (register)
- Only authenticated admins can SELECT (view registrations)
- Phone number uniqueness enforced
- SQL injection protection via Supabase client

### User Experience
- Persian/Farsi language throughout
- RTL (Right-to-Left) layout
- Success/error messages in Persian
- Smooth animations and transitions
- Mobile-responsive design
- Loading state during submission

## Database Structure

```sql
webinar_registrations
├── id (UUID)
├── name (TEXT)
├── phone (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

Indexes:
- idx_webinar_registrations_phone
- idx_webinar_registrations_created_at
```

## Next Steps

### Optional Enhancements
1. **Export Registrations**: Add CSV/Excel export functionality
2. **Email/SMS Confirmation**: Send confirmation to registrants
3. **Admin Dashboard**: Create `/admin/webinar` page to view registrations
4. **Statistics**: Add charts showing registration trends
5. **Reminder System**: Send reminders before webinar starts

### Marketing Ideas
1. Share the link: `https://yourdomain.com/webinar`
2. Add to social media posts
3. Include in email campaigns
4. Create QR code for the webinar page

## Troubleshooting

### Issue: Banner image not showing
- Check that `aks/baner.PNG` exists in the correct location
- Verify file name matches exactly (case-sensitive)

### Issue: Form not submitting
- Check browser console for errors
- Verify Supabase connection in server logs
- Ensure database table was created correctly

### Issue: Duplicate phone error
- This is expected - phone numbers can only register once
- User should receive Persian error message
- Check database to confirm registration exists

## URL Structure
- **Landing Page**: `/webinar`
- **Registration API**: `/api/webinar/register`
- **Admin View API**: `/api/admin/webinar/registrations`

## Testing Checklist
- [ ] Database table created successfully
- [ ] Server restarted
- [ ] Landing page loads at `/webinar`
- [ ] Banner image displays correctly
- [ ] Form accepts valid input
- [ ] Form rejects invalid phone numbers
- [ ] Success message shows after registration
- [ ] Duplicate registration is blocked
- [ ] Data appears in Supabase table
- [ ] Admin API returns registrations

## Support
If you encounter any issues, check:
1. Server console logs
2. Browser console (F12)
3. Supabase logs
4. Network tab in browser dev tools

---

**Created**: December 2024
**Tech Stack**: Express.js, Supabase, Vanilla JS
**Theme**: Yalda Night (Purple/Violet)

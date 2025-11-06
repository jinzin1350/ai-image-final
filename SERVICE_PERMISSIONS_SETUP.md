# Service Permissions System - Complete Setup Guide

## 🎯 Overview

This system allows you to control which AI image services each user tier can access. When users try to access a restricted service, they'll see a beautiful upgrade modal prompting them to upgrade their subscription.

---

## 📦 What Was Created

### 1. Database Migration
**File:** `migrations/service_permissions.sql`

Creates the `tier_service_permissions` table to store which services each tier can access.

#### Services:
- `complete-outfit` - عکاسی استایل کامل
- `accessories-only` - عکاسی اکسسوری محصول
- `color-collection` - نمایش کالکشن رنگی
- `flat-lay` - عکاسی Flat Lay حرفه‌ای
- `scene-recreation` - الهام از عکس مرجع
- `style-transfer` - انتقال استایل

#### Default Permissions:
- **testlimit** (5 credits): Only `complete-outfit`
- **bronze** (50 credits): Only `complete-outfit`
- **silver** (100 credits): All services *except* `scene-recreation` and `style-transfer`
- **gold** (130 credits): All services

### 2. Backend API Endpoints
**File:** `index.js` (lines 5000-5150)

Three new endpoints:

#### `GET /api/admin/service-permissions`
- Requires admin authentication
- Returns all service permissions grouped by tier
- Used by admin panel

#### `PUT /api/admin/service-permissions/:tier/:serviceKey`
- Requires admin authentication
- Updates permission for a specific tier and service
- Body: `{ has_access: boolean }`

#### `GET /api/check-service-access/:serviceKey`
- Requires user authentication (Bearer token)
- Returns user's access status for a service
- Returns: `{ hasAccess, userTier, requiredTiers }`

### 3. Admin Panel Page
**File:** `public/admin-service-permissions.html`

Beautiful admin interface to manage service permissions:
- Toggle switches for each tier/service combination
- Real-time updates
- Color-coded tier badges
- Responsive design

**Access:** `/admin/service-permissions`

### 4. Pricing Page
**File:** `public/pricing.html`

Professional pricing page with:
- Three tier cards (Bronze, Silver, Gold)
- Comparison table
- FAQ section
- Beautiful gradient design
- Mobile responsive

**Access:** `/pricing.html`

### 5. Permission Check Script
**File:** `public/service-permission-check.js`

Reusable JavaScript module for:
- Checking user service access
- Showing upgrade modal
- Handling permission denied scenarios

### 6. Updated Files

#### `index.js`
- Added service permissions API endpoints
- Added route for `/admin/service-permissions`

#### `public/admin-menu.js`
- Added "Service Permissions" link in admin sidebar

#### `public/index.html`
- Added permission check script
- Intercepts service card clicks
- Shows upgrade modal for restricted services

---

## 🚀 Installation Steps

### Step 1: Run Database Migration

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy the entire contents of `migrations/service_permissions.sql`
5. Run the migration
6. You should see success messages in the output

### Step 2: Push Code to GitHub

```bash
git add .
git commit -m "Add service permissions system with admin panel and upgrade modals"
git push origin main
```

### Step 3: Pull on Replit

In your Replit console:
```bash
git pull origin main
```

### Step 4: Restart Server

In Replit, restart your Node.js server or it will auto-restart.

### Step 5: Test the System

1. **Test Admin Panel:**
   - Go to `/admin/service-permissions`
   - Login with admin credentials
   - Toggle service permissions
   - Verify changes are saved

2. **Test User Experience:**
   - Login as a user with `testlimit` or `bronze` tier
   - Go to home page (`/index.html`)
   - Try clicking on restricted services
   - You should see the upgrade modal
   - Click on allowed services - should navigate normally

3. **Test Pricing Page:**
   - Visit `/pricing.html`
   - Verify all tiers and prices are correct
   - Test responsive design on mobile

---

## ⚙️ Configuration

### Modify Default Permissions

Edit `migrations/service_permissions.sql` and change the INSERT statements:

```sql
-- Example: Give bronze tier access to color-collection
INSERT INTO tier_service_permissions (tier, service_key, has_access)
VALUES
  ('bronze', 'color-collection', true)  -- Change false to true
ON CONFLICT (tier, service_key) DO UPDATE SET has_access = true;
```

Then re-run the migration or use the admin panel to update.

### Modify Pricing

Edit `public/pricing.html` and update:

```html
<!-- Bronze price -->
<div class="price-amount">۱۹۹,۰۰۰</div>

<!-- Silver price -->
<div class="price-amount">۳۹۹,۰۰۰</div>

<!-- Gold price -->
<div class="price-amount">۵۹۹,۰۰۰</div>
```

### Add Payment Integration

When ready to accept payments, modify the `selectPlan()` function in `public/pricing.html`:

```javascript
function selectPlan(tier) {
    // Redirect to payment gateway
    window.location.href = `/checkout?plan=${tier}`;
}
```

---

## 🎨 Customization

### Change Modal Design

Edit `public/service-permission-check.js` and modify the `showUpgradeModal()` function.

### Change Service Icons

Update the `SERVICE_INFO` object in `service-permission-check.js`:

```javascript
const SERVICE_INFO = {
    'complete-outfit': {
        icon: '👗',  // Change this emoji
        name: 'عکاسی استایل کامل',
        nameEn: 'Complete Outfit Photography'
    },
    // ...
};
```

### Change Tier Colors

Update the `TIER_INFO` object in `service-permission-check.js`:

```javascript
const TIER_INFO = {
    'bronze': {
        icon: '🥉',
        name: 'برنز',
        nameEn: 'Bronze',
        credits: 50,
        price: 199000,
        color: '#f59e0b'  // Change this color
    },
    // ...
};
```

---

## 📊 Database Schema

### Table: `tier_service_permissions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `tier` | TEXT | User tier (testlimit, bronze, silver, gold) |
| `service_key` | TEXT | Service identifier |
| `has_access` | BOOLEAN | Whether tier has access |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Constraints:**
- UNIQUE(tier, service_key)
- CHECK tier IN ('testlimit', 'bronze', 'silver', 'gold')
- CHECK service_key IN (6 service keys)

---

## 🔒 Security

### Row Level Security (RLS)

The table has RLS enabled with two policies:

1. **Users can view permissions** - Authenticated users can SELECT
2. **Service role can manage** - Admin/service role can do everything

### Admin Authentication

Admin endpoints require:
```javascript
headers: {
    'admin-email': 'your-admin-email',
    'admin-password': 'your-admin-password'
}
```

These are stored in `.env`:
```
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
```

---

## 🧪 Testing Scenarios

### Test Case 1: Testlimit User
1. Create user with testlimit tier (default for new users)
2. Should see upgrade modal for all services except `complete-outfit`
3. Modal should suggest upgrading to Bronze

### Test Case 2: Bronze User
1. User with bronze tier
2. Should access `complete-outfit` only
3. Modal should suggest upgrading to Silver for other services

### Test Case 3: Admin Panel
1. Login to admin panel
2. Toggle bronze tier access to `accessories-only`
3. Logout and login as bronze user
4. Should now access `accessories-only`

### Test Case 4: Pricing Page
1. Visit `/pricing.html`
2. Verify responsive design on mobile/tablet/desktop
3. Click "انتخاب پلن" buttons
4. Should show "coming soon" alert

---

## 🐛 Troubleshooting

### Issue: Modal not showing
**Solution:** Check browser console for errors. Ensure `service-permission-check.js` is loaded.

### Issue: Admin panel not loading permissions
**Solution:**
1. Verify migration ran successfully
2. Check Supabase service role key in `.env`
3. Check browser network tab for API errors

### Issue: Permission checks not working
**Solution:**
1. Verify user has valid JWT token
2. Check user's tier in `user_limits` table
3. Verify permissions exist in `tier_service_permissions` table

### Issue: Changes in admin panel not saving
**Solution:**
1. Check admin credentials
2. Verify Supabase service role permissions
3. Check browser console for errors

---

## 📈 Future Enhancements

### 1. Add Payment Integration
- Integrate with Zarinpal, IDPay, or other Iranian payment gateways
- Create `/checkout` endpoint
- Handle payment callbacks
- Update user tier after successful payment

### 2. Add Subscription Management
- Allow users to cancel subscriptions
- Implement grace periods
- Add subscription renewal reminders
- Email notifications

### 3. Add Analytics
- Track which services users try to access
- Monitor conversion rates from modal to upgrade
- A/B test different pricing

### 4. Add Bulk Operations
- Admin feature to update multiple permissions at once
- Import/export permission configurations
- Permission templates

---

## 📝 API Reference

### Check Service Access

```javascript
GET /api/check-service-access/:serviceKey
Headers: {
    Authorization: Bearer <user-jwt-token>
}

Response: {
    success: true,
    hasAccess: true,
    userTier: "bronze",
    serviceKey: "complete-outfit",
    requiredTiers: ["bronze", "silver", "gold"]
}
```

### Get All Permissions (Admin)

```javascript
GET /api/admin/service-permissions
Headers: {
    admin-email: "admin@example.com",
    admin-password: "password"
}

Response: {
    success: true,
    permissions: {
        testlimit: [...],
        bronze: [...],
        silver: [...],
        gold: [...]
    }
}
```

### Update Permission (Admin)

```javascript
PUT /api/admin/service-permissions/:tier/:serviceKey
Headers: {
    admin-email: "admin@example.com",
    admin-password: "password",
    Content-Type: "application/json"
}
Body: {
    has_access: true
}

Response: {
    success: true,
    permission: { ... }
}
```

---

## ✅ Checklist

Before going live:

- [ ] Run database migration in Supabase
- [ ] Test all service permissions in admin panel
- [ ] Test upgrade modal for each tier
- [ ] Verify pricing page displays correctly
- [ ] Test on mobile devices
- [ ] Update prices if needed
- [ ] Set up payment gateway (when ready)
- [ ] Add monitoring/analytics
- [ ] Test all API endpoints
- [ ] Verify RLS policies are correct

---

## 💡 Tips

1. **Start Conservative:** Begin with restrictive permissions and gradually open up access based on user feedback

2. **Monitor Usage:** Track which services users try to access most when restricted - this shows demand

3. **A/B Test Pricing:** Consider different price points for different user segments

4. **Communicate Value:** Make sure users understand what they get with each tier

5. **Easy Upgrades:** Make the upgrade process as smooth as possible

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review browser console for errors
3. Check Supabase logs
4. Verify all environment variables are set correctly

---

## 🎉 You're Done!

The service permissions system is now fully set up. Users will see beautiful upgrade prompts when they try to access restricted services, and you can easily manage permissions through the admin panel.

**Next Steps:**
1. Run the migration
2. Configure default permissions
3. Test the system
4. Launch! 🚀

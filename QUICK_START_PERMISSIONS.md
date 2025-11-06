# 🚀 Quick Start - Service Permissions System

## 5-Minute Setup

### Step 1: Database (2 minutes)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy `migrations/service_permissions.sql` content
4. Click "Run"
5. Wait for ✅ success messages

### Step 2: Deploy Code (2 minutes)

```bash
# On your local machine
git add .
git commit -m "Add service permissions system"
git push origin main

# On Replit
git pull origin main
# Server auto-restarts
```

### Step 3: Configure Permissions (1 minute)

1. Go to `/admin/service-permissions`
2. Login with admin credentials
3. Toggle switches for each tier:
   - **testlimit**: Only `complete-outfit` ✓
   - **bronze**: Only `complete-outfit` ✓
   - **silver**: All except `scene-recreation` and `style-transfer`
   - **gold**: Everything ✓

4. Changes save automatically!

---

## ✅ Quick Test

1. **Test as testlimit user:**
   - Go to `/index.html`
   - Click "عکاسی اکسسوری محصول"
   - Should see upgrade modal 🔒

2. **Test pricing page:**
   - Visit `/pricing.html`
   - Should see 3 beautiful pricing cards 💎

3. **Test admin panel:**
   - Visit `/admin/service-permissions`
   - Toggle a permission
   - Should see "✓ Permission updated successfully"

---

## 🎯 Key Files Created

| File | Purpose |
|------|---------|
| `migrations/service_permissions.sql` | Database setup |
| `public/admin-service-permissions.html` | Admin panel UI |
| `public/pricing.html` | Pricing page |
| `public/service-permission-check.js` | Permission checking logic |
| `SERVICE_PERMISSIONS_SETUP.md` | Full documentation |

---

## 🔑 Default Permissions

### testlimit (5 credits)
- ✓ complete-outfit
- ✗ All others

### bronze (50 credits)
- ✓ complete-outfit
- ✗ All others

### silver (100 credits)
- ✓ complete-outfit
- ✓ accessories-only
- ✓ color-collection
- ✓ flat-lay
- ✗ scene-recreation
- ✗ style-transfer

### gold (130 credits)
- ✓ All services

---

## 💰 Current Pricing

- **Bronze:** 199,000 تومان/month
- **Silver:** 399,000 تومان/month
- **Gold:** 599,000 تومان/month

To change: Edit `public/pricing.html`

---

## 🎨 What Users See

### When they click restricted service:

1. Beautiful modal appears 🔒
2. Shows their current tier
3. Suggests tier to upgrade to
4. Shows price and credits
5. Button to view pricing page
6. Can close modal to go back

### When they have access:

1. Click service card
2. Navigate directly to service
3. Can use service normally

---

## 🛠️ Admin Features

### Permissions Panel (`/admin/service-permissions`)

- Visual toggle switches
- Color-coded tiers
- Real-time updates
- See all 6 services × 4 tiers = 24 permissions
- One-click enable/disable

---

## ⚡ Pro Tips

1. **Test First:** Always test with testlimit account before changing live permissions

2. **Start Strict:** Begin with fewer permissions, add more based on demand

3. **Monitor:** Watch which services users try to access most

4. **Communicate:** Update pricing page when you change permissions

5. **Backup:** Before major changes, export database or take Supabase snapshot

---

## 🐛 Quick Fixes

### Modal not showing?
→ Check browser console, make sure `/service-permission-check.js` loads

### Admin panel empty?
→ Run the migration again, check Supabase connection

### Changes not saving?
→ Verify admin credentials in browser's localStorage

### User still sees restricted service?
→ They may have cached page, ask them to refresh (Ctrl+F5)

---

## 📞 Need Help?

1. Check `SERVICE_PERMISSIONS_SETUP.md` for detailed docs
2. Look at browser console for errors
3. Check Supabase logs
4. Verify `.env` file has correct credentials

---

## 🎉 You're Live!

That's it! Your service permissions system is ready. Users will see upgrade prompts, and you control everything from the admin panel.

**Enjoy!** 🚀

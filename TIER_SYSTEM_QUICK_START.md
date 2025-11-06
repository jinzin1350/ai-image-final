# Tier System - Quick Start Guide

## 🚀 Quick Implementation Steps

### 1. Run Database Migration

```sql
-- Execute this in Supabase SQL Editor
-- File: migrations/add-tier-system.sql
```

Go to Supabase Dashboard → SQL Editor → Paste the migration file → Run

### 2. Files Changed/Added

**Modified Files**:
- ✅ `index.js` - Added credit tracking and enforcement
- ✅ `public/admin-users.html` - Updated for 3-tier management

**New Files**:
- ✅ `migrations/add-tier-system.sql` - Database migration
- ✅ `public/user-usage-widget.js` - User dashboard widget
- ✅ `TIER_SYSTEM_DOCUMENTATION.md` - Full documentation

### 3. Tier Configuration

| Tier | Credits/Month | Icon | Target Users |
|------|---------------|------|--------------|
| Bronze (برنزی) | 50 | 🥉 | New users, small businesses |
| Silver (نقره‌ای) | 100 | ⭐ | Growing businesses |
| Gold (طلایی) | 130 | 👑 | Established brands, agencies |

### 4. Service Costs

**Standard Services** (1 credit):
- Flat Lay Photography
- Catalog Collection
- Luxury Product
- Professional Modeling
- All other standard modes

**Premium Services** (2 credits):
- Style Transfer (`mode: 'style-transfer'`)
- Brand Theme Recreation (`mode: 'scene-recreation'`)

### 5. Add Usage Widget to Your App

```html
<!-- In your main app page (e.g., index.html or app.html) -->
<div id="user-usage-widget"></div>
<script src="/user-usage-widget.js"></script>
```

### 6. Test the System

```bash
# 1. Create a test user
# 2. Generate some images
# 3. Check credits are deducted
# 4. Try to exceed limit
# 5. Verify admin panel shows correct data
```

---

## 📋 Admin Panel Quick Actions

### Change User Tier
1. Go to `/admin-users.html`
2. Find the user
3. Use dropdown: Bronze (50) / Silver (100) / Gold (130)
4. Click to apply

### Reset User Credits
1. Go to `/admin-users.html`
2. Find the user
3. Click "Reset" button
4. Confirm

---

## 🔧 Key API Endpoints

### Get User Usage
```javascript
GET /api/user/usage
Headers: Authorization: Bearer {token}

Response:
{
  "tier": "bronze",
  "credits": {
    "used": 25,
    "limit": 50,
    "remaining": 25
  }
}
```

### Generate Image (Auto-deducts credits)
```javascript
POST /api/generate
Headers: Authorization: Bearer {token}
Body: { mode: 'complete-outfit', ... }

// Credits are checked and deducted automatically
// Returns 403 if insufficient credits
```

### Admin: Change Tier
```javascript
PUT /api/admin/users/:userId
Headers: admin-email, admin-password
Body: {
  "tier": "gold",
  "credits_limit": 130
}
```

---

## ⚠️ Important Notes

1. **Credits are deducted BEFORE generation** - No refunds if generation fails
2. **Caption/Description limits** are tracked separately (not implemented yet in this version)
3. **Monthly reset** must be done manually via admin panel (auto-reset not implemented yet)
4. **Demo mode** (no token) bypasses all limits
5. **Premium services cost 2x** - Make sure users know this

---

## 🐛 Quick Troubleshooting

**Credits not deducting?**
- Check Supabase connection
- Verify migration ran successfully
- Check user has entry in `user_limits` table

**User can't generate images?**
- Check `/api/user/usage` endpoint
- Verify credits_used < credits_limit
- Check browser console for errors

**Admin panel not showing tiers?**
- Clear browser cache
- Check admin authentication
- Verify migration added `tier` column

---

## 📝 Next Steps

After implementing the basic system, consider:

1. **Auto-reset cron job** - Reset credits monthly
2. **Email notifications** - Alert users when low on credits
3. **Upgrade flow** - Allow users to purchase higher tiers
4. **Analytics** - Track which services are most popular
5. **Caption/Description tracking** - Implement per-product limits

---

## 📚 Full Documentation

See `TIER_SYSTEM_DOCUMENTATION.md` for complete details on:
- Database schema
- Implementation details
- Security considerations
- Future enhancements
- Detailed troubleshooting

---

**Ready to go!** 🎉

Run the migration → Refresh your app → Start tracking usage!

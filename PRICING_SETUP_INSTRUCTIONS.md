# Pricing System Setup Instructions

## Overview
The pricing system has been successfully migrated from localStorage to Supabase database. All pricing is now centrally managed through the admin panel and automatically fetched by the frontend.

## What Was Done

### 1. Database Setup
- Created `tier_pricing` table in Supabase
- Added Row Level Security (RLS) policies
- Initialized default pricing for all 4 tiers (testlimit, bronze, silver, gold)
- Location: `migrations/pricing_table.sql`

### 2. Backend API Endpoints
Added 5 new endpoints to `index.js`:

- **GET `/api/pricing`** - Public endpoint to get all pricing
- **GET `/api/pricing/:tier`** - Public endpoint to get specific tier pricing
- **GET `/api/admin/pricing`** - Admin endpoint to get all pricing (with admin auth)
- **PUT `/api/admin/pricing/:tier`** - Admin endpoint to update specific tier pricing
- **POST `/api/admin/pricing/batch`** - Admin endpoint to batch update all pricing

### 3. Admin Panel Updates
Updated `public/admin-pricing.html`:
- Changed from localStorage to database API
- Added `loadPricing()` to fetch from `/api/admin/pricing`
- Added `saveTierPricing()` to save individual tier via PUT
- Added `saveAllPricing()` to batch save all tiers via POST
- Added error toast notifications for failed saves
- Added real-time preview updates

### 4. Frontend Updates

**public/pricing.html**:
- Added `loadPricing()` to fetch pricing from `/api/pricing`
- Added `updatePricingCard()` to dynamically update price displays
- Updates pricing cards and comparison table automatically

**public/service-permission-check.js**:
- Added `loadPricingData()` to fetch pricing from `/api/pricing`
- Updates `TIER_INFO` object with database values
- Upgrade modals now show correct pricing from database

## Steps to Deploy

### Step 1: Run Database Migration
1. Go to Supabase SQL Editor
2. Copy contents of `migrations/pricing_table.sql`
3. Run the migration
4. Verify output shows all 4 tiers installed

### Step 2: Deploy to Replit
```bash
git add .
git commit -m "Add database-backed pricing system

- Migrate pricing from localStorage to Supabase
- Add 5 new API endpoints for pricing management
- Update admin panel to use database
- Update frontend to fetch pricing dynamically
- Add error handling and toast notifications

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

### Step 3: Test the System

#### Test Admin Panel
1. Go to `/admin/pricing`
2. Change a price (e.g., change Bronze from 199,000 to 299,000)
3. Click "Save Bronze Pricing"
4. Should see success toast
5. Refresh page - new price should persist

#### Test Pricing Page
1. Go to `/pricing.html`
2. Should see prices from database
3. Make a change in admin panel
4. Refresh pricing page - should show updated prices

#### Test Upgrade Modals
1. Log in as a bronze user
2. Try to access a silver-only service
3. Upgrade modal should show correct pricing from database
4. Prices should match what's in admin panel

## Database Schema

```sql
CREATE TABLE tier_pricing (
  id BIGSERIAL PRIMARY KEY,
  tier TEXT UNIQUE NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  credits INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'IRR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Default Pricing

| Tier | Price (IRR) | Credits | Color |
|------|-------------|---------|-------|
| Test Limit | 0 | 5 | Blue |
| Bronze | 199,000 | 50 | Orange |
| Silver | 399,000 | 100 | Gray |
| Gold | 599,000 | 130 | Yellow |

## API Documentation

### Public Endpoints

#### GET /api/pricing
Get all active pricing tiers.

**Response:**
```json
{
  "success": true,
  "pricing": [
    {
      "tier": "testlimit",
      "price": 0,
      "credits": 5,
      "currency": "IRR"
    },
    ...
  ]
}
```

#### GET /api/pricing/:tier
Get pricing for a specific tier.

**Response:**
```json
{
  "success": true,
  "pricing": {
    "tier": "bronze",
    "price": 199000,
    "credits": 50,
    "currency": "IRR"
  }
}
```

### Admin Endpoints

#### GET /api/admin/pricing
Get all pricing (admin only).

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "pricing": [...]
}
```

#### PUT /api/admin/pricing/:tier
Update pricing for a specific tier.

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Body:**
```json
{
  "price": 299000,
  "credits": 60
}
```

**Response:**
```json
{
  "success": true,
  "pricing": {
    "tier": "bronze",
    "price": 299000,
    "credits": 60
  }
}
```

#### POST /api/admin/pricing/batch
Batch update all pricing.

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Body:**
```json
{
  "pricing": [
    { "tier": "testlimit", "price": 0, "credits": 5 },
    { "tier": "bronze", "price": 199000, "credits": 50 },
    { "tier": "silver", "price": 399000, "credits": 100 },
    { "tier": "gold", "price": 599000, "credits": 130 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "All pricing updated successfully"
}
```

## Files Modified

1. ✅ `migrations/pricing_table.sql` - Created
2. ✅ `index.js` - Added 5 API endpoints
3. ✅ `public/admin-pricing.html` - Updated to use API
4. ✅ `public/pricing.html` - Added dynamic pricing loading
5. ✅ `public/service-permission-check.js` - Added pricing fetch

## Troubleshooting

### Pricing not updating
1. Check Supabase SQL Editor for migration success
2. Check browser console for API errors
3. Verify admin authentication is working
4. Check Replit logs for backend errors

### Error: "Failed to load pricing data"
1. Verify Supabase connection is working
2. Check RLS policies allow public read access
3. Verify `/api/pricing` endpoint is accessible

### Admin panel shows old prices
1. Clear browser cache
2. Check sessionStorage for admin_token
3. Verify `/api/admin/pricing` endpoint authentication

## Next Steps

After deployment and testing:
1. Consider adding pricing change history/audit log
2. Add currency conversion support
3. Add seasonal discounts/promotions
4. Add email notifications for price changes

## Support

If you encounter issues:
1. Check Replit logs
2. Check browser console
3. Check Supabase logs
4. Verify all migration steps completed

---

✅ **Pricing system is now fully database-backed!**

All prices are managed centrally in Supabase and automatically synced across:
- Admin panel
- Pricing page
- Upgrade modals
- Permission checks

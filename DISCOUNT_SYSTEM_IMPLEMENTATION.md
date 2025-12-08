# 🎯 Discount System Implementation Guide

## ✅ Complete - Ready to Use!

This document explains the **complete discount system** that has been implemented for your pricing tiers.

---

## 📋 What Was Implemented

### 1. **Database Schema** ✅
- Added `discount_percentage` column (0-100)
- Added `discount_active` column (boolean)
- Created helper function `get_discounted_price()`
- Added indexes for performance

**Location:** `migrations/add_discount_to_pricing.sql`

### 2. **Admin Panel** ✅
- Added discount percentage input (0-100%)
- Added "Activate Discount" checkbox
- Real-time preview showing discounted prices
- Discount badge shows in preview

**Location:** `public/admin-pricing.html`

### 3. **API Endpoints** ✅
Updated endpoints to handle discount data:
- `GET /api/pricing` - Returns discount info to users
- `GET /api/admin/pricing` - Returns discount info to admin
- `PUT /api/admin/pricing/:tier` - Saves discount settings
- `POST /api/admin/pricing/batch` - Batch save with discounts

**Location:** `index.js` (lines 5721-5826)

### 4. **User-Facing Pages** ✅
- **pricing.html** - Shows crossed-out original price + discounted price + badge
- **landing.html** - Dynamic pricing with discount display

---

## 🚀 How to Use

### Step 1: Run Database Migration

Open Supabase SQL Editor and run:

```sql
-- Copy and paste the entire contents of:
migrations/add_discount_to_pricing.sql
```

This adds the discount columns to your `tier_pricing` table.

### Step 2: Set Discounts in Admin Panel

1. Go to `/admin/pricing`
2. For each tier (Bronze, Silver, Gold):
   - Enter the **Discount Percentage** (e.g., 20 for 20% off)
   - Check **🎯 Activate Discount** to enable it
   - Click **Save [Tier] Pricing** or **💾 Save All Changes**

3. See the **Preview** section update immediately!

### Step 3: Verify on User Pages

1. Visit `/pricing.html` - Users see:
   - ~~Original Price~~ (crossed out)
   - **Discounted Price** (large)
   - **20% تخفیف** (red badge)

2. Visit `/` (landing page) - Same discount display in pricing section

---

## 📊 Visual Example

### Admin Panel (Before)
```
┌─────────────────────────┐
│ Bronze Tier             │
│ Price: 199,000 Toman    │
│ [Save]                  │
└─────────────────────────┘
```

### Admin Panel (After)
```
┌─────────────────────────────────┐
│ Bronze Tier                     │
│ Price: 199,000 Toman            │
│ Discount: [20]%                 │
│ [x] Activate Discount           │
│ ─────────────────               │
│ Preview:                        │
│ ~~199,000~~ (crossed)           │
│ 159,200 (BIG)                   │
│ [20% OFF] (red badge)           │
│ [Save]                          │
└─────────────────────────────────┘
```

### User Sees
```
┌─────────────────────────┐
│       🥉 برنز            │
│   ~~199,000~~           │
│   159,200               │
│   [20% تخفیف]           │
│   تومان / ماهانه        │
└─────────────────────────┘
```

---

## 🎨 Design Details

### Discount Badge Style
- **Color:** Red gradient (#ef4444 → #dc2626)
- **Text:** White, bold
- **Shadow:** Soft glow effect
- **Border-radius:** 20px (rounded pill)

### Original Price
- **Color:** Gray (#9ca3af)
- **Style:** Line-through (crossed out)
- **Size:** Smaller than discounted price

### Discounted Price
- **Size:** 36px-56px (depending on page)
- **Weight:** 800 (very bold)
- **Color:** Dark (#1a1a1a) or gradient

---

## 🔧 Technical Details

### Database Columns

| Column               | Type    | Description                        |
|----------------------|---------|------------------------------------|
| `discount_percentage`| INTEGER | 0-100, percentage off              |
| `discount_active`    | BOOLEAN | Whether discount is shown to users |

### Calculation
```javascript
const hasDiscount = discount_active && discount_percentage > 0;
const discountedPrice = hasDiscount
    ? price - (price * discount_percentage / 100)
    : price;
```

### Example
- Original Price: 199,000 Toman
- Discount: 20%
- Calculation: 199,000 - (199,000 × 0.20) = **159,200 Toman**

---

## 📁 Modified Files

1. ✅ `migrations/add_discount_to_pricing.sql` - NEW
2. ✅ `public/admin-pricing.html` - Updated
3. ✅ `public/pricing.html` - Updated
4. ✅ `public/landing.html` - Updated
5. ✅ `index.js` - Updated API endpoints

---

## 🧪 Testing Checklist

- [ ] Run database migration in Supabase
- [ ] Go to `/admin/pricing`
- [ ] Set Bronze to 20% discount, activate it
- [ ] Save and check preview
- [ ] Visit `/pricing.html` - verify discount shows
- [ ] Visit `/` (landing) - verify discount shows
- [ ] Turn off discount - verify it disappears
- [ ] Test all 3 tiers (Bronze, Silver, Gold)

---

## 💡 Usage Examples

### Example 1: Holiday Sale (20% off all tiers)
```
Bronze: 199,000 → 159,200 (20% off) ✅
Silver: 399,000 → 319,200 (20% off) ✅
Gold: 599,000 → 479,200 (20% off) ✅
```

### Example 2: Promote Silver Tier (30% off)
```
Bronze: 199,000 (no discount)
Silver: 399,000 → 279,300 (30% off) ✅
Gold: 599,000 (no discount)
```

### Example 3: Flash Sale (50% off Bronze)
```
Bronze: 199,000 → 99,500 (50% off) ✅
Silver: 399,000 (no discount)
Gold: 599,000 (no discount)
```

---

## ⚠️ Important Notes

1. **Discount is visual only** - You still need to apply actual discount in payment processing
2. **Instant updates** - Changes in admin panel show immediately on user pages
3. **No data loss** - Original price is always preserved
4. **Flexible** - Can activate/deactivate anytime without data change
5. **Safe** - Doesn't affect existing user subscriptions

---

## 🎯 What's Next?

Your discount system is **100% complete** and ready to use!

1. Run the SQL migration
2. Set your first discount
3. Watch it appear on pricing pages

If you need any adjustments or have questions, just ask!

---

**Created:** 2025-11-09
**Status:** ✅ Complete
**Version:** 1.0

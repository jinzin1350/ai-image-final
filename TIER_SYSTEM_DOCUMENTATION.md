# Tier-Based Usage Tracking System Documentation

## Overview

This document describes the implementation of a credit-based tier system for the AI Fashion Studio platform. Users are assigned to one of three tiers (Bronze, Silver, Gold), each with different credit limits. Credits are consumed when generating images, with premium services costing more credits.

---

## Table of Contents

1. [Tier Structure](#tier-structure)
2. [Credit System](#credit-system)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Admin Panel](#admin-panel)
6. [User Dashboard](#user-dashboard)
7. [Implementation Details](#implementation-details)
8. [Migration Guide](#migration-guide)

---

## Tier Structure

### Bronze Tier (Default)
- **Credits**: 50 per month
- **Target**: New users, small businesses
- **Icon**: 🥉
- **Color**: Amber (#f59e0b)

### Silver Tier
- **Credits**: 100 per month
- **Target**: Growing businesses
- **Icon**: ⭐
- **Color**: Gray (#6b7280)

### Gold Tier (Premium)
- **Credits**: 130 per month
- **Target**: Established brands, agencies
- **Icon**: 👑
- **Color**: Gold (#eab308)
- **Note**: Gold tier users are marked as `is_premium = true`

---

## Credit System

### Service Costs

**Standard Services (1 credit per image):**
- عکاسی Flat Lay حرفه‌ای (Professional Flat Lay Photography)
- عکاسی کاتالوگ کالکشن (Catalog Collection Photography)
- عکاسی محصول لوکس (Luxury Product Photography)
- عکاسی مدلینگ حرفه‌ای (Professional Modeling Photography)
- All other standard image generation modes

**Premium Services (2 credits per image):**
- انتقال استایل (Style Transfer) - `mode: 'style-transfer'`
- عکاسی با تِم برندهای معروف (Brand Theme Photography) - `mode: 'scene-recreation'`

**Caption & Description Generation:**
- Caption generation: Free (but limited to once per product)
- Description generation: Free (but limited to once per product)
- Both are tracked separately in the `product_generations` table

### Credit Enforcement

- Credits are checked **before** image generation
- If user has insufficient credits, request is blocked with HTTP 403
- Credits are deducted **immediately** upon successful validation
- No refunds if generation fails after credit deduction (this is by design to prevent abuse)

---

## Database Schema

### Migration File: `migrations/add-tier-system.sql`

#### Modified Table: `user_limits`

**New Columns:**
```sql
tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold'))
credits_limit INTEGER DEFAULT 50
credits_used INTEGER DEFAULT 0
```

**Existing Columns (Still Used):**
```sql
id BIGSERIAL PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
email TEXT
is_premium BOOLEAN DEFAULT false
last_reset_date TIMESTAMP WITH TIME ZONE
notes TEXT
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
```

**Deprecated Columns (Kept for backward compatibility):**
```sql
images_limit INTEGER DEFAULT 10
images_used INTEGER DEFAULT 0
captions_limit INTEGER DEFAULT 5
captions_used INTEGER DEFAULT 0
descriptions_limit INTEGER DEFAULT 3
descriptions_used INTEGER DEFAULT 0
```

#### New Table: `product_generations`

Tracks caption and description usage per product to enforce one-time-per-product limits.

```sql
CREATE TABLE product_generations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_identifier TEXT NOT NULL, -- Hash or unique ID for product
  has_generated_caption BOOLEAN DEFAULT false,
  has_generated_description BOOLEAN DEFAULT false,
  caption_text TEXT,
  description_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_identifier)
);
```

---

## API Endpoints

### 1. Image Generation with Credit Tracking

**Endpoint**: `POST /api/generate`

**Authentication**: Required (Bearer token)

**Credit Check Flow**:
1. Request received with `mode` parameter
2. `checkAndDeductCredits(userId, mode)` is called
3. Function checks current usage vs. limit
4. If sufficient credits: deduct cost and proceed
5. If insufficient: return 403 error with message

**Example Error Response**:
```json
{
  "error": "اعتبار شما به پایان رسیده است. پلن برنزی: 50/50 اعتبار استفاده شده",
  "remaining": 0,
  "needsUpgrade": true
}
```

**Example Success Response**:
```json
{
  "success": true,
  "imagePath": "https://...",
  "model": "Model Name",
  "background": "Background Name",
  "description": "...",
  "prompt": "...",
  "message": "تصویر با موفقیت تولید شد!"
}
```

### 2. Get User Usage Stats

**Endpoint**: `GET /api/user/usage`

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "success": true,
  "tier": "bronze",
  "tierName": "برنزی",
  "credits": {
    "used": 25,
    "limit": 50,
    "remaining": 25,
    "percentage": 50
  },
  "lastResetDate": "2025-11-01T00:00:00Z",
  "email": "user@example.com"
}
```

### 3. Admin: Get All Users

**Endpoint**: `GET /api/admin/users`

**Authentication**: Admin headers required

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "user_id": "uuid",
      "email": "user@example.com",
      "tier": "bronze",
      "credits_used": 25,
      "credits_limit": 50,
      "is_premium": false,
      "last_reset_date": "2025-11-01T00:00:00Z",
      "created_at": "2025-10-15T10:30:00Z"
    }
  ]
}
```

### 4. Admin: Update User Tier

**Endpoint**: `PUT /api/admin/users/:userId`

**Authentication**: Admin headers required

**Request Body**:
```json
{
  "tier": "gold",
  "credits_limit": 130,
  "is_premium": true
}
```

**Or to reset credits**:
```json
{
  "credits_used": 0,
  "last_reset_date": "2025-11-05T00:00:00Z"
}
```

---

## Admin Panel

### Location: `/admin-users.html`

**Features**:
- View all users with tier, credits used, and limits
- Change user tier via dropdown (Bronze/Silver/Gold)
- Reset user credits to 0
- Visual progress bars showing credit usage
- Color-coded tiers

**UI Components**:
- Tier badge with color coding
- Credit usage progress bar (red when depleted, blue otherwise)
- Dropdown to change tier with automatic credit limit update
- "Reset" button to clear user's credits

**Functions**:
- `changeTier(userId, newTier)` - Changes user tier and updates limits
- `resetCredits(userId)` - Resets credits_used to 0
- `loadUsers()` - Fetches and displays all users

---

## User Dashboard

### Component: `user-usage-widget.js`

**Usage**:
```html
<div id="user-usage-widget"></div>
<script src="/user-usage-widget.js"></script>
```

**Features**:
- Auto-refreshing widget (every 30 seconds)
- Displays current tier with icon and color
- Credit usage with progress bar
- Visual warnings when credits are low (<10) or critical (<5)
- Service cost information
- Blockage notification when credits reach 0

**States**:
- Normal: Blue progress bar
- Low Credits (<10): Amber warning badge
- Critical (<5): Red warning badge
- Depleted (0): Red border + warning message

---

## Implementation Details

### Helper Functions (in `index.js`)

#### `getServiceCreditCost(mode)`
Returns credit cost based on service mode.

```javascript
function getServiceCreditCost(mode) {
  const premiumServices = ['style-transfer', 'scene-recreation'];
  return premiumServices.includes(mode) ? 2 : 1;
}
```

#### `getTierLimits(tier)`
Returns tier configuration.

```javascript
function getTierLimits(tier) {
  const limits = {
    bronze: { credits: 50, name: 'برنزی' },
    silver: { credits: 100, name: 'نقره‌ای' },
    gold: { credits: 130, name: 'طلایی' }
  };
  return limits[tier] || limits.bronze;
}
```

#### `async checkAndDeductCredits(userId, mode)`
Main enforcement function.

**Flow**:
1. Check if Supabase is available and user is authenticated
2. Fetch user's current limits from database
3. Calculate credit cost for the requested service
4. Check if user has enough credits
5. If yes: deduct credits and return success
6. If no: return error with remaining credits

**Returns**:
```javascript
{
  allowed: boolean,
  message: string,
  remaining: number,
  creditsUsed?: number,
  creditsLimit?: number
}
```

---

## Migration Guide

### Step 1: Run the SQL Migration

Execute the migration file on your Supabase database:

```bash
# Connect to your Supabase database
psql -h your-project.supabase.co -U postgres -d postgres

# Run migration
\i migrations/add-tier-system.sql
```

**Or** use the Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `migrations/add-tier-system.sql`
3. Execute the query

### Step 2: Verify Migration

Check that the new columns exist:

```sql
SELECT tier, credits_limit, credits_used, email
FROM user_limits
LIMIT 5;
```

### Step 3: Update Frontend

1. **Add usage widget to main app**:
   ```html
   <div id="user-usage-widget"></div>
   <script src="/user-usage-widget.js"></script>
   ```

2. **Update navigation/sidebar** to show tier badge

3. **Handle 403 errors** from `/api/generate`:
   ```javascript
   if (response.status === 403) {
     const data = await response.json();
     if (data.needsUpgrade) {
       showUpgradeModal(data.message);
     }
   }
   ```

### Step 4: Test the System

1. **Create test users** with different tiers
2. **Generate images** and verify credit deduction
3. **Test premium services** (2 credits)
4. **Test credit depletion** blocking
5. **Test admin panel** tier changes
6. **Test credit reset** functionality

---

## Common Operations

### Set User to Gold Tier

```javascript
const response = await fetchWithAuth('/api/admin/users/{userId}', {
  method: 'PUT',
  body: JSON.stringify({
    tier: 'gold',
    credits_limit: 130,
    is_premium: true
  })
});
```

### Reset User Credits (Monthly Reset)

```javascript
const response = await fetchWithAuth('/api/admin/users/{userId}', {
  method: 'PUT',
  body: JSON.stringify({
    credits_used: 0,
    last_reset_date: new Date().toISOString()
  })
});
```

### Check User's Remaining Credits

```javascript
const response = await fetch('/api/user/usage', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log(`Remaining: ${data.credits.remaining}/${data.credits.limit}`);
```

---

## Future Enhancements

1. **Automatic Monthly Reset**: Cron job to reset credits on the first of each month
2. **Usage Analytics**: Track which services users use most
3. **Credit Purchase**: Allow users to buy additional credits
4. **Rollover Credits**: Carry unused credits to next month (for premium users)
5. **Email Notifications**: Alert users when credits are low
6. **Tier Upgrade Flow**: In-app purchase/upgrade workflow
7. **Credit Packages**: One-time credit purchases (10, 25, 50 credits)

---

## Troubleshooting

### Issue: Credits not deducting

**Check**:
1. Supabase connection is active
2. User is authenticated (`req.user.id` exists)
3. `user_limits` table has row for the user
4. Migration has been run

### Issue: User stuck at 0 credits

**Solution**: Use admin panel "Reset" button or run:
```sql
UPDATE user_limits
SET credits_used = 0, last_reset_date = NOW()
WHERE user_id = 'user-uuid-here';
```

### Issue: Tier changes not reflected

**Solution**:
1. Check browser console for errors
2. Verify admin authentication
3. Reload the page
4. Check database directly:
```sql
SELECT tier, credits_limit FROM user_limits WHERE email = 'user@email.com';
```

---

## Security Considerations

1. **Credit Deduction is Atomic**: Uses database transactions
2. **No Client-Side Bypass**: All checks happen server-side
3. **Admin Authentication**: Required for all tier management
4. **Rate Limiting**: Consider adding rate limits to prevent abuse
5. **Audit Logging**: All tier changes should be logged (future enhancement)

---

## Contact & Support

For questions or issues with the tier system:
- Check this documentation first
- Review the code in `index.js` (search for "USAGE TRACKING")
- Check migration file: `migrations/add-tier-system.sql`
- Inspect admin panel: `/admin-users.html`

---

**Last Updated**: November 5, 2025
**Version**: 1.0.0

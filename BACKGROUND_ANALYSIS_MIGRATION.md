# Background Analysis System - Migration Guide

## 🎯 What This Does

This system **caches AI analysis** of brand photos to save time and money:
- ✅ Each photo analyzed only **ONCE** (not every time user selects it)
- ✅ Analysis happens **automatically in background** after upload
- ✅ Users get **instant generation** (no analysis delay)
- ✅ **Retry logic** (up to 3 attempts) for failed analyses

---

## 📋 Migration Steps

### Step 1: Run Database Migration

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open and run: `migrations/add_analysis_to_brand_photos.sql`
4. Click **Run** to execute
5. Verify success (should see "Success. No rows returned")

### Step 2: Restart Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm start
```

You should see this in the logs:
```
🔄 Starting automatic brand photo analysis scheduler (every 10 seconds)
```

### Step 3: Verify Background Worker

Watch the server logs. Every 10 seconds, the background worker checks for pending photos.

**If there are pending photos:**
```
🔄 Processing analysis for photo ID: abc123
✅ Successfully analyzed photo ID: abc123
```

**If no pending photos:**
```
(silent - no logs to avoid spam)
```

---

## 🔄 How It Works

### Upload Flow:
```
Admin uploads photo → Saved to DB (status: pending)
                   ↓
           Background worker picks it up (every 10 sec)
                   ↓
              AI analyzes photo
                   ↓
         Analysis saved to DB (status: analyzed)
```

### Generation Flow:
```
User selects brand photo → Fetch from DB with pre-saved analysis
                         ↓
                Send to AI for generation (no analysis step!)
                         ↓
                    Instant results ⚡
```

---

## 📊 Admin Panel Features

When viewing brand photos in admin panel:

### Status Badges:
- **✓ تحلیل شده** (Green) - Photo analyzed successfully
- **🔄 در حال تحلیل...** (Blue, pulsing) - Currently being analyzed
- **⏳ در صف تحلیل** (Orange) - Waiting in queue
- **✗ خطا** (Red) - Analysis failed after 3 retries

### Auto-Refresh:
- Photos grid refreshes every **15 seconds** automatically
- See status updates in real-time
- No manual refresh needed!

---

## 🔧 Troubleshooting

### Photos stuck in "pending" status?

**Check server logs:**
```bash
# Should see background worker running:
🔄 Starting automatic brand photo analysis scheduler (every 10 seconds)
```

**If not running:**
- Ensure Supabase is configured (check `.env`)
- Ensure Gemini API is configured (check `.env`)
- Restart the server

### Analysis failing repeatedly?

**Check photo ID in database:**
```sql
SELECT id, image_url, analysis_status, analysis_retry_count
FROM brand_reference_photos
WHERE analysis_status = 'failed';
```

**Manually retry a failed photo:**
```sql
UPDATE brand_reference_photos
SET analysis_status = 'pending', analysis_retry_count = 0
WHERE id = 'photo-id-here';
```

The background worker will pick it up automatically.

---

## 🧪 Testing

### Test 1: Upload new photo
1. Go to Admin Panel → Brand Studio
2. Select a brand
3. Upload a photo (Recreation or Style Transfer)
4. Watch the status badge: ⏳ → 🔄 → ✓

### Test 2: Verify analysis saved
```sql
SELECT id, analysis_status, ai_analysis
FROM brand_reference_photos
WHERE analysis_status = 'analyzed'
LIMIT 1;
```

You should see the `ai_analysis` field populated with detailed analysis text.

### Test 3: User generation
1. Go to `/recreation` or `/transfer` page
2. Select a brand
3. Select a photo with ✓ status
4. Upload garment and generate
5. **Should be instant** (no "analyzing scene" delay!)

---

## 📈 Performance Impact

### Before:
```
User selects photo → AI analyzes (10-15 sec) → User uploads garment → AI generates (30-60 sec)
Total: ~50-75 seconds
```

### After:
```
User selects photo → User uploads garment → AI generates (30-60 sec)
Total: ~30-60 seconds (20-30% faster!)
```

### Cost Savings:
- **Before**: Every user selection = 1 analysis API call
- **After**: Every photo uploaded = 1 analysis API call (shared across all users)
- **Savings**: Up to 90% reduction in analysis API costs!

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Server logs show background worker running
- ✅ Admin panel shows status badges
- ✅ Photos automatically transition from ⏳ → 🔄 → ✓
- ✅ User generation is instant (no analysis delay)
- ✅ Database has `ai_analysis` populated

---

## 📝 Notes

- Background worker processes **1 photo at a time** to avoid overwhelming the AI API
- Photos are processed **FIFO** (oldest pending first)
- Failed photos retry **up to 3 times** before marked as failed
- Admin can manually retry failed photos by updating status to 'pending'
- Auto-refresh in admin panel **only runs when brand photos modal is open** (performance optimization)

---

## 🆘 Need Help?

If analysis is not working:
1. Check server logs for errors
2. Verify database migration succeeded
3. Ensure Gemini API key is valid
4. Check Supabase connection
5. Try manually triggering the worker:
   ```bash
   curl -X POST http://localhost:5000/api/admin/process-brand-photo-analyses
   ```

Enjoy instant, cost-effective brand photo analysis! 🚀

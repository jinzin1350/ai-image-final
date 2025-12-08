# ✅ AI-Powered Angle Detection - COMPLETE

## 🎯 What Was Added

### Admin Panel (`/admin-angles.html`)
✅ **AI-Powered Image Analysis**
- Upload an image → Nano Banana AI automatically detects the angle
- Auto-fills all form fields:
  - `angle_key` (e.g., "front", "back", "left-side")
  - `title_en` (English title)
  - `title_fa` (Persian title)
  - `description_en` (English description)
  - `description_fa` (Persian description)
- Shows AI analysis results with detected angle
- Image preview before saving
- Fallback to manual entry if AI fails

### How It Works

**1. Admin Uploads Image**
```
User selects image →
  AI analyzes via Nano Banana API →
    Detects angle type →
      Auto-fills form fields →
        User clicks Save →
          Image + data saved to database
```

**2. Frontend Displays Angles**
```
/scene-recreation page loads →
  Calls GET /api/angles →
    Loads all active angles with images →
      Shows angle cards with reference images →
        User selects angles →
          Generates one image per angle
```

---

## 🚀 Setup Instructions

### Step 1: Run SQL Migration
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Copy contents of: `migrations/create_angle_references_table.sql`
4. Click "Run"

This creates the `angle_references` table with 9 default angles.

### Step 2: Upload Your 7 Reference Images
1. Go to `/admin-angles.html`
2. Click "Add New Angle"
3. Upload one of your images from `angels/` folder
4. **AI will automatically analyze and detect:**
   - What angle it is (front, back, side, etc.)
   - English title
   - Persian title
   - Description
5. Review the AI's suggestions (edit if needed)
6. Click Save
7. Repeat for all 7 images

### Step 3: Test on Frontend
1. Go to `/scene-recreation`
2. Select brand reference photo
3. Upload garment
4. **Select model** ← This triggers angle section to appear
5. You'll see all your uploaded angle reference images!
6. Check multiple angles
7. Click Generate → One image per angle

---

## 📸 AI Analysis Example

**When you upload an image, the AI prompt is:**
```
Analyze this fashion photography image and identify the camera angle.

Determine which of these angles it represents:
- Front View: Direct frontal shot
- Back View: Shot from behind
- Left Side: Profile from left
- Right Side: Profile from right
- 3/4 Front-Left: 45° from front-left
- 3/4 Front-Right: 45° from front-right
- Full Body: Complete head-to-toe
- Waist-Up: Upper body from waist up
- Close-Up: Detailed fabric/details

Respond in JSON format with:
- angle_key
- title_en / title_fa
- description_en / description_fa
```

**AI Response Example:**
```json
{
  "angle_key": "front",
  "title_en": "Front View",
  "title_fa": "نمای جلو",
  "description_en": "Full frontal view - Hero shot showing complete front of garment",
  "description_fa": "نمایش کامل جلوی لباس - تصویر اصلی محصول"
}
```

---

## 🔧 Technical Details

### API Endpoint Used
```javascript
POST https://nanobanana.shop/api/analyze
Body: {
  image: "data:image/jpeg;base64,...",
  prompt: "Analyze this fashion photography..."
}
```

### Auto-Fill Logic
```javascript
1. User selects image
2. Convert to base64
3. Show image preview
4. Call Nano Banana API
5. Parse JSON response
6. Auto-fill form fields:
   - angleKey
   - titleEn
   - titleFa
   - descriptionEn
   - descriptionFa
7. User can edit before saving
```

### Fallback Handling
- If AI fails → Shows error message
- User can still manually fill fields
- Form validation still works
- Image still uploads normally

---

## 🎨 UI Updates

### Admin Panel
✅ Image preview panel
✅ AI analysis section with loading state
✅ Success message showing detected angle
✅ Error handling with clear messages

### Scene Recreation Page
✅ Angle section appears after model selection
✅ Dynamic loading from `/api/angles`
✅ Shows reference images in cards
✅ Checkbox selection with preview
✅ Count display: "3 angles selected - 3 images will be generated"

---

## 📋 Troubleshooting

### "Angle section doesn't appear on /scene-recreation"
**Solution:** You need to:
1. Run the SQL migration first
2. Upload at least one angle via admin panel
3. Make sure you select a model (angle section appears AFTER model selection)

### "AI analysis failed"
**Solutions:**
- Check Nano Banana API is accessible: `https://nanobanana.shop/api/analyze`
- Image must be valid JPEG/PNG
- Manually fill fields if AI fails
- Check browser console for detailed error

### "No angles showing in angle cards"
**Solution:**
- Run SQL migration to create table
- Upload images via `/admin-angles.html`
- Check `/api/angles` endpoint returns data
- Verify `is_active = true` for angles

---

## 📁 Files Modified

1. **public/admin-angles.html**
   - Added `analyzeAngleImage()` function
   - Added AI analysis UI section
   - Added image preview
   - Auto-fill form fields from AI response

2. **migrations/create_angle_references_table.sql**
   - Fixed DROP POLICY to prevent duplicate error

---

## ✨ Features Summary

### Admin Side:
✅ Upload image → AI analyzes angle automatically
✅ Auto-fills all fields (angle_key, titles, descriptions)
✅ Shows analysis results with confidence
✅ Image preview before save
✅ Manual override if AI is wrong
✅ Save to database with image URL

### User Side:
✅ Angle section appears after model selection
✅ Visual reference cards with uploaded images
✅ Multiple selection via checkboxes
✅ Preview showing selected count
✅ Sequential generation (one image per angle)
✅ Results displayed in grid with labels

---

## 🎯 Next Steps

1. ✅ SQL migration already created (just need to run it)
2. ⏳ Upload your 7 images via `/admin-angles.html`
3. ⏳ Test AI angle detection
4. ⏳ Test multi-angle generation on `/scene-recreation`

---

## 🤖 AI Integration

**Nano Banana API:**
- Endpoint: `https://nanobanana.shop/api/analyze`
- Method: POST
- Input: Base64 image + structured prompt
- Output: JSON with angle detection results
- Fallback: Manual entry if AI fails

**Response Parsing:**
- Handles markdown code blocks: ` ```json...``` `
- Handles raw JSON responses
- Error handling for malformed responses
- User-friendly error messages

---

**Status:** ✅ Complete and Ready for Testing
**Date:** December 2025
**Next Action:** Run SQL migration + Upload images

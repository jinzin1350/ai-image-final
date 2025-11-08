# Debug Guide: Image Delete Not Working

## Problem
Delete functionality is not working in both `/gallery` and `/admin-model-studio`

## Code Status
✅ Backend endpoint exists: `DELETE /api/generations/:id` (line 4444)
✅ Frontend function exists in gallery-script.js: `confirmDelete()` (line 668)
✅ Model studio delete exists: `deleteModel()` (line 1953)

## Debugging Steps

### 1. Check Browser Console
Open DevTools (F12) and try to delete an image. Look for:
- Any JavaScript errors
- Network requests to `/api/generations/...`
- Response status codes (401, 403, 500, etc.)

### 2. Check Authentication
The delete requires authentication. Verify:
```javascript
// In browser console:
console.log(localStorage.getItem('supabase_token'));
// Should show a token, not null
```

If token is null:
- User is not logged in
- Token expired
- Need to login again

### 3. Check Network Tab
When clicking delete:
1. Open DevTools → Network tab
2. Click delete button
3. Look for DELETE request to `/api/generations/{id}`
4. Check:
   - Status code (should be 200)
   - Response body
   - Request headers (Authorization header present?)

### 4. Check Server Logs
Look at your Node.js console for:
```
🗑️ User email@example.com deleting their own image: 123
```
or
```
👑 Admin email@example.com deleting image: 123
```

### 5. Common Issues

#### Issue: 401 Unauthorized
**Cause:** No token or invalid token
**Fix:**
```javascript
// Logout and login again
localStorage.clear();
// Then login through /auth
```

#### Issue: 403 Forbidden
**Cause:** User trying to delete someone else's image
**Check:** Backend logs for this message:
```
شما مجاز به حذف این تصویر نیستید
```

#### Issue: 500 Server Error
**Cause:** Database connection or Supabase error
**Check:**
- Supabase credentials in .env
- Database table permissions
- Server console for full error

#### Issue: Nothing happens when clicking delete
**Cause:** JavaScript error preventing function execution
**Check:**
- Browser console for errors
- Make sure gallery-script.js is loaded
- Check if `currentImage` variable is set

### 6. Test Delete Manually

#### Test Gallery Delete:
```bash
# In browser console:
const token = localStorage.getItem('supabase_token');
const imageId = 'your-image-id-here'; // Get from gallery

fetch(`/api/generations/${imageId}`, {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

#### Test Model Delete:
```bash
# In browser console (must be admin):
const token = localStorage.getItem('supabase_token');
const modelId = 'your-model-id-here';

fetch(`/api/admin/models/${modelId}`, {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### 7. Verify Backend is Running
```bash
# Check if server is running
curl http://localhost:3000/

# Test with curl (replace TOKEN and ID):
curl -X DELETE http://localhost:3000/api/generations/IMAGE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8. Check Database Permissions

Make sure in Supabase:
1. `generated_images` table has RLS (Row Level Security) configured properly
2. User can delete their own images
3. Admin can delete any image

### 9. Quick Fixes

#### Fix 1: Clear cache and restart
```bash
# Stop server
Ctrl+C

# Clear browser cache
Ctrl+Shift+Delete

# Restart server
node index.js

# Login again
```

#### Fix 2: Check authentication middleware
The endpoint uses `authenticateUser` middleware. Verify in index.js that it's working:
```javascript
// Around line 4444
app.delete('/api/generations/:id', authenticateUser, async (req, res) => {
```

#### Fix 3: Check if modal is opening
If clicking delete does nothing:
```javascript
// In gallery-script.js line 656:
function deleteImage() {
    console.log('Delete button clicked!'); // Add this
    console.log('Current image:', currentImage); // Add this
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.style.display = 'flex';
}
```

### 10. Error Messages to Look For

**Frontend:**
- "لطفاً ابتدا وارد حساب کاربری خود شوید"
- "خطا در حذف تصویر"

**Backend:**
- "Supabase تنظیم نشده است"
- "شما مجاز به حذف این تصویر نیستید"

## Expected Flow

### Gallery Delete:
1. User clicks delete icon → `deleteImage()` called
2. Modal opens asking for confirmation
3. User clicks confirm → `confirmDelete()` called
4. Fetch DELETE request with token to `/api/generations/{id}`
5. Backend checks authentication
6. Backend checks ownership (user vs admin)
7. Backend deletes from `generated_images` table
8. Success message shown
9. Gallery reloads

### Model Studio Delete:
1. Admin clicks delete button → `deleteModel(id, bucket)` called
2. Confirmation dialog shown
3. Admin confirms → Fetch DELETE to `/api/admin/models/{id}`
4. Backend deletes from `content_library` table
5. Backend deletes from Supabase Storage
6. Success message shown
7. List reloads

## Still Not Working?

If none of the above helps, please provide:
1. Browser console output (errors)
2. Network tab screenshot showing the DELETE request
3. Server console output
4. User email and image ID you're trying to delete

Then I can help debug further!

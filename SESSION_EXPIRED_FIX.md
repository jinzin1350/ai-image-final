# 🔧 Fix: "Session expired. Please login again." Error

## The Problem
You login successfully at `/admin`, but when you navigate to `/admin/generated-images`, you get:
> "Session expired. Please login again."

---

## ✅ Solution: Restart Server First!

### Step 1: Pull Latest Code & Restart Server ⚡

```bash
# Stop your Node.js server
Ctrl+C

# Pull latest changes
git pull

# Start server again
node index.js
```

**Why this is needed:**
The `/api/admin/generated-images` endpoint was added in recent commits. If your server is still running from before these commits, the endpoint doesn't exist yet!

When endpoint doesn't exist:
- Server returns 404 HTML error page
- Browser tries to parse HTML as JSON
- Error occurs → triggers "session expired" logic

---

### Step 2: Clear Browser Cache (Optional but Recommended)

```
1. Press F12 to open DevTools
2. Right-click on browser refresh button
3. Select "Empty Cache and Hard Reload"
```

Or:
```
1. Press Ctrl+Shift+Delete
2. Clear cached files
3. Close and reopen browser
```

---

### Step 3: Login and Navigate

```
1. Go to: http://localhost:3000/admin
2. Login with your credentials
3. Click "📸 Generated Images" in sidebar
4. Should work now! ✅
```

---

## 🔍 How to Verify Server Restarted Correctly

### Check Server Console

When you start `node index.js`, you should see:

```
✅ Server running on port 3000
✅ Connected to Supabase
✅ Admin email: your_admin@example.com
```

**No errors should appear!**

If you see errors like:
```
❌ Cannot find module...
❌ SyntaxError: Unexpected token...
❌ EADDRINUSE: Port 3000 is already in use
```

Then server didn't start properly.

---

## 🔍 How to Check if Endpoint Exists

### Method 1: Test API Directly

Open a new terminal and run:

```bash
# Windows CMD:
curl -H "admin-email: YOUR_ADMIN_EMAIL" -H "admin-password: YOUR_ADMIN_PASSWORD" http://localhost:3000/api/admin/generated-images

# Or use browser:
# Open DevTools Console (F12) and run:
```

```javascript
fetch('/api/admin/generated-images', {
  headers: {
    'admin-email': sessionStorage.getItem('adminEmail'),
    'admin-password': sessionStorage.getItem('adminPassword')
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected response:**
```json
{
  "success": true,
  "images": [...]
}
```

**If endpoint doesn't exist (server not restarted):**
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Error</title>
...
```

---

## 🔍 Detailed Debugging

### Open Browser Console (F12)

With the improved logging, you'll now see:

**If working correctly:**
```
🔄 Fetching generated images...
📥 Response status: 200
📥 Response content-type: application/json; charset=utf-8
✅ Loaded 15 images
```

**If server not restarted:**
```
🔄 Fetching generated images...
📥 Response status: 404
📥 Response content-type: text/html
❌ Non-JSON response: <!DOCTYPE html><html><head><title>Error</title>...
```

**If authentication issue:**
```
🔄 Fetching generated images...
📥 Response status: 401
📥 Response content-type: application/json
❌ Server error: {"success":false,"error":"Unauthorized"}
```

---

## 🎯 Common Scenarios

### Scenario 1: Forgot to Restart Server

**Symptoms:**
- Login works fine
- Dashboard works fine
- Other admin pages work fine
- ONLY `/admin/generated-images` fails

**Cause:** Endpoint doesn't exist on running server (added in recent commits)

**Fix:** `git pull` + restart server

---

### Scenario 2: Port Already in Use

**Symptoms:**
- Can't start server
- Error: `EADDRINUSE: address already in use :::3000`

**Fix (Windows):**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace <PID> with actual PID number)
taskkill /PID <PID> /F

# Start server again
node index.js
```

**Fix (Linux/Mac):**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Start server again
node index.js
```

---

### Scenario 3: Wrong Admin Credentials

**Symptoms:**
- Can't login at `/admin`
- Gets "Invalid credentials" error

**Fix:**

Check your `.env` file:
```env
ADMIN_EMAIL=your_admin@example.com
ADMIN_PASSWORD=your_secure_password
```

Use these EXACT credentials when logging in.

---

### Scenario 4: Environment Variables Not Loaded

**Symptoms:**
- Server starts but admin login doesn't work
- Any credentials seem to work (security issue!)

**Fix:**

Verify `.env` file exists in project root:
```
C:\Users\alire\ai-image-final\ai-image-final\.env
```

And contains:
```env
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
SUPABASE_URL=...
SUPABASE_KEY=...
```

If missing, create it with correct values.

---

## ✅ Complete Checklist

Before accessing `/admin/generated-images`, verify:

- [ ] Latest code pulled: `git pull`
- [ ] Server stopped (Ctrl+C)
- [ ] Server restarted: `node index.js`
- [ ] No errors in server console
- [ ] Server shows "Server running on port 3000"
- [ ] `.env` file exists with correct credentials
- [ ] Successfully logged in at `/admin`
- [ ] Can see other admin pages (Dashboard, Users, etc.)
- [ ] Browser cache cleared (Ctrl+Shift+Delete)

If all checked ✅, then navigate to `/admin/generated-images` → Should work!

---

## 🚀 Expected Behavior After Fix

When everything works correctly:

1. **Login at `/admin`** → Success, redirected to dashboard
2. **Click "📸 Generated Images"** → Page loads
3. **Console shows:**
   ```
   🔄 Fetching generated images...
   📥 Response status: 200
   📥 Response content-type: application/json; charset=utf-8
   ✅ Loaded X images
   ```
4. **Page displays:**
   - Statistics cards with counts
   - Table with images
   - Email and phone columns (may show "No email"/"No phone" if migrations not run)
   - Search filters

---

## 📞 Still Not Working?

If you've done all the above and still getting errors:

### Collect Debug Info:

1. **Server console output** (copy/paste last 20 lines)
2. **Browser console output** (F12 → Console tab → copy all)
3. **Network tab:**
   - F12 → Network tab
   - Refresh page
   - Click `/api/admin/generated-images`
   - Copy Response and Headers

### Share:
- Server output
- Browser console logs
- Network response details
- Your exact steps to reproduce

---

## 🎯 Most Common Fix (95% of cases)

**Server not restarted after `git pull`!**

```bash
# Just do this:
git pull
node index.js

# Then login and try again
```

That's it! The endpoint needs to be loaded into the running server process.

---

**Last Updated:** December 3, 2025
**Latest Commit:** da2a732 - Added detailed console logging for debugging

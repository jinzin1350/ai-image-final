# 🔧 Troubleshooting: Generated Images Page

## Error: "Unexpected token '<', '<!DOCTYPE'... is not valid JSON"

### What This Means
The API endpoint is returning HTML instead of JSON. This happens when you're not properly logged into the admin panel.

### Root Cause
One of these issues:
1. ❌ Not logged into admin panel
2. ❌ Session expired (sessionStorage cleared)
3. ❌ Server not restarted after code changes
4. ❌ Admin credentials not set in environment variables

---

## ✅ Solutions (Try in Order)

### Solution 1: Login to Admin Panel (MOST COMMON)

```
Step 1: Go to /admin
Step 2: Enter admin credentials
Step 3: After successful login, navigate to /admin/generated-images
```

**Why this works:**
- The page requires admin authentication
- Admin credentials are stored in sessionStorage
- Without valid credentials, requests are redirected to login

---

### Solution 2: Restart Server with Latest Code

```bash
# Stop server
Ctrl+C

# Pull latest changes
git pull

# Start server
node index.js
```

**Why this works:**
- The `/api/admin/generated-images` endpoint needs to be loaded
- Server restart applies the new route

---

### Solution 3: Check Admin Credentials

Verify your `.env` file has:
```
ADMIN_EMAIL=your_admin_email@example.com
ADMIN_PASSWORD=your_secure_password
```

Then use these exact credentials when logging in to `/admin`.

---

### Solution 4: Clear Browser Cache

```
1. Open browser DevTools (F12)
2. Go to Application tab
3. Clear Storage → Clear site data
4. Refresh page
5. Login again
```

**Why this works:**
- Clears corrupt sessionStorage data
- Forces fresh login

---

## 🔍 How to Debug

### Check 1: Are You Logged In?

Open browser console (F12) and run:
```javascript
console.log(sessionStorage.getItem('adminEmail'));
console.log(sessionStorage.getItem('adminPassword'));
```

**Expected:** Should show your admin email and password
**If null:** You're not logged in → Go to `/admin` and login

---

### Check 2: Is Server Running?

Look at your terminal where server is running:
```
✅ Should see: Server running on port 3000
❌ If blank or error: Server crashed or not started
```

---

### Check 3: Is Endpoint Registered?

When server starts, check for errors like:
```
❌ Error: Cannot find module...
❌ SyntaxError: Unexpected token...
```

If you see errors, the routes aren't loading properly.

---

### Check 4: Network Request

1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Click on `/api/admin/generated-images` request
5. Check Response tab

**What you might see:**

#### Scenario A: HTML Response (Not Logged In)
```html
<!DOCTYPE html>
<html>
...login page...
```
**Fix:** Login at `/admin` first

#### Scenario B: 401 Unauthorized
```json
{"success": false, "error": "Unauthorized"}
```
**Fix:** Wrong admin credentials

#### Scenario C: 404 Not Found
```
Cannot GET /api/admin/generated-images
```
**Fix:** Server not restarted after code update

#### Scenario D: 500 Server Error
```json
{"success": false, "error": "Failed to fetch generated images"}
```
**Fix:** Database connection issue or Supabase error

---

## 🎯 Quick Diagnosis

### Symptom → Likely Cause

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Unexpected token <!DOCTYPE" | Not logged in | Login at /admin |
| "Authentication failed" | Wrong credentials | Check .env file |
| "Failed to load resource: 404" | Server not restarted | Restart server |
| "Cannot read property" | JavaScript error | Check browser console |
| "Empty table" | No data yet | Run migrations or generate images |

---

## ✅ Verification Checklist

Before reporting issues, verify:

- [ ] Server is running (`node index.js`)
- [ ] Latest code pulled (`git pull`)
- [ ] Logged into admin panel at `/admin`
- [ ] Can access other admin pages (Dashboard, Users, etc.)
- [ ] Browser console shows no JavaScript errors
- [ ] Network tab shows 200 OK response (not 401/404)

---

## 🔄 Complete Reset (Nuclear Option)

If nothing works, do a complete reset:

```bash
# 1. Stop server
Ctrl+C

# 2. Clear any processes on port
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9

# 3. Pull fresh code
git fetch origin
git reset --hard origin/main

# 4. Reinstall dependencies
npm install

# 5. Start server
node index.js

# 6. Clear browser data
# Browser → Settings → Clear browsing data

# 7. Login fresh
# Go to /admin and login with credentials from .env
```

---

## 📞 Still Not Working?

### Collect This Information:

1. **Server Console Output**
   - Copy last 20 lines from terminal

2. **Browser Console Errors**
   - F12 → Console tab → Copy any red errors

3. **Network Request Details**
   - F12 → Network tab
   - Find `/api/admin/generated-images`
   - Copy: Status code, Response, Headers

4. **Environment Check**
   - Node version: `node --version`
   - OS: Windows/Mac/Linux
   - Browser: Chrome/Firefox/Safari

5. **Auth Status**
   - Run in browser console:
   ```javascript
   console.log({
     email: sessionStorage.getItem('adminEmail'),
     hasPassword: !!sessionStorage.getItem('adminPassword')
   });
   ```

---

## 🎯 Most Common Fix (90% of cases)

**You're not logged in!**

```
1. Go to: http://localhost:3000/admin
2. Enter credentials from .env file
3. Click Login
4. Then go to: /admin/generated-images
```

That's it! Most errors are simply because the admin session isn't established.

---

**Last Updated:** December 3, 2025
**Latest Fix:** Added JSON content-type check before parsing response

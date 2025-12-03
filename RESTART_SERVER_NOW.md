# ⚡ YOU NEED TO RESTART THE SERVER!

## The Issue
You're getting "Session expired" error because **the server is running old code**.

The `/api/admin/generated-images` endpoint was added in recent commits. Your running server doesn't have it yet!

---

## ✅ Quick Fix (3 Commands)

```bash
# 1. Stop server
Ctrl+C

# 2. Get new code
git pull

# 3. Start server
node index.js
```

**That's it!** Now login and try again.

---

## Why This Happens

```
You started server BEFORE the endpoint was added
         ↓
Git commits added new endpoint code
         ↓
Server still running with old code (no endpoint)
         ↓
You login (works, uses old login endpoint)
         ↓
You try /admin/generated-images
         ↓
Calls /api/admin/generated-images
         ↓
Endpoint doesn't exist on running server
         ↓
Returns 404 HTML error page
         ↓
Browser tries to parse HTML as JSON
         ↓
ERROR: "Session expired. Please login again."
```

---

## After Restart

```
Server starts with latest code
         ↓
/api/admin/generated-images endpoint loaded ✅
         ↓
You login
         ↓
You go to /admin/generated-images
         ↓
API call succeeds with JSON response
         ↓
Page displays images ✅
```

---

## ⚠️ Common Mistake

**DON'T DO THIS:**
```bash
git pull
# Forget to restart server ❌
# Try page again → Still fails
```

**DO THIS:**
```bash
git pull
node index.js  # ✅ MUST restart!
# Now try page → Works!
```

---

## 🔍 How to Check Server Restarted

Look at your terminal:

**✅ GOOD - Server restarted:**
```
Server running on port 3000
Connected to Supabase
```

**❌ BAD - Old terminal still open:**
```
[Last command from hours ago]
[No "Server running" message]
```

---

## 📝 Summary

| Problem | Solution |
|---------|----------|
| "Session expired" error | Restart server |
| Login works, page fails | Restart server |
| Other pages work, this fails | Restart server |
| Did git pull | Restart server |

**Always restart after `git pull`!**

---

**Read full details:** `SESSION_EXPIRED_FIX.md`

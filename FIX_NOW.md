# 🚨 FIX: "Unexpected token <!DOCTYPE" Error

## The Problem
You're seeing: `Failed to load images: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

## The Fix (2 Steps)

### Step 1: Restart Server ⚡
```bash
# Stop server (Ctrl+C)
# Then:
git pull
node index.js
```

### Step 2: Login to Admin Panel 🔐
```
1. Open browser: http://localhost:3000/admin
2. Enter your admin credentials (from .env file)
3. Click Login
4. NOW go to: /admin/generated-images
```

---

## Why This Happens

You tried to access `/admin/generated-images` without logging in first.

The page requires authentication, so when you're not logged in:
- API returns HTML (login page redirect)
- JavaScript tries to parse HTML as JSON
- Error: "Unexpected token <!DOCTYPE"

---

## ✅ Verification

After fixing, you should see:
- ✅ Page loads successfully
- ✅ Table with generated images
- ✅ Email and phone columns (may show "No email"/"No phone" until migrations run)
- ✅ Search filters work

---

## Still Not Working?

See: `TROUBLESHOOTING_GENERATED_IMAGES.md`

---

## TL;DR

**Login first at `/admin`, THEN access `/admin/generated-images`**

# Setup Guide for AI Image Generation

## Problem
You're getting a **502 Bad Gateway** error when trying to generate backgrounds because the required API services are not configured.

## Required Services

To use the AI image generation features (Model Studio and Background Studio), you need to set up:

### 1. Google Gemini API (for AI Image Generation)

**Steps to get Gemini API Key:**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Copy your API key

**Add to .env file:**
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 2. Supabase (for Image Storage and Database)

**Steps to get Supabase credentials:**

1. Go to [Supabase](https://supabase.com)
2. Create a new project (or use existing one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (for SUPABASE_ANON_KEY)
5. Go to **Settings** → **API** → **Service Role Key**
6. Copy the **service_role** key (for SUPABASE_SERVICE_ROLE_KEY)

**Add to .env file:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. Set up Supabase Storage

In your Supabase project:

1. Go to **Storage** in the sidebar
2. Create a new bucket called **"admin-content"**
3. Make it **public** (so generated images can be accessed)

## Complete .env File Example

```env
# Supabase Configuration
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini API for AI Image Generation
GEMINI_API_KEY=AIzaSyD...

# Admin Dashboard Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

## After Setting Up

1. **Update your .env file** with the real credentials
2. **On Replit:**
   - Add these as **Secrets** in the Replit Secrets tab
   - Or update the `.env` file in Replit
3. **Restart your server**
4. Try generating a background again!

## Testing

Once configured, you should see on server startup:
```
✅ Supabase Admin client initialized
🤖 Gemini AI: Configured
```

Instead of:
```
🔐 Supabase: Not configured
🤖 Gemini AI: Not configured
```

## Costs

- **Gemini API**: Has a free tier with generous limits for image generation
- **Supabase**: Free tier includes 500MB storage and 2GB bandwidth

## Troubleshooting

If you still get errors:

1. **Check your .env file** - Make sure there are no extra spaces or quotes
2. **Restart the server** - Changes to .env require a restart
3. **Check Supabase storage** - Make sure the "admin-content" bucket exists and is public
4. **Check API quotas** - Make sure you haven't exceeded free tier limits

## Alternative: Using Pre-made Content

If you don't want to set up AI generation right now, you can still:
- Use the pre-loaded Unsplash images (20 models available)
- Manually upload backgrounds through the admin panel
- The main app will work without AI generation

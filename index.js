const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 5000;

// تنظیمات Supabase
let supabase = null;
let supabaseAdmin = null;

try {
  if (process.env.SUPABASE_URL &&
      process.env.SUPABASE_URL !== 'your_supabase_project_url' &&
      process.env.SUPABASE_ANON_KEY &&
      process.env.SUPABASE_ANON_KEY !== 'your_supabase_anon_key') {
    // Regular client for normal operations
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Admin client with service role key for admin operations
    if (process.env.SUPABASE_SERVICE_ROLE_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your_supabase_service_role_key') {
      supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      console.log('✅ Supabase Admin client initialized');
    } else {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not configured - admin features will be limited');
    }
  }
} catch (error) {
  console.error('⚠️  خطا در اتصال به Supabase:', error.message);
}

// 🚩 FEATURE FLAG: Show content_library models in gallery (temporary for database cleanup)
// Set to FALSE later when you want to show only generated_images
const SHOW_CONTENT_LIBRARY_IN_GALLERY = true;

// تنظیمات Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// تنظیمات Multer برای آپلود موقت
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|avif/;
    const allowedMimetypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];

    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.includes(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error(`فقط فایل‌های تصویری (JPG, PNG, WEBP, AVIF) مجاز هستند. فرمت فایل شما: ${file.mimetype}`));
  }
});

// Increase body size limit for large image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================
// FILENAME SANITIZER - Support Persian/Arabic/Unicode filenames
// ============================================
function sanitizeFilename(originalName) {
  // Extract file extension
  const ext = path.extname(originalName).toLowerCase();

  // Get base name without extension
  let baseName = path.basename(originalName, ext);

  // If filename contains non-ASCII characters (Persian, Arabic, Chinese, etc.)
  // encode it to make it URL-safe while preserving readability
  if (/[^\x00-\x7F]/.test(baseName)) {
    // Keep the Unicode filename but make it URL-safe
    baseName = encodeURIComponent(baseName)
      .replace(/%20/g, '-')  // Replace spaces with hyphens
      .substring(0, 100);     // Limit length to 100 chars
  } else {
    // For ASCII filenames, just clean special characters
    baseName = baseName
      .replace(/[^a-zA-Z0-9_-]/g, '-')  // Replace special chars with hyphen
      .replace(/-+/g, '-')               // Replace multiple hyphens with single
      .substring(0, 100);                // Limit length
  }

  // Return: timestamp-sanitized-name.ext
  return `${Date.now()}-${baseName}${ext}`;
}

// Example outputs:
// "عکس من.jpg" → "1699999999999-%D8%B9%DA%A9%D8%B3-%D9%85%D9%86.jpg"
// "my photo.png" → "1699999999999-my-photo.png"
// "صورة جميلة.webp" → "1699999999999-%D8%B5%D9%88%D8%B1%D8%A9-%D8%AC%D9%85%D9%8A%D9%84%D8%A9.webp"

// Serve attached_assets folder
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));

// Landing page as homepage - MUST come before static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// App page route
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auth page route
app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// Legal pages routes
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/rules', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rules.html'));
});

// Support pages routes
app.get('/help', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'help.html'));
});

app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'faq.html'));
});

app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api-docs.html'));
});

app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

// Gallery page route
app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

// Profile page route
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Domain verification file route
app.get('/43021824.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '43021824.txt'));
});

// Static files - MUST come after specific routes
app.use(express.static('public'));

// ================== ADMIN PANEL API ENDPOINTS ==================
// IMPORTANT: These must come AFTER static files but BEFORE admin page routes

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const adminEmail = req.headers['admin-email'];
  const adminPassword = req.headers['admin-password'];
  
  const validEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const validPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (adminEmail === validEmail && adminPassword === validPassword) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
};

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const validEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const validPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (email === validEmail && password === validPassword) {
      res.json({ 
        success: true, 
        admin: { 
          email: email, 
          role: 'admin' 
        } 
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get admin stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({
        success: true,
        stats: {
          totalUsers: 0,
          premiumUsers: 0,
          totalImages: 0,
          todayImages: 0,
          totalModels: models.length,
          totalBackgrounds: backgrounds.length,
          freeUsers: 0
        }
      });
    }

    // Get user counts
    const { data: users, error: usersError } = await supabase
      .from('user_limits')
      .select('is_premium');
    
    const totalUsers = users?.length || 0;
    const premiumUsers = users?.filter(u => u.is_premium).length || 0;
    const freeUsers = totalUsers - premiumUsers;

    // Get image counts
    const { data: images, error: imagesError } = await supabase
      .from('generated_images')
      .select('created_at');
    
    const totalImages = images?.length || 0;
    
    // Count today's images
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayImages = images?.filter(img => new Date(img.created_at) >= today).length || 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        premiumUsers,
        totalImages,
        todayImages,
        totalModels: models.length,
        totalBackgrounds: backgrounds.length,
        freeUsers
      }
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all users
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      console.warn('⚠️ Supabase Admin client not configured - returning empty user list');
      console.warn('💡 Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables');
      return res.json({ success: true, users: [] });
    }

    console.log('📋 Fetching all users from Supabase auth...');

    // Fetch ALL users from auth.users using admin API (requires service role key)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users from authentication system',
        details: authError.message
      });
    }

    const allUsers = authData?.users || [];
    console.log(`✅ Found ${allUsers.length} auth users`);

    // Fetch all user_limits data
    const { data: limitsData, error: limitsError } = await supabase
      .from('user_limits')
      .select('*');

    // Fetch all user_profiles data (for image_generation_model)
    // Use supabaseAdmin to bypass RLS and read all profiles
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, image_generation_model, updated_at');

    // If user_limits table doesn't exist, still show all users with default limits
    const userLimitsMap = {};
    if (!limitsError && limitsData) {
      limitsData.forEach(limit => {
        userLimitsMap[limit.user_id] = limit;
      });
      console.log(`✅ Found ${limitsData.length} user limit records`);
    } else if (limitsError) {
      console.warn('⚠️ Could not fetch user_limits (table might not exist):', limitsError.message);
    }

    // Create profiles map
    const profilesMap = {};
    if (!profilesError && profilesData) {
      profilesData.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
      console.log(`✅ Found ${profilesData.length} user profile records`);
    } else if (profilesError) {
      console.warn('⚠️ Could not fetch user_profiles:', profilesError.message);
    }

    // Combine auth users with their limits and profiles (or default values)
    const usersWithLimits = allUsers.map(authUser => {
      const limits = userLimitsMap[authUser.id];
      const profile = profilesMap[authUser.id];

      return {
        id: authUser.id,
        user_id: authUser.id,
        email: authUser.email,
        // User registration data from metadata
        phone: authUser.user_metadata?.phone || null,
        brand_name: authUser.user_metadata?.brand_name || null,
        // New tier system fields
        tier: limits?.tier || 'testlimit',
        credits_used: limits?.credits_used || 0,
        credits_limit: limits?.credits_limit || 5,
        // Legacy fields (for backward compatibility)
        is_premium: limits?.is_premium || false,
        images_used: limits?.images_used || 0,
        images_limit: limits?.images_limit || 10,
        captions_used: limits?.captions_used || 0,
        captions_limit: limits?.captions_limit || 5,
        // Model selection
        image_generation_model: profile?.image_generation_model || 'gemini-2-flash',
        // Additional info
        last_reset_date: limits?.last_reset_date,
        updated_at: profile?.updated_at,
        created_at: authUser.created_at
      };
    });

    console.log(`✅ Returning ${usersWithLimits.length} users to admin panel`);
    res.json({ success: true, users: usersWithLimits });
  } catch (error) {
    console.error('❌ Error in /api/admin/users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load users',
      details: error.message
    });
  }
});

// Update user limits/premium
app.put('/api/admin/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    // First check if user_limits entry exists
    const { data: existing, error: fetchError } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching user limits:', fetchError);
      throw fetchError;
    }

    // Prepare update object with only allowed fields
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Add fields if they exist in the request
    if (updates.tier !== undefined) updateData.tier = updates.tier;
    if (updates.credits_limit !== undefined) updateData.credits_limit = updates.credits_limit;
    if (updates.credits_used !== undefined) updateData.credits_used = updates.credits_used;
    if (updates.is_premium !== undefined) updateData.is_premium = updates.is_premium;
    if (updates.last_reset_date !== undefined) updateData.last_reset_date = updates.last_reset_date;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    // Legacy fields (for backward compatibility)
    if (updates.images_limit !== undefined) updateData.images_limit = updates.images_limit;
    if (updates.images_used !== undefined) updateData.images_used = updates.images_used;
    if (updates.captions_limit !== undefined) updateData.captions_limit = updates.captions_limit;
    if (updates.captions_used !== undefined) updateData.captions_used = updates.captions_used;

    let result;

    if (!existing) {
      // Create new entry if doesn't exist
      const { data, error } = await supabase
        .from('user_limits')
        .insert([{
          user_id: userId,
          email: updates.email || '',
          tier: updates.tier || 'testlimit',
          credits_limit: updates.credits_limit || 5,
          credits_used: updates.credits_used || 0,
          is_premium: updates.is_premium || false,
          ...updateData
        }])
        .select();

      if (error) throw error;
      result = data;
    } else {
      // Update existing entry
      const { data, error } = await supabase
        .from('user_limits')
        .update(updateData)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      result = data;
    }

    console.log(`✅ Updated user ${userId}:`, updateData);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      hint: error.hint
    });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase Admin not configured' });
    }

    console.log(`🗑️ Admin attempting to delete user: ${userId}`);

    // Step 1: Delete from user_limits table
    const { error: limitsError } = await supabase
      .from('user_limits')
      .delete()
      .eq('user_id', userId);

    if (limitsError && limitsError.code !== 'PGRST116') {
      console.warn('⚠️ Error deleting user_limits:', limitsError.message);
    } else {
      console.log('✅ Deleted user_limits record');
    }

    // Step 2: Delete from user_profiles table
    const { error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (profilesError && profilesError.code !== 'PGRST116') {
      console.warn('⚠️ Error deleting user_profiles:', profilesError.message);
    } else {
      console.log('✅ Deleted user_profiles record');
    }

    // Step 3: Delete from generated_images table
    const { error: imagesError } = await supabaseAdmin
      .from('generated_images')
      .delete()
      .eq('user_id', userId);

    if (imagesError && imagesError.code !== 'PGRST116') {
      console.warn('⚠️ Error deleting generated_images:', imagesError.message);
    } else {
      console.log('✅ Deleted generated_images records');
    }

    // Step 4: Delete the actual auth user (requires admin client)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('❌ Error deleting auth user:', authError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user from authentication system',
        details: authError.message
      });
    }

    console.log(`✅ Successfully deleted user ${userId} and all associated data`);
    res.json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error.message
    });
  }
});

// Update user's image generation model
app.post('/api/admin/update-user-model', authenticateAdmin, async (req, res) => {
  try {
    const { userId, model } = req.body;

    if (!userId || !model) {
      return res.status(400).json({
        success: false,
        error: 'userId and model are required'
      });
    }

    // Validate model value
    if (!['gemini-2-flash', 'nano-banana-2'].includes(model)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model. Must be either gemini-2-flash or nano-banana-2'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Supabase Admin not configured'
      });
    }

    console.log(`📝 Updating user ${userId} model to: ${model}`);

    // Use supabaseAdmin to bypass RLS
    // Check if user_profile exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', fetchError);
      throw fetchError;
    }

    let result;

    if (!existing) {
      // Create new profile if doesn't exist
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .insert([{
          id: userId,
          image_generation_model: model,
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      result = data;
    } else {
      // Update existing profile
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          image_generation_model: model,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (error) throw error;
      result = data;
    }

    console.log(`✅ Updated user ${userId} model to ${model}`);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error updating user model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get content library
app.get('/api/admin/content', authenticateAdmin, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ success: true, content: [] });
    }

    const { data, error } = await supabase
      .from('content_library')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, content: data || [] });
  } catch (error) {
    console.error('Error getting content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload content (model/background)
app.post('/api/admin/content/upload', authenticateAdmin, upload.single('content'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    const { content_type, tier, category, name, description } = req.body;
    const fileName = `admin-content-${sanitizeFilename(req.file.originalname)}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('admin-content')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('admin-content')
      .getPublicUrl(fileName);

    // Save to database
    const { data: contentData, error: dbError } = await supabase
      .from('content_library')
      .insert([{
        content_type,
        tier,
        category,
        name,
        description,
        image_url: urlData.publicUrl,
        storage_path: fileName
      }])
      .select();

    if (dbError) throw dbError;

    res.json({ success: true, content: contentData[0] });
  } catch (error) {
    console.error('Error uploading content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete content
app.delete('/api/admin/content/:contentId', authenticateAdmin, async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    // Get content info first
    const { data: content, error: fetchError } = await supabase
      .from('content_library')
      .select('storage_path')
      .eq('id', contentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (content.storage_path) {
      await supabase.storage
        .from('admin-content')
        .remove([content.storage_path]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('content_library')
      .delete()
      .eq('id', contentId);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// USER CONTENT ENDPOINTS (for premium users)
// ========================================

// Get user's own content (models & backgrounds)
app.get('/api/user/content', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Get user's own content + public content
    const { data, error } = await supabase
      .from('content_library')
      .select('*')
      .or(`visibility.eq.public,owner_user_id.eq.${user.id}`)
      .eq('is_active', true)
      .order('created_at', { ascending: false});

    if (error) throw error;

    // Generate signed URLs for content
    const contentWithSignedUrls = await Promise.all((data || []).map(async (item) => {
      let imageUrl = item.image_url;

      // Try to create signed URL if storage info exists
      if (item.storage_bucket && item.storage_filename) {
        try {
          const { data: signedUrlData } = await supabaseAdmin.storage
            .from(item.storage_bucket)
            .createSignedUrl(item.storage_filename, 3600);

          if (signedUrlData) {
            imageUrl = signedUrlData.signedUrl;
          }
        } catch (err) {
          console.warn(`⚠️ Signed URL error for ${item.name}:`, err.message);
        }
      }

      return { ...item, image_url: imageUrl };
    }));

    res.json({ success: true, content: contentWithSignedUrls });
  } catch (error) {
    console.error('Error fetching user content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload user content (premium users only)
app.post('/api/user/content/upload', upload.single('content'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Check if user is premium
    const { data: userLimits } = await supabase
      .from('user_limits')
      .select('is_premium')
      .eq('user_id', user.id)
      .single();

    if (!userLimits || !userLimits.is_premium) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required to upload custom content'
      });
    }

    const { content_type, visibility, category, name, description } = req.body;
    const fileName = `user-${user.id}-${sanitizeFilename(req.file.originalname)}`;

    console.log(`📤 Uploading user content: ${fileName} for user ${user.email}`);

    // Upload to Supabase Storage (admin-content bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('admin-content')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('admin-content')
      .getPublicUrl(fileName);

    // Save to database with user ownership
    const { data: contentData, error: dbError } = await supabase
      .from('content_library')
      .insert([{
        content_type,
        tier: 'premium', // User-uploaded content is always premium
        visibility: visibility || 'private', // Default to private
        category,
        name,
        description,
        image_url: urlData.publicUrl,
        storage_path: fileName,
        owner_user_id: user.id
      }])
      .select();

    if (dbError) throw dbError;

    console.log(`✅ User content uploaded successfully: ${contentData[0].id}`);
    res.json({ success: true, content: contentData[0] });
  } catch (error) {
    console.error('Error uploading user content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete user's own content
app.delete('/api/user/content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Get content info first and verify ownership
    const { data: content, error: fetchError } = await supabase
      .from('content_library')
      .select('storage_path, owner_user_id')
      .eq('id', contentId)
      .single();

    if (fetchError) throw fetchError;

    if (content.owner_user_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this content' });
    }

    // Delete from storage
    if (content.storage_path) {
      await supabase.storage
        .from('admin-content')
        .remove([content.storage_path]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('content_library')
      .delete()
      .eq('id', contentId)
      .eq('owner_user_id', user.id); // Double-check ownership

    if (deleteError) throw deleteError;

    console.log(`🗑️ User content deleted: ${contentId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// Admin User Content Management Endpoints
// ========================================

// Get user's content (for admin)
app.get('/api/admin/user-content/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!supabase) {
      return res.json({ success: true, content: [] });
    }

    const { data, error } = await supabase
      .from('content_library')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`📚 Loaded ${data?.length || 0} content items for user ${userId}`);
    res.json({ success: true, content: data || [] });
  } catch (error) {
    console.error('Error fetching user content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload content for a user (admin only)
app.post('/api/admin/user-content/upload', authenticateAdmin, upload.single('content'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    const { content_type, visibility, category, name, description, user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Upload to Supabase Storage
    const fileName = `user-${user_id}-${sanitizeFilename(req.file.originalname)}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('admin-content')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('admin-content')
      .getPublicUrl(fileName);

    // Save to database with user ownership
    const { data: contentData, error: dbError } = await supabase
      .from('content_library')
      .insert([{
        content_type,
        tier: 'premium',
        visibility: visibility || 'private',
        category,
        name,
        description,
        image_url: urlData.publicUrl,
        storage_path: fileName,
        owner_user_id: user_id,
        is_active: true
      }])
      .select();

    if (dbError) throw dbError;

    console.log(`✅ Admin uploaded content for user ${user_id}: ${name}`);
    res.json({ success: true, content: contentData[0] });
  } catch (error) {
    console.error('Error uploading content for user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete user content (admin only)
app.delete('/api/admin/user-content/:contentId', authenticateAdmin, async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    // Get content to find storage path
    const { data: content, error: fetchError } = await supabase
      .from('content_library')
      .select('storage_path')
      .eq('id', contentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (content.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('admin-content')
        .remove([content.storage_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('content_library')
      .delete()
      .eq('id', contentId);

    if (deleteError) throw deleteError;

    console.log(`🗑️ Admin deleted content: ${contentId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// Model Prompts Management (Admin Only)
// ========================================

// Get all prompts for a specific model
app.get('/api/admin/model-prompts/:modelId', authenticateAdmin, async (req, res) => {
  try {
    const { modelId } = req.params;

    const { data: prompts, error } = await supabaseAdmin
      .from('model_prompts')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, prompts: prompts || [] });
  } catch (error) {
    console.error('Error fetching model prompts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a new prompt for a model
app.post('/api/admin/model-prompts', authenticateAdmin, async (req, res) => {
  try {
    const { model_id, prompt_text, prompt_type = 'accessory' } = req.body;

    if (!model_id || !prompt_text) {
      return res.status(400).json({ success: false, error: 'Model ID and prompt text are required' });
    }

    const { data: prompt, error } = await supabaseAdmin
      .from('model_prompts')
      .insert([{
        model_id,
        prompt_text,
        prompt_type,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Added prompt for model ${model_id}`);
    res.json({ success: true, prompt });
  } catch (error) {
    console.error('Error adding model prompt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a prompt
app.put('/api/admin/model-prompts/:promptId', authenticateAdmin, async (req, res) => {
  try {
    const { promptId } = req.params;
    const { prompt_text, is_active } = req.body;

    const updateData = {};
    if (prompt_text !== undefined) updateData.prompt_text = prompt_text;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data: prompt, error } = await supabaseAdmin
      .from('model_prompts')
      .update(updateData)
      .eq('id', promptId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Updated prompt ${promptId}`);
    res.json({ success: true, prompt });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a prompt
app.delete('/api/admin/model-prompts/:promptId', authenticateAdmin, async (req, res) => {
  try {
    const { promptId } = req.params;

    const { error } = await supabaseAdmin
      .from('model_prompts')
      .delete()
      .eq('id', promptId);

    if (error) throw error;

    console.log(`🗑️ Deleted prompt ${promptId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save generated image to user content (admin only)
app.post('/api/admin/save-generated-to-user', authenticateAdmin, async (req, res) => {
  try {
    const { imageUrl, user_id, content_type, visibility, category, service_type, name, description } = req.body;

    if (!user_id || !imageUrl) {
      return res.status(400).json({ success: false, error: 'User ID and image URL are required' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    // If content_type is 'model', save to models table
    // Otherwise save to content_library
    let data, dbError;

    if (content_type === 'model') {
      const result = await supabaseAdmin
        .from('models')
        .insert([{
          name,
          category,
          image_url: imageUrl,
          storage_path: imageUrl.split('/').pop(),
          owner_user_id: user_id,
          visibility: visibility || 'private',
          is_active: true,
          description
        }])
        .select();

      data = result.data;
      dbError = result.error;
    } else {
      // For non-model content (garments, backgrounds, etc.), use content_library
      const result = await supabaseAdmin
        .from('content_library')
        .insert([{
          content_type,
          tier: 'premium',
          visibility: visibility || 'private',
          category,
          name,
          description,
          image_url: imageUrl,
          storage_path: imageUrl.split('/').pop(),
          owner_user_id: user_id,
          is_active: true
        }])
        .select();

      data = result.data;
      dbError = result.error;
    }

    if (dbError) throw dbError;

    console.log(`✅ Admin saved ${content_type} to user ${user_id}: ${name}`);
    res.json({ success: true, content: data[0] });
  } catch (error) {
    console.error('Error saving generated content to user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to determine category from filename
function getCategoryFromFilename(filename) {
  const lower = filename.toLowerCase();

  // Model-related keywords
  if (lower.includes('model') || lower.includes('pro_') || lower.includes('generated-')) {
    return 'Model';
  }

  // Background-related keywords
  if (lower.includes('background') || lower.includes('scene') || lower.includes('backdrop')) {
    return 'Background';
  }

  // Garment/clothing keywords
  if (lower.includes('garment') || lower.includes('content-') || lower.includes('reference-')) {
    return 'Garment';
  }

  // Default based on numeric names
  if (/^\d+$/.test(filename.replace(/\.[^/.]+$/, ''))) {
    return 'Model';
  }

  return 'Other';
}

// Sync Storage files to content_library database
app.post('/api/admin/sync-storage-to-db', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔄 Syncing Storage files to content_library database...');

    let synced = 0;
    let skipped = 0;

    // Sync admin-content bucket
    const { data: adminFiles, error: adminError } = await supabaseAdmin.storage
      .from('admin-content')
      .list('', { limit: 1000 });

    if (!adminError && adminFiles) {
      for (const file of adminFiles) {
        if (file.name === '.emptyFolderPlaceholder') continue;

        const { data: publicUrlData } = supabaseAdmin.storage
          .from('admin-content')
          .getPublicUrl(file.name);

        // Check if already exists
        const { data: existing } = await supabaseAdmin
          .from('content_library')
          .select('id')
          .eq('storage_bucket', 'admin-content')
          .eq('storage_filename', file.name)
          .single();

        if (!existing) {
          await supabaseAdmin.from('content_library').insert({
            content_type: 'model',
            name: file.name.replace(/\.[^/.]+$/, ''),
            category: getCategoryFromFilename(file.name),
            visibility: 'public',
            image_url: publicUrlData.publicUrl,
            storage_bucket: 'admin-content',
            storage_filename: file.name,
            owner_user_id: null,
            created_at: file.created_at
          });
          synced++;
        } else {
          skipped++;
        }
      }
    }

    // Sync garments bucket
    const { data: garmentFiles, error: garmentError } = await supabaseAdmin.storage
      .from('garments')
      .list('', { limit: 1000 });

    if (!garmentError && garmentFiles) {
      for (const file of garmentFiles) {
        if (file.name === '.emptyFolderPlaceholder') continue;

        const { data: publicUrlData } = supabaseAdmin.storage
          .from('garments')
          .getPublicUrl(file.name);

        // Check if already exists
        const { data: existing } = await supabaseAdmin
          .from('content_library')
          .select('id')
          .eq('storage_bucket', 'garments')
          .eq('storage_filename', file.name)
          .single();

        if (!existing) {
          await supabaseAdmin.from('content_library').insert({
            content_type: 'model',
            name: file.name.replace(/\.[^/.]+$/, ''),
            category: getCategoryFromFilename(file.name),
            visibility: 'public',
            image_url: publicUrlData.publicUrl,
            storage_bucket: 'garments',
            storage_filename: file.name,
            owner_user_id: null,
            created_at: file.created_at
          });
          synced++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`✅ Sync complete: ${synced} new, ${skipped} existing`);
    res.json({
      success: true,
      synced,
      skipped,
      message: `Synced ${synced} new files, ${skipped} already existed`
    });

  } catch (error) {
    console.error('❌ Error syncing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all models with user information (for admin model management)
app.get('/api/admin/models', authenticateAdmin, async (req, res) => {
  try {
    console.log('📋 Fetching models from models table...');

    if (!supabaseAdmin) {
      console.error('❌ Supabase Admin not configured');
      return res.status(500).json({ success: false, error: 'Supabase Admin not configured' });
    }

    // Fetch from dedicated models table
    const { data: models, error } = await supabaseAdmin
      .from('models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching models from database:', error);
      throw error;
    }

    console.log(`✅ Found ${models?.length || 0} models in database`);

    // If no models, return empty array
    if (!models || models.length === 0) {
      return res.json({ success: true, models: [] });
    }

    // Get user emails for models with owners
    const userIds = [...new Set(models.filter(m => m.owner_user_id).map(m => m.owner_user_id))];
    let userEmails = {};

    if (userIds.length > 0) {
      try {
        const { data: limits } = await supabaseAdmin
          .from('user_limits')
          .select('user_id, tier, is_premium')
          .in('user_id', userIds);

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

        if (authError) {
          console.warn('⚠️ Could not fetch auth users:', authError.message);
        } else if (authData && authData.users) {
          limits?.forEach(limit => {
            const user = authData.users.find(u => u.id === limit.user_id);
            if (user) {
              userEmails[limit.user_id] = {
                email: user.email,
                is_premium: limit.is_premium
              };
            }
          });
        }
      } catch (userErr) {
        console.warn('⚠️ Error fetching user data, continuing without user emails:', userErr.message);
      }
    }

    // Format models for frontend with signed URLs
    const formattedModels = await Promise.all(models.map(async (model) => {
      try {
        let imageUrl = model.image_url;

        // If model has storage info, try to get signed URL (fallback to public URL)
        if (model.storage_bucket && model.storage_filename) {
          try {
            const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
              .from(model.storage_bucket)
              .createSignedUrl(model.storage_filename, 3600); // 1 hour expiry

            if (signedUrlData && !signedUrlError) {
              imageUrl = signedUrlData.signedUrl;
              console.log(`✅ Created signed URL for ${model.name}`);
            } else if (signedUrlError) {
              console.warn(`⚠️ Signed URL failed for ${model.name}, using public URL:`, signedUrlError.message);
            }
          } catch (err) {
            console.warn(`⚠️ Error creating signed URL for ${model.name}:`, err.message);
          }
        }

        return {
          id: model.id,
          name: model.name,
          category: model.category,
          visibility: model.visibility,
          tier_requirement: model.tier_requirement || 'bronze',
          image_url: imageUrl,
          created_at: model.created_at,
          user_id: model.owner_user_id,
          user_email: model.owner_user_id && userEmails[model.owner_user_id]
            ? userEmails[model.owner_user_id].email
            : (model.storage_bucket === 'admin-content' ? 'Admin Upload' : 'System (AI Generated)'),
          is_premium: model.owner_user_id && userEmails[model.owner_user_id]
            ? userEmails[model.owner_user_id].is_premium
            : false,
          bucket: model.storage_bucket,
          filename: model.storage_filename
        };
      } catch (modelErr) {
        console.error(`❌ Error formatting model ${model.id}:`, modelErr.message);
        // Return basic model info even if formatting fails
        return {
          id: model.id,
          name: model.name,
          category: model.category,
          visibility: model.visibility,
          tier_requirement: model.tier_requirement || 'bronze',
          image_url: model.image_url,
          created_at: model.created_at,
          user_id: model.owner_user_id,
          user_email: 'Unknown',
          is_premium: false,
          bucket: model.storage_bucket,
          filename: model.storage_filename
        };
      }
    }));

    console.log(`✅ Returning ${formattedModels.length} formatted models`);
    res.json({ success: true, models: formattedModels });

  } catch (error) {
    console.error('❌ Error in /api/admin/models endpoint:', error);
    console.error('Error stack:', error.stack);
    // Always return valid JSON even on error
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch models',
      details: error.toString()
    });
  }
});

// Update a model (name, category, visibility, tier_requirement, owner)
app.put('/api/admin/models/:modelId', authenticateAdmin, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { name, category, visibility, tier_requirement, user_id } = req.body;

    console.log(`📝 Updating model ID: ${modelId}`);

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (tier_requirement !== undefined) updateData.tier_requirement = tier_requirement;
    if (user_id !== undefined) updateData.owner_user_id = user_id === '' ? null : user_id;
    updateData.updated_at = new Date().toISOString();

    const { data: model, error } = await supabaseAdmin
      .from('models')
      .update(updateData)
      .eq('id', modelId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Updated model ${modelId}:`, updateData);
    res.json({ success: true, model });

  } catch (error) {
    console.error('Error updating model:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a model
app.delete('/api/admin/models/:modelId', authenticateAdmin, async (req, res) => {
  try {
    const modelId = req.params.modelId;

    console.log(`🗑️ Deleting model ID: ${modelId}`);

    // Get model info to find storage location
    const { data: model, error: fetchError } = await supabaseAdmin
      .from('models')
      .select('*')
      .eq('id', modelId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('models')
      .delete()
      .eq('id', modelId);

    if (deleteError) throw deleteError;

    // Delete from Storage if exists
    if (model.storage_bucket && model.storage_filename) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(model.storage_bucket)
        .remove([model.storage_filename]);

      if (storageError) {
        console.warn('⚠️ Warning: Could not delete from storage:', storageError);
        // Don't fail the whole operation if storage delete fails
      } else {
        console.log(`✅ Deleted ${model.storage_filename} from ${model.storage_bucket}`);
      }
    }

    console.log(`✅ Successfully deleted model ${modelId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Make all models public (bulk update)
app.post('/api/admin/models/make-all-public', authenticateAdmin, async (req, res) => {
  try {
    const { data: models, error } = await supabaseAdmin
      .from('models')
      .update({ visibility: 'public' })
      .select();

    if (error) throw error;

    console.log(`🌍 Made ${models?.length || 0} models public`);
    res.json({ success: true, count: models?.length || 0, models });
  } catch (error) {
    console.error('Error making models public:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get activity logs
app.get('/api/admin/logs', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    if (!supabase) {
      return res.json({ success: true, logs: [] });
    }

    const { data, error } = await supabase
      .from('admin_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ success: true, logs: data || [] });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all generated images with user contact info
app.get('/api/admin/generated-images', authenticateAdmin, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ success: true, images: [] });
    }

    // Fetch ALL generated images with user contact info
    const { data, error } = await supabase
      .from('generated_images')
      .select('id, generated_image_url, created_at, user_id, user_email, user_phone')
      .order('created_at', { ascending: false })
      .limit(200); // Get recent 200 images

    if (error) {
      console.error('❌ Database error fetching generated images:', error);
      throw error;
    }

    console.log(`📸 Admin fetched ${data?.length || 0} generated images`);

    // Map to format expected by frontend
    const images = data ? data.map(img => ({
      id: img.id,
      image_url: img.generated_image_url,
      created_at: img.created_at,
      user_email: img.user_email,
      user_phone: img.user_phone
    })) : [];

    res.json({
      success: true,
      images: images
    });
  } catch (error) {
    console.error('❌ Error in /api/admin/generated-images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch generated images'
    });
  }
});

// ================== END OF ADMIN PANEL API ==================

// Admin panel page routes - MUST come after API routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/admin/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-users.html'));
});

app.get('/admin/tier-settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-tier-settings.html'));
});

app.get('/admin/service-permissions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-service-permissions.html'));
});

app.get('/admin/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-pricing.html'));
});

app.get('/test-update-credits', (req, res) => {
  res.sendFile(path.join(__dirname, 'test_update_credits.html'));
});

app.get('/test-permissions', (req, res) => {
  res.sendFile(path.join(__dirname, 'test_permissions.html'));
});

app.get('/admin/content', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-content.html'));
});

app.get('/admin/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-analytics.html'));
});

app.get('/admin/user-content', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-user-content.html'));
});

app.get('/admin/model-studio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-model-studio.html'));
});

app.get('/admin/background-studio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-background-studio.html'));
});

app.get('/admin/brand-studio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-brand-studio.html'));
});

app.get('/admin/generate-model', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-generate-model.html'));
});

app.get('/admin/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-blog.html'));
});

app.get('/admin/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-gallery.html'));
});

app.get('/admin/generated-images', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-generated-images.html'));
});

app.get('/admin/llm-model', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-llm-model.html'));
});

// Public blog page
app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog.html'));
});

// Individual blog post page
app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog-post.html'));
});

// لیست مدل‌ها - تعریف model prompts برای تولید تصویر
/*
 * DEPRECATED: These hardcoded model arrays are no longer used
 * All models are now loaded from the database via /api/models endpoint
 * Kept here only for reference - can be safely deleted in future
 */

/* DEPRECATED - No longer used
const modelPrompts = [
  // زنان (35 ساله)
  {
    id: 'woman-1',
    name: 'مدل ۱',
    category: 'woman',
    categoryName: 'زن',
    description: 'زن 35 ساله با موهای بلند',
    prompt: 'A professional fashion model portrait, 35 year old woman with long hair, elegant appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'woman-2',
    name: 'مدل ۲',
    category: 'woman',
    categoryName: 'زن',
    description: 'زن 35 ساله با استایل مدرن',
    prompt: 'A professional fashion model portrait, 35 year old stylish woman with modern hairstyle, confident pose, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'woman-3',
    name: 'مدل ۳',
    category: 'woman',
    categoryName: 'زن',
    description: 'زن 35 ساله با موهای کوتاه',
    prompt: 'A professional fashion model portrait, 35 year old woman with short hair, professional appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'woman-4',
    name: 'مدل ۴',
    category: 'woman',
    categoryName: 'زن',
    description: 'زن 35 ساله با موهای فر',
    prompt: 'A professional fashion model portrait, 35 year old woman with curly hair, natural beauty, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'woman-5',
    name: 'مدل ۵',
    category: 'woman',
    categoryName: 'زن',
    description: 'زن 35 ساله با استایل کلاسیک',
    prompt: 'A professional fashion model portrait, 35 year old woman with classic style, sophisticated look, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },

  // مردان (35 ساله)
  {
    id: 'man-1',
    name: 'مدل ۱',
    category: 'man',
    categoryName: 'مرد',
    description: 'مرد 35 ساله ورزشکار',
    prompt: 'A professional fashion model portrait, 35 year old athletic man with fit physique, confident posture, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'man-2',
    name: 'مدل ۲',
    category: 'man',
    categoryName: 'مرد',
    description: 'مرد 35 ساله با ظاهر رسمی',
    prompt: 'A professional fashion model portrait, 35 year old professional businessman, formal appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'man-3',
    name: 'مدل ۳',
    category: 'man',
    categoryName: 'مرد',
    description: 'مرد 35 ساله با ریش',
    prompt: 'A professional fashion model portrait, 35 year old man with beard, casual confident style, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'man-4',
    name: 'مدل ۴',
    category: 'man',
    categoryName: 'مرد',
    description: 'مرد 35 ساله با موهای کوتاه',
    prompt: 'A professional fashion model portrait, 35 year old man with short hair, modern style, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'man-5',
    name: 'مدل ۵',
    category: 'man',
    categoryName: 'مرد',
    description: 'مرد 35 ساله با استایل اسپرت',
    prompt: 'A professional fashion model portrait, 35 year old sporty man, athletic casual style, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },

  // دختران (13-15 ساله)
  {
    id: 'girl-1',
    name: 'مدل ۱',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله',
    prompt: 'IMPORTANT: Create a TEENAGE GIRL (age 13-15 years old) - NOT an adult woman. A professional fashion portrait of a young teenage girl exactly 13-15 years old with YOUTHFUL TEENAGE FEATURES: round face, soft young features, teenage proportions, innocent youthful expression, age-appropriate appearance. She must clearly look like a young teenager, NOT an adult. Friendly smile, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on. The face and body must match the age range 13-15 years old.'
  },
  {
    id: 'girl-2',
    name: 'مدل ۲',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با موهای بلند',
    prompt: 'IMPORTANT: Create a TEENAGE GIRL (age 13-15 years old) - NOT an adult woman. A professional fashion portrait of a young teenage girl exactly 13-15 years old with YOUTHFUL TEENAGE FEATURES: round face, soft young features, teenage proportions, innocent youthful expression, age-appropriate appearance. She must clearly look like a young teenager, NOT an adult. Long hair, cheerful expression, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on. The face and body must match the age range 13-15 years old.'
  },
  {
    id: 'girl-3',
    name: 'مدل ۳',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با استایل مدرن',
    prompt: 'IMPORTANT: Create a TEENAGE GIRL (age 13-15 years old) - NOT an adult woman. A professional fashion portrait of a young teenage girl exactly 13-15 years old with YOUTHFUL TEENAGE FEATURES: round face, soft young features, teenage proportions, innocent youthful expression, age-appropriate appearance. She must clearly look like a young teenager, NOT an adult. Modern style, confident pose, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on. The face and body must match the age range 13-15 years old.'
  },
  {
    id: 'girl-4',
    name: 'مدل ۴',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با موهای کوتاه',
    prompt: 'IMPORTANT: Create a TEENAGE GIRL (age 13-15 years old) - NOT an adult woman. A professional fashion portrait of a young teenage girl exactly 13-15 years old with YOUTHFUL TEENAGE FEATURES: round face, soft young features, teenage proportions, innocent youthful expression, age-appropriate appearance. She must clearly look like a young teenager, NOT an adult. Short hair, sporty look, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on. The face and body must match the age range 13-15 years old.'
  },
  {
    id: 'girl-5',
    name: 'مدل ۵',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با لبخند',
    prompt: 'IMPORTANT: Create a TEENAGE GIRL (age 13-15 years old) - NOT an adult woman. A professional fashion portrait of a young teenage girl exactly 13-15 years old with YOUTHFUL TEENAGE FEATURES: round face, soft young features, teenage proportions, innocent youthful expression, age-appropriate appearance. She must clearly look like a young teenager, NOT an adult. Happy smile, natural beauty, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on. The face and body must match the age range 13-15 years old.'
  },

  // پسران (13-15 ساله)
  {
    id: 'boy-1',
    name: 'مدل ۱',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله',
    prompt: 'IMPORTANT: Create a TEENAGE BOY (age 13-15 years old) - NOT an adult man. A professional fashion portrait of a young teenage boy exactly 13-15 years old with YOUTHFUL TEENAGE FEATURES: rounder face, softer young features, teenage body proportions, innocent boyish expression, age-appropriate appearance. He must clearly look like a young teenager, NOT an adult. Friendly expression, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on. The face and body must match the age range 13-15 years old.'
  },
  {
    id: 'boy-2',
    name: 'مدل ۲',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله ورزشکار',
    prompt: 'IMPORTANT: Create a TEENAGE BOY (age 13-15 years old) - NOT an adult man. A professional fashion portrait of a young teenage boy exactly 13-15 years old with YOUTHFUL TEENAGE FEATURES: rounder face, softer young features, teenage body proportions, innocent boyish expression, age-appropriate appearance. He must clearly look like a young teenager, NOT an adult. Athletic build for a teenager, sporty appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on. The face and body must match the age range 13-15 years old.'
  },
  {
    id: 'boy-3',
    name: 'مدل ۳',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله با موهای کوتاه',
    prompt: 'IMPORTANT: Create a TEENAGE BOY (age 13-15 years old) - NOT an adult man. A professional fashion portrait of a young teenage boy exactly 13-15 years old with YOUTHFUL TEENAGE FEATURES: rounder face, softer young features, teenage body proportions, innocent boyish expression, age-appropriate appearance. He must clearly look like a young teenager, NOT an adult. Short hair, casual style, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on. The face and body must match the age range 13-15 years old.'
  },
  {
    id: 'boy-4',
    name: 'مدل ۴',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله با لبخند',
    prompt: 'IMPORTANT: Create a TEENAGE BOY (age 13-15 years old) - NOT an adult man. A professional fashion portrait of a young teenage boy exactly 13-15 years old with YOUTHFUL TEENAGE FEATURES: rounder face, softer young features, teenage body proportions, innocent boyish expression, age-appropriate appearance. He must clearly look like a young teenager, NOT an adult. Happy smile, confident pose, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on. The face and body must match the age range 13-15 years old.'
  },
  {
    id: 'boy-5',
    name: 'مدل ۵',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله با استایل مدرن',
    prompt: 'IMPORTANT: Create a TEENAGE BOY (age 13-15 years old) - NOT an adult man. A professional fashion portrait of a young teenage boy exactly 13-15 years old with YOUTHFUL TEENAGE FEATURES: rounder face, softer young features, teenage body proportions, innocent boyish expression, age-appropriate appearance. He must clearly look like a young teenager, NOT an adult. Modern casual style, friendly appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on. The face and body must match the age range 13-15 years old.'
  }
];
*/

/* DEPRECATED - No longer used
const fallbackModels = [
  // زنان
  { id: 'woman-1', name: 'مدل ۱', category: 'woman', categoryName: 'زن', description: 'زن 35 ساله', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/40.jpeg?w=400&h=600&fit=crop' },
  { id: 'woman-2', name: 'مدل ۲', category: 'woman', categoryName: 'زن', description: 'زن 35 ساله', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/41.jpeg?w=400&h=600&fit=crop' },
  { id: 'woman-3', name: 'مدل ۳', category: 'woman', categoryName: 'زن', description: 'زن 35 ساله', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/42.jpeg?w=400&h=600&fit=crop' },
  { id: 'woman-4', name: 'مدل ۴', category: 'woman', categoryName: 'زن', description: 'زن 35 ساله', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/ai-generated-model-1761433152399.png?w=400&h=600&fit=crop' },
  { id: 'woman-5', name: 'مدل ۵', category: 'woman', categoryName: 'زن', description: 'زن 35 ساله', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/44.jpeg?w=400&h=600&fit=crop' },

  // مردان
  { id: 'man-1', name: 'مدل ۱', category: 'man', categoryName: 'مرد', description: 'مرد 35 ساله', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop' },
  { id: 'man-2', name: 'مدل ۲', category: 'man', categoryName: 'مرد', description: 'مرد 35 ساله', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop' },
  { id: 'man-3', name: 'مدل ۳', category: 'man', categoryName: 'مرد', description: 'مرد 35 ساله', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop' },
  { id: 'man-4', name: 'مدل ۴', category: 'man', categoryName: 'مرد', description: 'مرد 35 ساله', image: 'https://images.unsplash.com/photo-1519085360753-5a69c17a67c6?w=400&h=600&fit=crop' },
  { id: 'man-5', name: 'مدل ۵', category: 'man', categoryName: 'مرد', description: 'مرد 35 ساله', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=600&fit=crop' },

  // دختران
  { id: 'girl-1', name: 'مدل ۱', category: 'girl', categoryName: 'دختر', description: 'دختر 13-15 ساله', image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=600&fit=crop' },
  { id: 'girl-2', name: 'مدل ۲', category: 'girl', categoryName: 'دختر', description: 'دختر 13-15 ساله', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop' },
  { id: 'girl-3', name: 'مدل ۳', category: 'girl', categoryName: 'دختر', description: 'دختر 13-15 ساله', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=600&fit=crop' },
  { id: 'girl-4', name: 'مدل ۴', category: 'girl', categoryName: 'دختر', description: 'دختر 13-15 ساله', image: 'https://images.unsplash.com/photo-1554080353-a576cf80bda?w=400&h=600&fit=crop' },
  { id: 'girl-5', name: 'مدل ۵', category: 'girl', categoryName: 'دختر', description: 'دختر 13-15 ساله', image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop' },

  // پسران
  { id: 'boy-1', name: 'مدل ۱', category: 'boy', categoryName: 'پسر', description: 'پسر 13-15 ساله', image: 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=400&h=600&fit=crop' },
  { id: 'boy-2', name: 'مدل ۲', category: 'boy', categoryName: 'پسر', description: 'پسر 13-15 ساله', image: 'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=400&h=600&fit=crop' },
  { id: 'boy-3', name: 'مدل ۳', category: 'boy', categoryName: 'پسر', description: 'پسر 13-15 ساله', image: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=600&fit=crop' },
  { id: 'boy-4', name: 'مدل ۴', category: 'boy', categoryName: 'پسر', description: 'پسر 13-15 ساله', image: 'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=400&h=600&fit=crop' },
  { id: 'boy-5', name: 'مدل ۵', category: 'boy', categoryName: 'پسر', description: 'پسر 13-15 ساله', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=600&fit=crop' }
];
*/

/* DEPRECATED - No longer used
const accessoryModels = [
  // Female hand/arm models
  { id: 'hand-woman-1', name: 'دست زن ۱', category: 'accessory', categoryName: 'اکسسوری', description: 'دست و بازوی زن برای عکاسی اکسسوری', image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&h=600&fit=crop' },
  { id: 'hand-woman-2', name: 'دست زن ۲', category: 'accessory', categoryName: 'اکسسوری', description: 'دست زن با پوست روشن', image: 'https://images.unsplash.com/photo-1583327112925-b3f0e0a36ff5?w=400&h=600&fit=crop' },
  { id: 'hand-woman-3', name: 'دست زن ۳', category: 'accessory', categoryName: 'اکسسوری', description: 'دست و مچ زن برای ساعت و دستبند', image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=600&fit=crop' },
  { id: 'hand-woman-4', name: 'دست زن ۴', category: 'accessory', categoryName: 'اکسسوری', description: 'دست زن با پوست متوسط', image: 'https://images.unsplash.com/photo-1610992015762-45dca7e4e1f6?w=400&h=600&fit=crop' },
  { id: 'hand-woman-5', name: 'دست زن ۵', category: 'accessory', categoryName: 'اکسسوری', description: 'دست و بازوی زن لاغر', image: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=400&h=600&fit=crop' },

  // Male hand/arm models
  { id: 'hand-man-1', name: 'دست مرد ۱', category: 'accessory', categoryName: 'اکسسوری', description: 'دست و بازوی مرد برای عکاسی اکسسوری', image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=600&fit=crop' },
  { id: 'hand-man-2', name: 'دست مرد ۲', category: 'accessory', categoryName: 'اکسسوری', description: 'دست مرد برای ساعت مچی', image: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=400&h=600&fit=crop' },
  { id: 'hand-man-3', name: 'دست مرد ۳', category: 'accessory', categoryName: 'اکسسوری', description: 'مچ و دست مرد', image: 'https://images.unsplash.com/photo-1509941943102-10c232535736?w=400&h=600&fit=crop' },
  { id: 'hand-man-4', name: 'دست مرد ۴', category: 'accessory', categoryName: 'اکسسوری', description: 'دست مرد با پوست روشن', image: 'https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=400&h=600&fit=crop' },
  { id: 'hand-man-5', name: 'دست مرد ۵', category: 'accessory', categoryName: 'اکسسوری', description: 'دست و بازوی مرد قوی', image: 'https://images.unsplash.com/photo-1594576722512-582bcd46fba4?w=400&h=600&fit=crop' }
];
*/

// لیست مدل‌ها با URL‌های تولید شده
// Models are now loaded from database via /api/models endpoint
let models = [];

// لیست پس‌زمینه‌ها - 20 موقعیت واقعی و متنوع
const backgrounds = [
  // استودیو (Studio) - High Variation
  { id: 'studio-white-highkey', name: 'استودیو سفید - نور بالا', description: 'Bright white seamless studio backdrop with high-key lighting, minimal shadows, clean professional fashion photography style, pure white cyclorama wall', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/1.jpg?w=800&h=600&fit=crop' },
  { id: 'studio-gray-neutral', name: 'استودیو خاکستری خنثی', description: 'Neutral gray studio background with balanced soft lighting, medium gray backdrop, professional product photography style with subtle shadows', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/Gemini_Generated_Image_uzqcbluzqcbluzqc.png?w=800&h=600&fit=crop' },
  { id: 'studio-dark-dramatic', name: 'استودیو تیره دراماتیک', description: 'Dark moody studio with dramatic low-key lighting, deep charcoal background, strong side lighting creating contrast and depth, editorial fashion style', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/Gemini_Generated_Image_s4al3os4al3os4al.png?w=800&h=600&fit=crop' },
  { id: 'studio-cream-warm', name: 'استودیو کرم گرم', description: 'Warm cream-colored studio with soft diffused lighting, beige textured backdrop, cozy warm tones, lifestyle photography aesthetic', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/5.jpg?w=800&h=600&fit=crop' },

  // کافه (Cafe) - Varied Atmospheres
  { id: 'cafe-modern-bright', name: 'کافه مدرن روشن', description: 'Bright modern cafe with floor-to-ceiling windows, natural daylight streaming in, clean white interior, minimalist Scandinavian design, fresh and airy atmosphere', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/6.jpg?w=800&h=600&fit=crop' },
  { id: 'cafe-vintage-cozy', name: 'کافه وینتیج دنج', description: 'Cozy vintage cafe with warm Edison bulbs, exposed brick walls, wooden furniture, amber lighting, nostalgic atmosphere with soft shadows', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/7.jpg?w=800&h=600&fit=crop' },
  { id: 'cafe-industrial-urban', name: 'کافه صنعتی شهری', description: 'Industrial loft cafe with metal fixtures, concrete walls, pendant lights, cool tones, urban trendy aesthetic with natural light from skylights', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/8.jpg?w=800&h=600&fit=crop' },
  { id: 'cafe-parisian-elegant', name: 'کافه پاریسی شیک', description: 'Elegant Parisian-style cafe with marble tables, velvet seating, gold accents, soft romantic lighting, sophisticated European charm', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/9.jpg?w=800&h=600&fit=crop' },

  // شهری (Urban) - Different Times and Moods
  { id: 'street-modern-day', name: 'خیابان مدرن روز', description: 'Contemporary city street in bright daylight, clean modern architecture, glass buildings, crisp shadows, dynamic urban energy, clear blue sky', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/10.jpg?w=800&h=600&fit=crop' },
  { id: 'street-graffiti-colorful', name: 'خیابان گرافیتی رنگی', description: 'Vibrant street art alley with colorful graffiti murals, urban edge, artistic vibe, natural daylight, street culture aesthetic', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/11.jpg?w=800&h=600&fit=crop' },
  { id: 'downtown-golden-hour', name: 'مرکز شهر طلایی', description: 'Downtown cityscape during golden hour, warm sunset light reflecting off glass buildings, long soft shadows, magical hour glow', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/12.jpg?w=800&h=600&fit=crop' },
  { id: 'downtown-night-neon', name: 'مرکز شهر شب نئونی', description: 'Downtown at night with vibrant neon lights, colorful store signs, bokeh city lights in background, cinematic night photography', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/13.jpg?w=800&h=600&fit=crop' },
  { id: 'rooftop-skyline', name: 'پشت‌بام با منظره', description: 'Rooftop terrace with stunning city skyline view, afternoon light, modern urban backdrop, professional architectural setting', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/14.jpg?w=800&h=600&fit=crop' },

  // طبیعت (Nature) - Different Seasons and Times
  { id: 'beach-golden-sunset', name: 'ساحل غروب طلایی', description: 'Sandy beach at golden hour sunset, warm orange and pink sky, soft natural light, romantic coastal atmosphere, gentle ocean backdrop', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/15.jpg?w=800&h=600&fit=crop' },
  { id: 'park-spring-bright', name: 'پارک بهاری روشن', description: 'Lush green park in spring, bright daylight filtering through trees, fresh vibrant greenery, natural outdoor lighting, energetic atmosphere', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/16.jpg?w=800&h=600&fit=crop' },
  { id: 'forest-morning-mist', name: 'جنگل مه صبح', description: 'Misty forest path in early morning, soft diffused light through fog, ethereal dreamy atmosphere, cool tones, mysterious natural setting', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/17.jpg?w=800&h=600&fit=crop' },
  { id: 'garden-summer-bloom', name: 'باغ گل تابستانی', description: 'Colorful flower garden in full summer bloom, bright natural sunlight, vibrant colors, cheerful outdoor setting, botanical backdrop', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/18.jpg?w=800&h=600&fit=crop' },

  // معماری (Architecture) - Varied Styles
  { id: 'building-modern-glass', name: 'ساختمان شیشه‌ای مدرن', description: 'Sleek modern glass building with geometric patterns, reflective surfaces, contemporary architecture, clean lines, professional business aesthetic', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop' },
  { id: 'stairs-marble-luxury', name: 'پله‌های مرمر لوکس', description: 'Elegant marble staircase in luxury building, sophisticated lighting, high-end architectural detail, refined elegant atmosphere', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/19.jpg?w=800&h=600&fit=crop' },
  { id: 'concrete-minimal', name: 'بتن مینیمال', description: 'Minimalist concrete architecture, raw industrial aesthetic, clean geometric shapes, modern brutalist style, neutral gray tones', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/20.jpg?w=800&h=600&fit=crop' },
  { id: 'bridge-modern-steel', name: 'پل فلزی مدرن', description: 'Contemporary steel bridge with architectural interest, urban engineering, strong lines and structure, dynamic modern backdrop', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/21.jpg?w=800&h=600&fit=crop' },

  // داخلی لوکس (Luxury Interior)
  { id: 'hotel-lobby-elegant', name: 'لابی هتل اِلِگانت', description: 'Luxurious hotel lobby with crystal chandeliers, polished marble floors, elegant furniture, warm ambient lighting, five-star sophistication', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/23.jpg?w=800&h=600&fit=crop' },
  { id: 'office-modern-bright', name: 'دفتر مدرن روشن', description: 'Modern bright office space with glass walls, natural daylight, clean white interior, professional business environment, corporate aesthetic', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/24.jpg?w=800&h=600&fit=crop' },
  { id: 'gallery-art-white', name: 'گالری هنری سفید', description: 'Contemporary white art gallery with pristine walls, track lighting, minimalist exhibition space, clean professional art presentation', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/25.jpg?w=800&h=600&fit=crop' },
  { id: 'loft-industrial-brick', name: 'لافت صنعتی آجری', description: 'Industrial loft with exposed brick walls, high ceilings, large windows, natural light, urban trendy living space aesthetic', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/26.jpg?w=800&h=600&fit=crop' },

  // رستوران (Restaurant)
  { id: 'restaurant-fine-dining', name: 'رستوران شیک', description: 'Elegant fine dining restaurant with mood lighting, sophisticated table settings, romantic ambiance, warm intimate atmosphere', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop' },
  { id: 'restaurant-modern-casual', name: 'رستوران مدرن کژوال', description: 'Modern casual dining space with bright lighting, contemporary design, relaxed atmosphere, friendly welcoming environment', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/27.jpg?w=800&h=600&fit=crop' },

  // فضای باز دیگر (Other Outdoor)
  { id: 'plaza-urban-day', name: 'میدان شهری روز', description: 'Open urban plaza in bright daylight, modern public space, contemporary architecture, clean geometric design, dynamic city environment', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/28.jpg?w=800&h=600&fit=crop' },
  { id: 'alley-charming-brick', name: 'کوچه آجری جذاب', description: 'Charming narrow brick alley with character, vintage urban feel, natural daylight, authentic street photography aesthetic', image: 'https://trrjixlshamhuhlcevtx.supabase.co/storage/v1/object/public/admin-content/30.jpg?w=800&h=600&fit=crop' }
];

// Product Photography Backgrounds (for color-collection and flat-lay modes)
const productBackgrounds = [
  // Pure Studio Backgrounds
  { id: 'pure-white', name: 'سفید خالص', description: 'Pure white seamless background, 100% white RGB(255,255,255), infinity wall, professional e-commerce product photography, clean and minimal', image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&h=600&fit=crop' },
  { id: 'soft-gray', name: 'خاکستری نرم', description: 'Soft light gray seamless background RGB(240,240,240), neutral studio backdrop, professional product photography, subtle and clean', image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=800&h=600&fit=crop' },
  { id: 'off-white-cream', name: 'کرم ملایم', description: 'Off-white cream background with warm undertones, soft beige seamless backdrop, elegant product display, lifestyle product photography', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&h=600&fit=crop' },
  { id: 'charcoal-dark', name: 'ذغالی تیره', description: 'Deep charcoal dark background RGB(40,40,40), dramatic product photography, high contrast, luxury product showcase', image: 'https://images.unsplash.com/photo-1557672199-6dec25919530?w=800&h=600&fit=crop' },

  // Textured Surfaces
  { id: 'marble-white', name: 'مرمر سفید', description: 'White marble surface with subtle gray veining, luxury product display, elegant natural stone texture, high-end e-commerce aesthetic', image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=800&h=600&fit=crop' },
  { id: 'wood-light', name: 'چوب روشن', description: 'Light natural wood surface, warm oak or maple, clean grain texture, organic product photography, lifestyle aesthetic', image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&h=600&fit=crop' },
  { id: 'wood-dark', name: 'چوب تیره', description: 'Dark walnut wood surface, rich brown tones, elegant natural texture, premium product display, sophisticated look', image: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&h=600&fit=crop' },
  { id: 'concrete-smooth', name: 'بتن صاف', description: 'Smooth concrete surface, modern industrial aesthetic, neutral gray texture, contemporary product photography, urban minimal style', image: 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=800&h=600&fit=crop' },

  // Fabric & Soft Textures
  { id: 'linen-natural', name: 'کتان طبیعی', description: 'Natural linen fabric background, soft beige texture, wrinkled organic look, lifestyle product photography, casual elegant aesthetic', image: 'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=800&h=600&fit=crop' },
  { id: 'cotton-white', name: 'پنبه سفید', description: 'White cotton fabric background, soft textile texture, clean and fresh, casual product display, natural material aesthetic', image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&h=600&fit=crop' },
  { id: 'velvet-navy', name: 'مخمل سورمه‌ای', description: 'Navy blue velvet fabric, rich deep color, luxurious soft texture, premium product photography, elegant showcase', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&h=600&fit=crop' },
  { id: 'silk-champagne', name: 'ابریشم شامپاینی', description: 'Champagne silk fabric, subtle sheen, elegant draping, luxury product display, sophisticated and refined', image: 'https://images.unsplash.com/photo-1618221469555-7f3ad97540d6?w=800&h=600&fit=crop' },

  // Modern Minimal
  { id: 'pastel-pink', name: 'صورتی پاستل', description: 'Soft pastel pink background, modern minimal aesthetic, gentle blush tone, trendy product photography, feminine elegant look', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop' },
  { id: 'pastel-blue', name: 'آبی پاستل', description: 'Soft pastel blue background, calm serene color, minimal modern style, clean product display, fresh aesthetic', image: 'https://images.unsplash.com/photo-1614963326505-842a6f39a194?w=800&h=600&fit=crop' },
  { id: 'sage-green', name: 'سبز مریمی', description: 'Sage green muted background, natural earthy tone, modern botanical aesthetic, organic product photography, calm sophisticated look', image: 'https://images.unsplash.com/photo-1615799278677-e5a3e04f5ae4?w=800&h=600&fit=crop' },
  { id: 'terracotta', name: 'خاکی تراکوتا', description: 'Terracotta clay background, warm earthy orange-brown, natural material aesthetic, artisanal product display, warm inviting look', image: 'https://images.unsplash.com/photo-1615655096345-61c72c990126?w=800&h=600&fit=crop' }
];

// لیست حالت‌های بدن (Poses)
const poses = [
  { id: 'standing-front', name: 'ایستاده رو به جلو', description: 'Standing straight facing camera' },
  { id: 'standing-side', name: 'ایستاده نیمرخ', description: 'Standing with side profile, 45 degree angle' },
  { id: 'walking', name: 'در حال راه رفتن', description: 'Walking pose, natural movement' },
  { id: 'sitting', name: 'نشسته', description: 'Sitting pose, relaxed position' },
  { id: 'casual-lean', name: 'تکیه داده کژوال', description: 'Casual leaning pose, one hand in pocket' },
  { id: 'hands-on-hips', name: 'دست به کمر', description: 'Confident pose with hands on hips' },
  { id: 'crossed-arms', name: 'دست به سینه', description: 'Arms crossed, confident stance' },
  { id: 'dynamic', name: 'پویا و متحرک', description: 'Dynamic, energetic pose with movement' },
  { id: 'looking-back', name: 'نگاه به عقب', description: 'Looking back over shoulder, mysterious' },
  { id: 'hands-in-pockets', name: 'دست در جیب', description: 'Both hands in pockets, casual and relaxed' },
  { id: 'one-leg-bent', name: 'یک پا خم شده', description: 'One leg bent, weight on other leg, relaxed stance' },
  { id: 'sitting-crossed-legs', name: 'نشسته پا روی پا', description: 'Sitting with legs crossed, elegant' },
  { id: 'kneeling', name: 'زانو زده', description: 'Kneeling pose, artistic and unique' },
  { id: 'jumping', name: 'در حال پرش', description: 'Jumping or leaping, energetic and fun' },
  { id: 'leaning-wall', name: 'تکیه به دیوار', description: 'Leaning against wall, casual and cool' },
  { id: 'hand-in-hair', name: 'دست در مو', description: 'Hand running through hair, fashion pose' },
  { id: 'looking-down', name: 'نگاه به پایین', description: 'Looking down, contemplative and artistic' },
  { id: 'back-to-camera', name: 'پشت به دوربین', description: 'Back turned to camera, mysterious look' }
];

// لیست زاویه‌های دوربین
const cameraAngles = [
  { id: 'eye-level', name: 'هم‌سطح چشم', description: 'Camera at eye level, straight on' },
  { id: 'slightly-low', name: 'کمی از پایین', description: 'Slightly low angle, looking up' },
  { id: 'slightly-high', name: 'کمی از بالا', description: 'Slightly high angle, looking down' },
  { id: 'three-quarter', name: 'سه‌چهارم', description: 'Three-quarter view, 45 degree angle' },
  { id: 'low-angle', name: 'زاویه پایین (Worm\'s Eye)', description: 'Low angle looking up, powerful and dramatic' },
  { id: 'high-angle', name: 'زاویه بالا (Bird\'s Eye)', description: 'High angle looking down, comprehensive view' },
  { id: 'dutch-angle', name: 'زاویه مورب (Dutch Angle)', description: 'Tilted camera angle, dynamic and artistic' },
  { id: 'over-shoulder', name: 'از پشت شانه', description: 'Over the shoulder view, natural perspective' },
  { id: 'close-up', name: 'نمای نزدیک', description: 'Close-up shot, focus on details' },
  { id: 'wide-angle', name: 'نمای وسیع', description: 'Wide angle shot, environmental context' }
];

// لیست استایل‌ها و حال و هوا
const styles = [
  { id: 'professional', name: 'حرفه‌ای', description: 'Professional, business style, formal' },
  { id: 'casual', name: 'کژوال روزمره', description: 'Casual everyday style, relaxed' },
  { id: 'elegant', name: 'شیک و اِلِگانت', description: 'Elegant, sophisticated, classy' },
  { id: 'sporty', name: 'اسپرت', description: 'Sporty, athletic, dynamic' },
  { id: 'trendy', name: 'مد روز', description: 'Trendy, modern, fashionable' },
  { id: 'artistic', name: 'هنری', description: 'Artistic, creative, unique' },
  { id: 'vintage', name: 'وینتیج کلاسیک', description: 'Vintage classic style, retro aesthetic' },
  { id: 'minimalist', name: 'مینیمال', description: 'Minimalist, clean, simple and modern' },
  { id: 'bohemian', name: 'بوهو (بوهمیان)', description: 'Bohemian style, free-spirited, eclectic' },
  { id: 'streetwear', name: 'استریت‌ویر', description: 'Street style, urban, hip and cool' },
  { id: 'luxury', name: 'لاکچری', description: 'Luxury high-end, premium, exclusive' },
  { id: 'romantic', name: 'رمانتیک', description: 'Romantic, soft, dreamy atmosphere' },
  { id: 'edgy', name: 'ادجی (جسورانه)', description: 'Edgy, bold, alternative fashion' },
  { id: 'preppy', name: 'پرپی', description: 'Preppy, collegiate, polished casual' }
];

// لیست نورپردازی
const lightings = [
  { id: 'natural', name: 'طبیعی روز', description: 'Natural daylight, soft shadows' },
  { id: 'studio', name: 'استودیو حرفه‌ای', description: 'Professional studio lighting, balanced' },
  { id: 'golden-hour', name: 'طلایی (Golden Hour)', description: 'Golden hour, warm sunset light' },
  { id: 'dramatic', name: 'دراماتیک', description: 'Dramatic lighting, strong contrasts' },
  { id: 'soft-diffused', name: 'نرم و پخش شده', description: 'Soft diffused light, minimal shadows' },
  { id: 'backlit', name: 'نور پشت', description: 'Backlit, rim lighting effect' },
  { id: 'blue-hour', name: 'آبی (Blue Hour)', description: 'Blue hour twilight, cool moody atmosphere' },
  { id: 'ring-light', name: 'رینگ لایت', description: 'Ring light, even beauty lighting' },
  { id: 'side-light', name: 'نور از کنار', description: 'Side lighting, dimensional depth and texture' },
  { id: 'rembrandt', name: 'رامبرانت', description: 'Rembrandt lighting, classic portrait style' },
  { id: 'butterfly', name: 'پروانه‌ای', description: 'Butterfly lighting, glamorous beauty light' },
  { id: 'split', name: 'نیم‌رخ', description: 'Split lighting, half face lit, dramatic' },
  { id: 'neon', name: 'نئون شهری', description: 'Neon urban lighting, colorful modern vibe' },
  { id: 'candlelight', name: 'نور شمع', description: 'Candlelight, warm intimate atmosphere' },
  { id: 'overcast', name: 'ابری', description: 'Overcast diffused light, soft even illumination' }
];

// نوع فریم (Shot Type / Framing)
const shotTypes = [
  { id: 'full-body', name: '🧍 تمام قد (Full Body)', description: 'Full body shot from head to toe, complete view' },
  { id: 'three-quarter', name: '⅗ سه‌چهارم (3/4 Body)', description: 'Three-quarter body shot, from head to mid-thigh' },
  { id: 'half-body', name: '½ نیم‌تنه (Half Body)', description: 'Half body shot, from head to waist' },
  { id: 'waist-up', name: '🎯 از کمر به بالا (Waist Up)', description: 'Waist up shot, from head to waist line' },
  { id: 'knee-up', name: '🦵 از زانو به بالا (Knee Up)', description: 'From knee up, casual standing pose' },
  { id: 'bust', name: '👔 سینه و شانه (Bust Shot)', description: 'Bust shot, head and shoulders plus upper chest' },
  { id: 'head-shoulders', name: '👤 سر و گردن (Head & Shoulders)', description: 'Head and shoulders portrait, classic framing' },
  { id: 'close-portrait', name: '📸 پرتره نزدیک (Close Portrait)', description: 'Close portrait, face and neck only' },
  { id: 'extreme-close', name: '🔍 بسیار نزدیک (Extreme Close-up)', description: 'Extreme close-up, face details and expression' }
];

// PHASE 1: Critical Quality Parameters

// دمای رنگ (Color Temperature)
const colorTemperatures = [
  { id: 'warm', name: '🔥 گرم (2700K-3500K)', description: 'Warm color temperature 2700K-3500K, cozy sunset feel, golden orange tones' },
  { id: 'neutral', name: '☀️ خنثی (5000K-5500K)', description: 'Neutral color temperature 5000K-5500K, natural daylight, true-to-life colors' },
  { id: 'cool', name: '❄️ سرد (6000K-7000K)', description: 'Cool color temperature 6000K-7000K, modern crisp look, blue-tinted highlights' },
  { id: 'auto', name: '🎨 خودکار', description: 'Auto white balance matched to location and lighting for natural look' }
];

// عمق میدان (Depth of Field)
const depthOfFields = [
  { id: 'ultra-shallow', name: '💫 خیلی کم (f/1.2-1.4)', description: 'Ultra shallow depth of field f/1.2-f/1.4, extreme bokeh, dreamy background blur, cinematic look' },
  { id: 'shallow', name: '🎯 کم (f/1.8-2.8)', description: 'Shallow depth of field f/1.8-f/2.8, soft background bokeh, subject pops out, professional portrait look' },
  { id: 'medium-shallow', name: '🌟 کم به متوسط (f/3.5-4)', description: 'Medium-shallow depth of field f/3.5-f/4, gentle background separation, natural look' },
  { id: 'medium', name: '⚖️ متوسط (f/5.6)', description: 'Medium depth of field f/5.6, balanced focus, slight background blur, versatile for most situations' },
  { id: 'medium-deep', name: '🔍 متوسط به زیاد (f/8)', description: 'Medium-deep depth of field f/8, good sharpness throughout, environmental context visible' },
  { id: 'deep', name: '📐 زیاد (f/11-16)', description: 'Deep depth of field f/11-f/16, everything sharp and in focus, product photography style' },
  { id: 'ultra-deep', name: '🌍 خیلی زیاد (f/22+)', description: 'Ultra deep depth of field f/22+, maximum sharpness, landscape photography style, tack-sharp details' }
];

// بافت پارچه (Fabric Texture)
const fabricTypes = [
  { id: 'cotton', name: '👕 نخی (Cotton)', description: 'Cotton fabric: matte finish, soft texture, natural wrinkles, breathable appearance' },
  { id: 'denim', name: '👖 جین (Denim)', description: 'Denim fabric: rugged texture, visible weave pattern, structured folds, indigo color depth' },
  { id: 'silk', name: '👗 ابریشم (Silk)', description: 'Silk fabric: lustrous sheen, smooth drape, fluid movement, reflective highlights' },
  { id: 'wool', name: '🧥 پشمی (Wool)', description: 'Wool fabric: textured surface, warm appearance, structured shape, subtle fiber detail' },
  { id: 'leather', name: '🧥 چرم (Leather)', description: 'Leather material: glossy or matte finish, natural grain texture, firm structure, environmental reflections' },
  { id: 'synthetic', name: '🏃 مصنوعی (Synthetic)', description: 'Synthetic fabric: smooth surface, consistent texture, slight sheen, athletic appearance' },
  { id: 'linen', name: '🌾 کتان (Linen)', description: 'Linen fabric: natural creases, textured weave, relaxed drape, casual elegance' },
  { id: 'auto', name: '🤖 تشخیص خودکار', description: 'Auto-detect fabric type from garment image and render appropriate texture' }
];

// کیفیت سایه (Shadow Quality)
const shadowQualities = [
  { id: 'hard', name: '⚫ سخت', description: 'Hard shadows: sharp edges, high contrast, direct light source, dramatic effect' },
  { id: 'medium', name: '🌗 متوسط', description: 'Medium shadows: moderately soft edges, balanced contrast, natural appearance' },
  { id: 'soft', name: '⚪ نرم', description: 'Soft shadows: diffused edges, low contrast, gentle transitions, flattering look' },
  { id: 'studio', name: '🎬 استودیو', description: 'Studio shadows: controlled density, proper direction, color temperature shifted cooler, professional quality' }
];

// PHASE 2: Professional Touch Parameters

// نسبت تصویر (Aspect Ratio)
const aspectRatios = [
  { id: '1:1', name: '⬜ مربع 1:1', description: 'Square 1:1 ratio, perfect for Instagram feed posts', width: 1024, height: 1024 },
  { id: '4:5', name: '📱 پرتره 4:5', description: 'Portrait 4:5 ratio, ideal for Instagram portrait posts', width: 1024, height: 1280 },
  { id: '16:9', name: '🖥️ افقی 16:9', description: 'Landscape 16:9 ratio, widescreen for websites and banners', width: 1920, height: 1080 },
  { id: '9:16', name: '📲 استوری 9:16', description: 'Vertical 9:16 ratio, Instagram/TikTok stories and reels', width: 1080, height: 1920 },
  { id: '3:4', name: '📸 کلاسیک 3:4', description: 'Classic 3:4 portrait ratio, traditional photography', width: 1536, height: 2048 }
];

// نسبت نوری (Lighting Ratio)
const lightingRatios = [
  { id: 'low', name: '📉 کم (2:1)', description: 'Low contrast 2:1 lighting ratio, flat even lighting, minimal shadows, commercial look' },
  { id: 'medium', name: '⚖️ متوسط (4:1)', description: 'Medium contrast 4:1 lighting ratio, balanced shadows and highlights, natural depth' },
  { id: 'high', name: '📈 زیاد (8:1)', description: 'High contrast 8:1 lighting ratio, dramatic shadows, strong depth, editorial style' },
  { id: 'rembrandt', name: '🎨 رامبراند', description: 'Rembrandt lighting, triangular highlight on cheek, artistic portrait style, 6:1 ratio' }
];

// تاری پس‌زمینه (Background Blur)
const backgroundBlurs = [
  { id: 'none', name: '⛔ بدون تاری', description: 'No background blur, everything sharp, product photography' },
  { id: 'subtle', name: '🌫️ ملایم (20%)', description: 'Subtle background blur 20%, slight separation, natural look' },
  { id: 'medium', name: '🌁 متوسط (50%)', description: 'Medium background blur 50%, clear subject focus, professional portraits' },
  { id: 'heavy', name: '☁️ زیاد (80%)', description: 'Heavy background blur 80%, strong bokeh effect, subject isolation' },
  { id: 'cinematic', name: '🎬 سینمایی (100%)', description: 'Cinematic blur 100%, creamy bokeh, hexagonal highlights, film-like quality' }
];

// برازش لباس (Garment Fit)
const garmentFits = [
  { id: 'tight', name: '⚡ تنگ/Fitted', description: 'Tight fitted garment, body-hugging, minimal fabric slack, athletic fit' },
  { id: 'regular', name: '👔 معمولی/Regular', description: 'Regular fit garment, natural comfort, standard proportions, everyday wear' },
  { id: 'loose', name: '🌊 گشاد/Loose', description: 'Loose oversized fit, relaxed drape, extra fabric, streetwear style' },
  { id: 'tailored', name: '✂️ خیاطی شده/Tailored', description: 'Tailored custom fit, precise measurements, structured shape, luxury appearance' }
];

// PHASE 3: Advanced Features

// پیش‌تنظیم پردازش (Post-Processing Presets)
const postProcessingPresets = [
  { id: 'natural', name: '🌿 طبیعی', description: 'Natural processing, true colors, minimal editing, authentic look' },
  { id: 'editorial', name: '📰 ادیتوریال', description: 'Editorial magazine style, high contrast, vibrant colors, punchy saturation, Vogue aesthetic' },
  { id: 'ecommerce', name: '🛍️ فروشگاهی', description: 'E-commerce clean look, neutral accurate colors, even lighting, product-focused' },
  { id: 'vintage', name: '📼وینتیج', description: 'Vintage retro film look, faded colors, grain texture, nostalgic 70s-90s aesthetic' },
  { id: 'cinematic', name: '🎬 سینمایی', description: 'Cinematic color grading, teal and orange, film-like contrast, movie poster quality' },
  { id: 'portra', name: '🎞️ کداک پرترا', description: 'Kodak Portra 400 film emulation, warm skin tones, soft pastels, professional portrait film' },
  { id: 'velvia', name: '🌄 فوجی ولویا', description: 'Fuji Velvia film emulation, hyper-saturated, rich colors, landscape film aesthetic' },
  { id: 'bw-classic', name: '⬛ سیاه‌سفید کلاسیک', description: 'Classic black and white, rich tones, proper contrast, timeless monochrome' }
];

// بازتاب محیط (Environmental Reflections)
const environmentalReflections = [
  { id: 'none', name: '⛔ بدون بازتاب', description: 'No environmental reflections, isolated subject' },
  { id: 'subtle', name: '✨ ملایم', description: 'Subtle environmental reflections, slight color cast from surroundings, natural integration' },
  { id: 'realistic', name: '🌍 واقع‌گرایانه', description: 'Realistic environmental reflections, ambient light influence, proper color temperature shift, location-based lighting' },
  { id: 'enhanced', name: '💎 تقویت شده', description: 'Enhanced environmental reflections, visible on reflective materials like silk and leather, strong ambient occlusion' }
];

// جلوه‌های آب و هوا (Weather Effects)
const weatherEffects = [
  { id: 'clear', name: '☀️ صاف', description: 'Clear weather, bright sunlight, crisp shadows, perfect visibility' },
  { id: 'overcast', name: '☁️ ابری', description: 'Overcast cloudy day, soft diffused light, gentle shadows, even illumination' },
  { id: 'mist', name: '🌫️ مه ملایم', description: 'Light mist or fog, atmospheric depth, soft focus on background, dreamy mood' },
  { id: 'golden', name: '🌅 طلایی', description: 'Golden hour atmosphere, warm sunlight, long shadows, magical quality' },
  { id: 'dramatic', name: '⛈️ دراماتیک', description: 'Dramatic stormy atmosphere, moody clouds, dynamic contrast, editorial impact' }
];

// حرکت و پویایی (Motion Elements)
const motionElements = [
  { id: 'static', name: '🗿 ثابت', description: 'Static pose, no motion, perfectly sharp, classic studio shot' },
  { id: 'hair', name: '💨 حرکت مو', description: 'Hair movement from gentle wind, natural flow, adds life and energy' },
  { id: 'fabric', name: '🌊 حرکت پارچه', description: 'Fabric flow and movement, dynamic draping, flowing garments, editorial drama' },
  { id: 'action', name: '⚡ اکشن', description: 'Action photography feel, slight motion blur, frozen movement, dynamic energy' },
  { id: 'wind', name: '🌬️ باد قوی', description: 'Strong wind effect, dramatic fabric and hair movement, high-energy fashion editorial' }
];

// Middleware برای احراز هویت
const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    // برای demo، اجازه دسترسی بدون احراز هویت
    req.user = null;
    return next();
  }

  // If Supabase is not configured, allow access without authentication
  if (!supabase) {
    console.warn('⚠️ Supabase not configured - allowing unauthenticated access');
    req.user = null;
    return next();
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('❌ Auth error:', error.message);
      throw error;
    }
    if (!user) {
      console.error('❌ No user found with token');
      throw new Error('No user found');
    }
    console.log('✅ User authenticated:', user.email, 'ID:', user.id);

    // Fetch user's phone number from user_limits table
    try {
      const { data: userLimits } = await supabase
        .from('user_limits')
        .select('phone_number, email')
        .eq('user_id', user.id)
        .single();

      // Add phone to user object
      if (userLimits) {
        user.phone = userLimits.phone_number;
        user.phone_number = userLimits.phone_number;
      }
    } catch (phoneError) {
      console.log('⚠️ Could not fetch phone number:', phoneError.message);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// ثبت نام کاربر
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) throw error;
    res.json({ success: true, user: data.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ورود کاربر
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;
    res.json({ success: true, session: data.session });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// خروج کاربر
app.post('/api/auth/signout', authenticateUser, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// دریافت لیست مدل‌ها
app.get('/api/models', async (req, res) => {
  try {
    const mode = req.query.mode || 'complete-outfit';

    // Initialize empty models array - we'll fetch from database only
    let allModels = [];

    // Fetch models from database (both public and user's private models if logged in)
    if (supabase) {
      const authHeader = req.headers.authorization;
      let userId = null;
      let userTier = null;

      // Try to get user ID and tier if authenticated (skip if no auth header for speed)
      if (authHeader && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (!error && user) {
            userId = user.id;

            // Get user's tier for hierarchical filtering
            const { data: limits } = await supabase
              .from('user_limits')
              .select('tier')
              .eq('user_id', userId)
              .single();

            if (limits) {
              userTier = limits.tier;
            }
          }
        } catch (authError) {
          // Silently fail - show public models only
        }
      }

      try {
        // Build query to fetch models
        // Only select columns we need for better performance
        let query = supabase
          .from('models')
          .select('id, name, category, description, image_url, tier_requirement')
          .eq('is_active', true);

        // If user is logged in, show their private models + public models
        // If not logged in, show only public models
        if (userId) {
          query = query.or(`visibility.eq.public,owner_user_id.eq.${userId}`);
        } else {
          query = query.eq('visibility', 'public');
        }

        // Filter by category based on mode
        if (mode === 'accessories-only') {
          query = query.in('category', ['brand-woman', 'brand-man', 'brand-girl', 'brand-boy']);
        } else if (mode === 'complete-outfit') {
          // Show regular categories for complete-outfit service
          query = query.in('category', ['woman', 'man', 'girl', 'boy', 'plus-size']);
        } else if (mode === 'scene-recreation') {
          // Show brand categories for scene-recreation service
          query = query.in('category', ['brand-woman', 'brand-man', 'brand-girl', 'brand-boy', 'brand-plus-size']);
        }

        // Optimize: Limit results to 100 most recent models for faster loading
        // Frontend will handle pagination client-side
        const { data: customModels } = await query
          .order('created_at', { ascending: false })
          .limit(100);

        if (customModels && customModels.length > 0) {
          console.log(`✅ Found ${customModels.length} models (mode: ${mode}, userId: ${userId || 'public'}, tier: ${userTier || 'none'})`);

          // Filter models by tier hierarchy
          // testlimit and gold: see all tiers
          // silver: see silver + bronze
          // bronze: see bronze only
          // no tier/public: see bronze only
          const allowedTiers = [];
          if (userTier === 'testlimit' || userTier === 'gold') {
            allowedTiers.push('bronze', 'silver', 'gold', 'testlimit');
          } else if (userTier === 'silver') {
            allowedTiers.push('bronze', 'silver');
          } else {
            // bronze or no tier
            allowedTiers.push('bronze');
          }

          const filteredModels = customModels.filter(model => {
            const modelTier = model.tier_requirement || 'bronze';
            return allowedTiers.includes(modelTier);
          });

          console.log(`🔒 Tier filtering: ${customModels.length} models → ${filteredModels.length} accessible (user tier: ${userTier || 'none'}, allowed: ${allowedTiers.join(', ')})`);

          // Transform database models to match frontend format
          // Use image_url directly - it's already stored as a valid URL in the database
          const transformedModels = filteredModels.map(model => ({
            id: `custom-${model.id}`,
            name: model.name,
            category: model.category,
            categoryName: model.category,
            description: model.description || model.name,
            image: model.image_url, // Already a valid public URL
            isCustom: true
          }));

          console.log('📋 Model categories:', transformedModels.map(m => m.category).join(', '));
          allModels = [...transformedModels, ...allModels];
        } else {
          console.log(`ℹ️ No models found (mode: ${mode}, userId: ${userId || 'public'})`);
        }
      } catch (dbError) {
        console.error('Database query failed:', dbError);
      }
    }

    res.json(allModels);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.json([]); // Return empty array on error
  }
});

// دریافت لیست پس‌زمینه‌ها
app.get('/api/backgrounds', async (req, res) => {
  try {
    const mode = req.query.mode || 'complete-outfit'; // Get mode from query parameter

    // Select appropriate background list based on mode
    let baseBackgrounds;
    if (mode === 'flat-lay' || mode === 'accessories-only') {
      // These modes use brand reference photos, no background selection needed
      baseBackgrounds = [];
    } else if (mode === 'color-collection') {
      // Color collection still uses backgrounds
      baseBackgrounds = [...productBackgrounds];
    } else {
      baseBackgrounds = [...backgrounds]; // Regular location backgrounds
    }

    let allBackgrounds = baseBackgrounds;

    // If user is authenticated and Supabase is configured, add their custom backgrounds
    const authHeader = req.headers.authorization;
    if (authHeader && supabase) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;

        if (user) {
          // Fetch user's custom backgrounds
          const { data: customBackgrounds } = await supabase
            .from('content_library')
            .select('*')
            .eq('content_type', 'background')
            .eq('is_active', true)
            .or(`visibility.eq.public,owner_user_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

          if (customBackgrounds && customBackgrounds.length > 0) {
            // Transform database backgrounds to match frontend format
            const transformedBackgrounds = customBackgrounds.map(bg => ({
              id: `custom-${bg.id}`,
              name: bg.name,
              category: bg.category,
              categoryName: bg.category,
              description: bg.description || bg.name,
              image: bg.image_url,
              isCustom: true
            }));

            allBackgrounds = [...transformedBackgrounds, ...allBackgrounds];
          }
        }
      } catch (authError) {
        console.log('Auth check failed, returning default backgrounds only');
      }
    }

    res.json(allBackgrounds);
  } catch (error) {
    console.error('Error fetching backgrounds:', error);
    res.json(backgrounds); // Fallback to default backgrounds
  }
});

// دریافت لیست حالت‌های بدن
app.get('/api/poses', (req, res) => {
  res.json(poses);
});

// دریافت لیست زاویه‌های دوربین
app.get('/api/camera-angles', (req, res) => {
  res.json(cameraAngles);
});

// دریافت لیست استایل‌ها
app.get('/api/styles', (req, res) => {
  res.json(styles);
});

// دریافت تنظیمات Supabase برای frontend
app.get('/api/supabase-config', (req, res) => {
  if (!supabase || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({
      error: 'Supabase is not configured',
      configured: false
    });
  }

  res.json({
    configured: true,
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  });
});

// Lookup email by phone number for authentication
app.post('/api/auth/lookup-email-by-phone', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    // Query auth.users to find user with matching phone in metadata
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to lookup user' });
    }

    // Find user with matching phone in user_metadata
    const user = data.users.find(u => u.user_metadata?.phone === phone);

    if (!user) {
      return res.status(404).json({ error: 'User not found with this phone number' });
    }

    res.json({ email: user.email });
  } catch (error) {
    console.error('Error in phone lookup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// دریافت لیست نورپردازی
app.get('/api/lightings', (req, res) => {
  res.json(lightings);
});

// دریافت لیست نوع فریم (Shot Types)
app.get('/api/shot-types', (req, res) => {
  res.json(shotTypes);
});
// Trigger reload for Replit

// PHASE 1: New API endpoints for critical quality parameters
app.get('/api/color-temperatures', (req, res) => {
  res.json(colorTemperatures);
});

app.get('/api/depth-of-fields', (req, res) => {
  res.json(depthOfFields);
});

app.get('/api/fabric-types', (req, res) => {
  res.json(fabricTypes);
});

app.get('/api/shadow-qualities', (req, res) => {
  res.json(shadowQualities);
});

// PHASE 2: Professional touch parameters
app.get('/api/aspect-ratios', (req, res) => {
  res.json(aspectRatios);
});

app.get('/api/lighting-ratios', (req, res) => {
  res.json(lightingRatios);
});

app.get('/api/background-blurs', (req, res) => {
  res.json(backgroundBlurs);
});

app.get('/api/garment-fits', (req, res) => {
  res.json(garmentFits);
});

// PHASE 3: Advanced features
app.get('/api/post-processing-presets', (req, res) => {
  res.json(postProcessingPresets);
});

app.get('/api/environmental-reflections', (req, res) => {
  res.json(environmentalReflections);
});

app.get('/api/weather-effects', (req, res) => {
  res.json(weatherEffects);
});

app.get('/api/motion-elements', (req, res) => {
  res.json(motionElements);
});

// آپلود عکس لباس به Supabase Storage
app.post('/api/upload', authenticateUser, upload.single('garment'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لطفاً یک عکس آپلود کنید' });
    }

    // بررسی تنظیمات Supabase
    if (!supabase) {
      console.error('❌ Supabase تنظیم نشده است!');
      return res.status(500).json({
        error: 'خطا در تنظیمات سرور',
        details: 'لطفاً فایل .env را با اطلاعات Supabase تنظیم کنید'
      });
    }

    const fileName = sanitizeFilename(req.file.originalname);
    const fileBuffer = req.file.buffer;

    console.log(`📤 در حال آپلود فایل: ${fileName}`);

    // آپلود به Supabase Storage
    const { data, error } = await supabase.storage
      .from('garments')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('❌ خطای Supabase Storage:', error);
      return res.status(500).json({
        error: 'خطا در آپلود به Supabase',
        details: error.message,
        hint: 'مطمئن شوید که bucket با نام "garments" ساخته شده و public است'
      });
    }

    // دریافت URL عمومی فایل
    const { data: urlData } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    console.log(`✅ آپلود موفق: ${urlData.publicUrl}`);

    // ذخیره در content_library برای نمایش در گالری
    try {
      const userId = req.user?.id || null;

      const { error: dbError } = await supabase
        .from('content_library')
        .insert({
          content_type: 'garment',
          name: fileName.replace(/\.[^/.]+$/, ''),
          category: 'garment',
          visibility: 'private',
          image_url: urlData.publicUrl,
          storage_bucket: 'garments',
          storage_filename: fileName,
          owner_user_id: userId,
          is_active: true
        });

      if (dbError) {
        console.warn('⚠️ خطا در ذخیره در content_library:', dbError);
      } else {
        console.log('✅ فایل در content_library ذخیره شد');
      }
    } catch (dbError) {
      console.warn('⚠️ خطا در ذخیره در پایگاه داده:', dbError);
    }

    res.json({
      success: true,
      filePath: urlData.publicUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('❌ خطای سرور:', error);
    res.status(500).json({
      error: 'خطا در آپلود فایل',
      details: error.message
    });
  }
});

// آپلود عکس مرجع برای Scene Recreation mode
app.post('/api/upload-reference', authenticateUser, upload.single('referencePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لطفاً یک عکس مرجع آپلود کنید' });
    }

    // بررسی تنظیمات Supabase
    if (!supabase) {
      console.error('❌ Supabase تنظیم نشده است!');
      return res.status(500).json({
        error: 'خطا در تنظیمات سرور',
        details: 'لطفاً فایل .env را با اطلاعات Supabase تنظیم کنید'
      });
    }

    const fileName = `reference-${sanitizeFilename(req.file.originalname)}`;
    const fileBuffer = req.file.buffer;

    console.log(`📤 در حال آپلود عکس مرجع: ${fileName}`);

    // آپلود به Supabase Storage
    const { data, error } = await supabase.storage
      .from('garments')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('❌ خطای Supabase Storage:', error);
      return res.status(500).json({
        error: 'خطا در آپلود به Supabase',
        details: error.message
      });
    }

    // دریافت URL عمومی فایل
    const { data: urlData } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    console.log(`✅ آپلود عکس مرجع موفق: ${urlData.publicUrl}`);

    res.json({
      success: true,
      filePath: urlData.publicUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('❌ خطای سرور:', error);
    res.status(500).json({
      error: 'خطا در آپلود عکس مرجع',
      details: error.message
    });
  }
});

// آپلود عکس‌های استایل برای Style Transfer mode
app.post('/api/upload-style', upload.single('styleImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لطفاً یک عکس استایل آپلود کنید' });
    }

    if (!supabase) {
      console.error('❌ Supabase تنظیم نشده است!');
      return res.status(500).json({
        error: 'خطا در تنظیمات سرور',
        details: 'لطفاً فایل .env را با اطلاعات Supabase تنظیم کنید'
      });
    }

    const fileName = `style-${sanitizeFilename(req.file.originalname)}`;
    const fileBuffer = req.file.buffer;

    console.log(`📤 در حال آپلود عکس استایل: ${fileName}`);

    const { data, error } = await supabase.storage
      .from('garments')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('❌ خطای Supabase Storage:', error);
      return res.status(500).json({
        error: 'خطا در آپلود به Supabase',
        details: error.message
      });
    }

    const { data: urlData } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    console.log(`✅ آپلود عکس استایل موفق: ${urlData.publicUrl}`);

    res.json({
      success: true,
      filePath: urlData.publicUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('❌ خطای سرور:', error);
    res.status(500).json({
      error: 'خطا در آپلود عکس استایل',
      details: error.message
    });
  }
});

// آپلود عکس محتوا برای Style Transfer mode
app.post('/api/upload-content', upload.single('contentImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لطفاً یک عکس محتوا آپلود کنید' });
    }

    if (!supabase) {
      console.error('❌ Supabase تنظیم نشده است!');
      return res.status(500).json({
        error: 'خطا در تنظیمات سرور',
        details: 'لطفاً فایل .env را با اطلاعات Supabase تنظیم کنید'
      });
    }

    const fileName = `content-${sanitizeFilename(req.file.originalname)}`;
    const fileBuffer = req.file.buffer;

    console.log(`📤 در حال آپلود عکس محتوا: ${fileName}`);

    const { data, error } = await supabase.storage
      .from('garments')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('❌ خطای Supabase Storage:', error);
      return res.status(500).json({
        error: 'خطا در آپلود به Supabase',
        details: error.message
      });
    }

    const { data: urlData } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    console.log(`✅ آپلود عکس محتوا موفق: ${urlData.publicUrl}`);

    res.json({
      success: true,
      filePath: urlData.publicUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('❌ خطای سرور:', error);
    res.status(500).json({
      error: 'خطا در آپلود عکس محتوا',
      details: error.message
    });
  }
});

// تحلیل عکس مرجع با Gemini برای Scene Recreation mode
app.post('/api/analyze-scene', async (req, res) => {
  try {
    const { photoPath } = req.body;

    if (!photoPath) {
      return res.status(400).json({ error: 'مسیر عکس مشخص نشده است' });
    }

    console.log(`🔍 در حال تحلیل صحنه: ${photoPath}`);

    // دانلود تصویر و تبدیل به base64
    const imageBase64 = await imageUrlToBase64(photoPath);

    // استفاده از Gemini Vision برای تحلیل صحنه
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const analysisPrompt = `You are an expert fashion photographer and scene analyst. Analyze this reference photo in detail and provide a comprehensive description that will be used to recreate a similar fashion photo with a model wearing different clothing.

CRITICAL FIRST TASK: Count the number of COMPLETE people visible in this photo (1, 2, 3, or more). Only count people where you can see most of their body, not just a hand or partial view.

Focus on these key aspects:

1. **People Analysis** (MOST IMPORTANT - if any people are present):
   - EXACTLY how many complete people are in the photo? (State the number clearly at the start)
   - Their positions, poses, and body language
   - Their facial expressions and mood
   - How they are interacting (if multiple people)
   - Camera angle relative to the person/people
   - If there are 2 or 3 people, describe how they are positioned relative to each other

2. **Location & Environment**:
   - Type of location (indoor/outdoor, specific place)
   - Background elements and scenery
   - Setting characteristics (urban, natural, studio, etc.)
   - Depth of field and background focus

3. **Lighting**:
   - Light source (natural/artificial, direction)
   - Time of day (if outdoor)
   - Lighting mood (bright, moody, dramatic, soft)
   - Shadows and highlights
   - Color temperature (warm/cool)

4. **Composition**:
   - Camera angle (eye level, low angle, high angle)
   - Shot type (close-up, medium shot, full body, etc.)
   - Rule of thirds or other composition techniques
   - Framing and negative space

5. **Color Palette & Atmosphere**:
   - Dominant colors in the scene
   - Color harmony and mood
   - Overall atmosphere (energetic, calm, mysterious, etc.)
   - Visual style (minimalist, busy, elegant, casual)

6. **Technical Details**:
   - Apparent focal length (wide, normal, telephoto)
   - Depth of field (shallow/deep)
   - Any special effects or filters

Provide your analysis in Persian (فارسی) in a clear, structured format that a photographer can use to recreate the scene. Be specific and detailed.`;

    const result = await visionModel.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      }
    ]);

    const response = await result.response;
    const analysis = response.text();

    // Now detect the number of people separately for use in generation
    const peopleCountPrompt = `Count EXACTLY how many full people/persons are clearly visible in this image. Respond with ONLY a single number (1, 2, or 3). If you see 4 or more people, respond with 3 (we support up to 3).`;

    const countResult = await visionModel.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      },
      peopleCountPrompt
    ]);

    const countResponse = await countResult.response;
    const detectedCount = parseInt(countResponse.text().trim());
    const numberOfPeople = Math.max(1, Math.min(3, isNaN(detectedCount) ? 1 : detectedCount));

    console.log(`✅ تحلیل صحنه کامل شد - تعداد افراد: ${numberOfPeople}`);

    res.json({
      success: true,
      analysis: analysis,
      numberOfPeople: numberOfPeople
    });
  } catch (error) {
    console.error('❌ خطا در تحلیل صحنه:', error);
    res.status(500).json({
      error: 'خطا در تحلیل صحنه',
      details: error.message
    });
  }
});

// تابع دانلود تصویر از URL و تبدیل به base64
async function imageUrlToBase64(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return base64;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// تابع تولید تصاویر مدل‌ها با Gemini AI
async function generateModelImages() {
  console.log('🎨 شروع تولید تصاویر مدل‌ها با Gemini AI...');

  if (!supabase) {
    console.error('❌ Supabase تنظیم نشده است. امکان آپلود تصاویر وجود ندارد.');
    throw new Error('Supabase is not configured');
  }

  // پاک کردن مدل‌های قبلی (fallback یا قدیمی)
  models = [];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image",
    generationConfig: {
      responseModalities: ["Image"]
    }
  });

  for (const modelPrompt of modelPrompts) {
    try {
      console.log(`📸 در حال تولید تصویر برای: ${modelPrompt.name}`);

      const result = await model.generateContent([
        { text: modelPrompt.prompt }
      ]);

      const response = await result.response;

      if (!response.candidates || !response.candidates[0] || !response.candidates[0].content || !response.candidates[0].content.parts) {
        console.error(`❌ خطا در تولید تصویر ${modelPrompt.name}`);
        continue;
      }

      let generatedImageBase64 = null;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImageBase64 = part.inlineData.data;
          break;
        }
      }

      if (!generatedImageBase64) {
        console.error(`❌ تصویری برای ${modelPrompt.name} تولید نشد`);
        continue;
      }

      // تبدیل base64 به buffer و آپلود به Supabase
      const imageBuffer = Buffer.from(generatedImageBase64, 'base64');
      const fileName = `model-${modelPrompt.id}-${Date.now()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('garments')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error(`❌ خطا در آپلود ${modelPrompt.name}:`, uploadError);
        continue;
      }

      // دریافت URL عمومی
      const { data: urlData } = supabase.storage
        .from('garments')
        .getPublicUrl(fileName);

      // افزودن به لیست مدل‌ها
      models.push({
        id: modelPrompt.id,
        name: modelPrompt.name,
        type: modelPrompt.type,
        description: modelPrompt.description,
        image: urlData.publicUrl
      });

      console.log(`✅ تصویر ${modelPrompt.name} با موفقیت تولید و آپلود شد`);

      // تاخیر کوتاه بین درخواست‌ها برای جلوگیری از rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ خطا در تولید ${modelPrompt.name}:`, error.message);
    }
  }

  console.log(`✅ تولید مدل‌ها تمام شد. تعداد: ${models.length}`);

  // ذخیره مدل‌ها در فایل برای استفاده بعدی
  try {
    fs.writeFileSync(
      path.join(__dirname, 'generated-models.json'),
      JSON.stringify(models, null, 2)
    );
    console.log('💾 مدل‌ها در فایل ذخیره شدند');
  } catch (error) {
    console.error('❌ خطا در ذخیره فایل:', error);
  }
}

// بارگذاری مدل‌های ذخیره شده (اگر وجود دارند)
function loadSavedModels() {
  const modelsFilePath = path.join(__dirname, 'generated-models.json');
  if (fs.existsSync(modelsFilePath)) {
    try {
      const savedModels = JSON.parse(fs.readFileSync(modelsFilePath, 'utf8'));
      models = savedModels;
      console.log(`✅ ${models.length} مدل از فایل بارگذاری شد`);
      return true;
    } catch (error) {
      console.error('❌ خطا در بارگذاری مدل‌ها از فایل:', error);
      return false;
    }
  }
  return false;
}

// ============================================
// USAGE TRACKING HELPER FUNCTIONS
// ============================================

/**
 * Get credit cost for a service mode
 * All services: 1 credit (unified pricing)
 */
function getServiceCreditCost(mode) {
  // All services now cost 1 credit
  return 1;
}

/**
 * Get tier limits based on tier name
 */
// Cache for tier pricing (refresh every 5 minutes)
let tierPricingCache = null;
let tierPricingCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getTierLimits(tier) {
  // Default fallback values
  const fallbackLimits = {
    testlimit: { credits: 5, name: 'تست' },
    bronze: { credits: 100, name: 'برنزی' },
    silver: { credits: 130, name: 'نقره‌ای' },
    gold: { credits: 171, name: 'طلایی' }
  };

  // Try to fetch from database if supabaseAdmin is available
  if (supabaseAdmin) {
    try {
      // Check cache first
      const now = Date.now();
      if (tierPricingCache && (now - tierPricingCacheTime) < CACHE_DURATION) {
        return tierPricingCache[tier] || fallbackLimits[tier] || fallbackLimits.testlimit;
      }

      // Fetch fresh data from database
      const { data: pricing, error } = await supabaseAdmin
        .from('tier_pricing')
        .select('tier, credits')
        .eq('is_active', true);

      if (!error && pricing) {
        // Build cache object
        const newCache = {};
        const tierNames = {
          testlimit: 'تست',
          bronze: 'برنزی',
          silver: 'نقره‌ای',
          gold: 'طلایی'
        };

        pricing.forEach(p => {
          newCache[p.tier] = {
            credits: p.credits,
            name: tierNames[p.tier] || p.tier
          };
        });

        // Update cache
        tierPricingCache = newCache;
        tierPricingCacheTime = now;

        return newCache[tier] || fallbackLimits[tier] || fallbackLimits.testlimit;
      }
    } catch (error) {
      console.error('Error fetching tier limits from database:', error);
    }
  }

  // Fallback to hardcoded values if database fetch fails
  return fallbackLimits[tier] || fallbackLimits.testlimit;
}

/**
 * Check if user has enough credits and deduct if yes
 * Returns: { allowed: boolean, message: string, remaining: number }
 */
async function checkAndDeductCredits(userId, mode) {
  console.log('🔍 checkAndDeductCredits called with userId:', userId, 'mode:', mode);
  if (!supabase || !userId) {
    console.log('⚠️ Demo mode triggered - supabase:', !!supabase, 'userId:', userId);
    return { allowed: true, message: 'Demo mode - no limits', remaining: 999 };
  }

  try {
    // Get user's current limits
    const { data: userLimit, error: fetchError } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !userLimit) {
      console.error('Error fetching user limits:', fetchError);
      return { allowed: false, message: 'خطا در بررسی محدودیت‌های کاربر', remaining: 0 };
    }

    const creditCost = getServiceCreditCost(mode);
    const creditsUsed = userLimit.credits_used || 0;
    const tierInfo = await getTierLimits(userLimit.tier || 'testlimit');
    const creditsLimit = userLimit.credits_limit || tierInfo.credits;
    const remainingCredits = creditsLimit - creditsUsed;

    // Check if user has enough credits
    if (remainingCredits < creditCost) {
      return {
        allowed: false,
        message: `اعتبار شما به پایان رسیده است. پلن ${tierInfo.name}: ${creditsUsed}/${creditsLimit} اعتبار استفاده شده`,
        remaining: remainingCredits
      };
    }

    // Deduct credits
    const { error: updateError } = await supabase
      .from('user_limits')
      .update({
        credits_used: creditsUsed + creditCost,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating user credits:', updateError);
      return { allowed: false, message: 'خطا در به‌روزرسانی اعتبار', remaining: remainingCredits };
    }

    return {
      allowed: true,
      message: `${creditCost} اعتبار کسر شد`,
      remaining: remainingCredits - creditCost,
      creditsUsed: creditsUsed + creditCost,
      creditsLimit: creditsLimit
    };

  } catch (error) {
    console.error('Error in checkAndDeductCredits:', error);
    return { allowed: false, message: 'خطا در سیستم محدودیت', remaining: 0 };
  }
}

// ============================================
// Nano Banana 2 (Gemini 3 Pro Image Preview) Generation Function
// ============================================
async function generateNanoBananaImage({ prompt, contentParts, aspectRatio = '1:1', imageSize = 'large' }) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3-pro-image-preview",
      generationConfig: {
        responseModalities: ["Image"],
        imageConfig: {
          aspectRatio: aspectRatio, // '1:1', '16:9', '9:16', '4:3', '3:4'
          imageSize: imageSize       // 'small', 'medium', 'large'
        }
      }
    });

    // Add prompt to content parts
    const parts = [...contentParts, { text: prompt }];

    const result = await model.generateContent(parts);

    const response = await result.response;

    let generatedImageBase64 = null;
    let generatedText = '';

    // Extract image and text from response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          generatedImageBase64 = part.inlineData.data;
        }
        if (part.text) {
          generatedText += part.text;
        }
      }
    }

    if (generatedImageBase64) {
      return { imageData: generatedImageBase64 };
    }

    if (generatedText) {
      throw new Error(`Nano Banana 2 returned text instead of image: ${generatedText}`);
    }

    throw new Error('No image generated. The model may have blocked the request due to safety filters.');
  } catch (error) {
    console.error('❌ Nano Banana 2 Generation Error:', error);
    throw error;
  }
}

// تولید عکس با Gemini 2.5 Flash
app.post('/api/generate', authenticateUser, async (req, res) => {
  try {
    const {
      mode = 'complete-outfit',  // NEW: 'complete-outfit', 'accessories-only', 'underwear', 'color-collection'
      garmentPath,      // For backward compatibility (single garment)
      garmentPaths,     // New: array of garment paths
      accessoryPath,    // NEW: For accessories-only mode (product photo)
      accessoryType,    // NEW: Type of accessory (handbag, watch, etc.)
      piercingType,     // NEW: Type of piercing (ear, nose, navel, eyebrow)
      underwearPath,    // NEW: For underwear mode (product photo)
      underwearType,    // NEW: Type of underwear (bra, panty, etc.)
      colorVariants,    // NEW: For color-collection mode (array of color variant paths)
      displayScenario,  // NEW: Display scenario (on-arm, hanging-rack, folded-stack, laid-out)
      flatLayProducts,  // NEW: For flat-lay mode (array of product paths)
      arrangement,      // NEW: Flat lay arrangement (grid, scattered, circular, diagonal)
      referencePhotoPath, // NEW: For scene-recreation mode (reference photo to analyze and recreate - OLD METHOD)
      brandReferencePhotoUrl, // NEW: For scene-recreation mode (brand reference photo URL - NEW METHOD)
      brandReferencePhotoId,  // NEW: Brand reference photo ID
      sceneAnalysis,    // NEW: AI analysis of the reference photo
      referencePhotoPeopleCount, // NEW: Number of people detected in reference photo
      styleImagePaths,  // NEW: For style-transfer mode (array of 1-3 style reference images)
      contentImagePath, // NEW: For style-transfer mode (content image to apply style to)
      contentImageAnalysis, // NEW: AI analysis of content image (lighting, mood, atmosphere)
      modelId,
      modelId2,         // NEW: Second model ID (for 2-model mode)
      garmentPaths2,    // NEW: Garments for second model
      modelAge,         // NEW: Exact age of model (3-80)
      modelEthnicity,   // NEW: Ethnicity (iranian, turkmen, tajik, iraqi, arab, etc.)
      backgroundId,
      customLocation,   // NEW: Custom location description (overrides backgroundId)
      hijabType,        // NEW: نوع حجاب
      poseId = 'standing-front',
      cameraAngleId = 'eye-level',
      styleId = 'professional',
      lightingId = 'studio',
      // PHASE 1: Critical quality parameters
      colorTemperatureId = 'auto',
      depthOfFieldId = 'medium',
      fabricTypeId = 'auto',
      shadowQualityId = 'medium',
      // PHASE 2: Professional touch
      aspectRatioId = '1:1',
      lightingRatioId = 'medium',
      backgroundBlurId = 'medium',
      garmentFitId = 'regular',
      // PHASE 3: Advanced features
      postProcessingId = 'natural',
      environmentalReflectionId = 'subtle',
      weatherEffectId = 'clear',
      motionElementId = 'static'
    } = req.body;

    // Support both single garment (old) and multiple garments (new)
    const garments = garmentPaths || (garmentPath ? [garmentPath] : []);

    // Validation based on mode
    if (mode === 'complete-outfit') {
      if (!garments.length || !modelId || !backgroundId) {
        return res.status(400).json({ error: 'لطفاً تمام فیلدها را پر کنید' });
      }
    } else if (mode === 'accessories-only') {
      if (!accessoryPath || !modelId || !brandReferencePhotoId) {
        return res.status(400).json({ error: 'لطفاً تصویر اکسسوری، مدل و عکس مرجع برند را انتخاب کنید' });
      }
    } else if (mode === 'underwear') {
      if (!underwearPath || !underwearType || !modelId || !backgroundId) {
        return res.status(400).json({ error: 'لطفاً تصویر لباس زیر، نوع آن، مدل و پس‌زمینه را انتخاب کنید' });
      }
    } else if (mode === 'color-collection') {
      if (!colorVariants || !colorVariants.length || !displayScenario || !backgroundId) {
        return res.status(400).json({ error: 'لطفاً حداقل یک رنگ، نوع نمایش و پس‌زمینه را انتخاب کنید' });
      }
    } else if (mode === 'flat-lay') {
      if (!flatLayProducts || !flatLayProducts.length || !brandReferencePhotoId) {
        return res.status(400).json({ error: 'لطفاً حداقل یک محصول و عکس مرجع برند را انتخاب کنید' });
      }
    } else if (mode === 'scene-recreation') {
      // Accept either brand reference photo URL or uploaded reference photo path
      if ((!brandReferencePhotoUrl && !referencePhotoPath) || !garments.length || !modelId) {
        return res.status(400).json({ error: 'لطفاً عکس مرجع، لباس و مدل را انتخاب کنید' });
      }
    } else if (mode === 'style-transfer') {
      if (!styleImagePaths || !styleImagePaths.length || !contentImagePath) {
        return res.status(400).json({ error: 'لطفاً حداقل یک عکس استایل و یک عکس محتوا را آپلود کنید' });
      }
    }

    // ============================================
    // CHECK AND DEDUCT CREDITS BEFORE GENERATION
    // ============================================
    console.log('🔍 req.user before credit check:', req.user);
    console.log('🔍 req.user.id:', req.user?.id);
    const creditCheck = await checkAndDeductCredits(req.user?.id, mode);

    if (!creditCheck.allowed) {
      return res.status(403).json({
        error: creditCheck.message,
        remaining: creditCheck.remaining,
        needsUpgrade: true
      });
    }

    console.log(`✅ Credits deducted: ${creditCheck.message}, Remaining: ${creditCheck.remaining}`);

    // ============================================
    // GET USER'S PREFERRED IMAGE GENERATION MODEL
    // ============================================
    let userGenerationModel = 'gemini-2-flash'; // Default model

    console.log('🔍 Fetching user model preference for user:', req.user?.id);

    if (supabaseAdmin && req.user?.id) {
      try {
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('image_generation_model')
          .eq('id', req.user.id)
          .single();

        console.log('📊 User profile query result:', {
          userProfile: userProfile,
          error: profileError,
          hasModel: !!userProfile?.image_generation_model
        });

        if (userProfile && userProfile.image_generation_model) {
          userGenerationModel = userProfile.image_generation_model;
          console.log(`🤖 User's preferred model: ${userGenerationModel}`);
        } else {
          console.log('⚠️ No model preference found, using default:', userGenerationModel);
        }
      } catch (modelError) {
        console.warn('⚠️ Could not fetch user model preference, using default:', modelError.message);
      }
    } else {
      console.log('⚠️ No supabaseAdmin or user ID, using default model');
    }

    // Find model (check hardcoded first, then custom from database)
    // Find the selected model from models loaded from database
    let selectedModel = modelId ?
      models.find(m => m.id === modelId)
      : null;

    // If not found in hardcoded models and ID starts with 'custom-', fetch from database
    if (!selectedModel && modelId && modelId.startsWith('custom-') && supabase) {
      const customId = modelId.replace('custom-', '');
      const { data: customModel } = await supabase
        .from('models')
        .select('*')
        .eq('id', customId)
        .single();

      if (customModel) {
        selectedModel = {
          id: `custom-${customModel.id}`,
          name: customModel.name,
          category: customModel.category,
          description: customModel.description || customModel.name,
          image: customModel.image_url
        };
      }
    }

    // Find model 2 if provided (for 2-model mode)
    let selectedModel2 = null;
    if (modelId2) {
      selectedModel2 = models.find(m => m.id === modelId2);

      // If not found in hardcoded models and ID starts with 'custom-', fetch from database
      if (!selectedModel2 && modelId2.startsWith('custom-') && supabase) {
        const customId2 = modelId2.replace('custom-', '');
        const { data: customModel2 } = await supabase
          .from('models')
          .select('*')
          .eq('id', customId2)
          .single();

        if (customModel2) {
          selectedModel2 = {
            id: `custom-${customModel2.id}`,
            name: customModel2.name,
            category: customModel2.category,
            description: customModel2.description || customModel2.name,
            image: customModel2.image_url
          };
        }
      }
    }

    // Support garments for model 2
    const garments2 = garmentPaths2 || [];

    // Find background (check hardcoded first, then custom from database)
    // Search in both regular and product backgrounds
    let selectedBackground = backgroundId ?
      (backgrounds.find(b => b.id === backgroundId) || productBackgrounds.find(b => b.id === backgroundId))
      : null;

    // If not found in hardcoded backgrounds and ID starts with 'custom-', fetch from database
    if (!selectedBackground && backgroundId && backgroundId.startsWith('custom-') && supabase) {
      const customId = backgroundId.replace('custom-', '');
      const { data: customBackground } = await supabase
        .from('content_library')
        .select('*')
        .eq('id', customId)
        .eq('content_type', 'background')
        .single();

      if (customBackground) {
        selectedBackground = {
          id: `custom-${customBackground.id}`,
          name: customBackground.name,
          category: customBackground.category,
          description: customBackground.description || customBackground.name,
          image: customBackground.image_url
        };
      }
    }

    // Fetch brand reference photo AI analysis AND image for accessories-only and flat-lay modes
    let brandReferenceAnalysis = null;
    let brandPhotoImageUrl = null;
    if ((mode === 'accessories-only' || mode === 'flat-lay') && brandReferencePhotoId && supabase) {
      const { data: brandPhoto, error: photoError } = await supabase
        .from('brand_reference_photos')
        .select('ai_analysis, image_url')
        .eq('id', brandReferencePhotoId)
        .single();

      if (photoError) {
        console.error('❌ Error fetching brand reference photo:', photoError);
        return res.status(400).json({ error: 'عکس مرجع برند یافت نشد' });
      }

      if (!brandPhoto || !brandPhoto.ai_analysis || !brandPhoto.image_url) {
        return res.status(400).json({ error: 'تحلیل هوش مصنوعی یا تصویر برای عکس مرجع برند یافت نشد' });
      }

      brandReferenceAnalysis = brandPhoto.ai_analysis;
      brandPhotoImageUrl = brandPhoto.image_url;
      console.log(`✅ Loaded brand reference photo AI analysis and image for ${mode} mode`);
    }

    const selectedPose = poses.find(p => p.id === poseId) || poses[0];
    const selectedCameraAngle = cameraAngles.find(c => c.id === cameraAngleId) || cameraAngles[0];
    const selectedStyle = styles.find(s => s.id === styleId) || styles[0];
    const selectedLighting = lightings.find(l => l.id === lightingId) || lightings[0];

    // PHASE 1: Select critical quality parameters
    const selectedColorTemp = colorTemperatures.find(ct => ct.id === colorTemperatureId) || colorTemperatures[3]; // auto
    const selectedDoF = depthOfFields.find(d => d.id === depthOfFieldId) || depthOfFields[1]; // medium
    const selectedFabric = fabricTypes.find(f => f.id === fabricTypeId) || fabricTypes[7]; // auto
    const selectedShadow = shadowQualities.find(sq => sq.id === shadowQualityId) || shadowQualities[1]; // medium

    // PHASE 2: Select professional touch parameters
    const selectedAspectRatio = aspectRatios.find(ar => ar.id === aspectRatioId) || aspectRatios[0]; // 1:1
    const selectedLightingRatio = lightingRatios.find(lr => lr.id === lightingRatioId) || lightingRatios[1]; // medium
    const selectedBgBlur = backgroundBlurs.find(bb => bb.id === backgroundBlurId) || backgroundBlurs[2]; // medium
    const selectedFit = garmentFits.find(gf => gf.id === garmentFitId) || garmentFits[1]; // regular

    // PHASE 3: Select advanced features
    const selectedPostProcessing = postProcessingPresets.find(pp => pp.id === postProcessingId) || postProcessingPresets[0]; // natural
    const selectedEnvReflection = environmentalReflections.find(er => er.id === environmentalReflectionId) || environmentalReflections[1]; // subtle
    const selectedWeather = weatherEffects.find(we => we.id === weatherEffectId) || weatherEffects[0]; // clear
    const selectedMotion = motionElements.find(me => me.id === motionElementId) || motionElements[0]; // static

    // Validate model and background based on mode
    if (mode === 'color-collection') {
      // Color collection doesn't need a model, only background
      if (!selectedBackground) {
        return res.status(400).json({ error: 'پس‌زمینه نامعتبر است' });
      }
    } else if (mode === 'scene-recreation' || mode === 'accessories-only' || mode === 'flat-lay') {
      // Scene recreation, accessories-only, and flat-lay use brand reference photo (no model/background needed)
      // Validation already done earlier - just need brand reference photo
    } else if (mode === 'style-transfer') {
      // Style transfer doesn't need model or background (uses style images for people and content image for environment)
      // Validation already done earlier - just need style images and content image
    } else {
      // Other modes need both model and background
      if (!selectedModel || !selectedBackground) {
        return res.status(400).json({ error: 'مدل یا پس‌زمینه نامعتبر است' });
      }
    }

    console.log('🎨 Generating image with Gemini 2.5 Flash...');
    console.log('🎯 Mode:', mode);
    console.log('📸 Garment URLs:', garments);
    if (selectedModel) console.log('👤 Model:', selectedModel.name);
    if (selectedBackground) console.log('📍 Location:', selectedBackground.name);
    if (mode === 'scene-recreation') console.log('🎬 Reference Photo:', referencePhotoPath);
    console.log('🎭 Pose:', selectedPose.name);
    console.log('📷 Camera:', selectedCameraAngle.name);
    console.log('✨ Style:', selectedStyle.name);
    console.log('💡 Lighting:', selectedLighting.name);

    // ========================================
    // NEW: Mode-Specific Image Loading Preparation
    // ========================================
    let garmentBase64Array = [];
    let modelBase64 = null;
    let garmentDescription = '';
    let locationDescription = '';

    if (mode === 'complete-outfit') {
      // Load garment images and model
      garmentBase64Array = await Promise.all(
        garments.map(path => imageUrlToBase64(path))
      );
      modelBase64 = await imageUrlToBase64(selectedModel.image);

      // Load model 2 and garments 2 if provided
      if (selectedModel2 && garments2.length > 0) {
        const garments2Base64 = await Promise.all(
          garments2.map(path => imageUrlToBase64(path))
        );
        const model2Base64 = await imageUrlToBase64(selectedModel2.image);

        // Add garments2 and model2 to the array
        garmentBase64Array = [...garmentBase64Array, ...garments2Base64, model2Base64];
      }

      garmentDescription = garments.length === 1
        ? 'the garment/clothing from the first image'
        : `ALL ${garments.length} garments/clothing items from the first ${garments.length} images (combine them on the model - e.g., if there's pants, shirt, and jacket, the model should wear all of them together)`;

      locationDescription = customLocation && customLocation.trim() !== ''
        ? customLocation.trim()
        : `${selectedBackground.name} - ${selectedBackground.description}`;

    } else if (mode === 'accessories-only') {
      // For accessories mode, load model, accessory, AND brand reference photo
      // Similar to scene-recreation: Model photo + Product photo + Brand reference photo
      modelBase64 = await imageUrlToBase64(selectedModel.image);
      garmentBase64Array = [await imageUrlToBase64(accessoryPath)];
      const brandReferencePhotoBase64 = await imageUrlToBase64(brandPhotoImageUrl);

      // Store for contentParts later
      selectedModel.brandReferencePhotoBase64 = brandReferencePhotoBase64;

      garmentDescription = `the accessory jewelry from the image`;
      // No locationDescription needed - using brand reference photo

      // Check if this model has custom prompts
      let customPrompt = null;
      if (selectedModel.id.startsWith('custom-') && supabase) {
        const modelDbId = selectedModel.id.replace('custom-', '');
        const { data: prompts } = await supabase
          .from('model_prompts')
          .select('prompt_text')
          .eq('model_id', modelDbId)
          .eq('is_active', true)
          .eq('prompt_type', 'accessory');

        if (prompts && prompts.length > 0) {
          // Randomly select one prompt
          const randomIndex = Math.floor(Math.random() * prompts.length);
          customPrompt = prompts[randomIndex].prompt_text;
          console.log(`🎲 Using random custom prompt (${randomIndex + 1}/${prompts.length}) for model ${modelDbId}`);
        }
      }

      // Store custom prompt for later use
      selectedModel.customPrompt = customPrompt;

    } else if (mode === 'underwear') {
      // For underwear mode, load underwear product image and model
      garmentBase64Array = [await imageUrlToBase64(underwearPath)];
      modelBase64 = await imageUrlToBase64(selectedModel.image);

      garmentDescription = `the ${underwearType} from the first image`;
      locationDescription = customLocation && customLocation.trim() !== ''
        ? customLocation.trim()
        : `${selectedBackground.name} - ${selectedBackground.description}`;

    } else if (mode === 'color-collection') {
      // For color collection mode, load ALL color variant images (no model needed)
      garmentBase64Array = await Promise.all(
        colorVariants.map(path => imageUrlToBase64(path))
      );
      modelBase64 = null; // No model needed for color collection display

      garmentDescription = `${colorVariants.length} color variants of the same garment`;
      locationDescription = customLocation && customLocation.trim() !== ''
        ? customLocation.trim()
        : `${selectedBackground.name} - ${selectedBackground.description}`;

    } else if (mode === 'flat-lay') {
      // For flat lay mode, load ALL product images AND brand reference photo
      garmentBase64Array = await Promise.all(
        flatLayProducts.map(path => imageUrlToBase64(path))
      );
      modelBase64 = null; // No model needed for flat lay photography
      const brandReferencePhotoBase64 = await imageUrlToBase64(brandPhotoImageUrl);

      // Store for contentParts later
      if (!selectedModel) selectedModel = {}; // Create object if doesn't exist
      selectedModel.brandReferencePhotoBase64 = brandReferencePhotoBase64;

      garmentDescription = `${flatLayProducts.length} product(s) for flat lay arrangement`;
      // No locationDescription needed - using brand reference photo

    } else if (mode === 'scene-recreation') {
      // For scene recreation mode, load reference photo (either brand URL or uploaded path), garment, and model
      const actualReferencePhotoPath = brandReferencePhotoUrl || referencePhotoPath;
      const referencePhotoBase64 = await imageUrlToBase64(actualReferencePhotoPath);
      garmentBase64Array = await Promise.all(
        garments.map(path => imageUrlToBase64(path))
      );
      modelBase64 = await imageUrlToBase64(selectedModel.image);

      // Load Model 2 and its garments if provided (for 2+ people in reference photo)
      let model2Base64 = null;
      let garment2Base64Array = [];
      if (selectedModel2 && garmentPaths2 && garmentPaths2.length > 0) {
        model2Base64 = await imageUrlToBase64(selectedModel2.image);
        garment2Base64Array = await Promise.all(
          garmentPaths2.map(path => imageUrlToBase64(path))
        );
        console.log(`👥 Scene recreation with 2 models: Model 1 + Model 2`);
      }

      garmentDescription = garments.length === 1
        ? 'the garment/clothing from the garment image'
        : `ALL ${garments.length} garments/clothing items (combine them on the model)`;

      // Store additional data for later use
      selectedModel.referencePhotoBase64 = referencePhotoBase64;
      selectedModel.model2Base64 = model2Base64;
      selectedModel.garment2Base64Array = garment2Base64Array;
      selectedModel.garmentPaths2 = garmentPaths2;
      locationDescription = 'Scene from reference photo';

    } else if (mode === 'style-transfer') {
      // For style transfer mode, load content image (for analysis) and style images (to combine)
      const contentImageBase64 = await imageUrlToBase64(contentImagePath);
      const styleImagesBase64 = await Promise.all(
        styleImagePaths.map(path => imageUrlToBase64(path))
      );

      console.log(`🎨 Style transfer mode: ${styleImagePaths.length} style images + 1 content image`);

      // Store for later use
      selectedModel = selectedModel || {};
      selectedModel.contentImageBase64 = contentImageBase64;
      selectedModel.styleImagesBase64 = styleImagesBase64;
      locationDescription = 'Style Transfer Mode';
    }

    console.log('📍 Using location description:', locationDescription);

    // تعریف نوع حجاب
    const hijabDescriptions = {
      'full': 'CRITICAL: Full traditional hijab - headscarf MUST completely cover all hair, neck, and ears. Tightly wrapped and secured. NO hair visible whatsoever. Conservative modest Islamic style with professional formal appearance.',
      'relaxed': 'CRITICAL: Relaxed modern Iranian-style hijab (حجاب راحت) - Loose, casual headscarf worn in the modern Iranian/Persian fashion style. IMPORTANT: The hijab is pushed back on the head showing SIGNIFICANT portions of the front hair (bangs/fringe area). Hair is CLEARLY VISIBLE at the front and sides. The scarf covers the back and top of head loosely, NOT tightly wrapped. This is the common everyday hijab style seen on Iranian women - stylish, modern, with visible hair at front. NOT full coverage - hair MUST be partially visible.',
      'no-hijab': 'CRITICAL: NO hijab at all - hair MUST be completely visible, uncovered, and freely shown. No head covering or scarf of any kind.'
    };

    const hijabDescription = hijabType && hijabDescriptions[hijabType]
      ? hijabDescriptions[hijabType]
      : null;

    console.log('🧕 Hijab type:', hijabType, hijabDescription);

    // ========================================
    // NEW: Mode-Specific Prompt Generation
    // ========================================
    let prompt = '';

    if (mode === 'complete-outfit') {
      // COMPLETE OUTFIT MODE: Garment + Hijab

      // Build age and ethnicity descriptions
      const ethnicityDescriptions = {
        'iranian': 'Iranian/Persian facial features and skin tone',
        'turkmen': 'Turkmen ethnic features with Central Asian appearance',
        'tajik': 'Tajik facial features with Persian-Central Asian characteristics',
        'iraqi': 'Iraqi/Mesopotamian facial features and appearance',
        'arab': 'Arab ethnic features and appearance',
        'afghan': 'Afghan facial features and appearance',
        'kurdish': 'Kurdish ethnic features and appearance',
        'azari': 'Azari/Azerbaijani ethnic features',
        'balochi': 'Balochi ethnic features and appearance',
        'african': 'African ethnic features with dark skin tone and African facial characteristics',
        'middle-east': 'Middle Eastern facial features and appearance',
        'korean': 'Korean/East Asian facial features with Korean appearance',
        'mixed': 'Mixed ethnicity with diverse multicultural features',
        'caucasian': 'Caucasian/European facial features and skin tone',
        'russian': 'Russian/Slavic facial features and appearance'
      };

      const ageDescription = modelAge ? `EXACTLY ${modelAge} years old` : 'age-appropriate';
      const ethnicityDescription = modelEthnicity && ethnicityDescriptions[modelEthnicity]
        ? ethnicityDescriptions[modelEthnicity]
        : 'natural ethnic appearance';

      // Determine age-specific instructions based on exact age or model category
      let ageSpecificInstructions = '';
      const age = modelAge || 25; // Default to 25 if not specified

      if (age < 12) {
        ageSpecificInstructions = `\n\nCRITICAL AGE & ETHNICITY REQUIREMENTS:
- This person is ${ageDescription} - a CHILD
- ${ethnicityDescription}
- Face MUST have childlike features: round face, soft features, innocent expression, child-like eyes and nose
- Body proportions should match child physique for age ${age} (shorter stature, child body proportions)
- Overall appearance must clearly be a young child, NOT a teenager or adult
- Facial features should look EXACTLY age ${age} years old`;
      } else if (age < 18) {
        ageSpecificInstructions = `\n\nCRITICAL AGE & ETHNICITY REQUIREMENTS:
- This person is ${ageDescription} - a TEENAGER
- ${ethnicityDescription}
- Face MUST have youthful teenage features: rounder face, softer features, younger-looking skin
- Body proportions should match teenage physique for age ${age} (not adult proportions)
- Overall appearance must clearly be a teenager, NOT an adult
- Facial features should look EXACTLY age ${age} years old`;
      } else {
        ageSpecificInstructions = `\n\nAGE & ETHNICITY REQUIREMENTS:
- This person is ${ageDescription}
- ${ethnicityDescription}
- Face and body should match age ${age} appropriately
- Natural appearance for a ${age}-year-old person`;
      }

      // Handle 2-model mode
      let twoModelInstructions = '';
      if (selectedModel2 && garments2.length > 0) {
        const garment2Description = garments2.length === 1
          ? 'the garment (image ' + (garments.length + 2) + ')'
          : `the garments (images ${garments.length + 2}-${garments.length + 1 + garments2.length})`;

        twoModelInstructions = `

CRITICAL 2-MODEL REQUIREMENTS:
- There are EXACTLY 2 people in this photo
- Model 1 (image ${garments.length + 1}) wears ${garmentDescription}
- Model 2 (image ${garments.length + garments2.length + 2}) wears ${garment2Description}
- BOTH models must be clearly visible in the photo
- Position them naturally side-by-side or in complementary poses
- Maintain professional composition with both models
- Each model wears THEIR OWN garment - do NOT mix them up`;

        prompt = `Create a photorealistic fashion photo showing TWO MODELS, each wearing different garments.${hijabDescription ? `

⚠️⚠️⚠️ MOST IMPORTANT - READ THIS FIRST ⚠️⚠️⚠️
HIJAB REQUIREMENT: ${hijabDescription}
This MUST be applied to the female model(s) in the photo.
⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
` : ''}
IMAGES PROVIDED:
- Image ${garments.length === 1 ? '1' : `1-${garments.length}`}: Garment for Model 1
- Image ${garments.length + 1}: Model 1 (person)
- Image ${garments2.length === 1 ? (garments.length + 2) : `${garments.length + 2}-${garments.length + 1 + garments2.length}`}: Garment for Model 2
- Image ${garments.length + garments2.length + 2}: Model 2 (person)

TASK:
Show BOTH models together, each wearing their respective garments. Model 1 wears ${garmentDescription}, Model 2 wears ${garment2Description}. Make it look like a real professional photograph with two people.${ageSpecificInstructions}${twoModelInstructions}`;
      } else {
        prompt = `Create a photorealistic fashion photo showing the model wearing the garment.${hijabDescription ? `

⚠️⚠️⚠️ MOST IMPORTANT - READ THIS FIRST ⚠️⚠️⚠️
HIJAB REQUIREMENT: ${hijabDescription}
This MUST be applied to the model in the photo.
⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
` : ''}
IMAGES PROVIDED:
- Image ${garments.length === 1 ? '1' : `1-${garments.length}`}: Garment/clothing to wear
- Image ${garments.length + 1}: Model (person)

TASK:
Show this exact model wearing ${garmentDescription}. Make it look like a real professional photograph.${ageSpecificInstructions}`;
      }

      prompt += `

TECHNICAL SPECS:
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels
- Aspect Ratio: ${selectedAspectRatio.description}
- Fabric Type: ${selectedFabric.description}
- Lighting: ${selectedLighting.description}
- Background Blur: ${selectedBgBlur.description}
- Depth of Field: ${selectedDoF.description}
- Color Temperature: ${selectedColorTemp.description}
- Shadow Quality: ${selectedShadow.description}
- Garment Fit: ${selectedFit.description}${hijabDescription ? `\n- Hijab Style: ${hijabDescription}` : ''}

SCENE & ENVIRONMENT:
- Location/Background: ${locationDescription}
- Style: ${selectedStyle.description}
- Pose: ${selectedPose.description}
- Camera Angle: ${selectedCameraAngle.description}
- Mood: Professional fashion photography

FRAMING & COMPOSITION:
- Show FULL BODY (head to feet) with proper proportions
- Model should occupy 70-80% of frame height for balanced composition
- Leave appropriate headroom and foot space in frame
- Natural body proportions - DO NOT make person disproportionately large or small
- Standard fashion photography framing with model centered in frame

KEY REQUIREMENTS:
1. Keep model's face, body, and pose EXACTLY the same - only change the clothes
2. Garment should fit naturally with realistic wrinkles and fabric draping
3. Natural skin texture (no plastic smoothing or artificial effects)${hijabDescription ? `\n4. ⚠️ CRITICAL - HIJAB REQUIREMENT: ${hijabDescription}\n5` : '\n4'}. ⚠️ CRITICAL - EXACT COLOR PRESERVATION:
   - Use the EXACT colors from the garment image - do NOT change or shift colors
   - If garment is blue denim, keep it EXACTLY that shade of blue
   - If garment is black, keep it pure black - NOT dark gray or navy
   - If garment is white, keep it pure white - NOT cream or off-white
   - Match color intensity and saturation EXACTLY as shown in garment image
   - Preserve color variations in fabric (fading, distressing, wash effects)${hijabDescription ? '\n6' : '\n5'}. Realistic fabric physics, wrinkles, and natural shadows${hijabDescription ? '\n7' : '\n6'}. Clean, sharp focus on the model and clothing${hijabDescription ? '\n8' : '\n7'}. ⚠️ CRITICAL DETAIL ATTENTION - FABRIC & HARDWARE:

   **FABRIC PATTERNS & PRINTS (MOST CRITICAL):**
   - ⚠️ If garment has printed design (flowers, graphics, text, logos): preserve EXACTLY as shown
   - ⚠️ If garment has woven pattern (stripes, checks, plaids, geometric): maintain exact pattern and scale
   - DO NOT simplify, blur, or alter any printed designs or patterns
   - Keep pattern alignment, repeat, and placement exactly as in garment image
   - Preserve ALL colors within the pattern - do not reduce color palette
   - Maintain pattern scale and proportion on the garment
   - Show how pattern follows fabric draping and wrinkles naturally
   - If floral print: show each flower detail, leaf, and stem accurately
   - If geometric pattern: keep lines, shapes, and spacing precise
   - If text/logo print: render text clearly and accurately
   - Pattern should wrap around body naturally following fabric flow

   **DENIM FABRIC (if applicable):**
   - Preserve EXACT denim wash color (light blue, dark blue, black, etc.)
   - Show authentic denim texture with visible weave pattern
   - Maintain any distressing, fading, or whiskering exactly as shown
   - Keep denim stitching visible (typically orange/yellow contrast stitching)
   - Show natural denim wrinkle patterns and creases

   **ZIPPERS (MOST CRITICAL):**
   - Render zippers with EXACT metal color (silver, gold, brass, black, etc.)
   - Show individual zipper teeth clearly and accurately
   - Display zipper pull/slider with correct shape and color
   - Maintain zipper placement and length exactly as in garment image
   - Show zipper stitching on both sides of the zipper tape
   - DO NOT deform, blur, or simplify zipper details
   - Keep zipper hardware looking metallic and three-dimensional

   **BUTTONS & SNAPS:**
   - Show exact button positions, button holes, and button design
   - Maintain button color and material (metal, plastic, fabric-covered)
   - Render snap buttons with proper metallic appearance

   **POCKETS:**
   - Maintain pocket shapes, pocket stitching, and pocket flaps exactly as shown
   - Show pocket rivets or metal reinforcements if present
   - Display pocket topstitching and any decorative elements

   **STITCHING & SEAMS:**
   - Preserve ALL visible stitching lines and seam placements
   - Show contrast stitching in correct color (common in denim/jeans)
   - Maintain topstitching details, especially on collars, cuffs, hems
   - Display any decorative or reinforcement stitching

   **FABRIC TEXTURE:**
   - Display fabric texture realistically (denim weave, smooth, rough, ribbed, woven, knit)
   - Show material quality indicators (sheen for silk, matte for cotton, worn texture for denim)
   - Render collar details, cuff details, and hem stitching precisely
   - Maintain any decorative elements (embroidery, prints, patches, logos, labels)
   - Show fabric weight through natural draping and wrinkle patterns

DO NOT:
- Change the model's face, body type, or overall appearance
- Age up the model - if it's a child/teenager, keep them looking their age
- Make children or teenagers look like adults with mature facial features
- Make unrealistic distortions or morphing
- Add text, watermarks, or logos
- Create obvious fake composites or artificial effects
- ❌ CRITICAL: DO NOT change garment colors - keep EXACT colors from garment image
- ❌ CRITICAL: DO NOT simplify, blur, or alter fabric patterns and prints - preserve exact design
- ❌ CRITICAL: DO NOT change pattern colors, scale, or placement on garment
- ❌ CRITICAL: DO NOT deform or blur zippers - render them with full detail and correct metal color
- ❌ CRITICAL: DO NOT change denim wash colors or remove denim texture
- ❌ CRITICAL: DO NOT simplify hardware details (zippers, buttons, rivets, snaps)
- Simplify or omit garment details like buttons, zippers, stitching, or pockets
- Smooth out fabric texture or make it look artificial
- Change stitching colors, especially contrast stitching on denim
- Ignore small but important details like seams, hems, or decorative elements
- Over-smooth skin or create plastic-looking results
- Make fabric look too perfect - natural wrinkles and texture should be visible

Make it simple and natural - like this person is actually wearing these clothes in a real professional photo shoot.`;

    } else if (mode === 'accessories-only') {
      // ACCESSORIES MODE: Product Photography INSPIRED BY Brand Reference Photo

      // NEW: Use custom prompt if available
      if (selectedModel.customPrompt) {
        prompt = selectedModel.customPrompt;
        console.log('✅ Using custom prompt for accessory model');
      } else {
        // Fallback to default prompt - similar to scene-recreation approach
        prompt = `Create a photorealistic product photography image showing the MODEL wearing/displaying the ACCESSORY, INSPIRED BY the style, lighting, and mood of the brand reference photo.

IMAGES PROVIDED (IN ORDER):
- Image 1: ⭐ MODEL - This is the person to photograph (use their EXACT face and body)
- Image 2: ACCESSORY/JEWELRY - The product to wear/display
- Image 3: BRAND REFERENCE PHOTO - Study this for style inspiration (do NOT copy the person)

⚠️ CRITICAL APPROACH:

**PRIMARY GOAL: Photograph the MODEL from Image 1**
- The person in the final photo MUST be the MODEL from Image 1
- Use their EXACT face, facial features, body type, skin tone, and hair
- This is the most important requirement - the MODEL must be recognizable as the person from Image 1

**SECONDARY GOAL: Create EXACT same style as the brand reference (Image 3)**
- Study Image 3 (brand reference photo) carefully
- Copy the general TYPE of location (e.g., if it's studio, shoot in studio; if outdoor, shoot outdoor)
- Match the EXACT STYLE of lighting (e.g., soft lighting, dramatic, natural light)
- Recreate the EXACT MOOD and atmosphere (e.g., elegant, casual, professional)
- Use the EXACT same pose and hand/body positioning for the accessory
- Match the EXACT composition style and camera angle
- The AI analysis below provides additional details about Image 3

**What to copy from brand reference analysis:**
✅ **EXACT FRAMING** (MOST CRITICAL - if only hand visible, show ONLY hand; if only neck, show ONLY neck)
✅ **EXACT CROP** (close-up vs medium vs full body - must match reference exactly)
✅ **Which body parts are visible** (hand only, hand+wrist, neck+collarbone, ear area, full body, etc.)
✅ Type of location (studio/outdoor, minimalist/detailed background)
✅ Lighting style (natural/artificial, soft/dramatic)
✅ Mood and atmosphere (elegant, modern, classic, bold)
✅ General pose and hand/body positioning for accessory display
✅ Camera angle type and distance
✅ Color palette and overall vibe

**What NOT to copy from brand reference:**
❌ The exact specific location (create a similar type of place, not the identical spot)
❌ The person's face or identity from the reference
❌ Every tiny detail of the background

⚠️ **CRITICAL FRAMING RULE:**
The final photo's framing (what body parts are visible) MUST EXACTLY MATCH the brand reference photo's framing. If brand reference is a close-up of hand only, DO NOT show the face or body - show ONLY the hand. If brand reference shows full body, show full body. The crop and framing is NOT optional - it must match perfectly.

TASK DESCRIPTION:
Create a NEW professional product photography photo of the MODEL from Image 1, wearing/displaying the ACCESSORY from Image 2, photographed in a similar style and mood as the brand reference. The key is: SAME MODEL + SAME ACCESSORY + SIMILAR (not identical) SCENE/STYLE.

AI ANALYSIS OF BRAND REFERENCE PHOTO:
${brandReferenceAnalysis}

TECHNICAL SPECS:
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels
- Aspect Ratio: ${selectedAspectRatio.description}

KEY REQUIREMENTS:
1. **The MODEL is the Star (MOST IMPORTANT)**:
   - The person in the final photo MUST be the MODEL from Image 1
   - Use their EXACT face - every facial feature must match Image 1
   - Use their EXACT body type, skin tone, and hair from Image 1
   - The MODEL must be clearly recognizable as the person from Image 1
   - DO NOT use or blend the face/body from the brand reference photo

2. **Create a SIMILAR Scene (Inspired, Not Identical)**:
   - If reference shows elegant studio → shoot MODEL in a similar elegant studio setting
   - If reference shows outdoor natural light → shoot MODEL with outdoor natural-style lighting
   - If reference has soft romantic lighting → create soft romantic lighting for MODEL
   - If reference has minimalist background → use minimalist background for MODEL
   - Copy the FEEL and VIBE, not the exact pixels

3. **Framing and Composition (CRITICAL - EXACT MATCH)**:
   - ⚠️ MATCH THE EXACT FRAMING from the brand reference photo
   - If reference shows ONLY hand/wrist → show ONLY the MODEL's hand/wrist (NO face, NO body)
   - If reference shows ONLY neck/collarbone → show ONLY the MODEL's neck/collarbone (NO face)
   - If reference shows close-up of ear → show ONLY the MODEL's ear area (NO full face)
   - If reference shows full body → show the MODEL's full body
   - If reference shows upper body portrait → show the MODEL's upper body portrait
   - Copy the EXACT camera distance, angle, and body parts visible in frame
   - Match the exact crop and framing - don't show more or less of the body than the reference
   - The face should ONLY be visible if the reference photo shows the face

4. **Accessory Integration**:
   - Display the ACCESSORY/JEWELRY from Image 2 on the MODEL
   - Accessory should be positioned naturally (on hand, wrist, neck, ear, etc.)

   ⚠️ **CRITICAL - EXACT ACCESSORY DETAIL PRESERVATION:**
   - Use EXACT colors from accessory image - do NOT change or shift colors
   - Preserve ALL material details: metal finish (gold, silver, rose gold), gemstone cuts, chain links
   - Show exact design patterns, engravings, and decorative elements
   - Accurately render hardware: clasps, settings, posts, backs with proper metallic texture
   - Maintain brand logos, hallmarks, or signatures exactly as shown
   - Display material quality: gold/silver sheen, gemstone brilliance, polish level
   - Render precise color matching and any gemstone colors/patterns
   - Maintain exact proportions and shape of the jewelry
   - Show surface details: filigree, texture, stone settings, prong details

5. **Photographic Quality**:
   - Natural skin texture (no plastic smoothing)
   - Clean, sharp focus on both MODEL and ACCESSORY
   - Realistic lighting and shadows matching the brand reference style
   - Professional product photography quality
   - Make it look like a real photo taken for a professional brand campaign

DO NOT:
- ❌ CRITICAL: DO NOT use the face or body from any person in the brand reference photo
- ❌ CRITICAL: DO NOT keep the people from the reference - only use them for pose reference
- ❌ The person must be the MODEL from Image 1 (FIRST image), not anyone from the brand reference photo
- Change the scene, location, or environment style from the brand reference
- Alter the lighting mood or atmosphere from the brand reference
- Change the camera angle or composition style from the brand reference
- Make the model look different from Image 1
- Create obvious fake composites or artificial effects
- Add text, watermarks, or logos (unless they exist on the original product)
- ❌ CRITICAL: DO NOT change accessory colors - keep EXACT colors from accessory image
- ❌ CRITICAL: DO NOT simplify or blur jewelry details - preserve all fine details
- ❌ CRITICAL: DO NOT alter material texture, metal finish, or gemstone appearance
- Simplify or omit fine details like hardware, gem settings, or brand elements
- Over-smooth skin or create plastic-looking results
- Make the accessory look pasted on or fake

EXAMPLE TO CLARIFY THE APPROACH:
IMAGE ORDER YOU RECEIVE:
- Image 1: MODEL - A woman with dark hair, olive skin, specific facial features
- Image 2: ACCESSORY - A gold necklace with diamond pendant

BRAND REFERENCE ANALYSIS SAYS:
"Close-up shot showing only hand and wrist, elegant studio setting with soft natural window light, minimalist white background, graceful hand pose, romantic and sophisticated mood"

CORRECT OUTPUT:
✅ ONLY the MODEL's hand/wrist visible (matching reference framing - NO face, NO full body)
✅ The woman's hand from Image 1 (her EXACT skin tone and hand from the model)
✅ Wearing the gold diamond bracelet from Image 2
✅ Photographed in AN elegant studio setting with soft lighting (similar to reference style)
✅ Graceful hand pose (similar pose to reference)
✅ Close-up composition showing ONLY hand/wrist (EXACT framing match to reference)
✅ Romantic sophisticated mood (similar atmosphere to reference)

WRONG OUTPUTS:
❌ Showing the woman's full body or face (reference only showed hand)
❌ Showing upper body or portrait (reference only showed hand/wrist)
❌ A different person from the brand reference wearing the bracelet
❌ The woman in harsh outdoor lighting (reference was soft studio)
❌ The woman in busy cluttered background (reference was minimalist)
❌ Stiff unnatural hand pose (reference was graceful and natural)
❌ Wide shot showing full body when reference was close-up of hand only

Generate a beautiful, professional product photography image that showcases the MODEL from Image 1 wearing the ACCESSORY from Image 2, in the inspiring style learned from the brand reference analysis.`;
      }

    } else if (mode === 'underwear') {
      // INTIMATE APPAREL MODE: Product Photography (using neutral terminology to avoid content filters)
      const apparelTypeDescriptions = {
        'bra': 'upper body athletic garment',
        'panty': 'lower body athletic garment',
        'lingerie-set': 'athletic wear set',
        'sports-bra': 'sports top athletic wear',
        'boxers': 'athletic shorts',
        'briefs': 'fitted athletic wear',
        'bodysuit': 'form-fitting athletic suit',
        'corset': 'fitted torso garment',
        'shapewear': 'compression athletic wear',
        'sleepwear': 'comfortable lounge wear'
      };

      const apparelDesc = apparelTypeDescriptions[underwearType] || 'intimate apparel';

      prompt = `Create a professional fashion product photography image showing the model wearing this intimate fashion garment.

IMAGES PROVIDED:
- Image 1: Fashion garment product photo (intimate apparel)
- Image 2: Model (person)

TASK:
Show this exact model wearing the fashion garment from the first image. Create a clean, professional product photography shot similar to high-end fashion retail catalogs like Victoria's Secret, Calvin Klein, or department store catalogs.

GARMENT TYPE:
${apparelDesc} - position naturally and appropriately on the model.

TECHNICAL SPECS:
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels
- Aspect Ratio: ${selectedAspectRatio.description}
- Lighting: ${selectedLighting.description}
- Background Blur: ${selectedBgBlur.description}
- Depth of Field: ${selectedDoF.description}
- Color Temperature: ${selectedColorTemp.description}
- Shadow Quality: ${selectedShadow.description}

SCENE & ENVIRONMENT:
- Location/Background: ${locationDescription}
- Style: ${selectedStyle.description}
- Pose: ${selectedPose.description}
- Camera Angle: ${selectedCameraAngle.description}
- Mood: Professional fashion product photography

PHOTOGRAPHY STYLE:
Professional fashion catalog photography similar to major retail brands. The garment should be the focus - clearly visible, well-displayed in a clean, appropriate, tasteful manner suitable for e-commerce and retail catalogs.

KEY REQUIREMENTS:
1. Keep model's face and body EXACTLY the same from the reference image
2. Professional retail catalog framing - appropriate, tasteful composition like major fashion brands
3. Position the garment correctly and naturally on the model
4. The garment should look natural and realistic on the model
5. Accurate colors and details from the garment product image
6. Professional product photography aesthetic - clean, elegant, retail-ready
7. Natural skin texture (no plastic smoothing)
8. Clean, sharp focus on both model and garment
9. Fashion editorial quality similar to department store catalogs
10. CRITICAL DETAIL ATTENTION:
   - Preserve ALL fabric details: lace patterns, mesh texture, elastic bands
   - Show exact stitching, seam lines, and decorative trim
   - Accurately render elastic waistbands, straps, and adjustable elements
   - Maintain any decorative elements: bows, ribbons, appliques, embroidery
   - Display fabric texture realistically: satin sheen, lace transparency, cotton matte
   - Show material layering and how different fabrics interact
   - Render precise color matching and any color combinations
   - Maintain exact garment construction details and cut

DO NOT:
- Change the model's face, body type, or overall appearance
- Make unrealistic distortions or artificial effects
- Add text, watermarks, or logos
- Make the garment look pasted on or fake
- Over-smooth skin or create plastic-looking results
- Simplify or omit fine details like lace patterns, trim, or decorative elements
- Alter fabric texture or material sheen
- Ignore construction details like seams, elastic bands, or straps

Create a professional fashion product photography shot suitable for retail e-commerce - elegant, clean, and showcasing the garment naturally on the model in the style of major fashion retailers.`;

    } else if (mode === 'color-collection') {
      // COLOR COLLECTION MODE: Multiple color variants display with 10 variations per scenario

      const colorCollectionVariations = {
        'on-arm': [
          { name: 'draped over extended forearm', details: 'Garments elegantly draped over extended forearm held horizontally, arm parallel to ground, each color cascading down naturally', positioning: 'Stack garments on horizontal forearm, front colors draping down, each color edge visible' },
          { name: 'held on bent arm at elbow', details: 'Garments held on forearm with elbow bent at 90°, vertical forearm presentation, colors stacked like retail display', positioning: 'Arrange on vertical forearm with elbow bent, stack colors from wrist toward elbow' },
          { name: 'casually slung over shoulder and arm', details: 'Garments draped from shoulder flowing down arm, relaxed casual presentation, lifestyle boutique aesthetic', positioning: 'Drape over shoulder cascading down to forearm, colors overlapping naturally shoulder to wrist' },
          { name: 'fanned out on extended arm', details: 'Colors fanned out in arc formation along the arm, each garment slightly spread to show full color, rainbow-like display', positioning: 'Fan garments in 120° arc along arm, each color separated showing full width' },
          { name: 'layered on arm with hand visible', details: 'Stacked on arm with hand elegantly positioned, fingers visible, adds human touch and scale to composition', positioning: 'Layer on forearm with graceful hand pose visible, colors stacked wrist toward elbow' },
          { name: 'held in crook of elbow', details: 'Garments nestled in the crook/bend of elbow, intimate holding position, cozy natural draping', positioning: 'Nestle all colors in elbow crook, allow natural draping from bent position' },
          { name: 'double-arm presentation', details: 'Colors distributed across both arms held together, expansive two-arm display for larger collections', positioning: 'Spread colors across both forearms held parallel, divide collection between two arms' },
          { name: 'one-handed gather on forearm', details: 'Hand gently gathering garments on opposite forearm, interactive presentation showing handling', positioning: 'One hand holds colors gathered on opposite forearm, natural gathering gesture' },
          { name: 'arm raised with cascading drape', details: 'Arm raised upward at 45° angle, garments cascading down dramatically, elegant waterfall effect', positioning: 'Raise arm at 45°, drape garments cascading downward, dramatic flowing arrangement' },
          { name: 'twisted arm presentation', details: 'Forearm gently twisted to show different angles of draped fabric, dynamic dimensional view of colors', positioning: 'Twist forearm 30° showing side profile, colors drape with dimensional twist' }
        ],
        'hanging-rack': [
          { name: 'on modern black metal rack', details: 'Hanging on sleek black metal clothing rack, contemporary minimalist aesthetic, clean industrial look', positioning: 'Hang colors on black metal rack, evenly spaced, modern minimal presentation' },
          { name: 'on vintage wooden clothing rail', details: 'Displayed on rustic wooden clothing rail, warm vintage boutique charm, natural wood tones', positioning: 'Arrange on wooden rail, vintage hangers, warm nostalgic retail aesthetic' },
          { name: 'on white boutique rack', details: 'Hanging on pristine white clothing rack, clean fresh retail environment, bright and airy presentation', positioning: 'Display on white rack with matching white/clear hangers, clean monochrome look' },
          { name: 'on copper pipe industrial rack', details: 'Displayed on exposed copper pipe clothing rack, trendy industrial-chic aesthetic, warm metallic accents', positioning: 'Hang on copper/brass pipe rack, industrial-chic hangers, warm metal tones' },
          { name: 'on tiered double-level rack', details: 'Arranged on two-tier clothing rack, colors split between upper and lower levels, boutique merchandising style', positioning: 'Distribute colors across two rack levels, create visual layers and depth' },
          { name: 'on curved arc clothing rack', details: 'Displayed on curved/arc-shaped rack, colors following the curve, dynamic flowing presentation', positioning: 'Arrange along curved rack following arc, creates sweeping visual flow' },
          { name: 'on wall-mounted rack bar', details: 'Hanging from wall-mounted clothing bar, floating appearance, modern space-saving display', positioning: 'Mount colors on wall bar, floating presentation, contemporary minimal look' },
          { name: 'on freestanding garment valet', details: 'Arranged on elegant freestanding valet/butler stand, upscale hotel-like presentation, refined aesthetic', positioning: 'Display on valet stand, refined hotel-style presentation, sophisticated spacing' },
          { name: 'on ladder-style leaning rack', details: 'Hanging on trendy ladder rack leaning against wall, casual-chic boutique vibe, relaxed aesthetic', positioning: 'Arrange on ladder rungs at various heights, casual layered look' },
          { name: 'on rolling clothing rack', details: 'Displayed on professional rolling garment rack, behind-the-scenes fashion studio feel, authentic backstage aesthetic', positioning: 'Hang on rolling Z-rack, fashion industry authentic presentation' }
        ],
        'folded-stack': [
          { name: 'neatly stacked with visible edges', details: 'Perfectly folded and stacked with each color edge prominently visible, retail shelf merchandising perfection', positioning: 'Stack with 3cm offset showing full edge of each color, retail-perfect alignment' },
          { name: 'casually stacked pile', details: 'Loosely folded and stacked in casual pile, lived-in lifestyle aesthetic, approachable natural arrangement', positioning: 'Stack casually with slight irregularity, natural home-like pile presentation' },
          { name: 'stacked in ascending size order', details: 'Folded and stacked from largest on bottom to smallest on top, pyramid formation, organized visual hierarchy', positioning: 'Stack largest to smallest creating tapered pyramid, visual size progression' },
          { name: 'side-by-side row of stacks', details: 'Multiple small stacks arranged in row side by side, organized compartmentalized display, boutique merchandising', positioning: 'Create 3-4 small stacks arranged horizontally, neat row presentation' },
          { name: 'stacked with one unfolded accent', details: 'Neat stack with top garment partially unfolded showing fabric detail, mixed presentation style', positioning: 'Stack colors neatly, top garment partially opened revealing texture and style' },
          { name: 'leaning stacked tower', details: 'Stack tilted at slight angle leaning against surface, casual dynamic presentation, relaxed aesthetic', positioning: 'Create tall stack leaning at 15° angle, dynamic casual composition' },
          { name: 'color-blocked stepped stack', details: 'Stacked in stepped formation like stairs, each color at different depth, architectural presentation', positioning: 'Arrange in staircase steps, each color recessed from previous, 3D depth' },
          { name: 'folded in thirds retail style', details: 'Each garment professionally folded in thirds and stacked, high-end retail store standard, crisp edges', positioning: 'Fold in professional thirds, stack with precision, luxury retail standard' },
          { name: 'rolled and stacked cylinders', details: 'Garments rolled instead of folded, stacked as cylinders showing spiral edges, unique modern presentation', positioning: 'Roll each color into cylinder, stack showing spiral edges, modern twist' },
          { name: 'stacked in woven basket', details: 'Folded colors stacked inside woven basket or container, cozy homey presentation, natural organic aesthetic', positioning: 'Arrange folded stack inside natural fiber basket, organic home styling' }
        ],
        'laid-out': [
          { name: 'flat side-by-side in row', details: 'All colors laid completely flat in straight row side by side, clean linear presentation, catalog style', positioning: 'Arrange in horizontal row, each garment flat and touching edges, linear alignment' },
          { name: 'overlapping fan arrangement', details: 'Colors laid out overlapping in fan formation, each color partially visible, dynamic radial composition', positioning: 'Overlap colors in fan pattern, each showing 60% surface area, radial spread' },
          { name: 'flat with sleeves extended', details: 'Garments laid with sleeves fully extended outward, showing full silhouette and form, detailed presentation', positioning: 'Lay flat with sleeves spread wide, show complete garment shape and construction' },
          { name: 'artfully scattered flat layout', details: 'Colors laid flat but at varied angles artistically scattered, editorial magazine aesthetic, dynamic composition', positioning: 'Lay each color at different 15-90° rotation, artistic scattered but controlled' },
          { name: 'stacked flat with slight offset', details: 'Colors layered flat on top of each other with slight offset, showing edge of each color, dimensional stack', positioning: 'Layer flat with 5cm offset showing color strips, create flat dimensional layers' },
          { name: 'diagonal line flat arrangement', details: 'Colors arranged flat along diagonal line, creates dynamic directional energy, modern editorial style', positioning: 'Lay colors flat along 45° diagonal from corner to corner, linear diagonal flow' },
          { name: 'circular flat mandala layout', details: 'Colors arranged flat in circular mandala pattern radiating from center, symmetrical artistic composition', positioning: 'Arrange flat in circle with each color pointing outward from center, radial symmetry' },
          { name: 'folded-half flat display', details: 'Each garment folded in half and laid flat showing both fold and edges, retail presentation hybrid', positioning: 'Fold each in half, lay flat showing fold line and color edges clearly' },
          { name: 'flat on chair or draping surface', details: 'Colors laid flat across chair back or draped surface, lifestyle home context, natural environment', positioning: 'Arrange flat across chair or furniture, natural home styling context' },
          { name: 'gradient progression flat layout', details: 'Colors arranged flat in gradient progression from light to dark or warm to cool, artistic color story', positioning: 'Lay flat in color gradient order, create visual color transition progression' }
        ]
      };

      // Randomly select one of the 10 variations for the chosen scenario
      const variations = colorCollectionVariations[displayScenario] || colorCollectionVariations['laid-out'];
      const scenario = variations[Math.floor(Math.random() * variations.length)];

      prompt = `Create a professional product photography image showing multiple color variants of the same garment ${scenario.name}.

IMAGES PROVIDED:
${colorVariants.map((_, index) => `- Image ${index + 1}: Garment color variant ${index + 1}`).join('\n')}

TOTAL: ${colorVariants.length} color variants of the SAME garment/product

TASK:
Generate a professional e-commerce product photo showing ALL ${colorVariants.length} color variants ${scenario.name}.
${scenario.details}

DISPLAY SCENARIO: ${displayScenario.toUpperCase()}
${scenario.positioning}

TECHNICAL SPECS:
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels
- Aspect Ratio: ${selectedAspectRatio.description}
- Lighting: ${selectedLighting.description}
- Background Blur: ${selectedBgBlur.description}
- Depth of Field: ${selectedDoF.description}
- Color Temperature: ${selectedColorTemp.description}
- Shadow Quality: ${selectedShadow.description}

SCENE & ENVIRONMENT:
- Location/Background: ${locationDescription}
- Style: ${selectedStyle.description}
- Camera Angle: ${selectedCameraAngle.description}
- Mood: Professional e-commerce product photography

KEY REQUIREMENTS:
1. Show ALL ${colorVariants.length} garments - each in its exact color from the provided images
2. ${scenario.positioning}
3. Each color variant must be clearly visible and distinguishable
4. Professional retail/e-commerce photography quality
5. Natural lighting and shadows
6. Clean, sharp focus on all garments
7. Maintain exact garment details from each image (style, cut, features)
8. CRITICAL DETAIL ATTENTION:
   - Preserve ALL fabric details for each color: stitching, seams, texture
   - Maintain exact color accuracy for each variant
   - Show fabric drape and texture naturally for each garment
   - Keep consistent garment style across all colors
   - Display any logos, patterns, or decorative elements accurately
   - Natural wrinkles and fabric physics for each piece

DO NOT:
- Mix up or change the colors from the provided images
- Make any color variant look fake or pasted
- Miss showing any of the ${colorVariants.length} color variants
- Change the garment style or design between colors
- Over-smooth or make fabric look artificial
- Add text, watermarks, or graphics
- Create unrealistic composites

Generate a professional e-commerce product photo perfect for showcasing the complete color collection - like in online stores or catalogs.`;

    } else if (mode === 'flat-lay') {
      // FLAT LAY MODE: Overhead product photography INSPIRED BY Brand Reference Photo

      prompt = `Create a professional flat lay product photography image showing the products, INSPIRED BY the brand reference photo's style.

IMAGES PROVIDED:
${flatLayProducts.map((_, index) => `- Image ${index + 1}: Product ${index + 1} to photograph`).join('\n')}
- Image ${flatLayProducts.length + 1}: BRAND REFERENCE PHOTO - Study this carefully for style inspiration

⚠️ CRITICAL APPROACH:

**STEP 1: Study Image ${flatLayProducts.length + 1} (brand reference photo) carefully**
Look at the actual brand reference photo (Image ${flatLayProducts.length + 1}) and observe:
- HOW MANY ITEMS are in the reference photo (count them: shirt, pants, accessories, etc.)
- WHAT TYPES of items are shown (clothing, jewelry, glasses, shoes, bags, etc.)
- How products are arranged (grid, scattered, circle, diagonal, etc.)
- Camera angle (overhead 90° or slightly angled)
- Background surface type (marble, wood, fabric, plain white, etc.)
- Lighting style (soft natural, bright studio, dramatic shadows, etc.)
- Spacing between products (tight/dense or spacious/minimal)
- Overall mood (minimalist, abundant, editorial, lifestyle, etc.)

**STEP 2: Create a COMPLETE COMPOSITION matching the reference**
🔥 **CRITICAL COMPOSITION RULE** 🔥
- Count total items in brand reference photo (Image ${flatLayProducts.length + 1})
- You uploaded ${flatLayProducts.length} product(s) in Images 1-${flatLayProducts.length}
- If reference has MORE items than you uploaded:
  ✅ Place your uploaded products prominently in the composition
  ✅ GENERATE/SIMULATE additional complementary items to match the reference's total item count
  ✅ Match the TYPES of items from reference (if reference has glasses → generate similar glasses, if reference has shirt → generate similar shirt, etc.)
  ✅ Example: Reference has 5 items (shirt+pants+cardigan+2 glasses+socks), you uploaded 1 jacket → Final image should show: Your jacket + 4 simulated complementary items (pants, cardigan-like item, 2 glasses, socks) = 5 total items
  ✅ The simulated items should be SIMILAR IN STYLE to what's in the reference (don't copy exactly, but match the category and aesthetic)

- If reference has SAME or FEWER items than you uploaded:
  ✅ Use all your uploaded products
  ✅ Arrange them like the reference

**STEP 3: Apply the EXACT style from reference**
- Arrange all items (uploaded + simulated) EXACTLY like the brand reference (same pattern, same spacing)
- Use EXACTLY the same camera angle as the reference
- Use a SIMILAR background surface type
- Use SIMILAR lighting style
- Create the SAME mood and atmosphere

AI ANALYSIS OF BRAND REFERENCE PHOTO:
${brandReferenceAnalysis}

CRITICAL REQUIREMENTS:

1. **Product Accuracy (MOST CRITICAL)**:
   - **For UPLOADED products (Images 1-${flatLayProducts.length})**: Use EXACT products with precise colors, designs, textures, and details - show ALL features (logos, labels, stitching, hardware)
   - **For SIMULATED/GENERATED items** (if needed to match reference item count): Generate realistic complementary products that match the style and category of items in the reference photo
   - Do NOT substitute uploaded products with different ones
   - Do NOT simplify or blur any product details

2. **Arrangement Pattern (MUST MATCH EXACTLY)**:
   - Copy the EXACT arrangement from brand reference:
     * If reference = grid → arrange ALL items (uploaded + simulated) in same grid pattern
     * If reference = scattered → scatter ALL items similarly
     * If reference = circle → arrange ALL items in circle
     * If reference = diagonal line → arrange ALL items diagonally
   - Match the EXACT spacing (if reference has 10cm gaps, use ~10cm gaps)
   - Match the EXACT density (if reference is minimal/spacious, be minimal/spacious)
   - Ensure total number of items matches reference photo's item count

3. **Camera Angle (MUST MATCH EXACTLY)**:
   - If reference = perfectly overhead 90° → shoot perfectly overhead
   - If reference = slightly angled → use similar angle
   - Products should lay flat on the surface (not standing up)

4. **Background & Surface**:
   - If reference uses white marble → use white marble-like surface
   - If reference uses wood → use wood-like surface
   - If reference uses plain white → use plain white surface
   - If reference uses fabric/textile → use similar fabric surface
   - Match the surface texture and color tone

5. **Lighting (MUST MATCH STYLE)**:
   - If reference = soft natural light → use soft natural lighting
   - If reference = bright studio → use bright even studio lighting
   - If reference = dramatic shadows → create dramatic shadows
   - Match shadow intensity and direction

6. **Mood & Atmosphere**:
   - If reference = minimalist clean → create minimalist clean look
   - If reference = abundant/full → show abundance
   - If reference = editorial artistic → create artistic composition
   - Match the overall feeling and vibe

TECHNICAL SPECS:
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels
- Sharp focus on all products
- Natural realistic shadows under products
- Professional e-commerce quality

DO NOT:
- ❌ Substitute or change uploaded products (Images 1-${flatLayProducts.length} MUST appear exactly as provided)
- ❌ Show fewer items than the reference photo (generate complementary items if needed)
- ❌ Change arrangement pattern (MUST match reference exactly)
- ❌ Change spacing/density (MUST match reference)
- ❌ Change camera angle (MUST match reference)
- ❌ Use wrong background type (MUST match reference style)
- ❌ Change lighting mood (MUST match reference)
- ❌ Make products stand up if they should be flat
- ❌ Simplify or blur product details
- ❌ Add text/watermarks not on original products
- ❌ Make products look fake or pasted

Generate a photorealistic professional flat lay that looks EXACTLY like it was shot for the same brand as the reference photo - same arrangement, same angle, same lighting, same mood, SAME NUMBER OF ITEMS - featuring your uploaded products prominently plus any simulated complementary items needed to match the reference's composition.`;

      /* OLD CODE - keeping variations for potential future use
      const flatLayVariations = {
        'grid': [
          { name: 'in a tight 2×2 grid', details: 'Compact 2×2 grid arrangement with minimal spacing between products, centered composition, symmetrical and orderly', positioning: 'Arrange in 2 rows and 2 columns with 2cm gaps, perfectly aligned' },
          { name: 'in a spacious 3×3 grid', details: 'Wide 3×3 grid with generous white space between each item, breathing room for each product, modern minimal aesthetic', positioning: 'Create 3×3 grid with 5cm spacing between items, emphasize negative space' },
          { name: 'in an asymmetric grid with hero product', details: 'Grid layout with one larger featured product taking center stage, other items arranged around in smaller grid cells', positioning: 'Place main product center at 1.5x size, arrange others in grid around it' },
          { name: 'in a staggered brick-pattern grid', details: 'Brick-laying pattern where each row is offset from the one above, creating visual rhythm and movement', positioning: 'Offset each row by half a product width, like brick masonry pattern' },
          { name: 'in a perfect square 4×4 grid', details: 'Dense 4×4 grid pattern filling the frame, catalog-style product showcase, equal prominence to all items', positioning: 'Arrange 16 items (or repeat if fewer) in tight 4×4 grid, minimal gaps' },
          { name: 'in a vertical column grid', details: 'Products arranged in neat vertical columns with generous horizontal spacing, tall elegant composition', positioning: 'Create 3-4 vertical columns, items stacked vertically with horizontal breathing room' },
          { name: 'in a horizontal row grid', details: 'Products lined up in horizontal rows across the frame, wide panoramic feeling, editorial magazine style', positioning: 'Arrange in 2-3 horizontal rows spanning full width, vertical spacing between rows' },
          { name: 'in a centered cross-pattern grid', details: 'Grid arranged in a cross/plus formation with products radiating from center point, balanced symmetry', positioning: 'Position products forming a + shape from center, equal spacing on all arms' },
          { name: 'in a checkerboard alternating grid', details: 'Checkerboard pattern where products alternate with empty spaces, playful negative space composition', positioning: 'Place products in alternating grid squares like checkerboard, empty spaces create rhythm' },
          { name: 'in a modular box grid', details: 'Products grouped in separate box modules within the grid, organized compartmentalized look', positioning: 'Divide frame into 4-6 box sections, arrange 1-2 products per box in mini-grids' }
        ],
        'scattered': [
          { name: 'in an organic scattered arrangement', details: 'Naturally scattered as if casually tossed, products at random angles creating effortless cool vibe', positioning: 'Scatter products at varying 15-45° angles, random placement with natural spacing' },
          { name: 'in a controlled chaos scatter', details: 'Deliberately random arrangement that looks spontaneous but maintains visual balance and harmony', positioning: 'Place products randomly but ensure balanced weight distribution across frame' },
          { name: 'in a clustered scattered arrangement', details: 'Products gathered in 2-3 small clusters with open space between groups, social grouping aesthetic', positioning: 'Create 2-3 product clusters, leaving breathing room between cluster groups' },
          { name: 'in a corner-weighted scatter', details: 'Products concentrated in corners with open center space, creates negative space focal point', positioning: 'Scatter most products toward 3-4 corners, keep center area relatively empty' },
          { name: 'in a flowing scattered arrangement', details: 'Products scattered in a flowing S-curve pattern across the frame, natural movement and rhythm', positioning: 'Arrange products following an invisible S or curved path, fluid composition' },
          { name: 'in a minimalist scattered layout', details: 'Very few products with lots of negative space, each item isolated and breathing, zen-like simplicity', positioning: 'Place 2-4 products with large empty areas between, emphasize isolation and space' },
          { name: 'in a layered scattered arrangement', details: 'Some products slightly overlapping others creating depth, dimensional scattered composition', positioning: 'Allow 10-20% overlap between some products, creates depth and layering' },
          { name: 'in a border-scattered layout', details: 'Products scattered around the perimeter leaving center empty, frame-within-frame composition', positioning: 'Scatter products around outer 30% of frame, central area stays clear' },
          { name: 'in a diagonal-flow scatter', details: 'Products scattered but flowing from one corner to opposite, diagonal energy and movement', positioning: 'Scatter products primarily along diagonal axis from corner to corner' },
          { name: 'in a random rotation scatter', details: 'Each product rotated to different extreme angle (45°-90°), dynamic angular energy throughout', positioning: 'Rotate each product differently (30-90°), create strong angular variety and movement' }
        ],
        'circular': [
          { name: 'in a perfect circle ring', details: 'Products arranged in a perfect circular ring with empty center, classic mandala-like composition', positioning: 'Position products in exact circle, equal spacing, center point empty for focal interest' },
          { name: 'in a spiral arrangement', details: 'Products arranged in a spiral pattern rotating outward from center, creates motion and flow', positioning: 'Arrange products in Fibonacci spiral or similar, starting center rotating outward' },
          { name: 'in a sunburst radiating pattern', details: 'Products radiating outward from center point like sun rays, dynamic energy emanating from core', positioning: 'Place products pointing outward from center like clock hands, radial symmetry' },
          { name: 'in concentric circles', details: 'Multiple circular rings nested inside each other, layered circular composition with depth', positioning: 'Create 2-3 concentric circles, inner circle smaller items, outer circle larger products' },
          { name: 'in a circular cluster with center focus', details: 'Main hero product in center, other items arranged in loose circle around it, clear hierarchy', positioning: 'Featured product dead center, arrange others in circular formation surrounding it' },
          { name: 'in a semi-circle arc', details: 'Products arranged in a half-circle arc across the frame, creates dynamic curved composition', positioning: 'Arrange products in 180° arc from left to right, rainbow-like curved formation' },
          { name: 'in an orbital pattern', details: 'Products at different orbital distances from center like planets, varied circular layers', positioning: 'Place products at varying distances from center point, 3-4 different orbital radii' },
          { name: 'in a circular wreath layout', details: 'Products tightly packed forming a circular wreath shape, festive and abundant feeling', positioning: 'Arrange products close together in circle, slightly overlapping, wreath aesthetic' },
          { name: 'in a broken circle arrangement', details: 'Circular pattern intentionally incomplete, creating visual tension and modern asymmetry', positioning: 'Form 3/4 circle leaving 1/4 open, creates dynamic incomplete circular flow' },
          { name: 'in a circular gradient pattern', details: 'Products arranged in circle with size gradation from small to large, creates depth perspective', positioning: 'Arrange in circle with smallest items one end, gradually larger moving around circle' }
        ],
        'diagonal': [
          { name: 'in a single diagonal line', details: 'Products aligned in one clean diagonal line from corner to corner, bold linear composition', positioning: 'Arrange all products along single 45° diagonal from bottom-left to top-right' },
          { name: 'in parallel diagonal rows', details: 'Multiple parallel diagonal lines creating striped pattern, dynamic rhythm and repetition', positioning: 'Create 2-3 parallel diagonal lines, products aligned along each stripe' },
          { name: 'in a diagonal cascade', details: 'Products stair-stepping diagonally with slight overlap, creates flowing waterfall effect', positioning: 'Arrange products in diagonal staircase pattern, each item slightly lower and overlapping' },
          { name: 'in a crossed diagonal X-pattern', details: 'Two diagonal lines crossing in center forming X shape, balanced dynamic symmetry', positioning: 'Form two diagonal lines intersecting at center, creating bold X composition' },
          { name: 'in a diagonal chevron pattern', details: 'V or inverted V shape along diagonal axis, creates strong directional arrow composition', positioning: 'Arrange products in V or Λ shape along diagonal, pointed chevron formation' },
          { name: 'in a diagonal zig-zag', details: 'Products alternating back and forth along diagonal path, creates energetic Z-shaped movement', positioning: 'Place products in zig-zag pattern following overall diagonal direction' },
          { name: 'in a diagonal offset pattern', details: 'Main diagonal line with secondary products offset to side, creates dimensional diagonal composition', positioning: 'Primary products on main diagonal, accent items offset 2-3cm to either side' },
          { name: 'in a diagonal wedge formation', details: 'Triangular wedge shape with diagonal edge, products densest at one corner spreading outward', positioning: 'Form triangle with one edge on diagonal, products dense at point spreading to base' },
          { name: 'in a stepped diagonal blocks', details: 'Products grouped in block formations stepping diagonally, architectural stair-step aesthetic', positioning: 'Create 3-4 product blocks arranged in diagonal staircase formation' },
          { name: 'in a sweeping diagonal curve', details: 'Products following a curved diagonal arc, combines diagonal energy with flowing curves', positioning: 'Arrange products in gentle curved arc that flows diagonally across frame' }
        ]
      };

      // Randomly select one of the 10 variations for the chosen arrangement
      const variations = flatLayVariations[arrangement] || flatLayVariations['grid'];
      const currentArrangement = variations[Math.floor(Math.random() * variations.length)];

      prompt = `Create a professional flat lay product photography image with products ${currentArrangement.name}.

IMAGES PROVIDED:
${flatLayProducts.map((_, index) => `- Image ${index + 1}: Product ${index + 1}`).join('\n')}

TOTAL: ${flatLayProducts.length} product(s)

TASK:
Generate a professional overhead flat lay photograph showing ${flatLayProducts.length > 1 ? 'ALL ' + flatLayProducts.length + ' products' : 'the product'} ${currentArrangement.name}.
${currentArrangement.details}

ARRANGEMENT TYPE: ${arrangement.toUpperCase()}
${currentArrangement.positioning}

CAMERA PERSPECTIVE:
- Perfectly overhead/bird's eye view (90-degree angle from above)
- Camera parallel to the flat surface
- Products laid flat on the surface below
- Professional top-down product photography

TECHNICAL SPECS:
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels
- Aspect Ratio: ${selectedAspectRatio.description}
- Lighting: ${selectedLighting.description} - even lighting across entire surface
- Background Blur: Minimal (flat lay style focuses on sharp details throughout)
- Depth of Field: ${selectedDoF.description}
- Color Temperature: ${selectedColorTemp.description}
- Shadow Quality: ${selectedShadow.description} - soft shadows under products

SCENE & ENVIRONMENT:
- Surface/Background: ${locationDescription}
- Style: ${selectedStyle.description} - clean flat lay aesthetic
- Mood: Professional e-commerce/editorial flat lay photography

KEY REQUIREMENTS:
1. Perfect overhead angle - directly from above looking down
2. ${currentArrangement.positioning}
3. All products must lay completely flat on the surface (no standing/propped items)
4. ${flatLayProducts.length > 1 ? 'Each product must be clearly visible and well-spaced' : 'Product should be prominently displayed'}
5. Even, consistent lighting across entire frame with no hot spots
6. Sharp focus on all products throughout the image
7. Clean, professional composition suitable for e-commerce
8. CRITICAL DETAIL ATTENTION:
   - Preserve ALL product details: textures, materials, colors, patterns
   - Show exact product features: buttons, zippers, logos, stitching
   - Maintain accurate colors and fabric textures
   - Render realistic shadows beneath each product
   - Display any text, labels, or branding clearly
   - Natural material appearance (leather grain, fabric weave, metal shine)
   - Show product construction details and edges crisply

DO NOT:
- Tilt the camera angle (must be perfectly overhead)
- Make products stand up or lean (everything must be flat)
- Create unrealistic shadows or lighting
- Over-smooth or lose product details
- Add text, watermarks, or graphics
- Make products look fake or digitally pasted
- Create cluttered or chaotic compositions
- Use dramatic angles or perspectives

Generate a professional flat lay photograph perfect for e-commerce product listings, social media, or catalog use - clean, organized, and beautifully composed.`;
      */
      // END OF OLD CODE - Now using brand reference photo approach instead

    } else if (mode === 'scene-recreation') {
      // SCENE RECREATION MODE: Create inspired photo using reference as style guide
      const peopleCount = referencePhotoPeopleCount || 1;
      const peopleText = peopleCount === 1
        ? 'the MODEL'
        : peopleCount === 2
        ? 'TWO people (BOTH models)'
        : 'THREE people (ALL THREE models)';

      // Check if we have 2 models provided
      const hasTwoModels = selectedModel.model2Base64 && selectedModel.garment2Base64Array.length > 0;

      const multiPersonInstruction = peopleCount > 1
        ? `\n\n⚠️ CRITICAL MULTI-PERSON REQUIREMENT:
- The reference photo contains ${peopleCount} people
- Your generated photo MUST also show ${peopleCount} people
- Recreate the same number of people with similar positioning and interaction
${hasTwoModels
  ? '- Model 1 wears Garment 1, Model 2 wears Garment 2 (each person wears their own garment)'
  : '- Each person should wear the garment/clothing provided'}
- Maintain natural spacing and composition between people as seen in reference`
        : '';

      // Build image description based on whether we have 2 models
      let imageDescription = '';
      let currentImageIndex = 1;

      if (hasTwoModels) {
        // 2 models mode: Model 1, Garment 1, Model 2, Garment 2, Reference
        imageDescription = `- Image ${currentImageIndex}: ⭐ MODEL 1 - First person to photograph (use their EXACT face and body)
- Image ${currentImageIndex + 1}${garments.length > 1 ? `-${currentImageIndex + garments.length}` : ''}: GARMENT 1 - Clothing for MODEL 1 to wear
- Image ${currentImageIndex + garments.length + 1}: ⭐ MODEL 2 - Second person to photograph (use their EXACT face and body)
- Image ${currentImageIndex + garments.length + 2}${selectedModel.garment2Base64Array.length > 1 ? `-${currentImageIndex + garments.length + 1 + selectedModel.garment2Base64Array.length}` : ''}: GARMENT 2 - Clothing for MODEL 2 to wear
- Image ${currentImageIndex + garments.length + selectedModel.garment2Base64Array.length + 2}: REFERENCE PHOTO - Use as inspiration for lighting, mood, pose, and style (NOT for the people's faces)`;
      } else {
        // Single model mode
        imageDescription = `- Image ${currentImageIndex}: ⭐ MODEL - This is the person to photograph (use their EXACT face and body)${peopleCount > 1 ? ` (NOTE: Since reference has ${peopleCount} people, duplicate this model ${peopleCount} times in similar poses)` : ''}
- Image ${garments.length === 1 ? currentImageIndex + 1 : `${currentImageIndex + 1}-${currentImageIndex + garments.length}`}: GARMENT - Clothing for the MODEL to wear
- Image ${currentImageIndex + garments.length + 1}: REFERENCE PHOTO - Use as inspiration for lighting, mood, pose, and style (NOT for the person's face)`;
      }

      prompt = `Create a photorealistic fashion photo showing ${peopleText} wearing the GARMENT${hasTwoModels ? 'S' : ''}, INSPIRED BY the style, lighting, and mood of the reference photo.${hijabDescription ? `

🚨🚨🚨 ABSOLUTE TOP PRIORITY - HIJAB OVERRIDE RULE 🚨🚨🚨
${hijabDescription}
🔥 THIS HIJAB REQUIREMENT IS NON-NEGOTIABLE AND OVERRIDES EVERYTHING 🔥
- COMPLETELY IGNORE any hijab or head covering shown in the reference photo
- The reference photo's hijab/head covering is IRRELEVANT - disregard it entirely
- ONLY apply the hijab requirement specified above
- If reference shows hijab but requirement is NO HIJAB → REMOVE all head covering, show full hair
- If reference shows NO hijab but requirement is HIJAB → ADD the specified hijab type
- If reference shows different hijab style → REPLACE with the specified hijab type above
- This rule has ABSOLUTE PRIORITY over matching the reference photo
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

` : ''}
IMAGES PROVIDED (IN ORDER):
${imageDescription}

⚠️ CRITICAL APPROACH:

**PRIMARY GOAL: Photograph the MODEL${hasTwoModels ? 'S' : ''} from the model image${hasTwoModels ? 's' : ''}**
${hasTwoModels
  ? `- The TWO people in the final photo MUST be MODEL 1 (Image 1) and MODEL 2 (Image ${garments.length + 2})
- Use MODEL 1's EXACT face, facial features, body type, skin tone, and hair from Image 1
- Use MODEL 2's EXACT face, facial features, body type, skin tone, and hair from Image ${garments.length + 2}
- This is the most important requirement - BOTH models must be recognizable as the people from their respective images
- DO NOT duplicate Model 1 twice - use BOTH different models`
  : `- The person in the final photo MUST be the MODEL from Image 1
- Use their EXACT face, facial features, body type, skin tone, and hair
- This is the most important requirement - the MODEL must be recognizable as the person from Image 1`}

**SECONDARY GOAL: Create a SIMILAR style inspired by the reference**
- Study the reference photo (Image ${hasTwoModels ? garments.length + selectedModel.garment2Base64Array.length + 3 : garments.length + 2}) for inspiration
- Copy the general TYPE of location (e.g., if it's outdoors in nature, shoot outdoors in nature)
- Match the STYLE of lighting (e.g., if it's golden hour, use golden hour lighting)
- Recreate the MOOD and atmosphere (e.g., if it's romantic, create romantic mood)
- Use a SIMILAR pose if there's a person in the reference
- Match the general composition style and camera angle

**What to copy from reference:**
✅ Type of location (outdoor/indoor, urban/nature, studio/casual)
✅ Lighting style (natural/artificial, soft/dramatic, time of day)
✅ Mood and atmosphere (energetic, calm, romantic, professional)
✅ General pose and body positioning
✅ Camera angle type (eye-level, low angle, etc.)
✅ Color palette and overall vibe

**What NOT to copy from reference:**
❌ The exact specific location (create a similar type of place, not the identical spot)
❌ The person's face or identity from the reference
❌ Every tiny detail of the background
❌ The exact clothing from the reference${hijabDescription ? `
❌ HIJAB OR HEAD COVERING from reference - COMPLETELY IGNORE IT` : ''}

TASK DESCRIPTION:${hasTwoModels
  ? `Create a NEW professional fashion photo of TWO MODELS: MODEL 1 from Image 1 wearing GARMENT 1, and MODEL 2 from Image ${garments.length + 2} wearing GARMENT 2, photographed in a similar style and mood as the reference photo. The key is: BOTH MODELS (separately) + THEIR GARMENTS + SIMILAR (not identical) SCENE/STYLE.`
  : `Create a NEW professional fashion photo of the MODEL from Image 1, wearing the GARMENT from Image 2, photographed in a similar style and mood as the reference photo. The key is: SAME MODEL + SAME GARMENT + SIMILAR (not identical) SCENE/STYLE.`}${multiPersonInstruction}

AI SCENE ANALYSIS:
The reference photo has been analyzed by AI with these findings:
${sceneAnalysis}

TECHNICAL SPECS:
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels
- Aspect Ratio: ${selectedAspectRatio.description}
- Fabric Type: ${selectedFabric.description}
- Garment Fit: ${selectedFit.description}${hijabDescription ? `\n- Hijab Style: ${hijabDescription}` : ''}

KEY REQUIREMENTS:
1. **The MODEL${hasTwoModels ? 'S ARE' : ' is'} the Star${hasTwoModels ? 's' : ''} (MOST IMPORTANT)**:
${hasTwoModels
  ? `   - The TWO people in the final photo MUST be MODEL 1 from Image 1 and MODEL 2 from Image ${garments.length + 2}
   - Use MODEL 1's EXACT face - every facial feature must match Image 1
   - Use MODEL 2's EXACT face - every facial feature must match Image ${garments.length + 2}
   - Use their EXACT body types, skin tones, and hair from their respective images
   - BOTH models must be clearly recognizable as the people from their images
   - DO NOT duplicate Model 1 twice - use TWO DIFFERENT models
   - DO NOT use or blend the faces/bodies from the reference photo`
  : `   - The person in the final photo MUST be the MODEL from Image 1
   - Use their EXACT face - every facial feature must match Image 1
   - Use their EXACT body type, skin tone, and hair from Image 1
   - The MODEL must be clearly recognizable as the person from Image 1
   - DO NOT use or blend the face/body from the reference photo`}

2. **Create a SIMILAR Scene (Inspired, Not Identical)**:
   - If reference shows outdoor park → shoot MODEL${hasTwoModels ? 'S' : ''} in a similar outdoor park setting
   - If reference shows indoor studio → shoot MODEL${hasTwoModels ? 'S' : ''} in a similar studio setting
   - If reference has golden sunset light → use golden sunset-style lighting on MODEL${hasTwoModels ? 'S' : ''}
   - If reference has dramatic shadows → create dramatic shadows for MODEL${hasTwoModels ? 'S' : ''}
   - Copy the FEEL and VIBE, not the exact pixels

3. **Pose and Composition Guidance**:
   - If reference has ${hasTwoModels ? 'people' : 'a person'} in ${hasTwoModels ? 'specific poses' : 'a specific pose'} → position MODEL${hasTwoModels ? 'S' : ''} in similar ${hasTwoModels ? 'poses' : 'pose'}
   - Use a similar camera angle and framing style
   - Match the general composition approach
   - But the face${hasTwoModels ? 's MUST be the MODELS' : ' MUST be the MODEL'} from ${hasTwoModels ? 'their respective images' : 'Image 1'}

4. **Garment Integration**:
${hasTwoModels
  ? `   - Dress MODEL 1 in ${garmentDescription}
   - Dress MODEL 2 in ${selectedModel.garmentPaths2.length === 1 ? 'the garment from their garment image' : `ALL ${selectedModel.garmentPaths2.length} garments (combine them on Model 2)`}
   - Each model wears THEIR OWN garment - do NOT mix them up`
  : `   - Dress the MODEL in ${garmentDescription}`}${hijabDescription ? `\n\n🚨🚨🚨 5. **ABSOLUTE PRIORITY - HIJAB OVERRIDE (MOST CRITICAL)** 🚨🚨🚨:

   ${hijabDescription}

   🔴🔴🔴 HIJAB ENFORCEMENT RULES (READ 3 TIMES): 🔴🔴🔴
   ✅ The hijab requirement above is THE ONLY rule for head covering
   ✅ The reference photo's hijab is 100% IRRELEVANT - treat it as if it doesn't exist
   ✅ Apply ONLY the hijab style specified above, regardless of what's in the reference

   📋 SPECIFIC SCENARIOS:
   ❌ Reference has NO hijab + Requirement = FULL HIJAB → YOU MUST ADD full traditional hijab covering all hair
   ❌ Reference has NO hijab + Requirement = RELAXED HIJAB → YOU MUST ADD relaxed hijab showing front hair
   ❌ Reference has FULL hijab + Requirement = NO HIJAB → YOU MUST REMOVE all hijab and show all hair uncovered
   ❌ Reference has FULL hijab + Requirement = RELAXED HIJAB → YOU MUST CHANGE to relaxed style with visible front hair
   ❌ Reference has RELAXED hijab + Requirement = FULL HIJAB → YOU MUST CHANGE to full coverage, no hair visible
   ❌ Reference has RELAXED hijab + Requirement = NO HIJAB → YOU MUST REMOVE all hijab and show all hair

   🔥 DO NOT BE INFLUENCED BY THE REFERENCE PHOTO'S HEAD COVERING 🔥
   🔥 THE REFERENCE PHOTO IS ONLY A GUIDE FOR POSE, LIGHTING, AND LOCATION 🔥
   🔥 HIJAB STYLE COMES FROM THE REQUIREMENT ABOVE, NOT THE REFERENCE 🔥

   The hijab requirement has ABSOLUTE PRIORITY and OVERRIDES all reference photo elements.` : ''}
   - Garment${hasTwoModels ? 's' : ''} should fit naturally with realistic wrinkles and fabric draping

   ⚠️ **CRITICAL - EXACT COLOR & DETAIL PRESERVATION:**
   - Use EXACT colors from garment image${hasTwoModels ? 's' : ''} - do NOT change or shift colors
   - PATTERNS & PRINTS: If garment has printed design or woven pattern, preserve EXACTLY - do NOT simplify, blur, or alter patterns/prints
   - Keep pattern colors, scale, alignment, and placement exactly as shown
   - If denim: preserve EXACT wash color (light/dark blue, black) and denim texture
   - ZIPPERS: Render with correct metal color, visible teeth, proper zipper pull - DO NOT deform or blur
   - BUTTONS: Show exact positions, colors, and materials
   - STITCHING: Preserve all visible stitching, especially contrast stitching on denim
   - POCKETS: Maintain exact shapes, stitching, rivets, and placement
   - FABRIC TEXTURE: Show authentic material texture (denim weave, smooth, knit, etc.)
   - Show material quality indicators (sheen, texture, weight, worn effects)${hijabDescription ? `\n   - Apply the specified hijab style correctly: ${hijabDescription}` : ''}

5. **Photographic Quality**:
   - Natural skin texture (no plastic smoothing)
   - Clean, sharp focus appropriate to the reference photo's style
   - Realistic lighting and shadows matching the reference scene
   - Professional fashion photography quality
   - Make it look like a real photo taken in that actual location

DO NOT:
- ❌ CRITICAL: DO NOT use the face or body from any person in the reference photo (Image ${hasTwoModels ? garments.length + selectedModel.garment2Base64Array.length + 3 : garments.length + 2})
- ❌ CRITICAL: DO NOT keep the people from the reference - only use them for pose reference${hijabDescription ? `\n🚨🚨🚨 ❌ MOST CRITICAL - HIJAB VIOLATION EXAMPLES 🚨🚨🚨:
- ❌❌❌ DO NOT EVER copy, imitate, or follow the hijab/head covering from the reference photo
- ❌❌❌ DO NOT look at the reference to determine hijab style - it is IRRELEVANT
- ❌❌❌ DO NOT think "reference has no hijab so I won't add hijab" - WRONG! Use requirement only
- ❌❌❌ DO NOT think "reference has hijab so I'll keep hijab" - WRONG! Check the requirement
- ❌❌❌ DO NOT match the reference's head covering in any way
- ✅✅✅ ONLY use the hijab requirement specified at the top of this prompt
- ✅✅✅ IGNORE the reference photo completely when deciding hijab style
- ✅✅✅ The requirement ${hijabDescription.includes('MUST completely cover') ? 'says FULL HIJAB → cover ALL hair' : hijabDescription.includes('NO hijab') ? 'says NO HIJAB → show ALL hair uncovered' : 'says RELAXED HIJAB → show front hair, loose covering'}` : ''}
${hasTwoModels
  ? `- ❌ CRITICAL: DO NOT duplicate Model 1 twice - use BOTH Model 1 AND Model 2 as two DIFFERENT people
- ❌ The TWO people must be MODEL 1 from Image 1 and MODEL 2 from Image ${garments.length + 2}, not anyone from the reference photo`
  : `- ❌ The person must be the MODEL from Image 1 (FIRST image), not anyone from the reference photo`}
- Change the scene, location, or environment from the reference photo
- Alter the lighting mood or atmosphere from the reference photo
- Change the camera angle or composition from the reference photo
- Make the model${hasTwoModels ? 's' : ''} look different from ${hasTwoModels ? 'their respective images' : 'Image 1'}
- Create obvious fake composites or artificial effects
- Add text, watermarks, or logos
- ❌ CRITICAL: DO NOT change garment colors - keep EXACT colors from garment image${hasTwoModels ? 's' : ''}
- ❌ CRITICAL: DO NOT simplify, blur, or alter fabric patterns and prints - preserve exact design
- ❌ CRITICAL: DO NOT change pattern colors, scale, or placement on garment
- ❌ CRITICAL: DO NOT deform or blur zippers - render with full detail and correct metal color
- ❌ CRITICAL: DO NOT change denim wash colors or remove denim texture
- ❌ CRITICAL: DO NOT simplify hardware details (zippers, buttons, rivets, snaps)
- Simplify or omit garment details like stitching, pockets, or decorative elements
- Smooth out fabric texture or make it look artificial
- Change stitching colors, especially contrast stitching on denim
- Over-smooth skin or create plastic-looking results

EXAMPLE TO CLARIFY THE APPROACH:
IMAGE ORDER YOU RECEIVE:
- Image 1: MODEL - A brunette woman with tan skin, curly hair
- Image 2: GARMENT - A blue floral dress
- Image 3: REFERENCE - A blonde woman in a sunny park at golden hour, standing by a tree, casual relaxed pose

CORRECT OUTPUT:
✅ The brunette woman from Image 1 (her EXACT face, curly hair, tan skin)
✅ Wearing the blue floral dress from Image 2
✅ Photographed in AN outdoor park setting (similar to reference, but doesn't have to be the exact same park)
✅ With golden hour sunset-style lighting (similar to reference)
✅ In a casual relaxed pose similar to the reference
✅ Similar camera angle and vibe

WRONG OUTPUTS:
❌ The blonde woman from the reference wearing the blue dress
❌ The brunette in indoor studio lighting (reference was outdoor golden hour)
❌ The brunette in formal stiff pose (reference was casual)
❌ A completely different style that ignores the reference mood

Think of it as: "Book a photoshoot for the MODEL from Image 1, style it like the reference photo"`;

    } else if (mode === 'style-transfer') {
      // STYLE TRANSFER MODE: Combine multiple people/outfits with lighting from content image
      const numStyleImages = selectedModel.styleImagesBase64.length;

      prompt = `Create a COMBINED fashion photo that merges ${numStyleImages} ${numStyleImages === 1 ? 'person' : 'people'} from the style images into ONE photo, EXACTLY REPLICATING the poses, body positions, gestures, expressions, vibe, lighting, and atmosphere from the content/reference image.

🎯 **YOUR ABSOLUTE #1 PRIORITY:** MATCH THE REFERENCE PHOTO EXACTLY

IMAGES PROVIDED (IN ORDER):
${selectedModel.styleImagesBase64.map((_, index) => `- Image ${index + 1}: STYLE IMAGE ${index + 1} - Person with outfit (USE: face, skin tone, clothing ONLY)`).join('\n')}
- Image ${numStyleImages + 1}: **REFERENCE/CONTENT IMAGE** - This is your MASTER GUIDE for EVERYTHING except faces and clothes

🔴 **MOST CRITICAL INSTRUCTIONS - READ CAREFULLY:**

**1️⃣ POSE & BODY POSITION (HIGHEST PRIORITY):**
${numStyleImages > 1
  ? `- Look at the REFERENCE image (Image ${numStyleImages + 1}) - study EXACTLY how people are positioned
- REPLICATE the EXACT body positions, poses, and spatial relationships
- If they're holding hands - YOUR people must hold hands in the SAME way
- If they're standing close - YOUR people must stand EXACTLY as close
- If they're sitting/leaning/gesturing - MATCH those exact positions
- Copy the EXACT body language and interaction dynamics
- Each person's pose must PRECISELY match the corresponding person in the reference
- Match shoulder angles, head tilts, hand positions, leg positions - EVERYTHING`
  : `- Look at the REFERENCE image (Image ${numStyleImages + 1}) - study the EXACT pose
- REPLICATE the PRECISE body position: torso angle, shoulder position, head tilt
- MATCH the exact arm positions, hand gestures, and leg stance
- If sitting - sit the SAME way; if leaning - lean the SAME way
- Copy the body angle relative to camera EXACTLY`}

**2️⃣ FACIAL EXPRESSIONS & EMOTIONS:**
- Study the EXACT facial expression in the reference image
- REPLICATE that expression PRECISELY: smiling/serious/laughing/thoughtful
- Match the eye direction and gaze
- Match mouth shape, smile width, teeth visibility
- Match eyebrow position and forehead tension
- The FEELING must be identical to the reference

**3️⃣ COMPOSITION & FRAMING:**
- Use the EXACT camera angle from the reference image
- Match the EXACT framing: full body/waist-up/close-up/etc.
- Position subjects at the SAME distance from camera
- Match the EXACT viewing angle and perspective

**SECONDARY GOAL: Apply lighting/mood from content image**
${contentImageAnalysis ? `
📋 **AI ANALYSIS OF CONTENT/REFERENCE IMAGE:**
${contentImageAnalysis}

- Use this analysis as your PRIMARY GUIDE for lighting, mood, and atmosphere
- Match the exact lighting characteristics described above
` : `- Analyze the content/reference image (Image ${numStyleImages + 1}) for:
  * Lighting direction, intensity, and color temperature
  * Time of day feel (golden hour, midday, blue hour, etc.)
  * Mood and atmosphere (bright, moody, dramatic, soft, romantic)
  * Color grading and tone
  * Shadow characteristics
`}- Apply ONLY these lighting/mood aspects to the combined photo
- Match the FEEL and VIBE of the lighting in the content image

**What to PRESERVE from style images (MOST CRITICAL):**
✅ EXACT faces, bodies, skin tones of all people
✅ EXACT outfits/garments - every detail, color, pattern, texture
✅ EXACT fabric patterns and prints - do NOT simplify or alter
✅ EXACT hardware details (zippers, buttons, rivets) with correct colors
✅ EXACT garment colors - do NOT shift or change
✅ All garment details: stitching, pockets, seams, decorative elements

**What to COPY EXACTLY from reference/content image:**
✅✅✅ **EXACT poses** - every body angle, limb position, gesture
✅✅✅ **EXACT facial expressions** - smile, eyes, emotion, gaze direction
✅✅✅ **EXACT body positioning** - distance between people, how they touch/interact
✅✅✅ **EXACT composition** - camera angle, framing, subject distance
✅✅ **Model vibe and energy** - relaxed/energetic/serious/playful
✅✅ **Background environment** - indoor/outdoor, setting type, depth
✅✅ **Camera perspective** - eye level/high/low angle, distance
✅ **Lighting style** (natural/artificial, soft/dramatic)
✅ **Light direction and shadows** - where light comes from, shadow length
✅ **Color temperature** (warm golden/cool blue/neutral)
✅ **Time of day atmosphere** - morning/midday/golden hour/night
✅ **Overall mood and feel** - romantic/professional/casual/dramatic
✅ **Color grading style** - warm/cool/vibrant/muted tones

**What NOT to take from content image:**
❌ People's faces or identities
❌ People's bodies or skin tones
❌ Clothing or outfits
❌ Specific location or background details
❌ Props or objects (unless they're part of the interaction like holding hands)

CRITICAL DETAIL PRESERVATION:
${numStyleImages > 1 ? `Since you're combining ${numStyleImages} people, make sure:
- Each person maintains their individual style and outfit
- No mixing of clothes between people
- Each outfit stays exactly as shown in its style image
- People are positioned naturally together (not overlapping awkwardly)

` : ''}⚠️ **FABRIC PATTERNS & PRINTS:**
- If garments have printed designs or patterns, preserve EXACTLY
- Do NOT simplify, blur, or alter any patterns
- Keep pattern colors, scale, and placement exact
- Show how patterns follow fabric draping naturally

⚠️ **HARDWARE & DETAILS:**
- Zippers: render with exact metal color, visible teeth
- Buttons: exact positions, colors, materials
- Stitching: preserve all visible stitching, especially contrast stitching
- Pockets: exact shapes, stitching, rivets
- Fabric texture: authentic material appearance

⚠️ **COLOR PRESERVATION:**
- Use EXACT colors from style images
- Do NOT change garment colors even with new lighting
- Lighting can affect brightness/shadows but NOT base colors
- Preserve color variations in fabric (fading, distressing, wash effects)

COMPOSITION:
${numStyleImages > 1
  ? `- Position all ${numStyleImages} people in a natural, balanced composition
- They should interact or relate to each other naturally
- Use appropriate spacing - not too cramped, not too far apart
- Create visual harmony between all people`
  : `- Center the person in the frame appropriately
- Use natural, professional composition`}
- Apply the lighting from content image consistently across the scene
- Maintain professional fashion photography quality

TECHNICAL SPECS:
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels
- Aspect Ratio: ${selectedAspectRatio.description}
- Professional fashion photography quality
- Natural skin texture (no plastic smoothing)
- Sharp focus on people and clothing
- Lighting should feel natural and consistent

DO NOT:
- ❌ CRITICAL: DO NOT change any garment colors - keep EXACT colors from style images
- ❌ CRITICAL: DO NOT simplify, blur, or alter fabric patterns and prints
- ❌ CRITICAL: DO NOT change faces or identities from style images (but DO use poses/expressions from content)
- ❌ CRITICAL: DO NOT use clothing or outfits from the content image - ONLY use clothes from style images
- ❌ CRITICAL: DO NOT deform or blur zippers, buttons, or hardware
- ❌ CRITICAL: DO NOT change pattern colors, scale, or placement
${numStyleImages > 1 ? `- ❌ CRITICAL: DO NOT mix clothes between people - each keeps their own outfit\n- ❌ CRITICAL: DO NOT omit any people - include ALL ${numStyleImages} people` : ''}
- Change the content/structure of the garments from style images
- Alter garment details, stitching, pockets, or decorative elements
- Over-smooth skin or create plastic-looking results
- Add text, watermarks, or logos
- Create obvious fake composites

🎬 EXAMPLE TO MAKE IT CRYSTAL CLEAR:
${numStyleImages > 1
  ? `📸 IMAGES YOU RECEIVE:
- Image 1: Woman in blue floral dress standing neutral, serious face (STYLE IMAGE)
- Image 2: Man in black suit standing neutral, serious face (STYLE IMAGE)
- Image 3: Happy couple holding hands, smiling big, walking together, golden hour sunset glow, romantic vibe (REFERENCE IMAGE)

✅ **CORRECT OUTPUT:**
✅ Woman in EXACT blue floral dress (from Image 1)
✅ Man in EXACT black suit (from Image 2)
✅ Woman's face and skin tone from Image 1, Man's face from Image 2
✅ **BUT BOTH are holding hands EXACTLY like in Image 3**
✅ **BOTH are smiling BIG like in Image 3** (NOT serious!)
✅ **BOTH are walking together like in Image 3** (NOT standing still!)
✅ Golden hour warm glow lighting from Image 3
✅ Romantic happy vibe from Image 3
✅ Same camera angle and framing as Image 3
✅ All dress patterns and suit details preserved perfectly

❌ **WRONG OUTPUT:**
❌ Only one person visible (WHERE'S THE OTHER PERSON?!)
❌ Both standing neutral/serious (NO! They should be smiling and walking!)
❌ Not holding hands (THEY MUST hold hands like in reference!)
❌ Changed dress color to pink or suit to navy
❌ Used the actual faces/people from the sunset couple photo
❌ Cold blue lighting instead of warm golden hour
❌ Simplified the floral pattern or removed suit details
❌ Standing pose instead of walking together pose`
  : `IMAGES YOU RECEIVE:
- Image 1: Woman in floral dress standing neutral (style image)
- Image 2: Model smiling and posing with hand on hip in dramatic side lighting (content image)

CORRECT OUTPUT:
✅ Woman in EXACT floral dress
✅ Smiling and posing with hand on hip (pose/expression from Image 2)
✅ With dramatic side lighting from Image 2
✅ All floral pattern details preserved
✅ Face and skin tone exactly from Image 1
✅ But expression and pose matching Image 2

WRONG OUTPUT:
❌ Changed dress pattern or colors
❌ Using the actual person/face from studio image
❌ Flat lighting instead of dramatic
❌ Simplified or blurred floral pattern
❌ Not matching the smiling expression or hand-on-hip pose from Image 2`}

Think of it as: "Take ${numStyleImages === 1 ? 'this person with their outfit' : `these ${numStyleImages} people with their outfits`}, pose them like the content image, and light them like the content image - but keep the exact clothing from the style images"`;
    }

    console.log('🎯 Mode:', mode);
    console.log('📝 Prompt:', prompt);
    console.log('🤖 Using model:', userGenerationModel);

    // ========================================
    // NEW: Mode-Specific Image Loading
    // ========================================
    const contentParts = [];

    if (mode === 'complete-outfit') {
      // Complete outfit: Load garment images + model image
      garmentBase64Array.forEach((garmentBase64, index) => {
        contentParts.push({ text: `GARMENT/CLOTHING IMAGE ${index + 1}:` });
        contentParts.push({
          inlineData: {
            data: garmentBase64,
            mimeType: 'image/jpeg'
          }
        });
      });

      contentParts.push({ text: "MODEL IMAGE:" });
      contentParts.push({
        inlineData: {
          data: modelBase64,
          mimeType: 'image/jpeg'
        }
      });

    } else if (mode === 'accessories-only') {
      // Accessories mode: Similar to scene-recreation
      // Send MODEL first (most important), then ACCESSORY, then BRAND REFERENCE
      contentParts.push({ text: "⭐ MODEL IMAGE - This is the person to photograph (use their EXACT face and body):" });
      contentParts.push({
        inlineData: {
          data: modelBase64,
          mimeType: 'image/jpeg'
        }
      });

      contentParts.push({ text: `ACCESSORY/JEWELRY PRODUCT IMAGE - The product to wear/display:` });
      contentParts.push({
        inlineData: {
          data: garmentBase64Array[0],
          mimeType: 'image/jpeg'
        }
      });

      contentParts.push({ text: `BRAND REFERENCE PHOTO - Study this for style, lighting, framing, and mood (do NOT copy the person):` });
      contentParts.push({
        inlineData: {
          data: selectedModel.brandReferencePhotoBase64,
          mimeType: 'image/jpeg'
        }
      });

    } else if (mode === 'underwear') {
      // Underwear mode: Load underwear product image + model image
      contentParts.push({ text: `UNDERWEAR PRODUCT IMAGE:` });
      contentParts.push({
        inlineData: {
          data: garmentBase64Array[0],
          mimeType: 'image/jpeg'
        }
      });

      contentParts.push({ text: "MODEL IMAGE:" });
      contentParts.push({
        inlineData: {
          data: modelBase64,
          mimeType: 'image/jpeg'
        }
      });

    } else if (mode === 'color-collection') {
      // Color Collection mode: Load ALL color variant images
      garmentBase64Array.forEach((colorBase64, index) => {
        contentParts.push({ text: `COLOR VARIANT ${index + 1} IMAGE:` });
        contentParts.push({
          inlineData: {
            data: colorBase64,
            mimeType: 'image/jpeg'
          }
        });
      });

      // NOTE: No model image needed - AI generates the display scenario naturally

    } else if (mode === 'flat-lay') {
      // Flat Lay mode: Load ALL product images, then BRAND REFERENCE
      garmentBase64Array.forEach((productBase64, index) => {
        contentParts.push({ text: `PRODUCT ${index + 1} IMAGE:` });
        contentParts.push({
          inlineData: {
            data: productBase64,
            mimeType: 'image/jpeg'
          }
        });
      });

      contentParts.push({ text: `BRAND REFERENCE PHOTO - Study this for arrangement, camera angle, background, lighting, and mood:` });
      contentParts.push({
        inlineData: {
          data: selectedModel.brandReferencePhotoBase64,
          mimeType: 'image/jpeg'
        }
      });

    } else if (mode === 'scene-recreation') {
      // Scene Recreation mode: MODEL(S) FIRST (most important), then garments, then reference
      // This order emphasizes that the MODEL(S) are the people to use

      // Check if we have 2 models
      const hasTwoModels = selectedModel.model2Base64 && selectedModel.garment2Base64Array.length > 0;

      if (hasTwoModels) {
        // 2 models mode: Model 1, Garment 1, Model 2, Garment 2, Reference
        contentParts.push({ text: "⭐ MODEL 1 IMAGE - FIRST PERSON TO USE (their face and body):" });
        contentParts.push({
          inlineData: {
            data: modelBase64,
            mimeType: 'image/jpeg'
          }
        });

        garmentBase64Array.forEach((garmentBase64, index) => {
          contentParts.push({ text: `GARMENT ${index + 1} FOR MODEL 1 (put this on MODEL 1):` });
          contentParts.push({
            inlineData: {
              data: garmentBase64,
              mimeType: 'image/jpeg'
            }
          });
        });

        contentParts.push({ text: "⭐ MODEL 2 IMAGE - SECOND PERSON TO USE (their face and body):" });
        contentParts.push({
          inlineData: {
            data: selectedModel.model2Base64,
            mimeType: 'image/jpeg'
          }
        });

        selectedModel.garment2Base64Array.forEach((garmentBase64, index) => {
          contentParts.push({ text: `GARMENT ${index + 1} FOR MODEL 2 (put this on MODEL 2):` });
          contentParts.push({
            inlineData: {
              data: garmentBase64,
              mimeType: 'image/jpeg'
            }
          });
        });

        contentParts.push({ text: `REFERENCE PHOTO (copy the SCENE/LIGHTING/BACKGROUND only, NOT the people):` });
        contentParts.push({
          inlineData: {
            data: selectedModel.referencePhotoBase64,
            mimeType: 'image/jpeg'
          }
        });
      } else {
        // Single model mode
        contentParts.push({ text: "⭐ MODEL IMAGE - THIS IS THE PERSON TO USE (their face and body):" });
        contentParts.push({
          inlineData: {
            data: modelBase64,
            mimeType: 'image/jpeg'
          }
        });

        garmentBase64Array.forEach((garmentBase64, index) => {
          contentParts.push({ text: `GARMENT/CLOTHING IMAGE ${index + 1} (put this on the MODEL):` });
          contentParts.push({
            inlineData: {
              data: garmentBase64,
              mimeType: 'image/jpeg'
            }
          });
        });

        contentParts.push({ text: `REFERENCE PHOTO (copy the SCENE/LIGHTING/BACKGROUND only, NOT the people):` });
        contentParts.push({
          inlineData: {
            data: selectedModel.referencePhotoBase64,
            mimeType: 'image/jpeg'
          }
        });
      }

    } else if (mode === 'style-transfer') {
      // Style Transfer mode: Style images FIRST (people to combine), then content image (for lighting)
      // Upload style images (these contain the people and outfits to preserve)
      selectedModel.styleImagesBase64.forEach((styleImageBase64, index) => {
        contentParts.push({ text: `⭐ STYLE IMAGE ${index + 1} - Person with outfit (PRESERVE THIS EXACTLY):` });
        contentParts.push({
          inlineData: {
            data: styleImageBase64,
            mimeType: 'image/jpeg'
          }
        });
      });

      // Upload content image (this provides the lighting/mood reference)
      contentParts.push({ text: `📸 CONTENT/REFERENCE IMAGE - Use ONLY for lighting, mood, atmosphere (NOT for people or clothes):` });
      contentParts.push({
        inlineData: {
          data: selectedModel.contentImageBase64,
          mimeType: 'image/jpeg'
        }
      });
    }

    // ========================================
    // GENERATE IMAGE WITH SELECTED MODEL
    // ========================================
    let generatedImageBase64 = null;
    let generatedText = '';

    if (userGenerationModel === 'nano-banana-2') {
      // Use Nano Banana 2 (Gemini 3 Pro Image Preview)
      console.log('🍌 Using Nano Banana 2 for generation...');
      const nanoBananaResult = await generateNanoBananaImage({
        prompt: prompt,
        contentParts: contentParts,
        aspectRatio: aspectRatioId || '1:1',
        imageSize: 'large'
      });
      generatedImageBase64 = nanoBananaResult.imageData;
    } else {
      // Use Gemini 2.5 Flash Image (default)
      console.log('⚡ Using Gemini 2.5 Flash Image for generation...');
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-image",
        generationConfig: {
          responseModalities: ["Image"]
        }
      });

      contentParts.push({ text: prompt });
      const result = await model.generateContent(contentParts);
      const response = await result.response;

      console.log('📦 Response structure:', JSON.stringify({
        candidates: response.candidates?.length,
        hasParts: !!response.candidates?.[0]?.content?.parts
      }));

      if (!response.candidates || !response.candidates[0] || !response.candidates[0].content || !response.candidates[0].content.parts) {
        console.error('❌ Invalid response structure:', JSON.stringify(response, null, 2));
        throw new Error('Invalid response from Gemini API');
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImageBase64 = part.inlineData.data;
          console.log('✅ Image generated successfully!');
        } else if (part.text) {
          generatedText += part.text;
        }
      }

      if (!generatedImageBase64) {
        console.error('❌ No image in response. Parts:', JSON.stringify(response.candidates[0].content.parts, null, 2));
        throw new Error('No image was generated by Gemini. Response only contains text.');
      }
    }

    // تبدیل base64 به buffer
    const imageBuffer = Buffer.from(generatedImageBase64, 'base64');
    const fileName = `generated-${Date.now()}.png`;

    // آپلود تصویر تولید شده به Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('garments')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading generated image:', uploadError);
      throw uploadError;
    }

    // دریافت URL عمومی
    const { data: urlData } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    const generatedImageUrl = urlData.publicUrl;

    // ذخیره اطلاعات در Supabase Database
    // Store garments as JSON array if multiple, or single string if one
    const garmentPathToStore = garments.length === 1 ? garments[0] : JSON.stringify(garments);

    // Debug: Log what we're about to save
    console.log('📧 Saving to DB with contact info:', {
      user_id: req.user?.id,
      user_email: req.user?.email || req.body?.userEmail,
      user_phone: req.user?.phone || req.user?.phone_number || req.body?.userPhone,
      has_req_user: !!req.user,
      req_user_keys: req.user ? Object.keys(req.user) : []
    });

    const { data: generationData, error: dbError } = await supabase
      .from('generated_images')
      .insert([
        {
          user_id: req.user?.id || null,
          user_email: req.user?.email || req.body?.userEmail || null,
          user_phone: req.user?.phone || req.user?.phone_number || req.body?.userPhone || null,
          garment_path: garmentPathToStore,
          model_id: modelId,
          background_id: backgroundId,
          prompt: prompt,
          description: generatedText,
          generated_image_url: generatedImageUrl,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (dbError) {
      console.error('خطا در ذخیره در دیتابیس:', dbError);
    }

    console.log('✅ Image generated and uploaded successfully!');

    res.json({
      success: true,
      imagePath: generatedImageUrl,
      model: selectedModel ? selectedModel.name : 'No model (product photography)',
      background: selectedBackground ? selectedBackground.name : (mode === 'scene-recreation' ? 'Scene from reference photo' : 'No background'),
      description: generatedText,
      prompt: prompt,
      message: 'تصویر با موفقیت تولید شد!'
    });

  } catch (error) {
    console.error('❌ خطا در تولید تصویر:', error);
    res.status(500).json({
      error: 'خطا در تولید تصویر',
      details: error.message
    });
  }
});

// دریافت تاریخچه تولیدها
app.get('/api/generations', authenticateUser, async (req, res) => {
  try {
    if (!supabase) {
      // اگر Supabase تنظیم نشده، یک آرایه خالی برمی‌گردانیم
      return res.json({ success: true, generations: [] });
    }

    const { data, error } = await supabase
      .from('generated_images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ success: true, generations: data || [] });
  } catch (error) {
    console.error('خطا در دریافت تاریخچه:', error);
    res.status(500).json({ error: 'خطا در دریافت تاریخچه' });
  }
});

// حذف یک تصویر (user can only delete their own images, unless admin)
app.delete('/api/generations/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase تنظیم نشده است' });
    }

    const ADMIN_EMAIL = 'engi.alireza@gmail.com';

    // First, try to find the image in generated_images
    const { data: generatedImage, error: findGenError } = await supabase
      .from('generated_images')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle instead of single to handle not found gracefully

    console.log(`🔍 Checking generated_images for ID ${id}:`, generatedImage ? 'Found' : 'Not found');

    // If found in generated_images, delete it
    if (generatedImage) {
      let deleteQuery = supabase
        .from('generated_images')
        .delete()
        .eq('id', id);

      // If NOT admin, ensure they can only delete their own images
      if (userEmail !== ADMIN_EMAIL) {
        deleteQuery = deleteQuery.eq('user_id', userId);
        console.log(`🗑️ User ${userEmail} deleting their own image from generated_images: ${id}`);
      } else {
        console.log(`👑 Admin ${userEmail} deleting image from generated_images: ${id}`);
      }

      const { error, count } = await deleteQuery;

      if (error) throw error;

      if (count === 0) {
        return res.status(403).json({
          success: false,
          error: 'شما مجاز به حذف این تصویر نیستید'
        });
      }

      console.log(`✅ Deleted image ${id} from generated_images`);

      // Verify deletion by checking if item still exists
      const { data: verifyCheck } = await supabase
        .from('generated_images')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      console.log(`🔍 Verification - Item ${id} still exists in DB: ${verifyCheck ? 'YES ⚠️' : 'NO ✅'}`);

      return res.json({ success: true, message: 'تصویر با موفقیت حذف شد' });
    }

    // If not found in generated_images, check if it's from content_library
    const { data: contentLibraryItem, error: findContentError } = await supabase
      .from('content_library')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle instead of single

    console.log(`🔍 Checking content_library for ID ${id}:`, contentLibraryItem ? 'Found' : 'Not found');

    if (contentLibraryItem) {
      // Only admin can delete from content_library
      if (userEmail !== ADMIN_EMAIL) {
        return res.status(403).json({
          success: false,
          error: 'فقط ادمین می‌تواند مدل‌ها را حذف کند'
        });
      }

      console.log(`👑 Admin ${userEmail} deleting item from content_library: ${id}`);

      // Delete from content_library
      const { error: deleteError } = await supabaseAdmin
        .from('content_library')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Delete from Storage if exists
      if (contentLibraryItem.storage_bucket && contentLibraryItem.storage_filename) {
        const { error: storageError } = await supabaseAdmin.storage
          .from(contentLibraryItem.storage_bucket)
          .remove([contentLibraryItem.storage_filename]);

        if (storageError) {
          console.warn('⚠️ Warning: Could not delete from storage:', storageError);
        } else {
          console.log(`✅ Deleted ${contentLibraryItem.storage_filename} from ${contentLibraryItem.storage_bucket}`);
        }
      }

      console.log(`✅ Deleted item ${id} from content_library`);

      // Verify deletion by checking if item still exists
      const { data: verifyCheck } = await supabase
        .from('content_library')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      console.log(`🔍 Verification - Item ${id} still exists in content_library: ${verifyCheck ? 'YES ⚠️' : 'NO ✅'}`);

      return res.json({ success: true, message: 'مدل با موفقیت حذف شد' });
    }

    // Image not found in either table
    return res.status(404).json({
      success: false,
      error: 'تصویر یافت نشد'
    });

  } catch (error) {
    console.error('خطا در حذف تصویر:', error);
    res.status(500).json({ success: false, error: 'خطا در حذف تصویر' });
  }
});

// Get user-specific gallery images (with admin override and pagination)
app.get('/api/user/gallery', authenticateUser, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ success: true, images: [], totalCount: 0, totalPages: 0 });
    }

    const userId = req.user.id;
    const userEmail = req.user.email;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    // Admin user email - can see ALL images
    const ADMIN_EMAIL = 'engi.alireza@gmail.com';
    const isAdmin = userEmail === ADMIN_EMAIL;

    console.log(`🔍 Gallery request - User: "${userEmail}" | Admin: ${isAdmin} | Feature Flag: ${SHOW_CONTENT_LIBRARY_IN_GALLERY}`);

    let allImages = [];
    let totalCount = 0;

    // Fetch from generated_images table
    let generatedCountQuery = supabase
      .from('generated_images')
      .select('*', { count: 'exact', head: true });

    if (!isAdmin) {
      generatedCountQuery = generatedCountQuery.eq('user_id', userId);
    }

    const { count: generatedCount, error: genCountError } = await generatedCountQuery;
    if (genCountError) throw genCountError;

    console.log(`📊 generated_images count: ${generatedCount}`);

    let generatedDataQuery = supabase
      .from('generated_images')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      generatedDataQuery = generatedDataQuery.eq('user_id', userId);
    }

    const { data: generatedImages, error: genDataError } = await generatedDataQuery;
    if (genDataError) throw genDataError;

    console.log(`📊 generated_images actual data rows: ${(generatedImages || []).length}`);

    // Build initial user email map for admin (will be completed after fetching content_library)
    let userEmailMap = {};
    let allUserIds = [];

    if (isAdmin && generatedImages && generatedImages.length > 0) {
      const generatedUserIds = generatedImages.map(img => img.user_id).filter(Boolean);
      allUserIds = [...allUserIds, ...generatedUserIds];
    }

    // Add source tag to generated images
    const taggedGeneratedImages = (generatedImages || []).map(img => ({
      ...img,
      generated_image_url: img.generated_image_url,
      image_source: 'generated_images'
    }));

    allImages = [...taggedGeneratedImages];
    totalCount = generatedCount || 0;

    // 🚩 FEATURE FLAG: Conditionally fetch from content_library
    if (SHOW_CONTENT_LIBRARY_IN_GALLERY) {
      console.log('🎨 Including content_library models in gallery');

      let contentCountQuery = supabase
        .from('content_library')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (!isAdmin) {
        contentCountQuery = contentCountQuery.eq('owner_user_id', userId);
      }

      const { count: contentCount, error: contentCountError } = await contentCountQuery;
      if (contentCountError) {
        console.warn('⚠️  Error counting content_library:', contentCountError);
      } else {
        console.log(`📊 content_library count: ${contentCount}`);

        let contentDataQuery = supabase
          .from('content_library')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          contentDataQuery = contentDataQuery.eq('owner_user_id', userId);
        }

        const { data: contentLibrary, error: contentDataError } = await contentDataQuery;
        if (contentDataError) {
          console.warn('⚠️  Error fetching content_library:', contentDataError);
        } else {
          console.log(`📊 content_library actual data rows: ${(contentLibrary || []).length}`);

          // Collect user IDs from content_library for admin
          if (isAdmin && contentLibrary && contentLibrary.length > 0) {
            const contentUserIds = contentLibrary.map(item => item.owner_user_id).filter(Boolean);
            allUserIds = [...allUserIds, ...contentUserIds];
          }

          // Normalize content_library to match generated_images structure
          const normalizedContent = (contentLibrary || []).map(item => ({
            id: item.id,
            generated_image_url: item.image_url, // Map image_url to generated_image_url
            created_at: item.created_at,
            user_id: item.owner_user_id, // Map owner_user_id to user_id
            prompt: `Model: ${item.name} (${item.category})`,
            style: item.category,
            model_type: item.content_type,
            image_source: 'content_library', // Tag for identification
            original_data: item // Keep original data for reference
          }));

          allImages = [...allImages, ...normalizedContent];
          totalCount += (contentCount || 0);
          console.log(`✅ Added ${normalizedContent.length} items from content_library`);
        }
      }
    }

    // Fetch user emails for admin (after collecting all user IDs)
    if (isAdmin && allUserIds.length > 0) {
      const uniqueUserIds = [...new Set(allUserIds)];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', uniqueUserIds);

      if (!usersError && users) {
        users.forEach(user => {
          userEmailMap[user.id] = user.email;
        });
        console.log(`👥 Fetched emails for ${users.length} users`);
      }

      // Add user_email to all images
      allImages = allImages.map(img => ({
        ...img,
        user_email: img.user_id ? userEmailMap[img.user_id] : null
      }));
    }

    // Sort all images by created_at
    allImages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply pagination AFTER merging
    const paginatedImages = allImages.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalCount / limit);

    console.log(`📸 Total: ${totalCount} | Page ${page}/${totalPages} | Showing: ${paginatedImages.length}`);

    res.json({
      success: true,
      images: paginatedImages,
      isAdmin: isAdmin,
      totalCount: totalCount,
      currentPage: page,
      totalPages: totalPages,
      itemsPerPage: limit
    });
  } catch (error) {
    console.error('Error fetching user gallery:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در بارگذاری گالری'
    });
  }
});

// Simple alias for gallery images (used by style transfer gallery selector)
app.get('/api/user-images', authenticateUser, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ success: true, images: [] });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const userId = req.user.id;
    const userEmail = req.user.email;

    // Check if user is admin
    const ADMIN_EMAIL = 'engi.alireza@gmail.com';
    const isAdmin = userEmail === ADMIN_EMAIL;

    // Fetch all user's images (no pagination, just simple list)
    // Admin sees ALL images, regular users see only their own
    let query = supabase
      .from('generated_images')
      .select('id, generated_image_url, created_at, user_id, user_email, user_phone')
      .order('created_at', { ascending: false })
      .limit(100); // Limit to recent 100 images

    // If not admin, filter by user_id
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Database error fetching images:', error);
      throw error;
    }

    console.log(`📸 Found ${data?.length || 0} images for ${isAdmin ? 'admin (all users)' : `user ${userId}`}`);

    // Map to format expected by frontend (image_url instead of generated_image_url)
    const images = data ? data.map(img => ({
      id: img.id,
      image_url: img.generated_image_url,
      created_at: img.created_at,
      user_email: img.user_email,
      user_phone: img.user_phone
    })) : [];

    console.log(`✅ Returning ${images.length} images to frontend`);

    res.json({
      success: true,
      images: images
    });
  } catch (error) {
    console.error('Error fetching user images:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در بارگذاری تصاویر'
    });
  }
});

// ============================================
// USER USAGE STATS ENDPOINT
// ============================================
app.get('/api/user/usage', authenticateUser, async (req, res) => {
  try {
    if (!supabase || !req.user || !req.user.id) {
      return res.json({
        success: true,
        tier: 'testlimit',
        credits: { used: 0, limit: 5, remaining: 5 },
        isDemo: true
      });
    }

    const userId = req.user.id;

    // Get user's limits and usage
    const { data: userLimit, error } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !userLimit) {
      console.error('Error fetching user usage:', error);
      return res.status(500).json({
        success: false,
        error: 'خطا در دریافت اطلاعات کاربر'
      });
    }

    const tier = userLimit.tier || 'testlimit';
    const tierInfo = await getTierLimits(tier);
    const creditsUsed = userLimit.credits_used || 0;
    const creditsLimit = userLimit.credits_limit || tierInfo.credits;
    const remaining = creditsLimit - creditsUsed;

    res.json({
      success: true,
      tier: tier,
      tierName: tierInfo.name,
      credits: {
        used: creditsUsed,
        limit: creditsLimit,
        remaining: remaining,
        percentage: Math.round((creditsUsed / creditsLimit) * 100)
      },
      lastResetDate: userLimit.last_reset_date,
      email: userLimit.email || req.user?.email || null
    });

  } catch (error) {
    console.error('Error in /api/user/usage:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در سیستم'
    });
  }
});

// تولید تصاویر مدل‌ها (endpoint برای اجرای دستی)
app.post('/api/generate-models', async (req, res) => {
  try {
    if (models.length > 0) {
      return res.json({
        success: true,
        message: 'مدل‌ها قبلاً تولید شده‌اند',
        models: models
      });
    }

    // اجرای تولید مدل‌ها در پس‌زمینه
    generateModelImages().then(() => {
      console.log('✅ تولید مدل‌ها کامل شد');
    });

    res.json({
      success: true,
      message: 'تولید مدل‌ها شروع شد. لطفاً چند دقیقه صبر کنید...'
    });
  } catch (error) {
    console.error('خطا در شروع تولید مدل‌ها:', error);
    res.status(500).json({ error: 'خطا در شروع تولید مدل‌ها' });
  }
});

// تولید توضیحات محصول برای سایت
app.post('/api/generate-product-description', async (req, res) => {
  try {
    const { imageUrl, imageId, productInfo } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'URL تصویر الزامی است' });
    }

    console.log('📄 Generating product description for image:', imageUrl);
    if (productInfo) {
      console.log('📦 Product info:', productInfo);
    }

    // دانلود تصویر و تبدیل به base64
    const imageBase64 = await imageUrlToBase64(imageUrl);

    // استفاده از Gemini برای تولید توضیحات محصول
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // ساخت پرامپت با اطلاعات محصول
    let productDetails = '';
    if (productInfo) {
      productDetails = `

🛍️ اطلاعات محصول:
- نام محصول: ${productInfo.name}
- رنگ‌های موجود: ${productInfo.colors.join('، ')}
- سایزهای موجود: ${productInfo.sizes.join('، ')}
- قیمت اصلی: ${parseInt(productInfo.price).toLocaleString('fa-IR')} تومان
${productInfo.discount ? `- تخفیف: ${productInfo.discount}% (قیمت نهایی: ${parseInt(productInfo.finalPrice).toLocaleString('fa-IR')} تومان)` : ''}
${productInfo.category ? `- دسته‌بندی: ${productInfo.category}` : ''}
${productInfo.fabricType ? `- جنس پارچه: ${productInfo.fabricType}` : ''}
${productInfo.description ? `- توضیحات اضافی: ${productInfo.description}` : ''}`;
    }

    const prompt = `شما یک متخصص محتوای محصول و کپی‌رایتر حرفه‌ای فروشگاه‌های آنلاین هستید.

این تصویر محصول را تحلیل کن و یک توضیحات کامل، جامع و حرفه‌ای برای صفحه محصول در سایت فروشگاهی بنویس.
${productDetails}

الزامات مهم:

📝 ساختار محتوا (به ترتیب):

1️⃣ معرفی جذاب (2-3 جمله):
   - شروع قوی و جذاب که توجه مشتری را جلب کند
   - ارزش منحصر به فرد محصول را برجسته کن
   - احساس و تجربه استفاده از محصول را توصیف کن

2️⃣ ویژگی‌های کلیدی (لیست نقطه‌ای):
   - کیفیت پارچه و جنس مواد
   - طراحی و استایل
   - راحتی و کاربرد
   - دوام و ماندگاری
   - ویژگی‌های خاص این محصول

3️⃣ کاربردها و موقعیت‌های استفاده (پاراگراف):
   - کجاها می‌توان از این محصول استفاده کرد؟
   - برای چه مناسبت‌هایی ایده‌آل است؟
   - با چه آیتم‌هایی می‌توان ست کرد؟
   - چه حسی به پوشنده می‌دهد؟

4️⃣ پیشنهادات استایل (پاراگراف):
   - نحوه ترکیب با سایر لباس‌ها
   - استایل‌های مختلف (کژوال، رسمی، اسپرت و...)
   - اکسسوری‌های پیشنهادی
   - ایده‌های ست کردن خلاقانه

5️⃣ راهنمای نگهداری و شستشو (لیست نقطه‌ای):
   - نحوه شستشو (ماشین، دستی، حالت ظریف)
   - دمای مناسب آب
   - نکات اتو کشیدن
   - نحوه خشک کردن
   - نکات نگهداری برای افزایش عمر محصول
   - هشدارها (مثل عدم استفاده از سفیدکننده)

6️⃣ اطلاعات فنی (جدول‌وار):
   - رنگ‌های موجود: [لیست]
   - سایزها: [لیست]
   ${productInfo && productInfo.fabricType ? `- جنس: ${productInfo.fabricType}` : '- جنس: [از تصویر استخراج کن]'}
   - قیمت و تخفیف

7️⃣ تضمین کیفیت (1-2 جمله):
   - ضمانت کیفیت
   - امکان بازگشت کالا
   - اصالت و اورجینال بودن

الزامات نگارشی:

✅ زبان: فارسی رسمی اما صمیمی و دوستانه
✅ طول: حدود 300-350 کلمه (دقیق!)
✅ لحن: حرفه‌ای، آموزنده، قابل اعتماد
✅ فرمت: پاراگراف‌های کوتاه با فاصله خوانا
✅ استفاده از ایموجی: 8-12 عدد به صورت استراتژیک در بخش‌های مختلف
✅ جمله‌بندی: واضح، ساده، بدون کلیشه

❌ اجتناب از:
- ادعاهای غیرواقعی یا اغراق‌آمیز
- جملات پیچیده و طولانی
- کلیشه‌های تبلیغاتی مزخرف
- لیست خسته‌کننده بدون توضیح

🎯 هدف نهایی:
محتوایی بنویس که:
- اعتماد مشتری را جلب کند
- تمام سوالات احتمالی را پاسخ دهد
- نرخ تبدیل فروش را افزایش دهد
- SEO-friendly باشد
- مشتری را مطمئن کند که انتخاب درستی می‌کند

فقط متن توضیحات فارسی رو بنویس، بدون هیچ توضیح یا متن اضافه. آماده برای قرار گرفتن مستقیم در صفحه محصول!`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const response = await result.response;
    const description = response.text();

    console.log('✅ Product description generated successfully');

    // ذخیره توضیحات در دیتابیس (اگر supabase فعال باشد و imageId وجود داشته باشد)
    if (supabase && imageId) {
      try {
        const { error: updateError } = await supabase
          .from('generated_images')
          .update({ product_description: description })
          .eq('id', imageId);

        if (updateError) {
          console.error('خطا در ذخیره توضیحات در دیتابیس:', updateError);
        } else {
          console.log('✅ توضیحات در دیتابیس ذخیره شد');
        }
      } catch (dbError) {
        console.error('خطا در ذخیره توضیحات:', dbError);
      }
    }

    res.json({
      success: true,
      description: description,
      imageId: imageId
    });

  } catch (error) {
    console.error('❌ خطا در تولید توضیحات محصول:', error);
    res.status(500).json({
      error: 'خطا در تولید توضیحات محصول',
      details: error.message
    });
  }
});

// Generate AI image only (for custom content creation)
app.post('/api/generate-image-only', async (req, res) => {
  try {
    const { prompt, aspectRatio, contentType, modelAge, modelEthnicity } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Check if Gemini AI is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
      return res.status(503).json({
        success: false,
        error: 'Gemini AI is not configured',
        message: 'Please set GEMINI_API_KEY in your environment variables to use AI image generation'
      });
    }

    // Check if Supabase is configured (needed for image storage)
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Supabase is not configured',
        message: 'Please set Supabase credentials in your environment variables'
      });
    }

    console.log(`🎨 Generating ${contentType} with Gemini AI using prompt: ${prompt}`);

    // Map aspect ratio to dimensions
    const aspectRatioMap = {
      '1:1': { width: 1024, height: 1024, description: '1:1 Square' },
      '3:4': { width: 768, height: 1024, description: '3:4 Portrait' },
      '4:3': { width: 1024, height: 768, description: '4:3 Landscape' },
      '16:9': { width: 1024, height: 576, description: '16:9 Wide' }
    };

    const selectedAspectRatio = aspectRatioMap[aspectRatio] || aspectRatioMap['3:4'];

    // Build enhanced prompt based on content type
    let enhancedPrompt = '';

    if (contentType === 'model') {
      // Build age and ethnicity specific instructions
      const ethnicityDescriptions = {
        'iranian': 'Iranian/Persian facial features and skin tone',
        'turkmen': 'Turkmen ethnic features with Central Asian appearance',
        'tajik': 'Tajik facial features with Persian-Central Asian characteristics',
        'iraqi': 'Iraqi/Mesopotamian facial features and appearance',
        'arab': 'Arab ethnic features and appearance',
        'afghan': 'Afghan facial features and appearance',
        'kurdish': 'Kurdish ethnic features and appearance',
        'azari': 'Azari/Azerbaijani ethnic features',
        'balochi': 'Balochi ethnic features and appearance',
        'african': 'African ethnic features with dark skin tone and African facial characteristics',
        'middle-east': 'Middle Eastern facial features and appearance',
        'korean': 'Korean/East Asian facial features with Korean appearance',
        'mixed': 'Mixed ethnicity with diverse multicultural features',
        'caucasian': 'Caucasian/European facial features and skin tone',
        'russian': 'Russian/Slavic facial features and appearance'
      };

      const ageDescription = modelAge ? `EXACTLY ${modelAge} years old` : 'age-appropriate';
      const ethnicityDescription = modelEthnicity && ethnicityDescriptions[modelEthnicity]
        ? ethnicityDescriptions[modelEthnicity]
        : 'natural ethnic appearance';

      // Determine age-specific instructions
      let ageSpecificInstructions = '';
      const age = modelAge || 25;

      if (age < 12) {
        ageSpecificInstructions = `\n\nCRITICAL AGE & ETHNICITY REQUIREMENTS:
- This person is ${ageDescription} - a CHILD
- ${ethnicityDescription}
- Face MUST have childlike features: round face, soft features, innocent expression, child-like eyes and nose
- Body proportions should match child physique for age ${age} (shorter stature, child body proportions)
- Overall appearance must clearly be a young child, NOT a teenager or adult
- Facial features should look EXACTLY age ${age} years old
- Child's height and body size appropriate for age ${age}`;
      } else if (age < 18) {
        ageSpecificInstructions = `\n\nCRITICAL AGE & ETHNICITY REQUIREMENTS:
- This person is ${ageDescription} - a TEENAGER
- ${ethnicityDescription}
- Face MUST have youthful teenage features: rounder face, softer features, younger-looking skin
- Body proportions should match teenage physique for age ${age} (not adult proportions)
- Overall appearance must clearly be a teenager, NOT an adult
- Facial features should look EXACTLY age ${age} years old
- Teen's height and body size appropriate for age ${age}`;
      } else {
        ageSpecificInstructions = `\n\nAGE & ETHNICITY REQUIREMENTS:
- This person is ${ageDescription}
- ${ethnicityDescription}
- Face and body should match age ${age} appropriately
- Natural appearance for a ${age}-year-old person`;
      }

      enhancedPrompt = `Generate a high-quality, professional fashion model photograph based on this description: ${prompt}
${ageSpecificInstructions}

CRITICAL REQUIREMENTS:
- Create a photorealistic portrait of a fashion model
- Professional studio or fashion photography quality
- Natural lighting with proper skin tones
- Sharp focus on the subject
- Model should be well-posed and professionally styled
- Magazine-quality composition
- No text, watermarks, or artificial elements
- Aspect Ratio: ${selectedAspectRatio.description}
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels

QUALITY PARAMETERS:
- Professional color grading
- Proper depth of field
- Natural skin texture and rendering
- Proper lighting setup with dimensional depth
- Clean, uncluttered composition
- Suitable for fashion e-commerce and editorial use

The final image should look like a professional fashion photography shoot.`;
    } else {
      enhancedPrompt = `Generate a high-quality background scene based on this description: ${prompt}

CRITICAL REQUIREMENTS:
- Create a photorealistic environment/background
- Professional photography quality
- Proper lighting and atmosphere
- Sharp details and clarity
- Suitable for fashion photography backdrop
- Magazine-quality composition
- No people in the image
- No text, watermarks, or artificial elements
- Aspect Ratio: ${selectedAspectRatio.description}
- Resolution: ${selectedAspectRatio.width}x${selectedAspectRatio.height} pixels

QUALITY PARAMETERS:
- Professional color grading
- Proper depth of field
- Natural environmental lighting
- Atmospheric perspective
- Clean, well-composed scene
- Suitable for fashion e-commerce and editorial backgrounds

The final image should look like a professional photography backdrop.`;
    }

    console.log('📝 Enhanced Prompt:', enhancedPrompt);

    // Use Gemini 2.5 Flash Image for generation
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["Image"] // Enable image generation
      }
    });

    // Generate content with text-only prompt
    const result = await model.generateContent([{ text: enhancedPrompt }]);

    const response = await result.response;

    console.log('📦 Response structure:', JSON.stringify({
      candidates: response.candidates?.length,
      hasParts: !!response.candidates?.[0]?.content?.parts
    }));

    // Extract generated image from response
    let generatedImageBase64 = null;
    let generatedText = '';

    if (!response.candidates || !response.candidates[0] || !response.candidates[0].content || !response.candidates[0].content.parts) {
      console.error('❌ Invalid response structure:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response from Gemini API');
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        // This is the generated image
        generatedImageBase64 = part.inlineData.data;
        console.log('✅ Image generated successfully!');
      } else if (part.text) {
        generatedText += part.text;
      }
    }

    if (!generatedImageBase64) {
      console.error('❌ No image in response. Parts:', JSON.stringify(response.candidates[0].content.parts, null, 2));
      throw new Error('No image was generated by Gemini. Response only contains text.');
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(generatedImageBase64, 'base64');
    const fileName = `ai-generated-${contentType}-${Date.now()}.png`;

    // Upload generated image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('admin-content')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading generated image:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('admin-content')
      .getPublicUrl(fileName);

    const generatedImageUrl = urlData.publicUrl;

    console.log('✅ AI image generated and uploaded successfully!');

    res.json({
      success: true,
      imageUrl: generatedImageUrl,
      prompt: prompt,
      contentType: contentType,
      aspectRatio: aspectRatio,
      source: 'gemini-2.5-flash',
      description: generatedText,
      message: 'Image successfully generated with AI!'
    });

  } catch (error) {
    console.error('❌ Error generating AI image:', error);
    res.status(500).json({
      error: 'Failed to generate AI image',
      details: error.message
    });
  }
});

// تولید کپشن اینستاگرام برای تصویر
app.post('/api/generate-caption', async (req, res) => {
  try {
    const { imageUrl, imageId, productInfo } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'URL تصویر الزامی است' });
    }

    console.log('📝 Generating Instagram caption for image:', imageUrl);
    if (productInfo) {
      console.log('📦 Product info:', productInfo);
    }

    // دانلود تصویر و تبدیل به base64
    const imageBase64 = await imageUrlToBase64(imageUrl);

    // استفاده از Gemini برای تولید کپشن
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // ساخت پرامپت با اطلاعات محصول
    let productDetails = '';
    if (productInfo) {
      productDetails = `

🛍️ اطلاعات محصول برای کپشن:
- نام محصول: ${productInfo.name}
- رنگ‌های موجود: ${productInfo.colors.join('، ')}
- سایزهای موجود: ${productInfo.sizes.join('، ')}
- قیمت اصلی: ${parseInt(productInfo.price).toLocaleString('fa-IR')} تومان
${productInfo.discount ? `- تخفیف: ${productInfo.discount}% (قیمت نهایی: ${parseInt(productInfo.finalPrice).toLocaleString('fa-IR')} تومان)` : ''}
${productInfo.category ? `- دسته‌بندی: ${productInfo.category}` : ''}
${productInfo.description ? `- توضیحات: ${productInfo.description}` : ''}

این اطلاعات رو حتماً در کپشن به صورت جذاب و فروش‌محور بگنجون. قیمت و تخفیف رو برجسته کن!`;
    }

    const prompt = `شما یک متخصص بازاریابی اینستاگرامی هستید که کپشن‌های فوق‌العاده جذاب و فروش‌محور می‌نویسید.

این تصویر مد را تحلیل کن و یک کپشن اینستاگرام فارسی فوق‌العاده جذاب و غیرقابل مقاومت بنویس که مشتری را فوراً به خرید ترغیب کند.
${productDetails}

الزامات مهم:

1. زبان: 100% فارسی - طبیعی، صمیمی، ترند
2. شروع قوی: با سوال یا جمله‌ای شروع کن که FOMO ایجاد کنه و توجه رو جلب کنه
3. احساسی: خواننده باید خودش رو با این لباس تصور کنه
4. داستان: تصویر زنده‌ای از اینکه با این لباس چقدر بهتر به نظر میاد و احساس میکنه
5. فوریت: موجودی محدود، ترند روز، همه می‌خوانش
6. منافع: تمرکز روی اعتماد به نفس، تعریف‌هایی که می‌شنوه، تحول ظاهری
7. اطلاعات محصول: ${productInfo ? 'قیمت، تخفیف، رنگ‌ها و سایزها رو به صورت جذاب و فوری ذکر کن' : 'اگر اطلاعاتی در تصویر دیدی استفاده کن'}
8. دعوت به اقدام: قوی و فوری (محدود، تخفیف ویژه، همین الان سفارش بده، دایرکت کن)
9. ایموجی: 5-8 تا ایموجی مرتبط به صورت استراتژیک
10. طول: ${productInfo ? '120-150 کلمه' : '80-120 کلمه'} - کوتاه اما قدرتمند
11. هشتگ: 10-15 هشتگ فارسی و انگلیسی پرطرفدار

${productInfo && productInfo.discount ? '⚡ تخفیف رو خیلی برجسته کن! این فرصت محدوده!' : ''}

لحن: هیجان‌انگیز، پرانرژی، ترغیب‌کننده، ایجاد FOMO، مستقیم با مشتری صحبت کن

اجتناب کن از: توضیحات کلیشه‌ای، لیست خسته‌کننده، زبان رسمی

هدف: کپشنی بنویس که خواننده نتونه مقاومت کنه و حتماً دکمه سفارش رو بزنه!

مثل یک کپی‌رایتر حرفه‌ای فکر کن - هر کلمه باید به فروش کمک کنه. میل و فوریت ایجاد کن!

فقط کپشن فارسی رو بنویس، بدون هیچ توضیح یا متن انگلیسی اضافه. فقط و فقط کپشن!`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const response = await result.response;
    const caption = response.text();

    console.log('✅ Instagram caption generated successfully');

    // ذخیره کپشن در دیتابیس (اگر supabase فعال باشد و imageId وجود داشته باشد)
    if (supabase && imageId) {
      try {
        const { error: updateError } = await supabase
          .from('generated_images')
          .update({ instagram_caption: caption })
          .eq('id', imageId);

        if (updateError) {
          console.error('خطا در ذخیره کپشن در دیتابیس:', updateError);
        } else {
          console.log('✅ کپشن در دیتابیس ذخیره شد');
        }
      } catch (dbError) {
        console.error('خطا در ذخیره کپشن:', dbError);
      }
    }

    res.json({
      success: true,
      caption: caption,
      imageId: imageId
    });

  } catch (error) {
    console.error('❌ خطا در تولید کپشن:', error);
    res.status(500).json({
      error: 'خطا در تولید کپشن',
      details: error.message
    });
  }
});

// ================== SERVICE PERMISSIONS API ENDPOINTS ==================

// Get all service permissions for all tiers
app.get('/api/admin/service-permissions', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { data: permissions, error } = await supabaseAdmin
      .from('tier_service_permissions')
      .select('*')
      .order('tier', { ascending: true })
      .order('service_key', { ascending: true });

    if (error) throw error;

    // Group permissions by tier
    const permissionsByTier = {
      testlimit: [],
      bronze: [],
      silver: [],
      gold: []
    };

    permissions.forEach(permission => {
      if (permissionsByTier[permission.tier]) {
        permissionsByTier[permission.tier].push(permission);
      }
    });

    console.log('✅ Fetched service permissions');
    res.json({ success: true, permissions: permissionsByTier });
  } catch (error) {
    console.error('Error fetching service permissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update service permission for a specific tier and service
app.put('/api/admin/service-permissions/:tier/:serviceKey', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { tier, serviceKey } = req.params;
    const { has_access } = req.body;

    if (has_access === undefined) {
      return res.status(400).json({ success: false, error: 'has_access is required' });
    }

    // Use UPSERT to insert if not exists, update if exists
    const { data: permission, error } = await supabaseAdmin
      .from('tier_service_permissions')
      .upsert({
        tier,
        service_key: serviceKey,
        has_access,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tier,service_key'
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Updated permission: ${tier} - ${serviceKey} = ${has_access}`);
    res.json({ success: true, permission });
  } catch (error) {
    console.error('Error updating service permission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize missing tier-service permission combinations
app.post('/api/admin/init-permissions', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const tiers = ['testlimit', 'bronze', 'silver', 'gold'];
    const services = [
      'complete-outfit',
      'accessories-only',
      'color-collection',
      'flat-lay',
      'scene-recreation',
      'style-transfer'
    ];

    const permissionsToInsert = [];

    // Create all combinations
    for (const tier of tiers) {
      for (const service of services) {
        // Default: testlimit gets complete-outfit only, others get nothing
        const hasAccess = (tier === 'testlimit' && service === 'complete-outfit');

        permissionsToInsert.push({
          tier,
          service_key: service,
          has_access: hasAccess
        });
      }
    }

    // Use upsert to insert missing rows without affecting existing ones
    const { data, error } = await supabaseAdmin
      .from('tier_service_permissions')
      .upsert(permissionsToInsert, {
        onConflict: 'tier,service_key',
        ignoreDuplicates: true
      });

    if (error) throw error;

    console.log(`✅ Initialized ${permissionsToInsert.length} permission combinations`);
    res.json({
      success: true,
      message: 'Permissions initialized successfully',
      count: permissionsToInsert.length
    });
  } catch (error) {
    console.error('Error initializing permissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check user's access to a specific service (used by frontend)
app.get('/api/check-service-access/:serviceKey', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    const { serviceKey } = req.params;
    const authHeader = req.headers.authorization;

    console.log('🔍 Checking service access:', { serviceKey, hasAuth: !!authHeader });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);

    // Verify user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    console.log('✅ User authenticated:', { userId: user.id, email: user.email });

    // Get user's tier from user_limits - use supabaseAdmin to bypass RLS
    const { data: userLimits, error: limitsError } = await supabaseAdmin
      .from('user_limits')
      .select('tier, email')
      .eq('user_id', user.id)
      .single();

    console.log('📊 User limits query result:', { userLimits, limitsError });

    if (limitsError) {
      console.error('❌ Error fetching user limits:', limitsError);
      return res.status(500).json({ success: false, error: 'Error fetching user tier' });
    }

    const userTier = userLimits?.tier || 'testlimit';
    console.log('🎯 User tier:', userTier);

    // Check if user has access to this service - use supabaseAdmin to bypass RLS
    const { data: permission, error: permError } = await supabaseAdmin
      .from('tier_service_permissions')
      .select('has_access')
      .eq('tier', userTier)
      .eq('service_key', serviceKey)
      .maybeSingle();

    console.log('🔐 Permission query result:', { permission, permError, tier: userTier, service: serviceKey });

    // If permission record doesn't exist, default to false (no access)
    if (permError) {
      console.error('❌ Error checking permission:', permError);
      // Don't return error, just default to no access
    }

    const hasAccess = permission?.has_access || false;
    console.log('✅ Final access decision:', { hasAccess, permissionExists: !!permission });

    // Get tiers that have access to this service (for upgrade suggestions) - use supabaseAdmin
    const { data: availableTiers, error: tiersError } = await supabaseAdmin
      .from('tier_service_permissions')
      .select('tier')
      .eq('service_key', serviceKey)
      .eq('has_access', true);

    if (tiersError) {
      console.error('Error fetching available tiers:', tiersError);
    }

    const requiredTiers = availableTiers ? availableTiers.map(t => t.tier) : [];

    res.json({
      success: true,
      hasAccess,
      userTier,
      serviceKey,
      requiredTiers
    });
  } catch (error) {
    console.error('Error checking service access:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== PRICING API ENDPOINTS ==================

// Get all pricing (public endpoint)
app.get('/api/pricing', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    const { data: pricing, error } = await supabase
      .from('tier_pricing')
      .select('*')
      .eq('is_active', true)
      .order('tier', { ascending: true });

    if (error) throw error;

    console.log('✅ Fetched pricing data');
    res.json({ success: true, pricing });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get pricing for specific tier (public endpoint)
app.get('/api/pricing/:tier', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    const { tier } = req.params;

    const { data: pricing, error } = await supabase
      .from('tier_pricing')
      .select('*')
      .eq('tier', tier)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    res.json({ success: true, pricing });
  } catch (error) {
    console.error('Error fetching tier pricing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all pricing (admin endpoint)
app.get('/api/admin/pricing', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { data: pricing, error } = await supabaseAdmin
      .from('tier_pricing')
      .select('*')
      .order('tier', { ascending: true });

    if (error) throw error;

    console.log('✅ Admin fetched pricing data');
    res.json({ success: true, pricing });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update pricing for specific tier (admin endpoint)
app.put('/api/admin/pricing/:tier', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { tier } = req.params;
    const { price, credits, discount_percentage, discount_active } = req.body;

    if (price === undefined) {
      return res.status(400).json({ success: false, error: 'price is required' });
    }

    // Build update object - only include fields that are provided
    const updateData = {
      price: parseInt(price),
      updated_at: new Date().toISOString()
    };

    // Only update credits if explicitly provided (for tier settings page)
    if (credits !== undefined) {
      updateData.credits = parseInt(credits);
    }

    // Update discount fields if provided
    if (discount_percentage !== undefined) {
      updateData.discount_percentage = parseInt(discount_percentage);
    }
    if (discount_active !== undefined) {
      updateData.discount_active = discount_active;
    }

    const { data: pricing, error } = await supabaseAdmin
      .from('tier_pricing')
      .update(updateData)
      .eq('tier', tier)
      .select()
      .single();

    if (error) throw error;

    const logMsg = credits !== undefined
      ? `✅ Updated pricing: ${tier} - ${price} IRR, ${credits} credits, ${discount_percentage || 0}% discount (${discount_active ? 'active' : 'inactive'})`
      : `✅ Updated price: ${tier} - ${price} IRR, ${discount_percentage || 0}% discount (${discount_active ? 'active' : 'inactive'})`;
    console.log(logMsg);
    res.json({ success: true, pricing });
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch update all pricing (admin endpoint)
app.post('/api/admin/pricing/batch', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { pricing } = req.body;

    if (!pricing || !Array.isArray(pricing)) {
      return res.status(400).json({ success: false, error: 'pricing array is required' });
    }

    // Update each tier
    const updates = await Promise.all(
      pricing.map(async (item) => {
        // Build update object - only include fields that are provided
        const updateData = {
          price: parseInt(item.price),
          updated_at: new Date().toISOString()
        };

        // Only update credits if explicitly provided
        if (item.credits !== undefined) {
          updateData.credits = parseInt(item.credits);
        }

        // Update discount fields if provided
        if (item.discount_percentage !== undefined) {
          updateData.discount_percentage = parseInt(item.discount_percentage);
        }
        if (item.discount_active !== undefined) {
          updateData.discount_active = item.discount_active;
        }

        const { data, error } = await supabaseAdmin
          .from('tier_pricing')
          .update(updateData)
          .eq('tier', item.tier)
          .select()
          .single();

        if (error) throw error;
        return data;
      })
    );

    console.log(`✅ Batch updated ${updates.length} pricing entries (with discount info)`);
    res.json({ success: true, pricing: updates });
  } catch (error) {
    console.error('Error batch updating pricing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== DISCOUNT CODES ENDPOINTS ==================

// Get all discount codes (admin only)
app.get('/api/admin/discount-codes', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { data, error } = await supabaseAdmin
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`✅ Retrieved ${data.length} discount codes`);
    res.json({ success: true, codes: data });
  } catch (error) {
    console.error('Error fetching discount codes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new discount code (admin only)
app.post('/api/admin/discount-codes', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { code, discount_percentage, expires_at, max_uses, description } = req.body;

    // Validation
    if (!code || !discount_percentage || !expires_at) {
      return res.status(400).json({
        success: false,
        error: 'Code, discount_percentage, and expires_at are required'
      });
    }

    if (discount_percentage < 1 || discount_percentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'Discount percentage must be between 1 and 100'
      });
    }

    // Check if code already exists
    const { data: existingCode } = await supabaseAdmin
      .from('discount_codes')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();

    if (existingCode) {
      return res.status(400).json({
        success: false,
        error: 'A discount code with this name already exists'
      });
    }

    // Create the discount code
    const { data, error } = await supabaseAdmin
      .from('discount_codes')
      .insert([{
        code: code.toUpperCase(),
        discount_percentage: parseInt(discount_percentage),
        expires_at,
        max_uses: max_uses ? parseInt(max_uses) : null,
        description: description || null,
        is_active: true,
        current_uses: 0
      }])
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Created discount code: ${code.toUpperCase()} (${discount_percentage}% off)`);
    res.json({ success: true, code: data });
  } catch (error) {
    console.error('Error creating discount code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update discount code (admin only - toggle active/inactive)
app.put('/api/admin/discount-codes/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ success: false, error: 'is_active field is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('discount_codes')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Updated discount code ${data.code} - active: ${is_active}`);
    res.json({ success: true, code: data });
  } catch (error) {
    console.error('Error updating discount code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete discount code (admin only)
app.delete('/api/admin/discount-codes/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { id } = req.params;

    // Delete the code (cascade will delete usage records)
    const { error } = await supabaseAdmin
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`✅ Deleted discount code ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate and apply discount code (public endpoint - no auth required)
app.post('/api/validate-discount-code', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { code, tier, originalPrice } = req.body;

    if (!code || !tier || !originalPrice) {
      return res.status(400).json({
        success: false,
        error: 'Code, tier, and originalPrice are required'
      });
    }

    // Fetch the discount code
    const { data: discountCode, error: codeError } = await supabaseAdmin
      .from('discount_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (codeError || !discountCode) {
      return res.status(404).json({
        success: false,
        error: 'Invalid discount code'
      });
    }

    // Check if code is active
    if (!discountCode.is_active) {
      return res.status(400).json({
        success: false,
        error: 'This discount code is no longer active'
      });
    }

    // Check if code is expired
    if (new Date(discountCode.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'This discount code has expired'
      });
    }

    // Check if max uses reached
    if (discountCode.max_uses && discountCode.current_uses >= discountCode.max_uses) {
      return res.status(400).json({
        success: false,
        error: 'This discount code has reached its maximum usage limit'
      });
    }

    // Calculate discounted price
    const discountAmount = Math.round(originalPrice * (discountCode.discount_percentage / 100));
    const finalPrice = originalPrice - discountAmount;

    console.log(`✅ Discount code ${code.toUpperCase()} validated - ${discountCode.discount_percentage}% off`);

    res.json({
      success: true,
      discount: {
        code: discountCode.code,
        percentage: discountCode.discount_percentage,
        amount: discountAmount,
        finalPrice: finalPrice,
        discountCodeId: discountCode.id
      }
    });
  } catch (error) {
    console.error('Error validating discount code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record discount code usage (called after successful payment)
app.post('/api/record-discount-usage', authenticateUser, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
    }

    const { discountCodeId, orderAmount, tier } = req.body;
    const userId = req.user.id;

    if (!discountCodeId || !orderAmount || !tier) {
      return res.status(400).json({
        success: false,
        error: 'discountCodeId, orderAmount, and tier are required'
      });
    }

    // Record the usage
    const { error: usageError } = await supabaseAdmin
      .from('discount_code_usage')
      .insert([{
        discount_code_id: discountCodeId,
        user_id: userId,
        order_amount: parseFloat(orderAmount),
        tier
      }]);

    if (usageError) throw usageError;

    // Increment current_uses counter
    const { error: updateError } = await supabaseAdmin
      .rpc('increment_discount_usage', { discount_id: discountCodeId });

    if (updateError) {
      // If RPC doesn't exist, do it manually
      const { data: currentCode } = await supabaseAdmin
        .from('discount_codes')
        .select('current_uses')
        .eq('id', discountCodeId)
        .single();

      if (currentCode) {
        await supabaseAdmin
          .from('discount_codes')
          .update({ current_uses: currentCode.current_uses + 1 })
          .eq('id', discountCodeId);
      }
    }

    console.log(`✅ Recorded discount code usage for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording discount usage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== GENERATE FACE MODEL ENDPOINTS ==================

// Analyze face with Gemini Vision
app.post('/api/admin/analyze-face', authenticateAdmin, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: 'Image is required' });
    }

    // Remove data:image/xxx;base64, prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const analysisPrompt = `Analyze this face photo in EXTREME DETAIL and provide comprehensive information in JSON format only. No other text.

Examine EVERY facial feature carefully and return ONLY this JSON structure:

{
  "gender": "male/female",
  "age": 25,
  "ethnicity": "iranian/caucasian/asian/african/middle-eastern/mixed/arab/turkish/indian",

  "faceFeatures": {
    "faceShape": "oval/round/square/heart/oblong/diamond/triangular",
    "eyeColor": "brown/dark-brown/light-brown/hazel/blue/green/gray/amber",
    "eyeShape": "almond/round/hooded/monolid/upturned/downturned",
    "eyebrows": "natural/thick/thin/arched/straight/bushy",
    "noseType": "straight/roman/button/hooked/flat/upturned/aquiline",
    "lipFullness": "thin/medium/full/very-full",
    "cheekbones": "prominent/defined/soft/high/low",
    "jawline": "defined/soft/angular/rounded/square",
    "chin": "rounded/pointed/square/cleft/receding/prominent"
  },

  "hairDetails": {
    "color": "black/dark-brown/brown/light-brown/blonde/red/gray/white/dyed",
    "length": "bald/very-short/short/medium/long/very-long",
    "texture": "straight/wavy/curly/kinky/coily",
    "style": "natural-loose/ponytail/bun/braided/layered/bob/pixie/slicked-back",
    "facialHair": "none/stubble/goatee/full-beard/mustache/soul-patch"
  },

  "skinDetails": {
    "tone": "very-fair/fair/light/medium/olive/tan/brown/dark/very-dark",
    "texture": ["smooth/natural/flawless/glowing/matte/dewy/radiant/freckled/beauty-marks/dimpled/textured/porous/velvety/silky"],
    "complexion": "clear/some-blemishes/acne/scars/wrinkles/age-spots"
  },

  "bodyType": {
    "build": ["petite/slim/slender/lean/athletic/toned/fit/muscular/bodybuilder/average/curvy/hourglass/pear-shaped/apple-shaped/rectangular/voluptuous/plus-size/full-figured/stocky/broad-shouldered"],
    "height": "short/medium/tall/very-tall"
  },

  "expression": {
    "mood": "neutral/confident/happy/smiling/serious/relaxed/intense/friendly/mysterious",
    "pose": ["standing-front/standing-profile/walking/sitting/leaning/hands-on-hips/arms-crossed/dynamic/one-leg-bent/looking-back"],
    "headAngle": "straight/tilted-left/tilted-right/looking-up/looking-down"
  },

  "photographyDetails": {
    "cameraAngle": "eye-level/low-angle/high-angle/dutch-angle",
    "shotType": "full-length/three-quarter/half-body/upper-body/headshot",
    "lighting": "studio/natural/soft/dramatic/backlighting/side-lighting/rim-lighting",
    "background": "white-studio/gray/neutral/simple/plain",
    "imageQuality": "professional-fashion/high-resolution/8k/commercial/editorial"
  }
}`;

    const result = await visionModel.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      }
    ]);

    const responseText = result.response.text();
    console.log('Gemini Vision Response:', responseText);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Gemini response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    console.log('✅ Face analyzed successfully');
    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Error analyzing face:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate face model with Gemini Image
app.post('/api/admin/generate-face-model', authenticateAdmin, async (req, res) => {
  try {
    const { analysisData, originalImage } = req.body;

    if (!analysisData) {
      return res.status(400).json({ success: false, error: 'Analysis data is required' });
    }

    if (!originalImage) {
      return res.status(400).json({ success: false, error: 'Original image is required for style transfer' });
    }

    // Build ultra-detailed prompt from comprehensive analysis
    const face = analysisData.faceFeatures || {};
    const hair = analysisData.hairDetails || {};
    const skin = analysisData.skinDetails || {};
    const body = analysisData.bodyType || {};
    const expr = analysisData.expression || {};
    const photo = analysisData.photographyDetails || {};

    const prompt = `🎯 FACE-ONLY PORTRAIT GENERATION: Create a professional HEADSHOT/PORTRAIT showing ONLY THE FACE (head and shoulders) of a NEW fashion model inspired by the reference image's style.

⚠️ CRITICAL FRAMING REQUIREMENT:
- Generate ONLY A CLOSE-UP PORTRAIT/HEADSHOT
- Show ONLY: Face, head, neck, and upper shoulders
- DO NOT show: Full body, torso, arms, waist, legs, or below shoulders
- Framing: Portrait/headshot style (like a professional profile photo or passport photo but with fashion photography quality)
- Crop: Tight crop on face, showing from top of head to just below shoulders

COPY THESE TECHNICAL ELEMENTS FROM REFERENCE IMAGE:
- Same head angle and facial pose
- Same camera angle (but zoomed in to face only)
- Same lighting setup and direction on face
- Same background style
- Same photography quality and resolution
- Same color grading and mood
- Similar expression and vibe

IMPORTANT - CREATE A NEW FACE (NOT A COPY):
Generate a SIMILAR but DISTINCTLY DIFFERENT face. Use the analysis below as inspiration, but introduce subtle variations:
- Slightly different facial proportions
- Unique facial features that distinguish this person from the original
- Similar but not identical bone structure
- Different enough to be clearly a different person

SUBJECT DETAILS (use as inspiration, not exact copy):
${analysisData.gender} model, approximately ${analysisData.age} years old, ${analysisData.ethnicity} ethnicity

FACE STRUCTURE (similar style, different person):
- Face shape: ${face.faceShape} (with subtle variations)
- Eye color: ${face.eyeColor}, ${face.eyeShape} shaped eyes (slightly modified)
- Eyebrows: ${face.eyebrows} (similar style, different shape)
- Nose: ${face.noseType} nose (unique proportions)
- Lips: ${face.lipFullness} lips (slightly different fullness)
- Cheekbones: ${face.cheekbones} (similar but distinct)
- Jawline: ${face.jawline} (unique angle)
- Chin: ${face.chin} (different proportions)

HAIR:
- Color: ${hair.color}
- Length: ${hair.length}
- Texture: ${hair.texture}
- Style: ${hair.style}
${hair.facialHair !== 'none' ? `- Facial hair: ${hair.facialHair}` : ''}

SKIN:
- Tone: ${skin.tone}
- Texture: ${Array.isArray(skin.texture) ? skin.texture.join(', ') : skin.texture}
- Complexion: ${skin.complexion}

EXPRESSION & HEAD POSE:
- Mood: ${expr.mood}
- Head angle: ${expr.headAngle}
- Facial expression: ${Array.isArray(expr.pose) ? expr.pose.join(', ') : expr.pose}

PHOTOGRAPHY SETUP (PORTRAIT/HEADSHOT):
- Camera angle: ${photo.cameraAngle} (zoomed to face only)
- Shot type: CLOSE-UP PORTRAIT/HEADSHOT (face and shoulders only, NOT full body)
- Lighting: ${photo.lighting}
- Background: ${photo.background}
- Quality: ${photo.imageQuality}

TECHNICAL REQUIREMENTS:
Professional fashion portrait photography, 8K ultra high resolution, extremely detailed facial features,
sharp focus on face, crisp details, magazine quality headshot, commercial photography standard,
perfect skin texture, natural beauty, photorealistic rendering, studio-grade portrait lighting,
color-graded, professional retouching, fashion magazine portrait quality,
PORTRAIT FRAMING: Show only face, head, neck, and upper shoulders (NO full body, NO torso, NO below shoulders)

REMEMBER:
1. Generate ONLY A FACE PORTRAIT/HEADSHOT (not full body!)
2. Create a NEW model that looks INSPIRED BY but NOT IDENTICAL TO the reference
3. The face must be clearly a different person while maintaining professional photography style
4. Frame it as a tight portrait showing only the face and shoulders`;

    console.log('🎨 Generating face model with prompt:', prompt);

    // Remove base64 prefix from original image
    const base64Image = originalImage.replace(/^data:image\/\w+;base64,/, '');

    const imageModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["Image"]
      }
    });

    // Send BOTH the reference image AND the detailed prompt for style transfer
    const result = await imageModel.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      }
    ]);
    const base64Data = result.response.candidates[0].content.parts[0].inlineData.data;

    // Upload to Supabase storage
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `generated-face-${Date.now()}.jpg`;
    const filePath = `generated-models/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('admin-content')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('admin-content')
      .getPublicUrl(filePath);

    console.log('✅ Face model generated and uploaded:', publicUrl);
    res.json({
      success: true,
      imageUrl: publicUrl,
      prompt: prompt
    });
  } catch (error) {
    console.error('Error generating face model:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BLOG API ENDPOINTS
// ============================================

// Get all published blog posts (public)
app.get('/api/blog', async (req, res) => {
  try {
    const { search, category } = req.query;

    let query = supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false });

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Apply category filter
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load blog posts' });
  }
});

// Get single blog post by slug (public)
app.get('/api/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load blog post' });
  }
});

// Get all blog posts (admin - includes drafts)
app.get('/api/admin/blog', authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load blog posts' });
  }
});

// Get single blog post by ID (admin)
app.get('/api/admin/blog/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(404).json({ error: 'Blog post not found' });
  }
});

// Create new blog post (admin)
app.post('/api/admin/blog', authenticateAdmin, async (req, res) => {
  try {
    const {
      slug,
      title,
      excerpt,
      content,
      author,
      category,
      tags,
      featured_image,
      meta_title,
      meta_description,
      seo_keywords,
      article_schema,
      faq_schema,
      article_summary,
      key_points,
      faq_content,
      published
    } = req.body;

    // Validate required fields
    if (!slug || !title || !content) {
      return res.status(400).json({
        error: 'Missing required fields: slug, title, and content are required'
      });
    }

    // Check if slug already exists
    const { data: existing } = await supabaseAdmin
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Slug already exists. Please use a unique slug.' });
    }

    const blogPost = {
      slug,
      title,
      excerpt,
      content,
      author: author || 'VIP Promo Club Team',
      category,
      tags: tags || [],
      featured_image,
      meta_title,
      meta_description,
      seo_keywords,
      article_schema,
      faq_schema,
      article_summary,
      key_points,
      faq_content,
      published: published || false,
      published_at: published ? new Date().toISOString() : null
    };

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .insert([blogPost])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, post: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// Update blog post (admin)
app.put('/api/admin/blog/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      slug,
      title,
      excerpt,
      content,
      author,
      category,
      tags,
      featured_image,
      meta_title,
      meta_description,
      seo_keywords,
      article_schema,
      faq_schema,
      article_summary,
      key_points,
      faq_content,
      published
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        error: 'Missing required fields: title and content are required'
      });
    }

    // If slug is being changed, check for conflicts
    if (slug) {
      const { data: existing } = await supabaseAdmin
        .from('blog_posts')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Slug already exists. Please use a unique slug.' });
      }
    }

    const updates = {
      ...(slug && { slug }),
      title,
      excerpt,
      content,
      ...(author && { author }),
      category,
      tags: tags || [],
      featured_image,
      meta_title,
      meta_description,
      seo_keywords,
      article_schema,
      faq_schema,
      article_summary,
      key_points,
      faq_content,
      published: published || false,
      published_at: published ? new Date().toISOString() : null
    };

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, post: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// Delete blog post (admin)
app.delete('/api/admin/blog/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Blog post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

// Upload blog image (admin)
app.post('/api/admin/blog/upload-image', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Supabase admin not configured' });
    }

    const fileName = `blog-${Date.now()}-${sanitizeFilename(req.file.originalname)}`;

    // Upload to Supabase Storage in blog-images bucket using admin client
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('blog-images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('blog-images')
      .getPublicUrl(fileName);

    res.json({
      success: true,
      url: urlData.publicUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('Blog image upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      details: error.message
    });
  }
});

// Toggle publish status (admin)
app.post('/api/admin/blog/:id/publish', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { published } = req.body;

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .update({
        published,
        published_at: published ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, post: data });
  } catch (error) {
    console.error('Error toggling publish status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 🏷️ BRAND REFERENCE PHOTO SYSTEM API ENDPOINTS
// ============================================

// PUBLIC: Get all active brands (for users)
app.get('/api/brands', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC: Get all active photos for a specific brand
app.get('/api/brands/:id/photos', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { photo_type, gender } = req.query; // Optional filters

    let query = supabase
      .from('brand_reference_photos')
      .select('*')
      .eq('brand_id', id)
      .eq('is_active', true);

    // Filter by photo_type if provided
    if (photo_type && (photo_type === 'recreation' || photo_type === 'style-transfer')) {
      query = query.eq('photo_type', photo_type);
    }

    // Filter by gender_category if provided
    if (gender && ['woman', 'man', 'child'].includes(gender)) {
      query = query.eq('gender_category', gender);
    }

    const { data, error} = await query
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching brand photos:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Get all brands (including inactive)
app.get('/api/admin/brands', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabaseAdmin
      .from('brands')
      .select(`
        *,
        photo_count:brand_reference_photos(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching brands (admin):', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Get single brand by ID
app.get('/api/admin/brands/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Create new brand
app.post('/api/admin/brands', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { name, logo, description, is_active, service_types } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('brands')
      .insert([{
        name: name.trim(),
        logo: logo || null,
        description: description || null,
        is_active: is_active !== undefined ? is_active : true,
        service_types: service_types || []
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Brand with this name already exists' });
      }
      throw error;
    }

    res.status(201).json({ success: true, brand: data });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Update brand
app.put('/api/admin/brands/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { name, logo, description, is_active, service_types } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (logo !== undefined) updateData.logo = logo;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (service_types !== undefined) updateData.service_types = service_types;

    const { data, error } = await supabaseAdmin
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Brand with this name already exists' });
      }
      throw error;
    }

    res.json({ success: true, brand: data });
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Delete brand
app.delete('/api/admin/brands/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    // Delete brand (cascade will automatically delete associated photos)
    const { error } = await supabaseAdmin
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Get all photos for a brand (including inactive)
app.get('/api/admin/brands/:id/photos', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { photo_type } = req.query; // Optional filter: 'recreation' or 'style-transfer'

    let query = supabaseAdmin
      .from('brand_reference_photos')
      .select('*')
      .eq('brand_id', id);

    // Filter by photo_type if provided
    if (photo_type && (photo_type === 'recreation' || photo_type === 'style-transfer')) {
      query = query.eq('photo_type', photo_type);
    }

    const { data, error } = await query
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching brand photos (admin):', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Upload brand reference photo
app.post('/api/admin/brands/:id/photos', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id: brandId } = req.params;
    const { image_url, title, description, display_order, photo_type, gender_category, accessory_type } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Validate photo_type if provided
    if (photo_type && !['recreation', 'style-transfer', 'accessories', 'flat-lay'].includes(photo_type)) {
      return res.status(400).json({ error: 'Invalid photo_type. Must be "recreation", "style-transfer", "accessories", or "flat-lay"' });
    }

    // Validate gender_category if provided
    if (gender_category && !['woman', 'man', 'child'].includes(gender_category)) {
      return res.status(400).json({ error: 'Invalid gender_category. Must be "woman", "man", or "child"' });
    }

    // Validate accessory_type if provided
    if (accessory_type && !['ring', 'earrings', 'bracelet', 'necklace', 'anklet', 'watch'].includes(accessory_type)) {
      return res.status(400).json({ error: 'Invalid accessory_type. Must be "ring", "earrings", "bracelet", "necklace", "anklet", or "watch"' });
    }

    // Verify brand exists
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const photoData = {
      brand_id: brandId,
      image_url,
      title: title || null,
      description: description || null,
      display_order: display_order || 0,
      photo_type: photo_type || 'recreation', // Default to 'recreation'
      gender_category: gender_category || 'woman', // Default to 'woman'
      is_active: true,
      analysis_status: 'pending', // Will be analyzed by background worker
      analysis_retry_count: 0
    };

    // Add accessory_type only if provided
    if (accessory_type) {
      photoData.accessory_type = accessory_type;
    }

    const { data, error } = await supabaseAdmin
      .from('brand_reference_photos')
      .insert([photoData])
      .select()
      .single();

    if (error) throw error;

    console.log(`📸 Brand photo uploaded - queued for analysis (ID: ${data.id})`);

    res.status(201).json({ success: true, photo: data });
  } catch (error) {
    console.error('Error uploading brand photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Update brand reference photo
app.put('/api/admin/brands/:brandId/photos/:photoId', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { brandId, photoId } = req.params;
    const { title, description, display_order, is_active, photo_type } = req.body;

    // Validate photo_type if provided
    if (photo_type && photo_type !== 'recreation' && photo_type !== 'style-transfer') {
      return res.status(400).json({ error: 'Invalid photo_type. Must be "recreation" or "style-transfer"' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (photo_type !== undefined) updateData.photo_type = photo_type;

    const { data, error } = await supabaseAdmin
      .from('brand_reference_photos')
      .update(updateData)
      .eq('id', photoId)
      .eq('brand_id', brandId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, photo: data });
  } catch (error) {
    console.error('Error updating brand photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Delete brand reference photo
app.delete('/api/admin/brands/:brandId/photos/:photoId', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { brandId, photoId } = req.params;

    const { error } = await supabaseAdmin
      .from('brand_reference_photos')
      .delete()
      .eq('id', photoId)
      .eq('brand_id', brandId);

    if (error) throw error;

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BACKGROUND WORKER: Process Pending Brand Photo Analyses
// ============================================
app.post('/api/admin/process-brand-photo-analyses', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }

    if (!genAI) {
      return res.status(503).json({ error: 'Google AI not configured' });
    }

    // Fetch ONE pending photo (FIFO - oldest first)
    const { data: pendingPhotos, error: fetchError } = await supabaseAdmin
      .from('brand_reference_photos')
      .select('*')
      .eq('analysis_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) throw fetchError;

    if (!pendingPhotos || pendingPhotos.length === 0) {
      return res.json({
        success: true,
        message: 'No pending photos to analyze',
        processed: 0
      });
    }

    const photo = pendingPhotos[0];
    console.log(`🔄 Processing analysis for photo ID: ${photo.id}`);

    // Update status to 'analyzing'
    await supabaseAdmin
      .from('brand_reference_photos')
      .update({ analysis_status: 'analyzing' })
      .eq('id', photo.id);

    try {
      // Analyze the photo with AI
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      });

      // Fetch image from URL
      const imageResponse = await axios.get(photo.image_url, {
        responseType: 'arraybuffer'
      });
      const imageBase64 = Buffer.from(imageResponse.data).toString('base64');
      const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

      const analysisPrompt = `Analyze this reference photo in detail for fashion AI generation.

Describe:
1. **Scene & Composition**: Overall scene, setting, background elements, lighting mood
2. **Number of People**: How many people are in the photo? (1, 2, 3+)
3. **Poses & Positioning**: How are people positioned? Body angles, poses, interactions
4. **Camera Angle**: Eye-level, high angle, low angle, three-quarter view, profile, etc.
5. **Lighting**: Natural/artificial, direction, softness, shadows, highlights
6. **Mood & Atmosphere**: Professional, casual, elegant, energetic, calm, etc.
7. **Key Visual Elements**: Props, accessories, notable features to recreate

Provide a detailed analysis that will help AI recreate this scene accurately.`;

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64
          }
        },
        { text: analysisPrompt }
      ]);

      const analysis = result.response.text();

      // Save analysis to database
      const { error: updateError } = await supabaseAdmin
        .from('brand_reference_photos')
        .update({
          ai_analysis: analysis,
          analysis_status: 'analyzed',
          analyzed_at: new Date().toISOString(),
          analysis_retry_count: 0
        })
        .eq('id', photo.id);

      if (updateError) throw updateError;

      console.log(`✅ Successfully analyzed photo ID: ${photo.id}`);

      return res.json({
        success: true,
        message: 'Photo analyzed successfully',
        processed: 1,
        photoId: photo.id
      });

    } catch (analysisError) {
      console.error(`❌ Analysis failed for photo ID ${photo.id}:`, analysisError);

      // Increment retry count
      const newRetryCount = (photo.analysis_retry_count || 0) + 1;
      const maxRetries = 3;

      if (newRetryCount >= maxRetries) {
        // Mark as failed after 3 retries
        await supabaseAdmin
          .from('brand_reference_photos')
          .update({
            analysis_status: 'failed',
            analysis_retry_count: newRetryCount
          })
          .eq('id', photo.id);

        console.log(`❌ Photo ID ${photo.id} marked as FAILED after ${maxRetries} retries`);
      } else {
        // Reset to pending for retry
        await supabaseAdmin
          .from('brand_reference_photos')
          .update({
            analysis_status: 'pending',
            analysis_retry_count: newRetryCount
          })
          .eq('id', photo.id);

        console.log(`⚠️  Photo ID ${photo.id} retry ${newRetryCount}/${maxRetries}`);
      }

      return res.status(500).json({
        success: false,
        error: 'Analysis failed',
        photoId: photo.id,
        retryCount: newRetryCount,
        willRetry: newRetryCount < maxRetries
      });
    }

  } catch (error) {
    console.error('❌ Error in background worker:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: Upload image (base64) for brand reference photos
app.post('/api/upload-image', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }

    const { image, filename } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Extract base64 data and mime type
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image format' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = filename ? sanitizeFilename(filename) : 'brand-photo.jpg';
    const fileName = `brand-photos/${timestamp}-${sanitizedName}`;

    // Upload to Supabase Storage in brand-photos bucket (or create one)
    const { data, error } = await supabaseAdmin.storage
      .from('admin-content') // Using existing bucket
      .upload(fileName, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('admin-content')
      .getPublicUrl(fileName);

    res.json({
      success: true,
      url: urlData.publicUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 🖼️ BEFORE/AFTER GALLERY API ENDPOINTS
// ============================================

// Public: Get all gallery items
app.get('/api/gallery', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('before_after_gallery')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, items: data || [] });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Get all gallery items (with more details)
app.get('/api/admin/gallery', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase admin not configured' });
    }

    const { data, error } = await supabaseAdmin
      .from('before_after_gallery')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching gallery (admin):', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get single gallery item
app.get('/api/admin/gallery/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase admin not configured' });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('before_after_gallery')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching gallery item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Upload image to Supabase Storage
app.post('/api/admin/gallery/upload', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase admin not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const timestamp = Date.now();
    const sanitizedName = sanitizeFilename(file.originalname);
    const fileName = `${timestamp}-${sanitizedName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('before-after-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('before-after-images')
      .getPublicUrl(fileName);

    res.json({
      success: true,
      url: urlData.publicUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Create new gallery item
app.post('/api/admin/gallery', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase admin not configured' });
    }

    const {
      title,
      description,
      before_image_url,
      after_image_url,
      service_type,
      category,
      is_featured,
      display_order
    } = req.body;

    // Validation
    if (!title || !before_image_url || !after_image_url) {
      return res.status(400).json({ error: 'Title, before image, and after image are required' });
    }

    const galleryData = {
      title,
      description: description || null,
      before_image_url,
      after_image_url,
      service_type: service_type || null,
      category: category || null,
      is_featured: is_featured || false,
      display_order: display_order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('before_after_gallery')
      .insert(galleryData)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, item: data });
  } catch (error) {
    console.error('Error creating gallery item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update gallery item
app.put('/api/admin/gallery/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase admin not configured' });
    }

    const { id } = req.params;
    const {
      title,
      description,
      before_image_url,
      after_image_url,
      service_type,
      category,
      is_featured,
      display_order
    } = req.body;

    const updateData = {
      title,
      description,
      before_image_url,
      after_image_url,
      service_type,
      category,
      is_featured,
      display_order,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('before_after_gallery')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, item: data });
  } catch (error) {
    console.error('Error updating gallery item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete gallery item
app.delete('/api/admin/gallery/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase admin not configured' });
    }

    const { id } = req.params;

    // Get item to delete images from storage
    const { data: item } = await supabaseAdmin
      .from('before_after_gallery')
      .select('before_image_url, after_image_url')
      .eq('id', id)
      .single();

    // Delete from database
    const { error } = await supabaseAdmin
      .from('before_after_gallery')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Optionally delete images from storage (extract filename from URL)
    if (item) {
      try {
        const extractFileName = (url) => {
          const parts = url.split('/');
          return parts[parts.length - 1];
        };

        if (item.before_image_url) {
          const beforeFileName = extractFileName(item.before_image_url);
          await supabaseAdmin.storage.from('before-after-images').remove([beforeFileName]);
        }

        if (item.after_image_url) {
          const afterFileName = extractFileName(item.after_image_url);
          await supabaseAdmin.storage.from('before-after-images').remove([afterFileName]);
        }
      } catch (storageError) {
        console.warn('Could not delete storage files:', storageError);
        // Don't fail the request if storage deletion fails
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run database migration (admin only)
app.post('/api/run-migration', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin client not configured' });
    }

    const migrationSQL = `
      -- Add photo_type column to brand_reference_photos table
      DO $$
      BEGIN
        -- Add column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='brand_reference_photos' AND column_name='photo_type') THEN
          ALTER TABLE brand_reference_photos ADD COLUMN photo_type VARCHAR(50) DEFAULT 'recreation';
        END IF;

        -- Add check constraint if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_name='brand_reference_photos_photo_type_check') THEN
          ALTER TABLE brand_reference_photos
          ADD CONSTRAINT brand_reference_photos_photo_type_check
          CHECK (photo_type IN ('recreation', 'style-transfer'));
        END IF;
      END $$;

      -- Create index if it doesn't exist
      CREATE INDEX IF NOT EXISTS idx_brand_reference_photos_photo_type ON brand_reference_photos(photo_type);

      -- Update existing photos to be 'recreation' type
      UPDATE brand_reference_photos SET photo_type = 'recreation' WHERE photo_type IS NULL;
    `;

    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: migrationSQL });

    if (error) {
      // If RPC doesn't exist, we need to run it manually
      console.error('Migration error:', error);
      return res.status(500).json({
        error: 'Migration failed. Please run the SQL manually in Supabase SQL Editor',
        sql: migrationSQL
      });
    }

    res.json({ success: true, message: 'Migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 سرور در حال اجرا است: http://0.0.0.0:${PORT}`);
  console.log(`📸 برنامه عکاسی مد با هوش مصنوعی آماده است!`);
  console.log(`🔐 Supabase: ${supabase ? 'Connected' : 'Not configured'}`);
  console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key' ? 'Connected' : 'Not configured'}`);

  // بارگذاری مدل‌های ذخیره شده یا تولید مدل‌های جدید
  const modelsLoaded = loadSavedModels();

  if (!modelsLoaded) {
    console.log(`⚠️  از ${models.length} مدل پیش‌فرض (Unsplash) استفاده می‌شود`);
    console.log('💡 برای استفاده از مدل‌های AI، به /api/generate-models درخواست POST ارسال کنید');
    if (!supabase) {
      console.log('⚠️  توجه: برای تولید مدل‌های AI، باید Supabase را در .env تنظیم کنید');
    }
  } else {
    console.log(`✅ ${models.length} مدل AI آماده استفاده است`);
  }

  // ============================================
  // AUTOMATIC BACKGROUND WORKER SCHEDULER
  // ============================================
  // Process brand photo analyses every 10 seconds
  if (supabaseAdmin && genAI) {
    console.log('🔄 Starting automatic brand photo analysis scheduler (every 10 seconds)');

    setInterval(async () => {
      try {
        const response = await axios.post(`http://localhost:${PORT}/api/admin/process-brand-photo-analyses`);

        if (response.data.processed > 0) {
          console.log(`✅ Background worker processed ${response.data.processed} photo(s)`);
        }
      } catch (error) {
        // Silent failure - don't spam logs for "no pending photos"
        if (error.response?.status !== 500) {
          // Only log actual errors, not "no pending" responses
          console.error('⚠️  Background worker error:', error.message);
        }
      }
    }, 10000); // Every 10 seconds
  } else {
    console.log('⚠️  Background photo analysis disabled (Supabase or Gemini AI not configured)');
  }
});
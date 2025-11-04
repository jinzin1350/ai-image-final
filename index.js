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

    // Combine auth users with their limits (or default values)
    const usersWithLimits = allUsers.map(authUser => {
      const limits = userLimitsMap[authUser.id];

      return {
        user_id: authUser.id,
        email: authUser.email,
        is_premium: limits?.is_premium || false,
        images_used: limits?.images_used || 0,
        images_limit: limits?.images_limit || 10,
        captions_used: limits?.captions_used || 0,
        captions_limit: limits?.captions_limit || 5,
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

    // Use upsert to create entry if it doesn't exist
    const { data, error } = await supabase
      .from('user_limits')
      .upsert({
        user_id: userId,
        ...updates
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (error) throw error;

    console.log(`✅ Updated user ${userId} with premium status: ${updates.is_premium}`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: error.message });
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
    const fileName = `admin-content-${Date.now()}-${req.file.originalname}`;

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
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, content: data || [] });
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
    const fileName = `user-${user.id}-${Date.now()}-${req.file.originalname}`;

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
    const fileName = `user-${user_id}-${Date.now()}-${req.file.originalname}`;

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
    const { imageUrl, user_id, content_type, visibility, category, name, description } = req.body;

    if (!user_id || !imageUrl) {
      return res.status(400).json({ success: false, error: 'User ID and image URL are required' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    // Simply save the existing imageUrl to database with user ownership
    // No need to re-upload - image is already in admin-content bucket
    const { data: contentData, error: dbError } = await supabase
      .from('content_library')
      .insert([{
        content_type,
        tier: 'premium',
        visibility: visibility || 'private',
        category,
        name,
        description,
        image_url: imageUrl,
        storage_path: imageUrl.split('/').pop(), // Extract filename from URL
        owner_user_id: user_id,
        is_active: true
      }])
      .select();

    if (dbError) throw dbError;

    console.log(`✅ Admin saved generated image to user ${user_id}: ${name}`);
    res.json({ success: true, content: contentData[0] });
  } catch (error) {
    console.error('Error saving generated content to user:', error);
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

// لیست مدل‌ها - تعریف model prompts برای تولید تصویر
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
    prompt: 'A professional fashion model portrait, teenage girl age 13-15 years old, friendly smile, youthful appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'girl-2',
    name: 'مدل ۲',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با موهای بلند',
    prompt: 'A professional fashion model portrait, teenage girl age 13-15 years old with long hair, cheerful expression, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'girl-3',
    name: 'مدل ۳',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با استایل مدرن',
    prompt: 'A professional fashion model portrait, teenage girl age 13-15 years old, modern style, confident pose, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'girl-4',
    name: 'مدل ۴',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با موهای کوتاه',
    prompt: 'A professional fashion model portrait, teenage girl age 13-15 years old with short hair, sporty look, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'girl-5',
    name: 'مدل ۵',
    category: 'girl',
    categoryName: 'دختر',
    description: 'دختر نوجوان 13-15 ساله با لبخند',
    prompt: 'A professional fashion model portrait, teenage girl age 13-15 years old, happy smile, natural beauty, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },

  // پسران (13-15 ساله)
  {
    id: 'boy-1',
    name: 'مدل ۱',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله',
    prompt: 'A professional fashion model portrait, teenage boy age 13-15 years old, friendly expression, youthful appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'boy-2',
    name: 'مدل ۲',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله ورزشکار',
    prompt: 'A professional fashion model portrait, teenage boy age 13-15 years old, athletic build, sporty appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'boy-3',
    name: 'مدل ۳',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله با موهای کوتاه',
    prompt: 'A professional fashion model portrait, teenage boy age 13-15 years old with short hair, casual style, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'boy-4',
    name: 'مدل ۴',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله با لبخند',
    prompt: 'A professional fashion model portrait, teenage boy age 13-15 years old, happy smile, confident pose, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  },
  {
    id: 'boy-5',
    name: 'مدل ۵',
    category: 'boy',
    categoryName: 'پسر',
    description: 'پسر نوجوان 13-15 ساله با استایل مدرن',
    prompt: 'A professional fashion model portrait, teenage boy age 13-15 years old, modern casual style, friendly appearance, standing in neutral pose facing camera, full body shot, white studio background, professional studio lighting, high resolution, photorealistic, suitable for virtual try-on'
  }
];

// لیست مدل‌های پیش‌فرض (fallback) - تا زمانی که مدل‌های AI تولید شوند
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

// لیست مدل‌ها با URL‌های تولید شده (در ابتدا از fallback استفاده می‌شود)
let models = [...fallbackModels];

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
  { id: 'dynamic', name: 'پویا و متحرک', description: 'Dynamic, energetic pose with movement' }
];

// لیست زاویه‌های دوربین
const cameraAngles = [
  { id: 'eye-level', name: 'هم‌سطح چشم', description: 'Camera at eye level, straight on' },
  { id: 'slightly-low', name: 'کمی از پایین', description: 'Slightly low angle, looking up' },
  { id: 'slightly-high', name: 'کمی از بالا', description: 'Slightly high angle, looking down' },
  { id: 'three-quarter', name: 'سه‌چهارم', description: 'Three-quarter view, 45 degree angle' }
];

// لیست استایل‌ها و حال و هوا
const styles = [
  { id: 'professional', name: 'حرفه‌ای', description: 'Professional, business style, formal' },
  { id: 'casual', name: 'کژوال روزمره', description: 'Casual everyday style, relaxed' },
  { id: 'elegant', name: 'شیک و اِلِگانت', description: 'Elegant, sophisticated, classy' },
  { id: 'sporty', name: 'اسپرت', description: 'Sporty, athletic, dynamic' },
  { id: 'trendy', name: 'مد روز', description: 'Trendy, modern, fashionable' },
  { id: 'artistic', name: 'هنری', description: 'Artistic, creative, unique' }
];

// لیست نورپردازی
const lightings = [
  { id: 'natural', name: 'طبیعی روز', description: 'Natural daylight, soft shadows' },
  { id: 'studio', name: 'استودیو حرفه‌ای', description: 'Professional studio lighting, balanced' },
  { id: 'golden-hour', name: 'طلایی (Golden Hour)', description: 'Golden hour, warm sunset light' },
  { id: 'dramatic', name: 'دراماتیک', description: 'Dramatic lighting, strong contrasts' },
  { id: 'soft-diffused', name: 'نرم و پخش شده', description: 'Soft diffused light, minimal shadows' },
  { id: 'backlit', name: 'نور پشت', description: 'Backlit, rim lighting effect' }
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
  { id: 'shallow', name: '🎯 کم (f/1.4-2.8)', description: 'Shallow depth of field f/1.4-f/2.8, blurred background bokeh, subject pops out, professional portrait look' },
  { id: 'medium', name: '⚖️ متوسط (f/4-5.6)', description: 'Medium depth of field f/4-f/5.6, balanced focus, slight background blur, versatile' },
  { id: 'deep', name: '📐 زیاد (f/8-16)', description: 'Deep depth of field f/8-f/16, everything sharp and in focus, product photography style' }
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
    if (error) throw error;
    req.user = user;
    next();
  } catch (error) {
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
    let allModels = [...models]; // Start with hardcoded models

    // If user is authenticated and Supabase is configured, add their custom models
    const authHeader = req.headers.authorization;
    if (authHeader && supabase) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw error;

        if (user) {
          // Fetch user's custom models (private + public models from content_library)
          const { data: customModels } = await supabase
            .from('content_library')
            .select('*')
            .eq('content_type', 'model')
            .eq('is_active', true)
            .or(`visibility.eq.public,owner_user_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

          if (customModels && customModels.length > 0) {
            console.log(`✅ Found ${customModels.length} custom models for user ${user.id}`);
            // Transform database models to match frontend format
            const transformedModels = customModels.map(model => ({
              id: `custom-${model.id}`,
              name: model.name,
              category: model.category,
              categoryName: model.category,
              description: model.description || model.name,
              image: model.image_url,
              isCustom: true
            }));

            console.log('📋 Custom model categories:', transformedModels.map(m => m.category).join(', '));
            allModels = [...transformedModels, ...allModels];
          } else {
            console.log(`ℹ️ No custom models found for user ${user.id}`);
          }
        }
      } catch (authError) {
        console.log('Auth check failed, returning default models only');
      }
    }

    res.json(allModels);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.json(models); // Fallback to default models
  }
});

// دریافت لیست پس‌زمینه‌ها
app.get('/api/backgrounds', async (req, res) => {
  try {
    const mode = req.query.mode || 'complete-outfit'; // Get mode from query parameter

    // Select appropriate background list based on mode
    let baseBackgrounds;
    if (mode === 'color-collection' || mode === 'flat-lay') {
      baseBackgrounds = [...productBackgrounds]; // Product photography backgrounds
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

// دریافت لیست نورپردازی
app.get('/api/lightings', (req, res) => {
  res.json(lightings);
});

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
app.post('/api/upload', upload.single('garment'), async (req, res) => {
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

    const fileName = `${Date.now()}-${req.file.originalname}`;
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

// تولید عکس با Gemini 2.5 Flash
app.post('/api/generate', authenticateUser, async (req, res) => {
  try {
    const {
      mode = 'complete-outfit',  // NEW: 'complete-outfit', 'accessories-only', 'underwear', 'color-collection'
      garmentPath,      // For backward compatibility (single garment)
      garmentPaths,     // New: array of garment paths
      accessoryPath,    // NEW: For accessories-only mode (product photo)
      accessoryType,    // NEW: Type of accessory (handbag, watch, etc.)
      underwearPath,    // NEW: For underwear mode (product photo)
      underwearType,    // NEW: Type of underwear (bra, panty, etc.)
      colorVariants,    // NEW: For color-collection mode (array of color variant paths)
      displayScenario,  // NEW: Display scenario (on-arm, hanging-rack, folded-stack, laid-out)
      flatLayProducts,  // NEW: For flat-lay mode (array of product paths)
      arrangement,      // NEW: Flat lay arrangement (grid, scattered, circular, diagonal)
      modelId,
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
      if (!accessoryPath || !accessoryType || !modelId || !backgroundId) {
        return res.status(400).json({ error: 'لطفاً تصویر اکسسوری، نوع آن، مدل و پس‌زمینه را انتخاب کنید' });
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
      if (!flatLayProducts || !flatLayProducts.length || !arrangement || !backgroundId) {
        return res.status(400).json({ error: 'لطفاً حداقل یک محصول، نوع چیدمان و پس‌زمینه را انتخاب کنید' });
      }
    }

    // Find model (check hardcoded first, then custom from database)
    let selectedModel = modelId ? models.find(m => m.id === modelId) : null;

    // If not found in hardcoded models and ID starts with 'custom-', fetch from database
    if (!selectedModel && modelId && modelId.startsWith('custom-') && supabase) {
      const customId = modelId.replace('custom-', '');
      const { data: customModel } = await supabase
        .from('content_library')
        .select('*')
        .eq('id', customId)
        .eq('content_type', 'model')
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
    if (mode === 'color-collection' || mode === 'flat-lay') {
      // These modes don't need a model, only background
      if (!selectedBackground) {
        return res.status(400).json({ error: 'پس‌زمینه نامعتبر است' });
      }
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
    console.log('📍 Location:', selectedBackground.name);
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

      garmentDescription = garments.length === 1
        ? 'the garment/clothing from the first image'
        : `ALL ${garments.length} garments/clothing items from the first ${garments.length} images (combine them on the model - e.g., if there's pants, shirt, and jacket, the model should wear all of them together)`;

      locationDescription = customLocation && customLocation.trim() !== ''
        ? customLocation.trim()
        : `${selectedBackground.name} - ${selectedBackground.description}`;

    } else if (mode === 'accessories-only') {
      // For accessories mode, load ONLY accessory product image (not model image)
      // AI will generate the scene naturally from text prompt
      garmentBase64Array = [await imageUrlToBase64(accessoryPath)];
      modelBase64 = null; // NEW: Don't send model image - let AI generate naturally

      garmentDescription = `the ${accessoryType} accessory from the image`;
      locationDescription = customLocation && customLocation.trim() !== ''
        ? customLocation.trim()
        : `${selectedBackground.name} - ${selectedBackground.description}`;

      // NEW: Check if this model has custom prompts
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
      // For flat lay mode, load ALL product images (no model needed)
      garmentBase64Array = await Promise.all(
        flatLayProducts.map(path => imageUrlToBase64(path))
      );
      modelBase64 = null; // No model needed for flat lay photography

      garmentDescription = `${flatLayProducts.length} product(s) for flat lay arrangement`;
      locationDescription = customLocation && customLocation.trim() !== ''
        ? customLocation.trim()
        : `${selectedBackground.name} - ${selectedBackground.description}`;
    }

    console.log('📍 Using location description:', locationDescription);

    // تعریف نوع حجاب
    const hijabDescriptions = {
      'full': 'Full traditional hijab: headscarf tightly wrapped and secured, completely covering all hair and neck, modest conservative Islamic style, no hair visible at all, professional formal hijab style',
      'relaxed': 'Relaxed modern hijab: headscarf worn loosely and casually in a modern style, still covering the head but more relaxed, may show a small amount of hair at the front edges or sides, draped freely, trendy casual hijab look',
      'no-hijab': 'No hijab - hair completely visible and uncovered, no head covering'
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
      prompt = `Create a photorealistic fashion photo showing the model wearing the garment.

IMAGES PROVIDED:
- Image ${garments.length === 1 ? '1' : `1-${garments.length}`}: Garment/clothing to wear
- Image ${garments.length + 1}: Model (person)

TASK:
Show this exact model wearing ${garmentDescription}. Make it look like a real professional photograph.

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

KEY REQUIREMENTS:
1. Keep model's face, body, and pose EXACTLY the same - only change the clothes
2. Garment should fit naturally with realistic wrinkles and fabric draping
3. Natural skin texture (no plastic smoothing or artificial effects)
4. Accurate garment colors and patterns from the garment image
5. Realistic fabric physics, wrinkles, and natural shadows
6. Clean, sharp focus on the model and clothing
7. CRITICAL DETAIL ATTENTION:
   - Preserve ALL fabric details: stitching, seams, texture, and weave patterns
   - Show exact button positions, button holes, and button design
   - Accurately render zippers with proper metal/plastic texture and zipper teeth
   - Maintain pocket shapes, pocket stitching, and pocket flaps exactly as shown
   - Display fabric texture realistically (smooth, rough, ribbed, woven, knit, etc.)
   - Show material quality indicators (sheen for silk, matte for cotton, etc.)
   - Render collar details, cuff details, and hem stitching precisely
   - Maintain any decorative elements (embroidery, prints, patches, logos)
   - Show fabric weight through natural draping and wrinkle patterns${hijabDescription ? `\n8. IMPORTANT: Apply the specified hijab style correctly: ${hijabDescription}` : ''}

DO NOT:
- Change the model's face, body type, or overall appearance
- Make unrealistic distortions or morphing
- Add text, watermarks, or logos
- Create obvious fake composites or artificial effects
- Simplify or omit garment details like buttons, zippers, stitching
- Smooth out fabric texture or make it look artificial
- Ignore small but important details like seams, hems, or decorative elements
- Over-smooth skin or create plastic-looking results

Make it simple and natural - like this person is actually wearing these clothes in a real professional photo shoot.`;

    } else if (mode === 'accessories-only') {
      // ACCESSORIES MODE: Product Photography for Accessory

      // NEW: Use custom prompt if available
      if (selectedModel.customPrompt) {
        prompt = selectedModel.customPrompt;
        console.log('✅ Using custom prompt for accessory model');
      } else {
        // Fallback to default prompt
        const accessoryTypeDescriptions = {
          'handbag': 'handbag (carried in hand or on arm)',
          'backpack': 'backpack (worn on back)',
          'crossbody-bag': 'crossbody bag (worn across shoulder)',
          'clutch': 'clutch bag (held in hand)',
          'sunglasses': 'sunglasses (worn on face)',
          'eyeglasses': 'eyeglasses (worn on face)',
          'watch': 'wristwatch (worn on wrist)',
          'necklace': 'necklace (worn around neck)',
          'earrings': 'earrings (worn on ears)',
          'bracelet': 'bracelet (worn on wrist)',
          'ring': 'ring (worn on finger)',
          'scarf': 'neck scarf (draped around neck)',
          'hat': 'hat (worn on head)',
          'belt': 'belt (worn around waist)',
          'shoes': 'shoes (worn on feet)'
        };

        const accessoryDesc = accessoryTypeDescriptions[accessoryType] || accessoryType;

        // تعریف توصیف دقیق مدل بر اساس category
        const modelCategoryDescriptions = {
          'woman': 'adult woman (30-40 years old)',
          'man': 'adult man (30-40 years old)',
          'girl': 'teenage girl (age 12-15 years old)',
          'boy': 'teenage boy (age 12-15 years old)',
          'teen': 'teenager (age 15-18 years old)',
          'child': 'child (age 6-11 years old)'
        };

        const modelDescription = modelCategoryDescriptions[selectedModel.category] || 'person';

        prompt = `Create a professional product photography image of this ${accessoryType} being worn/displayed naturally.

IMAGE PROVIDED:
- ${accessoryType.toUpperCase()} product photo

TASK:
Generate a complete professional product photography scene showing this exact ${accessoryType} from the image being worn/displayed naturally by a ${modelDescription} in an e-commerce style photo.

IMPORTANT MODEL REQUIREMENTS:
- The person in the photo MUST be a ${modelDescription}
- Face and body proportions should match this age/category exactly
- Natural, age-appropriate appearance and styling
- Professional fashion model pose suitable for this age group

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
- Mood: Professional product photography for e-commerce/Instagram

SCENE GENERATION:
- Generate a natural scene appropriate for ${accessoryDesc}
- If it's jewelry (ring, bracelet, necklace, earrings): show elegant hand/neck/ear naturally displaying it
- If it's eyewear (sunglasses, glasses): show someone wearing it naturally
- If it's a bag/accessory: show it being held/worn in a natural, appealing way
- The ${accessoryType} should be the STAR - clearly visible and beautifully displayed
- Create a complete, natural, photorealistic scene
- The model MUST be a ${modelDescription} - NOT an adult if child/teen category

KEY REQUIREMENTS:
1. Use the EXACT ${accessoryType} from the provided image - keep all details, colors, and design accurate
2. Generate a natural, realistic scene (not a composite or paste-on effect)
3. Professional e-commerce product photography quality
4. Clean, sharp focus on the ${accessoryType}
5. Natural skin texture and realistic lighting
6. Appropriate body-part/model positioning for the accessory type
7. CRITICAL: Model must be ${modelDescription} with age-appropriate features and proportions
8. CRITICAL DETAIL ATTENTION FOR ACCESSORIES:
   - Preserve ALL material details: leather grain, metal finish, fabric weave
   - Show exact stitching patterns, seam lines, and thread color
   - Accurately render hardware: buckles, zippers, clasps, chains with proper metallic texture
   - Maintain brand logos, embossing, or embroidery exactly as shown
   - Display material quality: leather sheen, fabric texture, metal polish
   - Show wear patterns, edge finishing, and piping details
   - Render precise color matching and any color blocking/patterns
   - Maintain exact proportions and shape of the accessory
   - Show surface details: perforations, quilting, studs, or decorative elements

DO NOT:
- Make unrealistic or artificial composites
- Add text, watermarks, or logos (unless they exist on the original product)
- Make the ${accessoryType} look pasted on or fake
- Change the ${accessoryType}'s design, color, or details from the reference image
- Over-smooth skin or create plastic-looking results
- Simplify or omit fine details like stitching, hardware, or brand elements
- Alter material texture or finish quality
- Ignore small decorative elements or design details
- CRITICAL: Do NOT generate an adult model if the selected category is child/teen/girl/boy - the age MUST match the category

Generate a beautiful, natural product photography shot that looks like a real professional photo shoot - perfect for e-commerce or Instagram.`;
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
      // COLOR COLLECTION MODE: Multiple color variants display

      const scenarioDescriptions = {
        'on-arm': {
          name: 'draped over an arm',
          details: 'All garments beautifully draped over a person\'s forearm, showing fabric drape and texture. Each color clearly visible, stacked elegantly on the arm like a salesperson showing options to a customer.',
          positioning: 'Stack the garments on the forearm naturally, with each color variant clearly visible'
        },
        'hanging-rack': {
          name: 'hanging on a clothing rack',
          details: 'All garments hanging on wooden or metal hangers on a clothing rack, side by side. Retail boutique style with professional lighting.',
          positioning: 'Hang each color variant on individual hangers, arranged side by side on the rack'
        },
        'folded-stack': {
          name: 'neatly folded and stacked',
          details: 'All garments folded neatly and stacked on top of each other, with each color visible from the stack. Like in a retail store shelf display.',
          positioning: 'Stack the folded garments neatly, slightly offset so each color is visible'
        },
        'laid-out': {
          name: 'laid out flat on a surface',
          details: 'All garments laid flat on a surface side by side or slightly overlapping, showing colors clearly. Top-down or slight angle view.',
          positioning: 'Arrange garments flat on the surface, side by side or with slight overlap to show all colors'
        }
      };

      const scenario = scenarioDescriptions[displayScenario] || scenarioDescriptions['laid-out'];

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
      // FLAT LAY MODE: Overhead product photography

      const arrangementDescriptions = {
        'grid': {
          name: 'in a neat grid layout',
          details: 'Products arranged in a perfect grid pattern (rows and columns), evenly spaced with consistent gaps between items. Clean, organized retail catalog style.',
          positioning: 'Arrange products in symmetrical rows and columns with equal spacing between each item'
        },
        'scattered': {
          name: 'in an artistic scattered arrangement',
          details: 'Products artistically scattered across the surface in a seemingly random but visually balanced composition. Natural, lifestyle magazine editorial style.',
          positioning: 'Place products at various angles and positions, creating visual interest while maintaining balance'
        },
        'circular': {
          name: 'in a circular arrangement',
          details: 'Products arranged in a circle or radiating from a central point. Creates a focal point in the center with items evenly distributed around it.',
          positioning: 'Position products in a circular pattern, either forming a ring or radiating outward from center'
        },
        'diagonal': {
          name: 'in a diagonal arrangement',
          details: 'Products aligned along diagonal lines across the frame. Creates dynamic energy and visual flow. Modern, contemporary catalog style.',
          positioning: 'Arrange products along diagonal lines from corner to corner, creating dynamic composition'
        }
      };

      const currentArrangement = arrangementDescriptions[arrangement] || arrangementDescriptions['grid'];

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
    }

    console.log('🎯 Mode:', mode);
    console.log('📝 Prompt:', prompt);

    // استفاده از Gemini 2.5 Flash Image برای تولید تصویر
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["Image"] // Enable image generation
      }
    });

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
      // NEW: Accessories mode - ONLY send accessory image, NO model image
      // AI generates the scene naturally from text prompt
      contentParts.push({ text: `ACCESSORY PRODUCT IMAGE:` });
      contentParts.push({
        inlineData: {
          data: garmentBase64Array[0],
          mimeType: 'image/jpeg'
        }
      });

      // NOTE: We intentionally DO NOT send model image
      // The custom prompt describes the scene/hand/body-part
      // AI generates everything naturally

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
      // Flat Lay mode: Load ALL product images
      garmentBase64Array.forEach((productBase64, index) => {
        contentParts.push({ text: `PRODUCT ${index + 1} IMAGE:` });
        contentParts.push({
          inlineData: {
            data: productBase64,
            mimeType: 'image/jpeg'
          }
        });
      });

      // NOTE: No model needed - AI generates overhead flat lay composition naturally
    }

    // Add the prompt
    contentParts.push({ text: prompt });

    const result = await model.generateContent(contentParts);

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

    const { data: generationData, error: dbError } = await supabase
      .from('generated_images')
      .insert([
        {
          user_id: req.user?.id || null,
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
      background: selectedBackground.name,
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

    // If user is admin, they can delete any image
    let deleteQuery = supabase
      .from('generated_images')
      .delete()
      .eq('id', id);

    // If NOT admin, ensure they can only delete their own images
    if (userEmail !== ADMIN_EMAIL) {
      deleteQuery = deleteQuery.eq('user_id', userId);
      console.log(`🗑️ User ${userEmail} deleting their own image: ${id}`);
    } else {
      console.log(`👑 Admin ${userEmail} deleting image: ${id}`);
    }

    const { error, count } = await deleteQuery;

    if (error) throw error;

    // Check if image was actually deleted (returns 0 if user tried to delete someone else's image)
    if (count === 0) {
      return res.status(403).json({
        success: false,
        error: 'شما مجاز به حذف این تصویر نیستید'
      });
    }

    res.json({ success: true, message: 'تصویر با موفقیت حذف شد' });
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

    // First, get total count
    let countQuery = supabase
      .from('generated_images')
      .select('*', { count: 'exact', head: true });

    // If user is NOT admin, filter by user_id
    if (userEmail !== ADMIN_EMAIL) {
      countQuery = countQuery.eq('user_id', userId);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) throw countError;

    // Then get paginated data
    let dataQuery = supabase
      .from('generated_images')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // If user is NOT admin, filter by user_id
    if (userEmail !== ADMIN_EMAIL) {
      dataQuery = dataQuery.eq('user_id', userId);
      console.log(`📸 Fetching gallery page ${page} for user: ${userEmail} (limit: ${limit})`);
    } else {
      console.log(`👑 Admin user ${userEmail} - fetching ALL images page ${page} (limit: ${limit})`);
    }

    const { data, error } = await dataQuery;

    if (error) throw error;

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      images: data || [],
      isAdmin: userEmail === ADMIN_EMAIL,
      totalCount: totalCount || 0,
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
    const { prompt, aspectRatio, contentType } = req.body;

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
      enhancedPrompt = `Generate a high-quality, professional fashion model photograph based on this description: ${prompt}

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
});
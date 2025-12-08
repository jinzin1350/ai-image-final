// Script to setup angle_references table in Supabase
// Run this with: node setup-angles-table.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAnglesTable() {
  console.log('🔄 Setting up angle_references table...\n');

  try {
    // Check if table exists by trying to query it
    console.log('1️⃣ Checking if angle_references table exists...');
    const { data: existingData, error: checkError } = await supabase
      .from('angle_references')
      .select('count')
      .limit(1);

    if (checkError) {
      console.log('⚠️  Table might not exist. Error:', checkError.message);
      console.log('\n📝 Please run the following SQL in your Supabase SQL Editor:');
      console.log('   Go to: https://app.supabase.com/project/_/sql/new');
      console.log('   Then copy and paste the contents of: migrations/create_angle_references_table.sql\n');
      return;
    }

    console.log('✅ Table exists!\n');

    // Check current data
    console.log('2️⃣ Checking existing angle data...');
    const { data: angles, error: fetchError } = await supabase
      .from('angle_references')
      .select('*')
      .order('display_order', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching angles:', fetchError);
      return;
    }

    if (angles && angles.length > 0) {
      console.log(`✅ Found ${angles.length} existing angles:`);
      angles.forEach(angle => {
        console.log(`   - ${angle.title_fa} (${angle.title_en}) - ${angle.is_active ? '✓ Active' : '✗ Inactive'}`);
      });
      console.log('\n✨ Angle references are already set up!\n');
      return;
    }

    // If no data, insert seed data
    console.log('⚠️  No angle data found. Inserting seed data...\n');

    const seedData = [
      {
        angle_key: 'front',
        title_en: 'Front View',
        title_fa: 'نمای جلو',
        description_en: 'Full frontal view - Hero shot showing complete front of garment',
        description_fa: 'نمایش کامل جلوی لباس - تصویر اصلی محصول',
        display_order: 1,
        is_active: true
      },
      {
        angle_key: 'back',
        title_en: 'Back View',
        title_fa: 'نمای پشت',
        description_en: 'Complete back view showing garment from behind',
        description_fa: 'نمایش کامل پشت لباس',
        display_order: 2,
        is_active: true
      },
      {
        angle_key: 'right-side',
        title_en: 'Right Side View',
        title_fa: 'نمای راست',
        description_en: 'Side profile from the right showing garment silhouette',
        description_fa: 'نمای کناری از سمت راست - نمایش سیلوئت لباس',
        display_order: 3,
        is_active: true
      },
      {
        angle_key: 'three-quarter-left',
        title_en: 'Over-the-Shoulder (3/4 Left)',
        title_fa: 'سه‌ربع چپ',
        description_en: '45-degree angle over the shoulder showing back details',
        description_fa: 'زاویه ۴۵ درجه از پشت شانه - نمایش جزئیات پشت',
        display_order: 4,
        is_active: true
      },
      {
        angle_key: 'three-quarter-right',
        title_en: '45° Front-Right',
        title_fa: 'سه‌ربع راست',
        description_en: '45-degree front angle from the right side',
        description_fa: 'زاویه ۴۵ درجه از جلو سمت راست',
        display_order: 5,
        is_active: true
      },
      {
        angle_key: 'close-up',
        title_en: 'Close-Up Details',
        title_fa: 'نمای نزدیک',
        description_en: 'Detailed close-up showing neckline, fabric texture and embellishments',
        description_fa: 'نمای نزدیک جزئیات - بافت پارچه و تزئینات یقه',
        display_order: 6,
        is_active: true
      },
      {
        angle_key: 'left-side',
        title_en: 'Left Side View',
        title_fa: 'نمای چپ',
        description_en: 'Side profile from the left showing garment silhouette',
        description_fa: 'نمای کناری از سمت چپ - نمایش سیلوئت لباس',
        display_order: 7,
        is_active: true
      },
      {
        angle_key: 'full-body',
        title_en: 'Full Body Shot',
        title_fa: 'تمام قد',
        description_en: 'Complete full-length view from head to toe',
        description_fa: 'نمایش کامل از سر تا پا - تصویر تمام قد',
        display_order: 8,
        is_active: true
      },
      {
        angle_key: 'waist-up',
        title_en: 'Waist-Up Shot',
        title_fa: 'نیم‌تنه',
        description_en: 'Upper body shot from waist upward',
        description_fa: 'نمای نیم‌تنه - از کمر به بالا',
        display_order: 9,
        is_active: true
      }
    ];

    const { data: insertedData, error: insertError } = await supabase
      .from('angle_references')
      .insert(seedData)
      .select();

    if (insertError) {
      console.error('❌ Error inserting seed data:', insertError);
      return;
    }

    console.log(`✅ Successfully inserted ${insertedData.length} angle references!\n`);
    insertedData.forEach(angle => {
      console.log(`   ✓ ${angle.title_fa} (${angle.title_en})`);
    });

    console.log('\n🎉 Setup complete! The angle selection feature is now ready to use.\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setupAnglesTable();

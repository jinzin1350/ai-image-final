/**
 * Migration Runner - Run SQL migration files on Supabase
 * Usage: node run-migration.js migrations/add_accessory_man_category.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration(migrationFile) {
  // Check if Supabase is configured
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
  }

  // Create Supabase admin client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('🚀 Starting migration...\n');

  // Read migration file
  const migrationPath = path.resolve(migrationFile);
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Error: Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`📄 Migration file: ${migrationFile}`);
  console.log(`📝 SQL:\n${sql}\n`);

  try {
    // Execute SQL using Supabase RPC or direct query
    // Note: Supabase JS client doesn't support raw SQL execution directly
    // We need to use the REST API endpoint
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql function doesn't exist, try alternative approach
      console.log('⚠️  exec_sql RPC not available, trying alternative...');
      console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
      console.log('─'.repeat(80));
      console.log(sql);
      console.log('─'.repeat(80));
      console.log('\n💡 Instructions:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Create a new query');
      console.log('4. Copy and paste the SQL above');
      console.log('5. Click "Run" to execute');
      process.exit(0);
    }

    console.log('✅ Migration executed successfully!');
    if (data) {
      console.log('📊 Result:', data);
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    process.exit(1);
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Usage: node run-migration.js <migration-file>');
  console.error('📝 Example: node run-migration.js migrations/add_accessory_man_category.sql');
  process.exit(1);
}

runMigration(migrationFile);

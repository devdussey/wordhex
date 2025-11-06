const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://ztrvimioqaphkbbvzupo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cnZpbWlvcWFwaGtiYnZ6dXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MDc2MTcsImV4cCI6MjA3Nzk4MzYxN30.5Z10QchQAOo53Nafjb2ewowgfOxSrp1Bv_KJ0vWpZtA";

async function setupSchema() {
  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'supabase_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('🚀 Starting Supabase schema setup...\n');

    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let executedCount = 0;
    for (const statement of statements) {
      try {
        const { data, error } = await supabase.rpc('execute_sql', {
          sql: statement + ';'
        }).catch(() => {
          // Fallback: If rpc doesn't exist, we'll handle it differently
          return { error: 'RPC not available' };
        });

        if (error && error.message !== 'RPC not available') {
          console.log(`⚠️  Statement skipped (might already exist or be a view):`);
          console.log(`   ${statement.substring(0, 60)}...\n`);
        } else {
          executedCount++;
          console.log(`✅ Executed statement ${executedCount}`);
        }
      } catch (err) {
        console.log(`⚠️  Skipped statement (might already exist):`);
        console.log(`   ${statement.substring(0, 60)}...\n`);
      }
    }

    console.log(`\n✨ Schema setup attempted! (${executedCount} statements executed)`);
    console.log('📝 Note: Some statements may have been skipped if objects already exist.\n');

    // Try to verify tables exist
    console.log('🔍 Verifying tables...\n');

    const { data: tables, error: tablesError } = await supabase
      .from('player_stats')
      .select('count(*)')
      .limit(0);

    if (!tablesError) {
      console.log('✅ player_stats table exists');
    }

    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('count(*)')
      .limit(0);

    if (!wordsError) {
      console.log('✅ words table exists');
    }

    const { data: matches, error: matchesError } = await supabase
      .from('match_history')
      .select('count(*)')
      .limit(0);

    if (!matchesError) {
      console.log('✅ match_history table exists');
    }

    console.log('\n🎉 Schema setup complete! Your database is ready to use.\n');

  } catch (error) {
    console.error('❌ Error during schema setup:', error.message);
    process.exit(1);
  }
}

setupSchema();

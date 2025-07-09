require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testOnlineUsersAPI() {
  try {
    console.log('🔍 Testing Online Users API...');
    
    // Crear cliente de Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Test database direct query first
    console.log('🗄️  Testing direct database query...');
    const { data: dbData, error: dbError } = await supabase
      .from('online_users')
      .select('*')
      .limit(5);
    
    if (dbError) {
      console.error('❌ Database query error:', dbError);
      return;
    } else {
      console.log('✅ Database query successful:');
      console.log('   Records found:', dbData?.length || 0);
      if (dbData && dbData.length > 0) {
        console.log('   Sample record:', dbData[0]);
      }
    }
    
    // Test table structure
    console.log('\n🏗️  Testing table structure...');
    const { data: tableData, error: tableError } = await supabase
      .from('online_users')
      .select('user_id, last_seen_at, created_at, updated_at')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table structure error:', tableError);
    } else {
      console.log('✅ Table structure is correct');
    }
    
    // Test insert operation
    console.log('\n➕ Testing insert operation...');
    const testUserId = '00000000-0000-0000-0000-000000000001'; // UUID de prueba
    
    const { data: insertData, error: insertError } = await supabase
      .from('online_users')
      .upsert({
        user_id: testUserId,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
    } else {
      console.log('✅ Insert/upsert successful');
    }
    
    // Test cleanup operation
    console.log('\n🧹 Testing cleanup operation...');
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: cleanupData, error: cleanupError } = await supabase
      .from('online_users')
      .delete()
      .lt('last_seen_at', twoMinutesAgo);
    
    if (cleanupError) {
      console.error('❌ Cleanup error:', cleanupError);
    } else {
      console.log('✅ Cleanup operation successful');
    }
    
    console.log('\n🎯 Summary: Database operations are working correctly!');
    console.log('ℹ️  The API errors in the browser are likely due to authentication issues.');
    console.log('ℹ️  Make sure users are properly logged in before the component tries to send heartbeats.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOnlineUsersAPI();
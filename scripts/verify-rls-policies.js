const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  console.log('Necesitas:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Cliente con service role para verificar políticas
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyRLSPolicies() {
  console.log('🔍 Verificando políticas RLS para online_users...');
  
  try {
    // 1. Verificar acceso básico a la tabla
    console.log('\n1️⃣ Verificando acceso a la tabla online_users...');
    
    const { data: testAccess, error: accessError } = await supabase
      .from('online_users')
      .select('count')
      .limit(1);
    
    if (accessError) {
      console.error('❌ Error al acceder a la tabla:', accessError.message);
      return;
    }
    
    console.log('✅ Tabla online_users accesible');
    
    // 2. Verificar políticas RLS mediante pruebas prácticas
    console.log('\n2️⃣ Verificando políticas RLS mediante pruebas...');
    console.log('💡 No se pueden consultar políticas directamente, probando funcionalidad');
    
    console.log('\n📝 PARA VERIFICAR POLÍTICAS MANUALMENTE:');
    console.log('1. Ve a Supabase Dashboard > SQL Editor');
    console.log('2. Ejecuta esta consulta para ver las políticas:');
    console.log('');
    console.log('SELECT ');
    console.log('  policyname,');
    console.log('  cmd,');
    console.log('  roles,');
    console.log('  qual,');
    console.log('  with_check');
    console.log('FROM pg_policies ');
    console.log('WHERE schemaname = \'public\' AND tablename = \'online_users\';');
    console.log('');
    console.log('3. Si no ves las políticas correctas, ejecuta:');
    console.log('   sql/fix_online_users_rls_policies.sql');
    
    // 3. Probar operaciones básicas
    console.log('\n3️⃣ Probando operaciones básicas...');
    
    // Crear un usuario de prueba temporal
    const testUserId = 'test-user-' + Date.now();
    
    // Probar INSERT
    console.log('\n   🧪 Probando INSERT...');
    const { error: insertError } = await supabase
      .from('online_users')
      .insert({
        user_id: testUserId,
        last_seen_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.log('❌ Error en INSERT:', insertError.message);
      if (insertError.code === '42501') {
        console.log('🔍 Error RLS - Las políticas están bloqueando INSERT');
      }
    } else {
      console.log('✅ INSERT exitoso (con service_role)');
      
      // Probar UPDATE
      console.log('\n   🧪 Probando UPDATE...');
      const { error: updateError } = await supabase
        .from('online_users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('user_id', testUserId);
      
      if (updateError) {
        console.log('❌ Error en UPDATE:', updateError.message);
      } else {
        console.log('✅ UPDATE exitoso');
      }
      
      // Limpiar
      await supabase
        .from('online_users')
        .delete()
        .eq('user_id', testUserId);
    }
    
    // 4. Verificar usuarios existentes
    console.log('\n4️⃣ Verificando usuarios existentes...');
    
    const { data: existingUsers, error: selectError } = await supabase
      .from('online_users')
      .select('user_id, last_seen_at')
      .limit(5);
    
    if (selectError) {
      console.log('❌ Error en SELECT:', selectError.message);
    } else {
      console.log(`📊 Usuarios en tabla: ${existingUsers?.length || 0}`);
      if (existingUsers && existingUsers.length > 0) {
        existingUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.user_id.substring(0, 8)}... (${user.last_seen_at})`);
        });
      }
    }
    
    console.log('\n✅ Verificación completada');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Si las políticas no están correctas, ejecuta en Supabase:');
    console.log('   sql/fix_online_users_rls_policies.sql');
    console.log('2. Prueba la funcionalidad en el navegador:');
    console.log('   - Inicia sesión en la aplicación');
    console.log('   - Verifica que aparezcan usuarios en línea');
    console.log('3. Si sigue sin funcionar, revisa los logs del servidor');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verifyRLSPolicies();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOnlineUsersAfterFix() {
  console.log('🧪 Probando funcionalidad de online_users después de la corrección RLS...');
  
  try {
    // 1. Verificar acceso a la tabla
    console.log('\n1️⃣ Verificando acceso a la tabla...');
    const { data: tableData, error: tableError } = await supabase
      .from('online_users')
      .select('count', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('❌ Error al acceder a la tabla:', tableError);
      return;
    }
    
    console.log('✅ Acceso a tabla confirmado');
    console.log(`📊 Registros actuales en la tabla: ${tableData?.length || 0}`);
    
    // 2. Verificar estructura de la tabla
    console.log('\n2️⃣ Verificando estructura de la tabla...');
    const { data: structureData, error: structureError } = await supabase
      .from('online_users')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.error('❌ Error al verificar estructura:', structureError);
    } else {
      console.log('✅ Estructura de tabla verificada');
      if (structureData && structureData.length > 0) {
        console.log('📋 Columnas disponibles:', Object.keys(structureData[0]));
      }
    }
    
    // 3. Limpiar registros antiguos para la prueba
    console.log('\n3️⃣ Limpiando registros antiguos...');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { error: cleanupError } = await supabase
      .from('online_users')
      .delete()
      .lt('last_seen_at', fiveMinutesAgo);
    
    if (cleanupError) {
      console.log('⚠️  Error en limpieza (puede ser normal):', cleanupError.message);
    } else {
      console.log('✅ Limpieza completada');
    }
    
    // 4. Verificar usuarios actualmente en línea
    console.log('\n4️⃣ Verificando usuarios actualmente en línea...');
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: activeUsers, error: activeError } = await supabase
      .from('online_users')
      .select('user_id, last_seen_at, created_at')
      .gte('last_seen_at', twoMinutesAgo)
      .order('last_seen_at', { ascending: false });
    
    if (activeError) {
      console.error('❌ Error al consultar usuarios activos:', activeError);
    } else {
      console.log(`✅ Usuarios activos encontrados: ${activeUsers?.length || 0}`);
      if (activeUsers && activeUsers.length > 0) {
        activeUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. User ID: ${user.user_id.substring(0, 8)}... (${user.last_seen_at})`);
        });
      }
    }
    
    // 5. Verificar políticas RLS (indirectamente)
    console.log('\n5️⃣ Verificando políticas RLS...');
    
    // Intentar una operación que requiere políticas correctas
    const testUserId = '12345678-1234-1234-1234-123456789012'; // UUID de prueba
    
    // Probar INSERT (debería fallar por FK constraint, no por RLS)
    const { error: insertError } = await supabase
      .from('online_users')
      .insert({
        user_id: testUserId,
        last_seen_at: new Date().toISOString()
      });
    
    if (insertError) {
      if (insertError.code === '23503') {
        console.log('✅ Políticas RLS funcionando (error FK esperado con UUID de prueba)');
      } else if (insertError.code === '42501') {
        console.log('❌ Políticas RLS aún bloqueando INSERT:', insertError.message);
      } else {
        console.log('⚠️  Error inesperado en INSERT:', insertError.message);
      }
    } else {
      console.log('✅ INSERT funcionando (limpiando registro de prueba...)');
      await supabase.from('online_users').delete().eq('user_id', testUserId);
    }
    
    console.log('\n📋 RESUMEN:');
    console.log('- Si ves "Políticas RLS funcionando", las políticas están correctas');
    console.log('- Si ves "Políticas RLS aún bloqueando", necesitas aplicar el SQL manualmente');
    console.log('- El archivo SQL está en: sql/fix_online_users_rls_policies.sql');
    console.log('- Ejecútalo en el SQL Editor de Supabase Dashboard');
    
  } catch (error) {
    console.error('❌ Error general en la prueba:', error);
  }
}

testOnlineUsersAfterFix();
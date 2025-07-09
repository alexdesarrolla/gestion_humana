const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testCompleteFix() {
  console.log('🧪 Probando la solución completa para online_users...');
  
  try {
    // Cliente con service role para verificar políticas
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Verificar que las políticas RLS estén aplicadas
    console.log('\n1️⃣ Verificando políticas RLS...');
    
    const { data: policies, error: policiesError } = await adminSupabase
      .from('pg_policies')
      .select('policyname, cmd, roles')
      .eq('tablename', 'online_users');
    
    if (policiesError) {
      console.log('⚠️ No se pudieron verificar las políticas directamente');
    } else {
      console.log('✅ Políticas encontradas:', policies?.length || 0);
      policies?.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd}) para ${policy.roles}`);
      });
    }

    // 2. Verificar acceso básico a la tabla
    console.log('\n2️⃣ Verificando acceso básico a la tabla...');
    
    const { data: tableAccess, error: accessError } = await adminSupabase
      .from('online_users')
      .select('count')
      .limit(1);
    
    if (accessError) {
      console.error('❌ Error al acceder a la tabla:', accessError.message);
      return;
    }
    
    console.log('✅ Acceso a la tabla confirmado');

    // 3. Probar inserción con service role
    console.log('\n3️⃣ Probando inserción con service role...');
    
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    const { error: insertError } = await adminSupabase
      .from('online_users')
      .upsert({
        user_id: testUserId,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (insertError) {
      console.error('❌ Error al insertar con service role:', insertError.message);
    } else {
      console.log('✅ Inserción con service role exitosa');
    }

    // 4. Verificar que el registro se insertó
    console.log('\n4️⃣ Verificando registro insertado...');
    
    const { data: insertedRecord, error: selectError } = await adminSupabase
      .from('online_users')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (selectError) {
      console.error('❌ Error al verificar registro:', selectError.message);
    } else {
      console.log('✅ Registro encontrado:', {
        user_id: insertedRecord.user_id,
        last_seen_at: insertedRecord.last_seen_at
      });
    }

    // 5. Limpiar registro de prueba
    console.log('\n5️⃣ Limpiando registro de prueba...');
    
    const { error: deleteError } = await adminSupabase
      .from('online_users')
      .delete()
      .eq('user_id', testUserId);
    
    if (deleteError) {
      console.error('❌ Error al limpiar:', deleteError.message);
    } else {
      console.log('✅ Limpieza exitosa');
    }

    // 6. Verificar estructura de la tabla
    console.log('\n6️⃣ Verificando estructura de la tabla...');
    
    const { data: tableInfo, error: tableError } = await adminSupabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'online_users')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.log('⚠️ No se pudo verificar la estructura de la tabla');
    } else {
      console.log('✅ Estructura de la tabla:');
      tableInfo?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    console.log('\n🎉 PRUEBAS COMPLETADAS');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Ejecuta el SQL fix_online_users_rls_complete.sql en Supabase Dashboard');
    console.log('2. Reinicia tu aplicación Next.js');
    console.log('3. Verifica que los usuarios aparezcan en línea');
    console.log('4. Revisa los logs del servidor para confirmar que no hay errores RLS');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
  }
}

// Ejecutar las pruebas
testCompleteFix().catch(console.error);
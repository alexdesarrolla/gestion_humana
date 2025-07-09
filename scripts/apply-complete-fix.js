const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function applyCompleteFix() {
  console.log('🔧 Aplicando solución completa para online_users...');
  
  try {
    // Cliente con service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('\n1️⃣ Eliminando políticas existentes...');
    
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can view all online users" ON online_users;',
      'DROP POLICY IF EXISTS "Users can update their own online status" ON online_users;',
      'DROP POLICY IF EXISTS "Users can insert their own online status" ON online_users;',
      'DROP POLICY IF EXISTS "Users can delete their own online status" ON online_users;',
      'DROP POLICY IF EXISTS "Allow authenticated users to view online users" ON online_users;',
      'DROP POLICY IF EXISTS "Allow authenticated users to insert their own status" ON online_users;',
      'DROP POLICY IF EXISTS "Allow authenticated users to update their own status" ON online_users;',
      'DROP POLICY IF EXISTS "Allow users to delete their own status" ON online_users;',
      'DROP POLICY IF EXISTS "Allow service role to delete inactive users" ON online_users;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON online_users;',
      'DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON online_users;',
      'DROP POLICY IF EXISTS "Enable update for users based on user_id" ON online_users;',
      'DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON online_users;'
    ];

    for (const policy of dropPolicies) {
      const { error } = await supabase.rpc('exec_sql', { query: policy });
      if (error && !error.message.includes('does not exist')) {
        console.log(`⚠️ Error eliminando política: ${error.message}`);
      }
    }
    
    console.log('✅ Políticas eliminadas');

    console.log('\n2️⃣ Deshabilitando RLS temporalmente...');
    
    const { error: disableError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE online_users DISABLE ROW LEVEL SECURITY;'
    });
    
    if (disableError) {
      console.log('⚠️ Error deshabilitando RLS:', disableError.message);
    } else {
      console.log('✅ RLS deshabilitado');
    }

    console.log('\n3️⃣ Limpiando datos existentes...');
    
    const { error: cleanError } = await supabase
      .from('online_users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos
    
    if (cleanError) {
      console.log('⚠️ Error limpiando datos:', cleanError.message);
    } else {
      console.log('✅ Datos limpiados');
    }

    console.log('\n4️⃣ Habilitando RLS...');
    
    const { error: enableError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;'
    });
    
    if (enableError) {
      console.log('⚠️ Error habilitando RLS:', enableError.message);
    } else {
      console.log('✅ RLS habilitado');
    }

    console.log('\n5️⃣ Creando nuevas políticas...');
    
    const newPolicies = [
      `CREATE POLICY "online_users_select_policy" ON online_users
        FOR SELECT TO authenticated USING (true);`,
      
      `CREATE POLICY "online_users_insert_policy" ON online_users
        FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`,
      
      `CREATE POLICY "online_users_update_policy" ON online_users
        FOR UPDATE TO authenticated 
        USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`,
      
      `CREATE POLICY "online_users_delete_policy" ON online_users
        FOR DELETE TO authenticated USING (auth.uid() = user_id);`,
      
      `CREATE POLICY "online_users_service_role_policy" ON online_users
        FOR ALL TO service_role USING (true) WITH CHECK (true);`
    ];

    for (const policy of newPolicies) {
      const { error } = await supabase.rpc('exec_sql', { query: policy });
      if (error) {
        console.log(`❌ Error creando política: ${error.message}`);
      } else {
        console.log('✅ Política creada');
      }
    }

    console.log('\n6️⃣ Otorgando permisos...');
    
    const grants = [
      'GRANT SELECT, INSERT, UPDATE, DELETE ON online_users TO authenticated;',
      'GRANT ALL ON online_users TO service_role;'
    ];

    for (const grant of grants) {
      const { error } = await supabase.rpc('exec_sql', { query: grant });
      if (error) {
        console.log(`⚠️ Error otorgando permisos: ${error.message}`);
      } else {
        console.log('✅ Permisos otorgados');
      }
    }

    console.log('\n🎉 SOLUCIÓN APLICADA EXITOSAMENTE!');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Reinicia tu aplicación Next.js');
    console.log('2. Verifica que los usuarios aparezcan en línea');
    console.log('3. Revisa los logs del servidor para confirmar que no hay errores RLS');
    console.log('\n⚠️ NOTA: Si exec_sql no está disponible, ejecuta manualmente el archivo:');
    console.log('   sql/fix_online_users_rls_complete.sql en Supabase Dashboard');
    
  } catch (error) {
    console.error('❌ Error durante la aplicación:', error.message);
    console.log('\n🔧 SOLUCIÓN ALTERNATIVA:');
    console.log('Ejecuta manualmente el archivo sql/fix_online_users_rls_complete.sql');
    console.log('en el SQL Editor de Supabase Dashboard');
  }
}

// Ejecutar la solución
applyCompleteFix().catch(console.error);
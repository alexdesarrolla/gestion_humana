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

// Cliente con service role para aplicar políticas
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSPolicies() {
  console.log('🔧 Aplicando políticas RLS para online_users...');
  
  try {
    // 1. Eliminar políticas existentes
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
      'DROP POLICY IF EXISTS "Allow service role to delete inactive users" ON online_users;'
    ];
    
    for (const sql of dropPolicies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query: sql });
        if (error && !error.message.includes('does not exist')) {
          console.log(`⚠️  Error eliminando política: ${error.message}`);
        }
      } catch (e) {
        // Ignorar errores de políticas que no existen
      }
    }
    
    console.log('✅ Políticas existentes eliminadas');
    
    // 2. Habilitar RLS
    console.log('\n2️⃣ Habilitando RLS...');
    
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;'
    });
    
    if (rlsError) {
      console.log('⚠️  Error habilitando RLS:', rlsError.message);
    } else {
      console.log('✅ RLS habilitado');
    }
    
    // 3. Crear nuevas políticas
    console.log('\n3️⃣ Creando nuevas políticas...');
    
    const policies = [
      {
        name: 'SELECT Policy',
        sql: `CREATE POLICY "Allow authenticated users to view online users" ON online_users
          FOR SELECT 
          TO authenticated
          USING (true);`
      },
      {
        name: 'INSERT Policy',
        sql: `CREATE POLICY "Allow authenticated users to insert their own status" ON online_users
          FOR INSERT 
          TO authenticated
          WITH CHECK (auth.uid() = user_id);`
      },
      {
        name: 'UPDATE Policy',
        sql: `CREATE POLICY "Allow authenticated users to update their own status" ON online_users
          FOR UPDATE 
          TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);`
      },
      {
        name: 'DELETE Policy (Users)',
        sql: `CREATE POLICY "Allow users to delete their own status" ON online_users
          FOR DELETE 
          TO authenticated
          USING (auth.uid() = user_id);`
      },
      {
        name: 'DELETE Policy (Service Role)',
        sql: `CREATE POLICY "Allow service role to delete inactive users" ON online_users
          FOR DELETE 
          TO service_role
          USING (true);`
      }
    ];
    
    for (const policy of policies) {
      console.log(`   📝 Creando ${policy.name}...`);
      
      const { error } = await supabase.rpc('exec_sql', { query: policy.sql });
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ ${policy.name} creada`);
      }
    }
    
    // 4. Verificar políticas creadas
    console.log('\n4️⃣ Verificando políticas creadas...');
    
    const { data: policies_check, error: checkError } = await supabase.rpc('exec_sql', {
      query: `SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'online_users' ORDER BY policyname;`
    });
    
    if (checkError) {
      console.log('⚠️  No se pudieron verificar las políticas:', checkError.message);
    } else if (policies_check && policies_check.length > 0) {
      console.log('📋 Políticas aplicadas:');
      policies_check.forEach((policy, index) => {
        console.log(`   ${index + 1}. ${policy.policyname} (${policy.cmd}) - ${policy.roles}`);
      });
    } else {
      console.log('⚠️  No se encontraron políticas');
    }
    
    // 5. Probar inserción
    console.log('\n5️⃣ Probando inserción con usuario autenticado...');
    
    // Crear un cliente con anon key para simular usuario autenticado
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Intentar insertar con service role (debería funcionar)
    const testUserId = 'test-user-' + Date.now();
    const { error: insertError } = await supabase
      .from('online_users')
      .insert({
        user_id: testUserId,
        last_seen_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.log('❌ Error en inserción de prueba:', insertError.message);
    } else {
      console.log('✅ Inserción de prueba exitosa');
      
      // Limpiar
      await supabase
        .from('online_users')
        .delete()
        .eq('user_id', testUserId);
    }
    
    console.log('\n✅ Aplicación de políticas RLS completada');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Reinicia tu aplicación si está corriendo');
    console.log('2. Inicia sesión en la aplicación');
    console.log('3. Verifica que los usuarios en línea aparezcan');
    console.log('4. Si sigue fallando, revisa los logs del servidor');
    
  } catch (error) {
    console.error('❌ Error general:', error);
    
    console.log('\n🔧 SOLUCIÓN ALTERNATIVA:');
    console.log('Si este script falla, ejecuta manualmente en Supabase Dashboard:');
    console.log('1. Ve a SQL Editor');
    console.log('2. Ejecuta el contenido completo de: sql/fix_online_users_rls_policies.sql');
  }
}

applyRLSPolicies();
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function applyRLSPolicies() {
  console.log('🔧 APLICANDO POLÍTICAS RLS PARA ONLINE_USERS')
  console.log('=============================================')
  
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    console.log('\n1. Eliminando políticas existentes...')
    
    // Lista de políticas a eliminar
    const policiesToDrop = [
      'Users can view all online users',
      'Users can update their own online status',
      'Users can insert their own online status',
      'Users can delete their own online status',
      'Allow authenticated users to view online users',
      'Allow authenticated users to insert their own status',
      'Allow authenticated users to update their own status',
      'Allow users to delete their own status',
      'Allow service role to delete inactive users',
      'Enable read access for all users',
      'Enable insert for authenticated users only',
      'Enable update for users based on user_id',
      'Enable delete for users based on user_id',
      'online_users_select_policy',
      'online_users_insert_policy',
      'online_users_update_policy',
      'online_users_delete_policy',
      'online_users_service_role_policy',
      'online_users_select_all',
      'online_users_insert_flexible',
      'online_users_update_flexible',
      'online_users_delete_flexible',
      'online_users_service_role_all'
    ]
    
    for (const policy of policiesToDrop) {
      try {
        await adminSupabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policy}" ON online_users;`
        })
        console.log(`   ✅ Eliminada: ${policy}`)
      } catch (error) {
        console.log(`   ⚠️  No se pudo eliminar: ${policy}`)
      }
    }
    
    console.log('\n2. Deshabilitando RLS temporalmente...')
    await adminSupabase.rpc('exec_sql', {
      sql: 'ALTER TABLE online_users DISABLE ROW LEVEL SECURITY;'
    })
    
    console.log('\n3. Limpiando datos existentes...')
    await adminSupabase.rpc('exec_sql', {
      sql: 'DELETE FROM online_users;'
    })
    
    console.log('\n4. Habilitando RLS...')
    await adminSupabase.rpc('exec_sql', {
      sql: 'ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;'
    })
    
    console.log('\n5. Creando políticas simplificadas...')
    
    // Política SELECT: Permitir a todos los usuarios autenticados ver usuarios en línea
    await adminSupabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "online_users_select_simple" ON online_users
          FOR SELECT 
          TO authenticated
          USING (true);
      `
    })
    console.log('   ✅ Política SELECT creada')
    
    // Política INSERT: Permitir insertar solo su propio registro
    await adminSupabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "online_users_insert_simple" ON online_users
          FOR INSERT 
          TO authenticated
          WITH CHECK (
            auth.uid() = user_id AND
            auth.uid() IN (
              SELECT auth_user_id 
              FROM usuario_nomina 
              WHERE auth_user_id IS NOT NULL 
              AND estado = 'activo'
            )
          );
      `
    })
    console.log('   ✅ Política INSERT creada')
    
    // Política UPDATE: Permitir actualizar solo su propio registro
    await adminSupabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "online_users_update_simple" ON online_users
          FOR UPDATE 
          TO authenticated
          USING (
            auth.uid() = user_id AND
            auth.uid() IN (
              SELECT auth_user_id 
              FROM usuario_nomina 
              WHERE auth_user_id IS NOT NULL 
              AND estado = 'activo'
            )
          )
          WITH CHECK (
            auth.uid() = user_id AND
            auth.uid() IN (
              SELECT auth_user_id 
              FROM usuario_nomina 
              WHERE auth_user_id IS NOT NULL 
              AND estado = 'activo'
            )
          );
      `
    })
    console.log('   ✅ Política UPDATE creada')
    
    // Política DELETE: Permitir eliminar solo su propio registro
    await adminSupabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "online_users_delete_simple" ON online_users
          FOR DELETE 
          TO authenticated
          USING (
            auth.uid() = user_id AND
            auth.uid() IN (
              SELECT auth_user_id 
              FROM usuario_nomina 
              WHERE auth_user_id IS NOT NULL 
              AND estado = 'activo'
            )
          );
      `
    })
    console.log('   ✅ Política DELETE creada')
    
    // Política para service_role
    await adminSupabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "online_users_service_role" ON online_users
          FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
      `
    })
    console.log('   ✅ Política SERVICE_ROLE creada')
    
    console.log('\n6. Configurando permisos...')
    await adminSupabase.rpc('exec_sql', {
      sql: 'GRANT SELECT, INSERT, UPDATE, DELETE ON online_users TO authenticated;'
    })
    await adminSupabase.rpc('exec_sql', {
      sql: 'GRANT ALL ON online_users TO service_role;'
    })
    console.log('   ✅ Permisos configurados')
    
    console.log('\n7. Probando políticas...')
    
    // Buscar usuario de prueba
    const { data: testUser, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('auth_user_id, correo_electronico, colaborador')
      .eq('estado', 'activo')
      .not('auth_user_id', 'is', null)
      .limit(1)
      .single()
    
    if (userError || !testUser) {
      console.error('❌ No se encontró usuario de prueba')
      return
    }
    
    console.log(`   Usuario de prueba: ${testUser.colaborador}`)
    
    // Probar con service role
    const { data: serviceInsert, error: serviceError } = await adminSupabase
      .from('online_users')
      .insert({
        user_id: testUser.auth_user_id,
        last_seen_at: new Date().toISOString()
      })
    
    if (serviceError) {
      console.error('❌ Error con service role:', serviceError)
    } else {
      console.log('   ✅ INSERT con service role exitoso')
    }
    
    // Probar SELECT con cliente anónimo
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: anonSelect, error: anonError } = await anonSupabase
      .from('online_users')
      .select('*')
    
    if (anonError) {
      console.log('   ✅ SELECT bloqueado para usuarios no autenticados (correcto)')
    } else {
      console.log('   ⚠️  SELECT permitido para usuarios no autenticados')
    }
    
    console.log('\n✅ POLÍTICAS RLS APLICADAS EXITOSAMENTE')
    console.log('\n📋 PRÓXIMOS PASOS:')
    console.log('1. Reiniciar la aplicación Next.js')
    console.log('2. Probar con usuarios reales desde la aplicación')
    console.log('3. Verificar que los heartbeats funcionen correctamente')
    
  } catch (error) {
    console.error('❌ Error al aplicar políticas:', error)
  }
}

// Ejecutar la aplicación de políticas
applyRLSPolicies().catch(console.error)
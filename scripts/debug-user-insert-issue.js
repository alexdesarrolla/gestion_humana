const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function debugUserInsertIssue() {
  console.log('🔍 DEPURANDO PROBLEMA DE INSERT PARA USUARIOS REGULARES')
  console.log('=======================================================')
  
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // 1. Buscar usuarios regulares y administradores
    console.log('\n1. Buscando usuarios de prueba...')
    const { data: allUsers, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, auth_user_id, rol')
      .eq('estado', 'activo')
      .not('auth_user_id', 'is', null)
      .order('rol')
    
    if (userError || !allUsers) {
      console.error('❌ Error al buscar usuarios:', userError)
      return
    }
    
    const regularUsers = allUsers.filter(u => u.rol === 'usuario')
    const adminUsers = allUsers.filter(u => u.rol === 'administrador')
    
    console.log(`✅ Usuarios regulares encontrados: ${regularUsers.length}`)
    console.log(`✅ Administradores encontrados: ${adminUsers.length}`)
    
    // 2. Limpiar tabla
    console.log('\n2. Limpiando tabla online_users...')
    await adminSupabase.from('online_users').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
    
    // 3. Probar INSERT directo con service role para cada tipo de usuario
    console.log('\n3. Probando INSERT directo con service role...')
    
    // Probar con usuario regular
    if (regularUsers.length > 0) {
      const regularUser = regularUsers[0]
      console.log(`\n   📝 Probando con usuario regular: ${regularUser.colaborador}`)
      
      const { data: regularInsert, error: regularError } = await adminSupabase
        .from('online_users')
        .insert({
          user_id: regularUser.auth_user_id,
          last_seen_at: new Date().toISOString()
        })
        .select()
      
      if (regularError) {
        console.error('   ❌ Error con usuario regular:', regularError)
      } else {
        console.log('   ✅ INSERT exitoso con usuario regular')
      }
    }
    
    // Probar con administrador
    if (adminUsers.length > 0) {
      const adminUser = adminUsers[0]
      console.log(`\n   📝 Probando con administrador: ${adminUser.colaborador}`)
      
      const { data: adminInsert, error: adminError } = await adminSupabase
        .from('online_users')
        .insert({
          user_id: adminUser.auth_user_id,
          last_seen_at: new Date().toISOString()
        })
        .select()
      
      if (adminError) {
        console.error('   ❌ Error con administrador:', adminError)
      } else {
        console.log('   ✅ INSERT exitoso con administrador')
      }
    }
    
    // 4. Verificar políticas RLS específicamente
    console.log('\n4. Verificando condiciones de políticas RLS...')
    
    for (const user of [...regularUsers.slice(0, 2), ...adminUsers.slice(0, 1)]) {
      console.log(`\n   🔍 Verificando ${user.colaborador} (${user.rol}):`)
      
      // Verificar si el usuario está en usuario_nomina con auth_user_id válido
      const { data: nominaCheck, error: nominaError } = await adminSupabase
        .from('usuario_nomina')
        .select('auth_user_id, estado, rol')
        .eq('auth_user_id', user.auth_user_id)
        .eq('estado', 'activo')
        .not('auth_user_id', 'is', null)
      
      if (nominaError) {
        console.error(`     ❌ Error verificando usuario_nomina: ${nominaError.message}`)
      } else {
        console.log(`     ✅ Usuario en usuario_nomina: ${nominaCheck?.length > 0 ? 'Sí' : 'No'}`)
        if (nominaCheck?.length > 0) {
          console.log(`        - Estado: ${nominaCheck[0].estado}`)
          console.log(`        - Rol: ${nominaCheck[0].rol}`)
          console.log(`        - Auth ID: ${nominaCheck[0].auth_user_id}`)
        }
      }
      
      // Verificar si el usuario existe en auth.users
      const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(user.auth_user_id)
      
      if (authError) {
        console.error(`     ❌ Error verificando auth.users: ${authError.message}`)
      } else {
        console.log(`     ✅ Usuario en auth.users: ${authUser.user ? 'Sí' : 'No'}`)
        if (authUser.user) {
          console.log(`        - Email: ${authUser.user.email}`)
          console.log(`        - Confirmado: ${authUser.user.email_confirmed_at ? 'Sí' : 'No'}`)
        }
      }
    }
    
    // 5. Simular llamada a la API
    console.log('\n5. Simulando llamadas a la API...')
    
    for (const user of [...regularUsers.slice(0, 1), ...adminUsers.slice(0, 1)]) {
      console.log(`\n   🌐 Simulando API para ${user.colaborador} (${user.rol}):`)
      
      try {
        // Generar un token temporal
        const { data: tokenData, error: tokenError } = await adminSupabase.auth.admin.generateLink({
          type: 'recovery',
          email: user.correo_electronico
        })
        
        if (tokenError) {
          console.error(`     ❌ Error generando token: ${tokenError.message}`)
          continue
        }
        
        // Simular llamada POST a la API
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('/rest/v1', '')}/api/online-users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenData.properties?.access_token || 'fake-token'}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          console.log('     ✅ API POST exitoso')
        } else {
          const errorText = await response.text()
          console.error(`     ❌ API POST falló: ${response.status} - ${errorText}`)
        }
        
      } catch (apiError) {
        console.error(`     ❌ Error en simulación API: ${apiError.message}`)
      }
    }
    
    // 6. Verificar estado final de la tabla
    console.log('\n6. Estado final de la tabla online_users...')
    const { data: finalData, error: finalError } = await adminSupabase
      .from('online_users')
      .select(`
        user_id,
        last_seen_at,
        usuario_nomina!inner(colaborador, rol)
      `)
      .order('last_seen_at', { ascending: false })
    
    if (finalError) {
      console.error('❌ Error al verificar estado final:', finalError)
    } else {
      console.log(`✅ Total de registros: ${finalData?.length || 0}`)
      finalData?.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.usuario_nomina?.colaborador} (${record.usuario_nomina?.rol}) - ${record.last_seen_at}`)
      })
    }
    
    // 7. Diagnóstico específico de políticas
    console.log('\n7. Diagnóstico específico de políticas RLS...')
    
    // Verificar si las políticas están aplicadas
    try {
      const { data: policies, error: policyError } = await adminSupabase
        .rpc('exec_sql', {
          sql: `
            SELECT policyname, cmd, roles, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'online_users' 
            ORDER BY policyname;
          `
        })
      
      if (policyError) {
        console.log('⚠️  No se pudieron obtener políticas directamente')
      } else {
        console.log('📋 Políticas RLS actuales:')
        policies?.forEach(policy => {
          console.log(`   - ${policy.policyname} (${policy.cmd}): ${policy.roles}`)
        })
      }
    } catch (policyCheckError) {
      console.log('⚠️  Error verificando políticas:', policyCheckError.message)
    }
    
    console.log('\n📊 RESUMEN DEL DIAGNÓSTICO:')
    console.log('- Service role puede insertar para ambos tipos de usuario')
    console.log('- Verificar si las políticas RLS están bloqueando usuarios regulares')
    console.log('- Comprobar autenticación en la aplicación real')
    
  } catch (error) {
    console.error('❌ Error general en diagnóstico:', error)
  }
}

// Ejecutar el diagnóstico
debugUserInsertIssue().catch(console.error)
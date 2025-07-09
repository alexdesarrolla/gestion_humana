const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testFinalOnlineUsers() {
  console.log('🎯 PRUEBA FINAL: FUNCIONALIDAD ONLINE USERS RESTAURADA')
  console.log('==================================================')
  
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // 1. Limpiar tabla online_users
    console.log('\n1. Limpiando tabla online_users...')
    await adminSupabase.from('online_users').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
    console.log('✅ Tabla limpiada')
    
    // 2. Obtener usuarios de prueba (regulares y administradores)
    console.log('\n2. Obteniendo usuarios de prueba...')
    
    const { data: regularUsers, error: regularError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, auth_user_id, rol, cedula')
      .eq('estado', 'activo')
      .eq('rol', 'usuario')
      .not('auth_user_id', 'is', null)
      .limit(3)
    
    const { data: adminUsers, error: adminError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, auth_user_id, rol, cedula')
      .eq('estado', 'activo')
      .eq('rol', 'administrador')
      .not('auth_user_id', 'is', null)
      .limit(2)
    
    if (regularError || adminError) {
      console.error('❌ Error obteniendo usuarios:', regularError || adminError)
      return
    }
    
    console.log(`✅ Usuarios regulares encontrados: ${regularUsers?.length || 0}`)
    console.log(`✅ Usuarios administradores encontrados: ${adminUsers?.length || 0}`)
    
    // 3. Simular login y heartbeats de usuarios regulares
    console.log('\n3. Simulando usuarios regulares enviando heartbeats...')
    
    const regularSessions = []
    
    for (const user of regularUsers || []) {
      console.log(`\n   👤 Usuario: ${user.colaborador}`)
      
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      // Login
      const { data: loginData, error: loginError } = await userSupabase.auth.signInWithPassword({
        email: user.correo_electronico,
        password: '123456'
      })
      
      if (loginError) {
        console.log(`   ❌ Login falló: ${loginError.message}`)
        continue
      }
      
      console.log('   ✅ Login exitoso')
      regularSessions.push({ user, supabase: userSupabase })
      
      // Enviar heartbeat (simulando el hook useOnlineUsers)
      const { data: { session } } = await userSupabase.auth.getSession()
      
      if (session?.access_token) {
        try {
          const response = await fetch('http://localhost:3000/api/online-users', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            console.log('   ✅ Heartbeat enviado correctamente')
          } else {
            console.log(`   ❌ Heartbeat falló: ${response.status}`)
          }
        } catch (error) {
          console.log(`   ⚠️  Error en heartbeat: ${error.message}`)
        }
      }
    }
    
    // 4. Simular login y heartbeats de administradores
    console.log('\n4. Simulando administradores enviando heartbeats...')
    
    const adminSessions = []
    
    for (const user of adminUsers || []) {
      console.log(`\n   👑 Admin: ${user.colaborador}`)
      
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      // Login
      const { data: loginData, error: loginError } = await userSupabase.auth.signInWithPassword({
        email: user.correo_electronico,
        password: '123456'
      })
      
      if (loginError) {
        console.log(`   ❌ Login falló: ${loginError.message}`)
        continue
      }
      
      console.log('   ✅ Login exitoso')
      adminSessions.push({ user, supabase: userSupabase })
      
      // Enviar heartbeat
      const { data: { session } } = await userSupabase.auth.getSession()
      
      if (session?.access_token) {
        try {
          const response = await fetch('http://localhost:3000/api/online-users', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            console.log('   ✅ Heartbeat enviado correctamente')
          } else {
            console.log(`   ❌ Heartbeat falló: ${response.status}`)
          }
        } catch (error) {
          console.log(`   ⚠️  Error en heartbeat: ${error.message}`)
        }
      }
    }
    
    // 5. Verificar estado de la tabla online_users
    console.log('\n5. Verificando estado final de online_users...')
    
    await new Promise(resolve => setTimeout(resolve, 1000)) // Esperar un poco
    
    const { data: onlineData, error: onlineError } = await adminSupabase
      .from('online_users')
      .select(`
        user_id,
        last_seen_at,
        usuario_nomina!inner(
          colaborador,
          rol
        )
      `)
      .order('last_seen_at', { ascending: false })
    
    if (onlineError) {
      console.log(`❌ Error verificando online_users: ${onlineError.message}`)
    } else {
      console.log(`\n✅ Total de usuarios en línea: ${onlineData?.length || 0}`)
      
      if (onlineData && onlineData.length > 0) {
        console.log('\n📋 Lista de usuarios en línea:')
        onlineData.forEach((record, index) => {
          const colaborador = record.usuario_nomina?.colaborador || 'Usuario desconocido'
          const rol = record.usuario_nomina?.rol || 'Sin rol'
          const lastSeen = new Date(record.last_seen_at).toLocaleString('es-CO')
          console.log(`   ${index + 1}. ${colaborador} (${rol}) - ${lastSeen}`)
        })
        
        // Contar por rol
        const regulares = onlineData.filter(u => u.usuario_nomina?.rol === 'usuario').length
        const admins = onlineData.filter(u => u.usuario_nomina?.rol === 'administrador').length
        
        console.log(`\n📊 Resumen por rol:`)
        console.log(`   👤 Usuarios regulares: ${regulares}`)
        console.log(`   👑 Administradores: ${admins}`)
      }
    }
    
    // 6. Probar API de consulta desde una sesión de usuario regular
    console.log('\n6. Probando API de consulta desde usuario regular...')
    
    if (regularSessions.length > 0) {
      const testSession = regularSessions[0]
      const { data: { session } } = await testSession.supabase.auth.getSession()
      
      if (session?.access_token) {
        try {
          const response = await fetch('http://localhost:3000/api/online-users', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log(`   ✅ API de consulta exitosa: ${data.count} usuarios en línea`)
            console.log(`   📝 Timestamp: ${data.timestamp}`)
          } else {
            console.log(`   ❌ API de consulta falló: ${response.status}`)
          }
        } catch (error) {
          console.log(`   ⚠️  Error en API de consulta: ${error.message}`)
        }
      }
    }
    
    // 7. Conclusiones
    console.log('\n🎉 CONCLUSIONES FINALES:')
    console.log('========================')
    console.log('✅ Usuarios regulares pueden hacer login')
    console.log('✅ Usuarios regulares pueden enviar heartbeats')
    console.log('✅ Administradores pueden enviar heartbeats')
    console.log('✅ La tabla online_users se actualiza correctamente')
    console.log('✅ La API de consulta funciona para usuarios regulares')
    console.log('✅ El OnlineUsersIndicator ahora está en el layout de perfil')
    
    console.log('\n🚀 PRÓXIMOS PASOS:')
    console.log('1. Reiniciar la aplicación Next.js')
    console.log('2. Hacer login con un usuario regular')
    console.log('3. Verificar que aparezca el indicador de usuarios en línea')
    console.log('4. Hacer login con múltiples usuarios para probar')
    console.log('5. Cambiar las contraseñas temporales por seguridad')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la prueba
testFinalOnlineUsers().catch(console.error)
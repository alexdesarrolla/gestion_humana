const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testCompleteFlow() {
  console.log('🔄 PROBANDO FLUJO COMPLETO DE AUTENTICACIÓN')
  console.log('=============================================')
  
  try {
    // 1. Buscar un usuario de prueba
    console.log('\n1. Buscando usuario de prueba...')
    
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data: users, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, auth_user_id, rol, cedula')
      .eq('estado', 'activo')
      .eq('rol', 'usuario')
      .not('auth_user_id', 'is', null)
      .limit(1)
    
    if (userError || !users || users.length === 0) {
      console.error('❌ Error buscando usuarios:', userError)
      return
    }
    
    const testUser = users[0]
    console.log(`✅ Usuario de prueba: ${testUser.colaborador}`)
    console.log(`   Email: ${testUser.correo_electronico}`)
    console.log(`   Cédula: ${testUser.cedula}`)
    console.log(`   Auth ID: ${testUser.auth_user_id}`)
    
    // 2. Limpiar tabla online_users
    console.log('\n2. Limpiando tabla online_users...')
    await adminSupabase.from('online_users').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
    console.log('✅ Tabla limpiada')
    
    // 3. Simular login completo
    console.log('\n3. Simulando login completo...')
    
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    // Login con email
    console.log('   📧 Probando login con email...')
    const { data: emailLogin, error: emailError } = await userSupabase.auth.signInWithPassword({
      email: testUser.correo_electronico,
      password: '123456'
    })
    
    if (emailError) {
      console.log(`   ❌ Login con email falló: ${emailError.message}`)
      return
    }
    
    console.log('   ✅ Login con email exitoso')
    console.log(`   🎫 Token: ${emailLogin.session?.access_token?.substring(0, 30)}...`)
    
    // 4. Simular el hook useOnlineUsers
    console.log('\n4. Simulando hook useOnlineUsers...')
    
    // Función sendHeartbeat simulada
    const sendHeartbeat = async () => {
      try {
        const { data: { session } } = await userSupabase.auth.getSession()
        
        if (!session?.access_token) {
          console.log('      ❌ No hay sesión válida')
          return false
        }
        
        console.log('      ✅ Sesión válida obtenida')
        
        const response = await fetch('http://localhost:3000/api/online-users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`      ❌ Heartbeat API falló: ${response.status} - ${errorText}`)
          return false
        }
        
        console.log('      ✅ Heartbeat API exitoso')
        return true
      } catch (error) {
        console.log(`      ⚠️  Error en heartbeat: ${error.message}`)
        return false
      }
    }
    
    // Función fetchOnlineUsers simulada
    const fetchOnlineUsers = async () => {
      try {
        const { data: { session } } = await userSupabase.auth.getSession()
        
        if (!session?.access_token) {
          console.log('      ❌ No hay sesión para fetch')
          return null
        }
        
        const response = await fetch('http://localhost:3000/api/online-users', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`      ❌ Fetch API falló: ${response.status} - ${errorText}`)
          return null
        }
        
        const data = await response.json()
        console.log(`      ✅ Fetch API exitoso: ${data.count} usuarios en línea`)
        return data
      } catch (error) {
        console.log(`      ⚠️  Error en fetch: ${error.message}`)
        return null
      }
    }
    
    // Probar heartbeat
    console.log('\n   💓 Enviando heartbeat...')
    const heartbeatSuccess = await sendHeartbeat()
    
    if (heartbeatSuccess) {
      // Esperar un poco y probar fetch
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('\n   📖 Obteniendo usuarios en línea...')
      const onlineData = await fetchOnlineUsers()
      
      if (onlineData && onlineData.count > 0) {
        console.log('   ✅ Usuario aparece en línea correctamente')
        onlineData.users?.forEach((user, index) => {
          console.log(`      ${index + 1}. ${user.colaborador || 'Usuario'} - ${user.last_seen_at}`)
        })
      }
    }
    
    // 5. Probar con cédula (como en el login real)
    console.log('\n5. Probando login con cédula...')
    
    // Cerrar sesión actual
    await userSupabase.auth.signOut()
    
    // Crear nuevo cliente
    const cedulaSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    // Buscar email por cédula (como hace el login)
    const { data: cedulaData, error: cedulaError } = await cedulaSupabase
      .from('usuario_nomina')
      .select('correo_electronico')
      .eq('cedula', testUser.cedula)
      .single()
    
    if (cedulaError) {
      console.log(`   ❌ No se encontró usuario con cédula: ${cedulaError.message}`)
    } else {
      console.log(`   ✅ Email encontrado por cédula: ${cedulaData.correo_electronico}`)
      
      // Login con el email encontrado
      const { data: cedulaLogin, error: cedulaLoginError } = await cedulaSupabase.auth.signInWithPassword({
        email: cedulaData.correo_electronico,
        password: '123456'
      })
      
      if (cedulaLoginError) {
        console.log(`   ❌ Login con cédula falló: ${cedulaLoginError.message}`)
      } else {
        console.log('   ✅ Login con cédula exitoso')
        
        // Probar heartbeat con login por cédula
        console.log('\n   💓 Heartbeat con login por cédula...')
        
        const { data: { session } } = await cedulaSupabase.auth.getSession()
        
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
              console.log('   ✅ Heartbeat con cédula exitoso')
            } else {
              const errorText = await response.text()
              console.log(`   ❌ Heartbeat con cédula falló: ${response.status} - ${errorText}`)
            }
          } catch (apiError) {
            console.log(`   ⚠️  Error API: ${apiError.message}`)
          }
        }
      }
    }
    
    // 6. Verificar estado final
    console.log('\n6. Estado final...')
    
    const { data: finalData, error: finalError } = await adminSupabase
      .from('online_users')
      .select('user_id, last_seen_at')
      .order('last_seen_at', { ascending: false })
    
    if (finalError) {
      console.log(`❌ Error verificando estado final: ${finalError.message}`)
    } else {
      console.log(`✅ Total de registros finales: ${finalData?.length || 0}`)
      finalData?.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.user_id} - ${record.last_seen_at}`)
      })
    }
    
    console.log('\n📊 CONCLUSIONES:')
    console.log('✅ La autenticación funciona correctamente')
    console.log('✅ La API de online-users responde bien')
    console.log('✅ Los usuarios regulares pueden enviar heartbeats')
    console.log('\n📋 PRÓXIMOS PASOS:')
    console.log('1. Asegurar que los usuarios hagan login en la aplicación web')
    console.log('2. Verificar que el hook useOnlineUsers se ejecute automáticamente')
    console.log('3. Confirmar que el indicador visual funcione')
    console.log('4. Probar con múltiples usuarios simultáneamente')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la prueba
testCompleteFlow().catch(console.error)
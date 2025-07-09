const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testCurrentAuthState() {
  console.log('🔍 VERIFICANDO ESTADO ACTUAL DE AUTENTICACIÓN')
  console.log('==============================================')
  
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // 1. Verificar usuarios con contraseñas
    console.log('\n1. Verificando usuarios con contraseñas configuradas...')
    
    const { data: users, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, auth_user_id, rol')
      .eq('estado', 'activo')
      .not('auth_user_id', 'is', null)
      .limit(5)
    
    if (userError || !users) {
      console.error('❌ Error buscando usuarios:', userError)
      return
    }
    
    console.log(`✅ Encontrados ${users.length} usuarios activos`)
    
    // 2. Probar login con cada usuario
    console.log('\n2. Probando login con usuarios...')
    
    const testPassword = '123456'
    let successfulLogins = 0
    
    for (const user of users) {
      console.log(`\n   👤 ${user.colaborador} (${user.rol})`)
      console.log(`      Email: ${user.correo_electronico}`)
      
      try {
        // Crear cliente para pruebas
        const testSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        
        // Intentar login
        const { data: signInData, error: signInError } = await testSupabase.auth.signInWithPassword({
          email: user.correo_electronico,
          password: testPassword
        })
        
        if (signInError) {
          console.log(`      ❌ Login falló: ${signInError.message}`)
          continue
        }
        
        if (!signInData.session) {
          console.log('      ❌ No se obtuvo sesión')
          continue
        }
        
        console.log('      ✅ Login exitoso')
        console.log(`      🎫 Token: ${signInData.session.access_token.substring(0, 30)}...`)
        successfulLogins++
        
        // Probar heartbeat con la sesión real
        console.log('      💓 Probando heartbeat con sesión real...')
        
        try {
          const response = await fetch('http://localhost:3000/api/online-users', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${signInData.session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            console.log('      ✅ Heartbeat API exitoso')
          } else {
            const errorText = await response.text()
            console.log(`      ❌ Heartbeat API falló: ${response.status} - ${errorText}`)
          }
        } catch (apiError) {
          console.log(`      ⚠️  Error API (servidor no ejecutándose): ${apiError.message}`)
        }
        
        // Probar INSERT directo en Supabase
        console.log('      📝 Probando INSERT directo...')
        
        const { error: insertError } = await testSupabase
          .from('online_users')
          .upsert({
            user_id: user.auth_user_id,
            last_seen_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
        
        if (insertError) {
          console.log(`      ❌ INSERT directo falló: ${insertError.message}`)
        } else {
          console.log('      ✅ INSERT directo exitoso')
        }
        
        // Cerrar sesión
        await testSupabase.auth.signOut()
        
      } catch (userTestError) {
        console.log(`      ❌ Error en prueba: ${userTestError.message}`)
      }
      
      // Pausa entre usuarios
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 3. Verificar estado de online_users
    console.log('\n3. Estado actual de online_users...')
    
    const { data: onlineData, error: onlineError } = await adminSupabase
      .from('online_users')
      .select('user_id, last_seen_at')
      .order('last_seen_at', { ascending: false })
    
    if (onlineError) {
      console.log(`❌ Error consultando online_users: ${onlineError.message}`)
    } else {
      console.log(`✅ Registros en online_users: ${onlineData?.length || 0}`)
      onlineData?.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.user_id} - ${record.last_seen_at}`)
      })
    }
    
    // 4. Verificar políticas RLS
    console.log('\n4. Verificando políticas RLS...')
    
    try {
      const { data: policies, error: policyError } = await adminSupabase
        .rpc('exec_sql', {
          sql: `
            SELECT 
              policyname, 
              cmd, 
              roles,
              qual,
              with_check
            FROM pg_policies 
            WHERE tablename = 'online_users'
            ORDER BY policyname;
          `
        })
      
      if (policyError) {
        console.log(`⚠️  No se pudieron consultar políticas: ${policyError.message}`)
      } else {
        console.log(`✅ Políticas RLS activas: ${policies?.length || 0}`)
        policies?.forEach(policy => {
          console.log(`   - ${policy.policyname} (${policy.cmd}) para ${policy.roles}`)
        })
      }
    } catch (policyCheckError) {
      console.log(`⚠️  Error verificando políticas: ${policyCheckError.message}`)
    }
    
    // 5. Probar con un usuario específico y mantener sesión
    console.log('\n5. Prueba extendida con un usuario...')
    
    const testUser = users.find(u => u.rol === 'usuario')
    if (testUser) {
      console.log(`   Probando con: ${testUser.colaborador}`)
      
      const persistentSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      const { data: persistentSignIn, error: persistentError } = await persistentSupabase.auth.signInWithPassword({
        email: testUser.correo_electronico,
        password: testPassword
      })
      
      if (persistentError) {
        console.log(`   ❌ Login persistente falló: ${persistentError.message}`)
      } else {
        console.log('   ✅ Login persistente exitoso')
        
        // Verificar sesión
        const { data: { session }, error: sessionError } = await persistentSupabase.auth.getSession()
        
        if (sessionError || !session) {
          console.log('   ❌ No se pudo obtener sesión')
        } else {
          console.log('   ✅ Sesión obtenida correctamente')
          console.log(`   👤 Usuario: ${session.user.email}`)
          console.log(`   🎫 Token válido: ${session.access_token ? 'Sí' : 'No'}`)
          
          // Probar múltiples heartbeats
          console.log('   💓 Enviando múltiples heartbeats...')
          
          for (let i = 1; i <= 3; i++) {
            const { error: heartbeatError } = await persistentSupabase
              .from('online_users')
              .upsert({
                user_id: testUser.auth_user_id,
                last_seen_at: new Date().toISOString()
              }, {
                onConflict: 'user_id'
              })
            
            if (heartbeatError) {
              console.log(`      ${i}. ❌ Heartbeat falló: ${heartbeatError.message}`)
            } else {
              console.log(`      ${i}. ✅ Heartbeat exitoso`)
            }
            
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        
        await persistentSupabase.auth.signOut()
      }
    }
    
    console.log('\n📊 RESUMEN:')
    console.log(`✅ Logins exitosos: ${successfulLogins}/${users.length}`)
    console.log('\n📋 RECOMENDACIONES:')
    
    if (successfulLogins === 0) {
      console.log('❌ CRÍTICO: Ningún usuario puede hacer login')
      console.log('   - Verificar configuración de Supabase Auth')
      console.log('   - Revisar variables de entorno')
      console.log('   - Confirmar que las contraseñas se configuraron correctamente')
    } else if (successfulLogins < users.length) {
      console.log('⚠️  PARCIAL: Algunos usuarios no pueden hacer login')
      console.log('   - Verificar contraseñas de usuarios específicos')
      console.log('   - Confirmar emails en auth.users')
    } else {
      console.log('✅ EXCELENTE: Todos los usuarios pueden hacer login')
      console.log('   - El problema puede estar en la aplicación Next.js')
      console.log('   - Verificar que los usuarios hagan login en la aplicación')
      console.log('   - Revisar el manejo de sesiones en el frontend')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la prueba
testCurrentAuthState().catch(console.error)
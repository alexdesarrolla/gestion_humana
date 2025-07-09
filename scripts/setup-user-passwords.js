const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function setupUserPasswords() {
  console.log('🔐 CONFIGURANDO CONTRASEÑAS PARA USUARIOS')
  console.log('========================================')
  
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // 1. Buscar usuarios regulares sin contraseña
    console.log('\n1. Buscando usuarios regulares...')
    const { data: users, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, auth_user_id, rol')
      .eq('estado', 'activo')
      .eq('rol', 'usuario')
      .not('auth_user_id', 'is', null)
      .limit(10)
    
    if (userError || !users) {
      console.error('❌ Error buscando usuarios:', userError)
      return
    }
    
    console.log(`✅ Encontrados ${users.length} usuarios regulares`)
    
    // 2. Verificar y configurar contraseñas
    console.log('\n2. Configurando contraseñas...')
    
    const defaultPassword = '123456' // Contraseña temporal
    let successCount = 0
    let errorCount = 0
    
    for (const user of users) {
      console.log(`\n   👤 ${user.colaborador}`)
      console.log(`      Email: ${user.correo_electronico}`)
      
      try {
        // Verificar si el usuario existe en auth
        const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(user.auth_user_id)
        
        if (authError || !authUser.user) {
          console.log('      ❌ Usuario no encontrado en auth')
          errorCount++
          continue
        }
        
        // Verificar si ya tiene contraseña
        if (authUser.user.encrypted_password) {
          console.log('      ✅ Ya tiene contraseña configurada')
          successCount++
          continue
        }
        
        // Configurar contraseña
        console.log('      🔑 Configurando contraseña...')
        
        const { data: updateData, error: updateError } = await adminSupabase.auth.admin.updateUserById(
          user.auth_user_id,
          {
            password: defaultPassword,
            email_confirm: true // Confirmar email si no está confirmado
          }
        )
        
        if (updateError) {
          console.log(`      ❌ Error configurando contraseña: ${updateError.message}`)
          errorCount++
        } else {
          console.log('      ✅ Contraseña configurada exitosamente')
          successCount++
          
          // Probar login inmediatamente
          console.log('      🧪 Probando login...')
          
          const testSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          )
          
          const { data: signInData, error: signInError } = await testSupabase.auth.signInWithPassword({
            email: user.correo_electronico,
            password: defaultPassword
          })
          
          if (signInError) {
            console.log(`      ⚠️  Login de prueba falló: ${signInError.message}`)
          } else {
            console.log('      ✅ Login de prueba exitoso')
            
            // Probar heartbeat
            console.log('      💓 Probando heartbeat...')
            
            const { error: heartbeatError } = await testSupabase
              .from('online_users')
              .upsert({
                user_id: user.auth_user_id,
                last_seen_at: new Date().toISOString()
              }, {
                onConflict: 'user_id'
              })
            
            if (heartbeatError) {
              console.log(`      ❌ Heartbeat falló: ${heartbeatError.message}`)
            } else {
              console.log('      ✅ Heartbeat exitoso')
            }
            
            // Cerrar sesión
            await testSupabase.auth.signOut()
          }
        }
        
      } catch (userError) {
        console.log(`      ❌ Error procesando usuario: ${userError.message}`)
        errorCount++
      }
      
      // Pequeña pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 3. Verificar administradores también
    console.log('\n3. Verificando administradores...')
    
    const { data: admins, error: adminError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, auth_user_id, rol')
      .eq('estado', 'activo')
      .eq('rol', 'administrador')
      .not('auth_user_id', 'is', null)
      .limit(5)
    
    if (adminError || !admins) {
      console.log('⚠️  No se pudieron verificar administradores')
    } else {
      console.log(`✅ Encontrados ${admins.length} administradores`)
      
      for (const admin of admins) {
        console.log(`\n   👑 ${admin.colaborador}`)
        
        try {
          const { data: authAdmin, error: authAdminError } = await adminSupabase.auth.admin.getUserById(admin.auth_user_id)
          
          if (authAdminError || !authAdmin.user) {
            console.log('      ❌ No encontrado en auth')
            continue
          }
          
          const hasPassword = authAdmin.user.encrypted_password ? 'Sí' : 'No'
          console.log(`      🔑 Tiene contraseña: ${hasPassword}`)
          
          if (!authAdmin.user.encrypted_password) {
            console.log('      🔧 Configurando contraseña para admin...')
            
            const { error: adminUpdateError } = await adminSupabase.auth.admin.updateUserById(
              admin.auth_user_id,
              {
                password: defaultPassword,
                email_confirm: true
              }
            )
            
            if (adminUpdateError) {
              console.log(`      ❌ Error: ${adminUpdateError.message}`)
            } else {
              console.log('      ✅ Contraseña configurada')
            }
          }
          
        } catch (adminCheckError) {
          console.log(`      ❌ Error verificando admin: ${adminCheckError.message}`)
        }
      }
    }
    
    // 4. Verificar estado final
    console.log('\n4. Verificando estado final...')
    
    // Limpiar online_users primero
    await adminSupabase.from('online_users').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
    
    // Probar login con algunos usuarios
    console.log('\n   🧪 Probando logins finales...')
    
    const testUsers = users.slice(0, 3) // Probar con 3 usuarios
    
    for (const testUser of testUsers) {
      console.log(`\n      Probando: ${testUser.colaborador}`)
      
      const testSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      const { data: finalSignIn, error: finalSignInError } = await testSupabase.auth.signInWithPassword({
        email: testUser.correo_electronico,
        password: defaultPassword
      })
      
      if (finalSignInError) {
        console.log(`         ❌ Login falló: ${finalSignInError.message}`)
      } else {
        console.log('         ✅ Login exitoso')
        
        // Enviar heartbeat
        const { error: finalHeartbeatError } = await testSupabase
          .from('online_users')
          .upsert({
            user_id: testUser.auth_user_id,
            last_seen_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
        
        if (finalHeartbeatError) {
          console.log(`         ❌ Heartbeat falló: ${finalHeartbeatError.message}`)
        } else {
          console.log('         ✅ Heartbeat exitoso')
        }
        
        await testSupabase.auth.signOut()
      }
    }
    
    // Verificar registros en online_users
    const { data: finalOnlineData, error: finalOnlineError } = await adminSupabase
      .from('online_users')
      .select('user_id, last_seen_at')
      .order('last_seen_at', { ascending: false })
    
    if (finalOnlineError) {
      console.log(`❌ Error verificando online_users: ${finalOnlineError.message}`)
    } else {
      console.log(`\n✅ Registros finales en online_users: ${finalOnlineData?.length || 0}`)
      finalOnlineData?.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.user_id} - ${record.last_seen_at}`)
      })
    }
    
    console.log('\n📊 RESUMEN:')
    console.log(`✅ Usuarios configurados exitosamente: ${successCount}`)
    console.log(`❌ Errores: ${errorCount}`)
    console.log(`🔑 Contraseña temporal: ${defaultPassword}`)
    console.log('\n📋 PRÓXIMOS PASOS:')
    console.log('1. Reiniciar la aplicación Next.js')
    console.log('2. Probar login con usuarios regulares')
    console.log('3. Verificar que aparezcan en el indicador de usuarios en línea')
    console.log('4. Cambiar contraseñas por defecto por seguridad')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la configuración
setupUserPasswords().catch(console.error)
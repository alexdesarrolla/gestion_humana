const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function debugAuthSessions() {
  console.log('🔍 DEPURANDO SESIONES DE AUTENTICACIÓN')
  console.log('=======================================')
  
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // 1. Buscar usuarios activos
    console.log('\n1. Buscando usuarios activos...')
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
    
    // 2. Verificar estado en auth.users
    console.log('\n2. Verificando estado en auth.users...')
    
    for (const user of users) {
      console.log(`\n   👤 ${user.colaborador} (${user.rol})`)
      console.log(`      Email: ${user.correo_electronico}`)
      console.log(`      Auth ID: ${user.auth_user_id}`)
      
      try {
        // Verificar usuario en auth
        const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(user.auth_user_id)
        
        if (authError) {
          console.log(`      ❌ Error en auth: ${authError.message}`)
          continue
        }
        
        if (!authUser.user) {
          console.log('      ❌ Usuario no encontrado en auth.users')
          continue
        }
        
        console.log(`      ✅ Usuario en auth: ${authUser.user.email}`)
        console.log(`      📧 Email confirmado: ${authUser.user.email_confirmed_at ? 'Sí' : 'No'}`)
        console.log(`      🔐 Último login: ${authUser.user.last_sign_in_at || 'Nunca'}`)
        console.log(`      📱 Teléfono confirmado: ${authUser.user.phone_confirmed_at ? 'Sí' : 'No'}`)
        console.log(`      🆔 Proveedor: ${authUser.user.app_metadata?.provider || 'email'}`)
        
        // Verificar si tiene contraseña
        const hasPassword = authUser.user.encrypted_password ? 'Sí' : 'No'
        console.log(`      🔑 Tiene contraseña: ${hasPassword}`)
        
        // Intentar generar un token de acceso
        console.log('\n      🎫 Generando token de acceso...')
        
        try {
          const { data: tokenData, error: tokenError } = await adminSupabase.auth.admin.generateLink({
            type: 'magiclink',
            email: authUser.user.email
          })
          
          if (tokenError) {
            console.log(`         ❌ Error generando token: ${tokenError.message}`)
          } else {
            console.log('         ✅ Token generado exitosamente')
            
            // Probar el token
            const testSupabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            )
            
            const { data: sessionData, error: sessionError } = await testSupabase.auth.getUser(tokenData.properties?.access_token)
            
            if (sessionError) {
              console.log(`         ❌ Token inválido: ${sessionError.message}`)
            } else {
              console.log('         ✅ Token válido')
              
              // Probar INSERT en online_users
              const { error: insertError } = await testSupabase
                .from('online_users')
                .upsert({
                  user_id: user.auth_user_id,
                  last_seen_at: new Date().toISOString()
                }, {
                  onConflict: 'user_id'
                })
              
              if (insertError) {
                console.log(`         ❌ INSERT falló: ${insertError.message}`)
              } else {
                console.log('         ✅ INSERT exitoso')
              }
            }
          }
        } catch (tokenGenError) {
          console.log(`         ❌ Error generando token: ${tokenGenError.message}`)
        }
        
      } catch (userCheckError) {
        console.log(`      ❌ Error verificando usuario: ${userCheckError.message}`)
      }
    }
    
    // 3. Verificar configuración de autenticación
    console.log('\n3. Verificando configuración de autenticación...')
    
    try {
      // Intentar obtener configuración de auth
      const { data: settings, error: settingsError } = await adminSupabase.auth.admin.listUsers()
      
      if (settingsError) {
        console.log(`❌ Error obteniendo configuración: ${settingsError.message}`)
      } else {
        console.log(`✅ Total de usuarios en auth: ${settings.users?.length || 0}`)
        
        // Contar usuarios por estado
        const confirmedUsers = settings.users?.filter(u => u.email_confirmed_at) || []
        const unconfirmedUsers = settings.users?.filter(u => !u.email_confirmed_at) || []
        
        console.log(`📧 Usuarios confirmados: ${confirmedUsers.length}`)
        console.log(`⏳ Usuarios sin confirmar: ${unconfirmedUsers.length}`)
      }
    } catch (configError) {
      console.log(`❌ Error verificando configuración: ${configError.message}`)
    }
    
    // 4. Probar autenticación con email/password
    console.log('\n4. Probando autenticación con email/password...')
    
    const testUser = users.find(u => u.rol === 'usuario')
    if (testUser) {
      console.log(`   Probando con: ${testUser.colaborador}`)
      
      const testSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      // Intentar login con contraseña por defecto
      const { data: signInData, error: signInError } = await testSupabase.auth.signInWithPassword({
        email: testUser.correo_electronico,
        password: '123456' // Contraseña común de prueba
      })
      
      if (signInError) {
        console.log(`   ❌ Login falló: ${signInError.message}`)
        
        // Intentar con otras contraseñas comunes
        const commonPasswords = ['password', 'admin', '12345678', testUser.correo_electronico]
        
        for (const pwd of commonPasswords) {
          const { data: tryData, error: tryError } = await testSupabase.auth.signInWithPassword({
            email: testUser.correo_electronico,
            password: pwd
          })
          
          if (!tryError && tryData.user) {
            console.log(`   ✅ Login exitoso con contraseña: ${pwd}`)
            break
          }
        }
      } else {
        console.log('   ✅ Login exitoso con contraseña por defecto')
        console.log(`   🎫 Token: ${signInData.session?.access_token?.substring(0, 20)}...`)
      }
    }
    
    // 5. Verificar estado actual de online_users
    console.log('\n5. Estado actual de online_users...')
    
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
    
    console.log('\n📊 RESUMEN DEL DIAGNÓSTICO:')
    console.log('1. Verificar que los usuarios tengan contraseñas válidas')
    console.log('2. Confirmar que los emails estén verificados')
    console.log('3. Asegurar que la autenticación funcione en la aplicación')
    console.log('4. Verificar que las políticas RLS permitan a usuarios regulares')
    console.log('5. Comprobar que el hook useOnlineUsers obtenga sesiones válidas')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el diagnóstico
debugAuthSessions().catch(console.error)
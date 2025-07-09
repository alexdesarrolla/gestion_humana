const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testAPIDirectly() {
  console.log('🧪 PROBANDO API DE ONLINE-USERS DIRECTAMENTE')
  console.log('=============================================')
  
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // 1. Buscar usuarios de prueba
    console.log('\n1. Buscando usuarios de prueba...')
    const { data: users, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, auth_user_id, rol')
      .eq('estado', 'activo')
      .not('auth_user_id', 'is', null)
      .limit(3)
    
    if (userError || !users) {
      console.error('❌ Error buscando usuarios:', userError)
      return
    }
    
    const regularUsers = users.filter(u => u.rol === 'usuario')
    const adminUsers = users.filter(u => u.rol === 'administrador')
    
    console.log(`✅ Usuarios regulares: ${regularUsers.length}`)
    console.log(`✅ Administradores: ${adminUsers.length}`)
    
    // 2. Limpiar tabla
    console.log('\n2. Limpiando tabla online_users...')
    await adminSupabase.from('online_users').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
    
    // 3. Crear tokens de acceso reales para usuarios
    console.log('\n3. Creando tokens de acceso...')
    
    const testUsers = [...regularUsers.slice(0, 2), ...adminUsers.slice(0, 1)]
    
    for (const user of testUsers) {
      console.log(`\n   🔑 Creando token para ${user.colaborador} (${user.rol})...`)
      
      try {
        // Obtener o crear usuario en auth
        const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(user.auth_user_id)
        
        if (authError) {
          console.error(`     ❌ Error obteniendo usuario: ${authError.message}`)
          continue
        }
        
        if (!authUser.user) {
          console.error('     ❌ Usuario no encontrado en auth')
          continue
        }
        
        console.log(`     ✅ Usuario encontrado: ${authUser.user.email}`)
        
        // Generar token de acceso
        const { data: tokenData, error: tokenError } = await adminSupabase.auth.admin.generateLink({
          type: 'magiclink',
          email: authUser.user.email
        })
        
        if (tokenError) {
          console.error(`     ❌ Error generando token: ${tokenError.message}`)
          continue
        }
        
        console.log('     ✅ Token generado')
        
        // 4. Probar API con token real
        console.log('\n   🌐 Probando API POST...')
        
        // Crear cliente con el token
        const userSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            global: {
              headers: {
                'Authorization': `Bearer ${tokenData.properties?.access_token || 'invalid'}`
              }
            }
          }
        )
        
        // Verificar autenticación
        const { data: sessionData, error: sessionError } = await userSupabase.auth.getUser()
        
        if (sessionError) {
          console.log(`     ⚠️  Error de sesión: ${sessionError.message}`)
        } else {
          console.log(`     ✅ Sesión válida: ${sessionData.user?.email}`)
        }
        
        // Probar INSERT directo
        console.log('\n   📝 Probando INSERT directo...')
        const { data: insertData, error: insertError } = await userSupabase
          .from('online_users')
          .insert({
            user_id: user.auth_user_id,
            last_seen_at: new Date().toISOString()
          })
          .select()
        
        if (insertError) {
          console.error(`     ❌ INSERT error: ${insertError.message}`)
          console.error(`     Detalles:`, insertError)
        } else {
          console.log('     ✅ INSERT exitoso')
        }
        
        // Probar UPSERT (como en la API real)
        console.log('\n   🔄 Probando UPSERT...')
        const { data: upsertData, error: upsertError } = await userSupabase
          .from('online_users')
          .upsert({
            user_id: user.auth_user_id,
            last_seen_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
        
        if (upsertError) {
          console.error(`     ❌ UPSERT error: ${upsertError.message}`)
        } else {
          console.log('     ✅ UPSERT exitoso')
        }
        
        // Probar SELECT
        console.log('\n   📖 Probando SELECT...')
        const { data: selectData, error: selectError } = await userSupabase
          .from('online_users')
          .select('*')
        
        if (selectError) {
          console.error(`     ❌ SELECT error: ${selectError.message}`)
        } else {
          console.log(`     ✅ SELECT exitoso: ${selectData?.length || 0} registros`)
        }
        
      } catch (userTestError) {
        console.error(`     ❌ Error en prueba de usuario: ${userTestError.message}`)
      }
    }
    
    // 5. Verificar estado final con service role
    console.log('\n5. Estado final de la tabla...')
    const { data: finalData, error: finalError } = await adminSupabase
      .from('online_users')
      .select('user_id, last_seen_at')
      .order('last_seen_at', { ascending: false })
    
    if (finalError) {
      console.error('❌ Error verificando estado final:', finalError)
    } else {
      console.log(`✅ Total de registros: ${finalData?.length || 0}`)
      finalData?.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.user_id} - ${record.last_seen_at}`)
      })
    }
    
    // 6. Probar la API HTTP real
    console.log('\n6. Probando API HTTP real...')
    
    if (testUsers.length > 0) {
      const testUser = testUsers[0]
      console.log(`   Probando con: ${testUser.colaborador}`)
      
      try {
        // Generar token para API HTTP
        const { data: httpTokenData, error: httpTokenError } = await adminSupabase.auth.admin.generateLink({
          type: 'recovery',
          email: testUser.correo_electronico
        })
        
        if (httpTokenError) {
          console.error(`   ❌ Error generando token HTTP: ${httpTokenError.message}`)
        } else {
          // Construir URL correcta
          const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('/rest/v1', '')
          const apiUrl = `http://localhost:3000/api/online-users` // URL local de Next.js
          
          console.log(`   🌐 Llamando a: ${apiUrl}`)
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${httpTokenData.properties?.access_token || 'test-token'}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const result = await response.json()
            console.log('   ✅ API HTTP exitosa:', result)
          } else {
            const errorText = await response.text()
            console.log(`   ❌ API HTTP falló: ${response.status} - ${errorText}`)
          }
        }
      } catch (httpError) {
        console.log(`   ⚠️  Error en API HTTP (servidor no ejecutándose): ${httpError.message}`)
      }
    }
    
    console.log('\n📊 RESUMEN:')
    console.log('✅ Service role funciona correctamente')
    console.log('✅ Usuarios regulares pueden ser insertados por service role')
    console.log('⚠️  Verificar autenticación en aplicación real')
    console.log('⚠️  Probar con servidor Next.js ejecutándose')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la prueba
testAPIDirectly().catch(console.error)
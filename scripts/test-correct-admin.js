const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testCorrectAdmin() {
  console.log('🔍 PROBANDO LOGIN CON ADMINISTRADOR CORRECTO')
  console.log('===========================================')
  
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // 1. Verificar datos del administrador
    console.log('\n1. Verificando datos del administrador...')
    
    const { data: adminUser, error: adminError } = await adminSupabase
      .from('usuario_nomina')
      .select('*')
      .eq('correo_electronico', 'admin@gestionhumana360.co')
      .single()
    
    if (adminError) {
      console.log(`❌ Error: ${adminError.message}`)
      return
    }
    
    console.log('✅ Administrador encontrado:')
    console.log(`   Nombre: ${adminUser.colaborador}`)
    console.log(`   Email: ${adminUser.correo_electronico}`)
    console.log(`   Rol: ${adminUser.rol}`)
    console.log(`   Estado: ${adminUser.estado}`)
    console.log(`   Auth ID: ${adminUser.auth_user_id}`)
    
    // 2. Probar login con email correcto
    console.log('\n2. Probando login con admin@gestionhumana360.co...')
    
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: loginData, error: loginError } = await userSupabase.auth.signInWithPassword({
      email: 'admin@gestionhumana360.co',
      password: '1q2w3e4r'
    })
    
    if (loginError) {
      console.log(`❌ Error en login: ${loginError.message}`)
      
      // Intentar con la contraseña temporal
      console.log('\n3. Probando con contraseña temporal (123456)...')
      
      const { data: tempLoginData, error: tempLoginError } = await userSupabase.auth.signInWithPassword({
        email: 'admin@gestionhumana360.co',
        password: '123456'
      })
      
      if (tempLoginError) {
        console.log(`❌ Error con contraseña temporal: ${tempLoginError.message}`)
        
        // Resetear contraseña a la original
        console.log('\n4. Reseteando contraseña a 1q2w3e4r...')
        
        const { error: resetError } = await adminSupabase.auth.admin.updateUserById(
          adminUser.auth_user_id,
          { password: '1q2w3e4r' }
        )
        
        if (resetError) {
          console.log(`❌ Error reseteando: ${resetError.message}`)
        } else {
          console.log('✅ Contraseña reseteada correctamente')
          
          // Probar login final
          console.log('\n5. Probando login final...')
          
          const { data: finalLoginData, error: finalLoginError } = await userSupabase.auth.signInWithPassword({
            email: 'admin@gestionhumana360.co',
            password: '1q2w3e4r'
          })
          
          if (finalLoginError) {
            console.log(`❌ Login final falló: ${finalLoginError.message}`)
          } else {
            console.log('✅ Login final exitoso')
            console.log(`   Token: ${finalLoginData.session?.access_token?.substring(0, 30)}...`)
          }
        }
      } else {
        console.log('✅ Login exitoso con contraseña temporal')
        console.log(`   Token: ${tempLoginData.session?.access_token?.substring(0, 30)}...`)
        
        // Cambiar contraseña de vuelta
        console.log('\n4. Cambiando contraseña de vuelta a 1q2w3e4r...')
        
        const { error: changeError } = await userSupabase.auth.updateUser({
          password: '1q2w3e4r'
        })
        
        if (changeError) {
          console.log(`❌ Error cambiando contraseña: ${changeError.message}`)
        } else {
          console.log('✅ Contraseña cambiada correctamente')
        }
      }
    } else {
      console.log('✅ Login exitoso con contraseña original')
      console.log(`   Token: ${loginData.session?.access_token?.substring(0, 30)}...`)
    }
    
    // 3. Probar acceso a la API
    console.log('\n6. Probando acceso a API de administración...')
    
    const { data: { session } } = await userSupabase.auth.getSession()
    
    if (session?.access_token) {
      try {
        const response = await fetch('http://localhost:3001/api/online-users', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ API funcionando: ${data.count} usuarios en línea`)
        } else {
          console.log(`❌ API falló: ${response.status}`)
        }
      } catch (error) {
        console.log(`⚠️  Error en API: ${error.message}`)
      }
    }
    
    console.log('\n📋 CREDENCIALES CORRECTAS:')
    console.log('==========================')
    console.log('Email: admin@gestionhumana360.co')
    console.log('Contraseña: 1q2w3e4r')
    console.log('URL: http://localhost:3001')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la prueba
testCorrectAdmin().catch(console.error)
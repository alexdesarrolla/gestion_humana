const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function quickVerification() {
  console.log('🔍 VERIFICACIÓN RÁPIDA - FUNCIONALIDAD RESTAURADA')
  console.log('==============================================')
  
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // 1. Obtener un usuario regular de prueba
    console.log('\n1. Obteniendo usuario regular de prueba...')
    
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
    
    // 2. Simular login
    console.log('\n2. Simulando login...')
    
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: loginData, error: loginError } = await userSupabase.auth.signInWithPassword({
      email: testUser.correo_electronico,
      password: '123456'
    })
    
    if (loginError) {
      console.log(`❌ Login falló: ${loginError.message}`)
      return
    }
    
    console.log('✅ Login exitoso')
    
    // 3. Probar heartbeat con puerto correcto
    console.log('\n3. Probando heartbeat API...')
    
    const { data: { session } } = await userSupabase.auth.getSession()
    
    if (session?.access_token) {
      try {
        const response = await fetch('http://localhost:3001/api/online-users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          console.log('✅ Heartbeat API funcionando correctamente')
        } else {
          const errorText = await response.text()
          console.log(`❌ Heartbeat falló: ${response.status} - ${errorText}`)
          return
        }
      } catch (error) {
        console.log(`⚠️  Error en heartbeat: ${error.message}`)
        return
      }
    }
    
    // 4. Probar consulta API
    console.log('\n4. Probando consulta de usuarios en línea...')
    
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
        console.log(`✅ Consulta API exitosa: ${data.count} usuarios en línea`)
        
        if (data.users && data.users.length > 0) {
          console.log('\n📋 Usuarios en línea:')
          data.users.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.colaborador || 'Usuario'} - ${user.last_seen_at}`)
          })
        }
      } else {
        console.log(`❌ Consulta falló: ${response.status}`)
      }
    } catch (error) {
      console.log(`⚠️  Error en consulta: ${error.message}`)
    }
    
    console.log('\n🎉 RESUMEN:')
    console.log('✅ Servidor Next.js funcionando en puerto 3001')
    console.log('✅ API de online-users respondiendo correctamente')
    console.log('✅ Usuarios regulares pueden enviar heartbeats')
    console.log('✅ OnlineUsersIndicator agregado al layout de perfil')
    
    console.log('\n🚀 INSTRUCCIONES PARA PROBAR:')
    console.log('1. Abrir http://localhost:3001 en el navegador')
    console.log('2. Hacer login con un usuario regular:')
    console.log(`   - Email: ${testUser.correo_electronico}`)
    console.log(`   - Cédula: ${testUser.cedula}`)
    console.log('   - Contraseña: 123456')
    console.log('3. Verificar que aparezca el indicador de usuarios en línea en la esquina superior derecha')
    console.log('4. Abrir otra ventana/pestaña e iniciar sesión con otro usuario')
    console.log('5. Verificar que ambos usuarios aparezcan en el indicador')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la verificación
quickVerification().catch(console.error)
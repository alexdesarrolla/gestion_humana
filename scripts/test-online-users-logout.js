require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
// Usar fetch global de Node.js 18+
if (!globalThis.fetch) {
  globalThis.fetch = require('undici').fetch
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testOnlineUsersLogout() {
  console.log('🔍 PROBANDO FUNCIONALIDAD DE LOGOUT DE USUARIOS EN LÍNEA')
  
  try {
    // 1. Login con el administrador correcto
    console.log('\n1. Iniciando sesión con administrador...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@gestionhumana.co',
      password: '123456'
    })
    
    if (authError) {
      console.error('❌ Error en login:', authError.message)
      return
    }
    
    console.log('✅ Login exitoso')
    const token = authData.session.access_token
    
    // 2. Enviar heartbeat para aparecer en línea
    console.log('\n2. Enviando heartbeat para aparecer en línea...')
    const heartbeatResponse = await fetch('http://localhost:3000/api/online-users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (heartbeatResponse.ok) {
      console.log('✅ Heartbeat enviado correctamente')
    } else {
      console.log('❌ Error enviando heartbeat:', await heartbeatResponse.text())
    }
    
    // 3. Verificar que aparece en la lista de usuarios en línea
    console.log('\n3. Verificando usuarios en línea...')
    const onlineResponse = await fetch('http://localhost:3000/api/online-users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (onlineResponse.ok) {
      const onlineData = await onlineResponse.json()
      console.log('✅ Usuarios en línea:', onlineData.count)
      console.log('📋 Lista:', onlineData.users?.map(u => u.nombre_completo || u.email) || [])
    } else {
      console.log('❌ Error obteniendo usuarios en línea:', await onlineResponse.text())
    }
    
    // 4. Simular logout (eliminar de usuarios en línea)
    console.log('\n4. Simulando logout...')
    const logoutResponse = await fetch('http://localhost:3000/api/online-users', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (logoutResponse.ok) {
      console.log('✅ Usuario eliminado de la lista en línea')
    } else {
      console.log('❌ Error eliminando usuario:', await logoutResponse.text())
    }
    
    // 5. Verificar que ya no aparece en la lista
    console.log('\n5. Verificando que el usuario ya no está en línea...')
    const finalResponse = await fetch('http://localhost:3000/api/online-users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (finalResponse.ok) {
      const finalData = await finalResponse.json()
      console.log('✅ Usuarios en línea después del logout:', finalData.count)
      console.log('📋 Lista final:', finalData.users?.map(u => u.nombre_completo || u.email) || [])
    } else {
      console.log('❌ Error obteniendo usuarios finales:', await finalResponse.text())
    }
    
    // 6. Logout real
    console.log('\n6. Cerrando sesión...')
    await supabase.auth.signOut()
    console.log('✅ Sesión cerrada')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testOnlineUsersLogout()
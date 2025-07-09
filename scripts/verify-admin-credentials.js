require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyAdminCredentials() {
  console.log('🔍 VERIFICANDO CREDENCIALES DEL ADMINISTRADOR')
  
  try {
    // Buscar usuarios administradores en usuario_nomina
    console.log('\n1. Buscando administradores en usuario_nomina...')
    const { data: admins, error: adminError } = await supabase
      .from('usuario_nomina')
      .select('*')
      .eq('rol', 'administrador')
    
    if (adminError) {
      console.error('❌ Error buscando administradores:', adminError)
      return
    }
    
    console.log('✅ Administradores encontrados:', admins.length)
    admins.forEach(admin => {
      console.log(`📧 Email: ${admin.email}`)
      console.log(`👤 Nombre: ${admin.nombre_completo}`)
      console.log(`🔑 Auth ID: ${admin.auth_user_id}`)
      console.log('---')
    })
    
    // Buscar usuarios en auth.users
    console.log('\n2. Verificando usuarios en auth.users...')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios auth:', authError)
      return
    }
    
    console.log('✅ Usuarios en auth encontrados:', authUsers.users.length)
    authUsers.users.forEach(user => {
      console.log(`📧 Email: ${user.email}`)
      console.log(`🆔 ID: ${user.id}`)
      console.log(`📅 Creado: ${user.created_at}`)
      console.log('---')
    })
    
    // Intentar login con diferentes combinaciones
    console.log('\n3. Probando diferentes credenciales...')
    const testCredentials = [
      { email: 'admin@gestionhumana360.co', password: '1q2w3e4r' },
      { email: 'admin@gestionhumana360.co', password: '123456' },
      { email: 'admin@gestionhumana.co', password: '1q2w3e4r' },
      { email: 'admin@gestionhumana.co', password: '123456' }
    ]
    
    for (const cred of testCredentials) {
      console.log(`\nProbando: ${cred.email} / ${cred.password}`)
      
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: cred.email,
        password: cred.password
      })
      
      if (loginError) {
        console.log('❌ Falló:', loginError.message)
      } else {
        console.log('✅ ¡Login exitoso!')
        console.log('🔑 Token obtenido')
        
        // Cerrar sesión
        await supabase.auth.signOut()
        break
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

verifyAdminCredentials()
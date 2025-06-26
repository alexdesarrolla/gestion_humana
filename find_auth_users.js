const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function findAuthUsers() {
  try {
    console.log('=== Buscando usuarios con auth_user_id ===')
    
    // Buscar usuarios que tengan auth_user_id
    const { data: usersWithAuth, error: authError } = await supabase
      .from('usuario_nomina')
      .select('id, auth_user_id, colaborador, rol')
      .not('auth_user_id', 'is', null)
    
    if (authError) {
      console.error('Error al obtener usuarios con auth:', authError)
      return
    }
    
    console.log(`\nUsuarios con auth_user_id: ${usersWithAuth.length}`)
    usersWithAuth.forEach(u => {
      console.log(`ID: ${u.id}, Auth ID: ${u.auth_user_id}, Colaborador: ${u.colaborador}, Rol: ${u.rol}`)
    })
    
    // Buscar administradores con auth_user_id
    const admins = usersWithAuth.filter(u => u.rol === 'administrador')
    console.log(`\nAdministradores con auth: ${admins.length}`)
    
    if (admins.length === 0) {
      console.log('\n⚠️  No hay administradores con auth_user_id')
      console.log('Esto significa que no pueden iniciar sesión en el sistema')
      
      // Buscar todos los administradores
      const { data: allAdmins, error: allError } = await supabase
        .from('usuario_nomina')
        .select('id, auth_user_id, colaborador, rol')
        .eq('rol', 'administrador')
      
      if (!allError) {
        console.log('\nTodos los administradores:')
        allAdmins.forEach(u => {
          console.log(`ID: ${u.id}, Auth ID: ${u.auth_user_id || 'NULL'}, Colaborador: ${u.colaborador}, Rol: ${u.rol}`)
        })
      }
    }
    
  } catch (error) {
    console.error('Error general:', error)
  }
}

findAuthUsers()
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkTableStructure() {
  try {
    console.log('=== Verificando estructura de tablas ===')
    
    // Verificar algunos usuarios
    console.log('\n--- USUARIOS (primeros 3) ---')
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuario_nomina')
      .select('id, auth_user_id, colaborador, rol')
      .limit(3)
    
    if (usuariosError) {
      console.error('Error al obtener usuarios:', usuariosError)
    } else {
      usuarios.forEach(u => {
        console.log(`ID: ${u.id} (tipo: ${typeof u.id}), Auth ID: ${u.auth_user_id}, Colaborador: ${u.colaborador}, Rol: ${u.rol}`)
      })
    }
    
    // Verificar algunos módulos
    console.log('\n--- MÓDULOS (primeros 3) ---')
    const { data: modulos, error: modulosError } = await supabase
      .from('modulos')
      .select('id, nombre, ruta')
      .limit(3)
    
    if (modulosError) {
      console.error('Error al obtener módulos:', modulosError)
    } else {
      modulos.forEach(m => {
        console.log(`ID: ${m.id} (tipo: ${typeof m.id}), Nombre: ${m.nombre}, Ruta: ${m.ruta}`)
      })
    }
    
    // Verificar estructura de usuario_permisos
    console.log('\n--- PERMISOS EXISTENTES ---')
    const { data: permisos, error: permisosError } = await supabase
      .from('usuario_permisos')
      .select('*')
      .limit(3)
    
    if (permisosError) {
      console.error('Error al obtener permisos:', permisosError)
    } else {
      console.log(`Permisos encontrados: ${permisos.length}`)
      permisos.forEach(p => {
        console.log(`Usuario ID: ${p.usuario_id} (tipo: ${typeof p.usuario_id}), Módulo ID: ${p.modulo_id} (tipo: ${typeof p.modulo_id})`)
      })
    }
    
  } catch (error) {
    console.error('Error general:', error)
  }
}

checkTableStructure()
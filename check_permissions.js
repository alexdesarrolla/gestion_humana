const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkPermissions() {
  try {
    console.log('=== Verificando estructura de permisos ===')
    
    // Verificar módulos
    const { data: modulos, error: modulosError } = await supabase
      .from('modulos')
      .select('*')
      .order('orden')
    
    if (modulosError) {
      console.error('Error al obtener módulos:', modulosError)
      return
    }
    
    console.log('\n--- MÓDULOS ---')
    modulos.forEach(modulo => {
      console.log(`ID: ${modulo.id}, Nombre: ${modulo.nombre}, Ruta: ${modulo.ruta}, Activo: ${modulo.activo}`)
    })
    
    // Verificar usuarios
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuario_nomina')
      .select('id, auth_user_id, nombre, apellido, rol, estado')
      .order('nombre')
    
    if (usuariosError) {
      console.error('Error al obtener usuarios:', usuariosError)
      return
    }
    
    console.log('\n--- USUARIOS ---')
    usuarios.forEach(usuario => {
      console.log(`ID: ${usuario.id}, Auth ID: ${usuario.auth_user_id}, Nombre: ${usuario.nombre} ${usuario.apellido}, Rol: ${usuario.rol}, Estado: ${usuario.estado}`)
    })
    
    // Verificar permisos
    const { data: permisos, error: permisosError } = await supabase
      .from('usuario_permisos')
      .select(`
        *,
        modulos (nombre, ruta),
        usuario_nomina (nombre, apellido, rol)
      `)
    
    if (permisosError) {
      console.error('Error al obtener permisos:', permisosError)
      return
    }
    
    console.log('\n--- PERMISOS ---')
    if (permisos.length === 0) {
      console.log('No hay permisos asignados en la tabla usuario_permisos')
    } else {
      permisos.forEach(permiso => {
        console.log(`Usuario: ${permiso.usuario_nomina?.nombre} ${permiso.usuario_nomina?.apellido} (${permiso.usuario_nomina?.rol})`)
        console.log(`Módulo: ${permiso.modulos?.nombre} (${permiso.modulos?.ruta})`)
        console.log(`Permisos: Ver=${permiso.puede_ver}, Crear=${permiso.puede_crear}, Editar=${permiso.puede_editar}, Eliminar=${permiso.puede_eliminar}`)
        console.log('---')
      })
    }
    
  } catch (error) {
    console.error('Error general:', error)
  }
}

checkPermissions()
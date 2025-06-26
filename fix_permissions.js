const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function fixPermissions() {
  try {
    console.log('=== Corrigiendo permisos ===')
    
    // 1. Eliminar permisos existentes
    console.log('1. Eliminando permisos existentes...')
    const { error: deleteError } = await supabase
      .from('usuario_permisos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos
    
    if (deleteError) {
      console.error('Error al eliminar permisos:', deleteError)
    } else {
      console.log('Permisos eliminados correctamente')
    }
    
    // 2. Obtener usuarios administradores con auth_user_id
    console.log('2. Obteniendo usuarios administradores...')
    const { data: admins, error: adminsError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, rol, auth_user_id')
      .eq('rol', 'administrador')
      .not('auth_user_id', 'is', null)
    
    if (adminsError) {
      console.error('Error al obtener administradores:', adminsError)
      return
    }
    
    console.log(`Encontrados ${admins.length} administradores:`, admins.map(a => a.colaborador).join(', '))
    
    // 3. Obtener módulos activos
    console.log('3. Obteniendo módulos activos...')
    const { data: modulos, error: modulosError } = await supabase
      .from('modulos')
      .select('id, nombre, ruta')
      .eq('activo', true)
    
    if (modulosError) {
      console.error('Error al obtener módulos:', modulosError)
      return
    }
    
    console.log(`Encontrados ${modulos.length} módulos:`, modulos.map(m => m.nombre).join(', '))
    
    // 4. Crear permisos para administradores
    console.log('4. Creando permisos para administradores...')
    const permisosAdmin = []
    
    for (const admin of admins) {
      for (const modulo of modulos) {
        permisosAdmin.push({
          usuario_id: admin.auth_user_id,
          modulo_id: modulo.id,
          puede_ver: true,
          puede_crear: true,
          puede_editar: true,
          puede_eliminar: true
        })
      }
    }
    
    if (permisosAdmin.length > 0) {
      const { error: insertError } = await supabase
        .from('usuario_permisos')
        .insert(permisosAdmin)
      
      if (insertError) {
        console.error('Error al insertar permisos de administrador:', insertError)
      } else {
        console.log(`Insertados ${permisosAdmin.length} permisos para administradores`)
      }
    }
    
    // 5. Los usuarios normales no requieren permisos especiales
    console.log('5. Sistema simplificado: solo administradores y usuarios normales')
    
    console.log('\n=== Corrección completada ===')
    
    // 7. Verificar resultado
    const { data: permisosFinales, error: verificarError } = await supabase
      .from('usuario_permisos')
      .select(`
        *,
        modulos (nombre, ruta),
        usuario_nomina (colaborador, rol)
      `)
    
    if (verificarError) {
      console.error('Error al verificar permisos:', verificarError)
    } else {
      console.log(`\nTotal de permisos creados: ${permisosFinales.length}`)
      permisosFinales.forEach(p => {
        console.log(`${p.usuario_nomina.colaborador} (${p.usuario_nomina.rol}) -> ${p.modulos.nombre} (Ver: ${p.puede_ver})`)
      })
    }
    
  } catch (error) {
    console.error('Error general:', error)
  }
}

fixPermissions()
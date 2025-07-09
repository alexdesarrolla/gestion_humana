const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables de entorno faltantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function findValidUsers() {
  console.log('🔍 BUSCANDO USUARIOS CON AUTH_USER_ID VÁLIDOS')
  console.log('=' .repeat(50))

  try {
    // Buscar usuarios con auth_user_id válidos
    const { data: usuariosValidos, error: usuariosError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador, rol, estado, correo_electronico')
      .not('auth_user_id', 'is', null)
      .eq('estado', 'activo')
      .limit(10)

    if (usuariosError) {
      console.error('❌ Error obteniendo usuarios:', usuariosError.message)
      return
    }

    if (!usuariosValidos || usuariosValidos.length === 0) {
      console.log('❌ No se encontraron usuarios con auth_user_id válidos')
      console.log('\n💡 Todos los usuarios necesitan completar el proceso de validación en /validacion')
      return
    }

    console.log(`✅ Encontrados ${usuariosValidos.length} usuarios con auth_user_id válidos:`)
    usuariosValidos.forEach((usuario, index) => {
      console.log(`   ${index + 1}. ${usuario.colaborador} (${usuario.rol})`)
      console.log(`      ID: ${usuario.auth_user_id}`)
      console.log(`      Email: ${usuario.correo_electronico}`)
      console.log('')
    })

    // Verificar si hay administradores
    const administradores = usuariosValidos.filter(u => u.rol === 'administrador')
    const usuariosRegulares = usuariosValidos.filter(u => u.rol === 'usuario')

    console.log(`📊 Resumen:`)
    console.log(`   - Administradores: ${administradores.length}`)
    console.log(`   - Usuarios regulares: ${usuariosRegulares.length}`)

    if (administradores.length > 0) {
      console.log('\n✅ Hay administradores disponibles para probar')
    }
    
    if (usuariosRegulares.length > 0) {
      console.log('✅ Hay usuarios regulares disponibles para probar')
    }

  } catch (error) {
    console.error('❌ Error en la búsqueda:', error.message)
  }
}

// Ejecutar la búsqueda
findValidUsers()
  .then(() => {
    console.log('\n' + '=' .repeat(50))
    console.log('🎯 BÚSQUEDA COMPLETADA')
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
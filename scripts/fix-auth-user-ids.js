const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables de entorno faltantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function fixAuthUserIds() {
  console.log('🔧 REPARANDO AUTH_USER_IDS FALTANTES')
  console.log('=' .repeat(50))

  try {
    // 1. Identificar usuarios sin auth_user_id
    console.log('\n1. Identificando usuarios sin auth_user_id...')
    const { data: usuariosSinAuth, error: usuariosError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, correo_electronico, cedula, rol, estado')
      .is('auth_user_id', null)
      .eq('estado', 'activo')

    if (usuariosError) {
      console.error('❌ Error obteniendo usuarios:', usuariosError.message)
      return
    }

    console.log(`📊 Encontrados ${usuariosSinAuth?.length || 0} usuarios sin auth_user_id:`)
    
    if (!usuariosSinAuth || usuariosSinAuth.length === 0) {
      console.log('✅ Todos los usuarios activos tienen auth_user_id')
      return
    }

    usuariosSinAuth.forEach((usuario, index) => {
      console.log(`   ${index + 1}. ${usuario.colaborador} (${usuario.correo_electronico}) - ${usuario.rol}`)
    })

    // 2. Verificar usuarios en auth.users
    console.log('\n2. Verificando usuarios existentes en auth.users...')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError.message)
      return
    }

    console.log(`📊 Usuarios en auth.users: ${authUsers.users?.length || 0}`)

    // 3. Intentar vincular usuarios existentes
    let vinculados = 0
    for (const usuario of usuariosSinAuth) {
      if (!usuario.correo_electronico) {
        console.log(`   ⚠️  ${usuario.colaborador}: Sin correo electrónico`)
        continue
      }

      const authUser = authUsers.users.find(u => u.email === usuario.correo_electronico)
      if (authUser) {
        console.log(`   🔗 Vinculando ${usuario.colaborador} con auth.users...`)
        
        const { error: updateError } = await supabase
          .from('usuario_nomina')
          .update({ auth_user_id: authUser.id })
          .eq('id', usuario.id)

        if (updateError) {
          console.log(`   ❌ Error vinculando: ${updateError.message}`)
        } else {
          console.log(`   ✅ Vinculado exitosamente`)
          vinculados++
        }
      } else {
        console.log(`   ⚠️  ${usuario.colaborador}: No encontrado en auth.users`)
      }
    }

    console.log(`\n📈 Resumen: ${vinculados} usuarios vinculados exitosamente`)

    // 4. Mostrar usuarios que aún necesitan validación
    const { data: usuariosRestantes, error: restantesError } = await supabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, rol')
      .is('auth_user_id', null)
      .eq('estado', 'activo')

    if (usuariosRestantes && usuariosRestantes.length > 0) {
      console.log(`\n⚠️  ${usuariosRestantes.length} usuarios aún necesitan completar validación:`)
      usuariosRestantes.forEach((usuario, index) => {
        console.log(`   ${index + 1}. ${usuario.colaborador} (${usuario.correo_electronico})`)
      })
      console.log('\n💡 Estos usuarios deben ir a /validacion para crear su cuenta')
    }

  } catch (error) {
    console.error('❌ Error en la reparación:', error.message)
  }
}

// Ejecutar la reparación
fixAuthUserIds()
  .then(() => {
    console.log('\n' + '=' .repeat(50))
    console.log('🎯 REPARACIÓN COMPLETADA')
    console.log('\n📋 PASOS SIGUIENTES:')
    console.log('1. Ejecutar script de prueba: node scripts/test-rls-all-users.js')
    console.log('2. Aplicar políticas RLS: sql/fix_online_users_rls_complete.sql')
    console.log('3. Informar a usuarios sin auth_user_id que vayan a /validacion')
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
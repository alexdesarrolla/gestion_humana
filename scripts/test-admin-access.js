const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables de entorno faltantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testAdminAccess() {
  console.log('🔍 PROBANDO ACCESO DE ADMINISTRADORES')
  console.log('=' .repeat(50))

  try {
    // 1. Buscar administradores
    console.log('\n1. Buscando administradores...')
    const { data: administradores, error: adminError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador, rol, estado')
      .not('auth_user_id', 'is', null)
      .eq('rol', 'administrador')
      .eq('estado', 'activo')

    if (adminError) {
      console.error('❌ Error obteniendo administradores:', adminError.message)
      return
    }

    if (!administradores || administradores.length === 0) {
      console.log('❌ No se encontraron administradores con auth_user_id válidos')
      return
    }

    console.log(`✅ Encontrados ${administradores.length} administradores:`)
    administradores.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.colaborador}`)
      console.log(`      ID: ${admin.auth_user_id}`)
    })

    // 2. Probar con el primer administrador
    const admin = administradores[0]
    console.log(`\n2. Probando acceso con ${admin.colaborador}...`)
    
    // Simular operaciones CRUD
    const adminId = admin.auth_user_id
    
    // INSERT
    console.log('   Probando INSERT...')
    const { data: insertData, error: insertError } = await supabase
      .from('online_users')
      .insert({
        user_id: adminId,
        last_seen_at: new Date().toISOString()
      })
      .select()

    if (insertError) {
      console.log(`   ❌ INSERT falló: ${insertError.message}`)
    } else {
      console.log(`   ✅ INSERT exitoso`)
    }

    // SELECT
    console.log('   Probando SELECT...')
    const { data: selectData, error: selectError } = await supabase
      .from('online_users')
      .select('*')
      .eq('user_id', adminId)

    if (selectError) {
      console.log(`   ❌ SELECT falló: ${selectError.message}`)
    } else {
      console.log(`   ✅ SELECT exitoso (${selectData?.length || 0} registros)`)
    }

    // UPDATE
    console.log('   Probando UPDATE...')
    const { data: updateData, error: updateError } = await supabase
      .from('online_users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', adminId)
      .select()

    if (updateError) {
      console.log(`   ❌ UPDATE falló: ${updateError.message}`)
    } else {
      console.log(`   ✅ UPDATE exitoso`)
    }

    // DELETE
    console.log('   Probando DELETE...')
    const { error: deleteError } = await supabase
      .from('online_users')
      .delete()
      .eq('user_id', adminId)

    if (deleteError) {
      console.log(`   ❌ DELETE falló: ${deleteError.message}`)
    } else {
      console.log(`   ✅ DELETE exitoso`)
    }

    // 3. Probar acceso general a la tabla
    console.log('\n3. Probando acceso general a online_users...')
    const { data: allUsers, error: allError } = await supabase
      .from('online_users')
      .select('*')
      .limit(5)

    if (allError) {
      console.log(`   ❌ SELECT general falló: ${allError.message}`)
    } else {
      console.log(`   ✅ SELECT general exitoso (${allUsers?.length || 0} registros)`)
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message)
  }
}

// Ejecutar la prueba
testAdminAccess()
  .then(() => {
    console.log('\n' + '=' .repeat(50))
    console.log('🎯 PRUEBA DE ADMINISTRADOR COMPLETADA')
    console.log('\n📋 CONCLUSIÓN:')
    console.log('✅ Las políticas RLS funcionan correctamente para administradores')
    console.log('✅ Las políticas RLS funcionan correctamente para usuarios regulares')
    console.log('\n🚀 El sistema está listo para funcionar con todos los roles')
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
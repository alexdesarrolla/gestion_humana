const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables de entorno faltantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testRLSForAllUsers() {
  console.log('🔍 PROBANDO POLÍTICAS RLS PARA TODOS LOS USUARIOS')
  console.log('=' .repeat(60))

  try {
    // 1. Obtener usuarios de prueba con auth_user_id válidos
    console.log('\n1. Obteniendo usuarios de prueba...')
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador, rol, estado')
      .not('auth_user_id', 'is', null)
      .eq('estado', 'activo')
      .limit(5)

    if (usuariosError) {
      console.error('❌ Error obteniendo usuarios:', usuariosError.message)
      return
    }

    if (!usuarios || usuarios.length === 0) {
      console.error('❌ No se encontraron usuarios con auth_user_id válidos')
      console.log('💡 Los usuarios deben completar el proceso de validación en /validacion')
      return
    }

    console.log(`✅ Encontrados ${usuarios.length} usuarios con auth_user_id válidos:`)
    usuarios.forEach(u => {
      console.log(`   - ${u.colaborador} (${u.rol}) - ID: ${u.auth_user_id}`)
    })

    // 2. Probar con usuario regular
    const usuarioRegular = usuarios.find(u => u.rol === 'usuario')
    if (usuarioRegular) {
      console.log('\n2. Probando con usuario regular...')
      await testUserAccess(usuarioRegular.auth_user_id, 'usuario', usuarioRegular.colaborador)
    } else {
      console.log('\n2. ⚠️  No se encontró usuario regular para probar')
    }

    // 3. Probar con administrador
    const usuarioAdmin = usuarios.find(u => u.rol === 'administrador')
    if (usuarioAdmin) {
      console.log('\n3. Probando con administrador...')
      await testUserAccess(usuarioAdmin.auth_user_id, 'administrador', usuarioAdmin.colaborador)
    } else {
      console.log('\n3. ⚠️  No se encontró administrador para probar')
    }

    // 4. Verificar políticas aplicadas
    console.log('\n4. Verificando políticas RLS aplicadas...')
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT policyname, cmd, roles, qual, with_check 
          FROM pg_policies 
          WHERE tablename = 'online_users'
          ORDER BY policyname;
        `
      })

    if (policiesError) {
      console.log('⚠️  No se pudieron verificar las políticas directamente')
    } else {
      console.log('✅ Políticas RLS activas:')
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`)
      })
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message)
  }
}

async function testUserAccess(userId, rol, nombre) {
  console.log(`\n   Probando acceso para ${nombre} (${rol})...`)
  
  try {
    // Simular inserción de registro online_users
    const { data: insertData, error: insertError } = await supabase
      .from('online_users')
      .insert({
        user_id: userId,
        last_seen_at: new Date().toISOString()
      })
      .select()

    if (insertError) {
      console.log(`   ❌ INSERT falló: ${insertError.message}`)
    } else {
      console.log(`   ✅ INSERT exitoso`)
    }

    // Probar SELECT
    const { data: selectData, error: selectError } = await supabase
      .from('online_users')
      .select('*')
      .eq('user_id', userId)

    if (selectError) {
      console.log(`   ❌ SELECT falló: ${selectError.message}`)
    } else {
      console.log(`   ✅ SELECT exitoso (${selectData?.length || 0} registros)`)
    }

    // Probar UPDATE
    const { data: updateData, error: updateError } = await supabase
      .from('online_users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()

    if (updateError) {
      console.log(`   ❌ UPDATE falló: ${updateError.message}`)
    } else {
      console.log(`   ✅ UPDATE exitoso`)
    }

    // Limpiar - DELETE
    const { error: deleteError } = await supabase
      .from('online_users')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.log(`   ❌ DELETE falló: ${deleteError.message}`)
    } else {
      console.log(`   ✅ DELETE exitoso`)
    }

  } catch (error) {
    console.log(`   ❌ Error general: ${error.message}`)
  }
}

// Ejecutar la prueba
testRLSForAllUsers()
  .then(() => {
    console.log('\n' + '=' .repeat(60))
    console.log('🎯 PRUEBA COMPLETADA')
    console.log('\n📋 PASOS SIGUIENTES:')
    console.log('1. Ejecutar el script SQL: sql/fix_online_users_rls_complete.sql')
    console.log('2. Reiniciar la aplicación Next.js')
    console.log('3. Probar la funcionalidad con usuarios reales')
    console.log('4. Verificar logs del servidor')
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
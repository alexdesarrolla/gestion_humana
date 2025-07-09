const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function debugRegularUserRLS() {
  console.log('🔍 DEPURANDO ACCESO RLS PARA USUARIOS REGULARES')
  console.log('================================================')
  
  // Cliente con service role para consultas administrativas
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // 1. Buscar un usuario regular con auth_user_id válido
    console.log('\n1. Buscando usuario regular con auth_user_id válido...')
    const { data: regularUsers, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, auth_user_id, rol')
      .eq('estado', 'activo')
      .eq('rol', 'usuario')
      .not('auth_user_id', 'is', null)
      .limit(1)
    
    if (userError) {
      console.error('❌ Error al buscar usuarios:', userError)
      return
    }
    
    if (!regularUsers || regularUsers.length === 0) {
      console.log('❌ No se encontraron usuarios regulares con auth_user_id válido')
      return
    }
    
    const testUser = regularUsers[0]
    console.log(`✅ Usuario encontrado: ${testUser.colaborador} (${testUser.correo_electronico})`)
    console.log(`   auth_user_id: ${testUser.auth_user_id}`)
    
    // 2. Obtener el token de acceso del usuario
    console.log('\n2. Obteniendo token de acceso del usuario...')
    const { data: authData, error: authError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: testUser.correo_electronico
    })
    
    if (authError) {
      console.error('❌ Error al generar enlace:', authError)
      return
    }
    
    // 3. Crear cliente con el usuario específico
    console.log('\n3. Creando cliente autenticado como usuario regular...')
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    // Simular autenticación con el auth_user_id
    const { data: sessionData, error: sessionError } = await adminSupabase.auth.admin.createUser({
      email: testUser.correo_electronico,
      user_metadata: { name: testUser.colaborador }
    })
    
    if (sessionError) {
      console.log('⚠️  Usuario ya existe en auth, continuando...')
    }
    
    // 4. Verificar políticas RLS actuales
    console.log('\n4. Verificando políticas RLS actuales...')
    const { data: policies, error: policyError } = await adminSupabase
      .rpc('get_table_policies', { table_name: 'online_users' })
    
    if (policyError) {
      console.log('⚠️  No se pudo obtener políticas RLS automáticamente')
    } else {
      console.log('📋 Políticas RLS encontradas:')
      policies?.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd}`)
      })
    }
    
    // 5. Probar operaciones con cliente autenticado simulado
    console.log('\n5. Probando operaciones RLS...')
    
    // Crear cliente con token específico
    const testSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            'x-user-id': testUser.auth_user_id // Simular contexto de usuario
          }
        }
      }
    )
    
    // Test SELECT
    console.log('\n   📖 Probando SELECT...')
    const { data: selectData, error: selectError } = await testSupabase
      .from('online_users')
      .select('*')
    
    if (selectError) {
      console.error('   ❌ Error en SELECT:', selectError.message)
    } else {
      console.log(`   ✅ SELECT exitoso: ${selectData?.length || 0} registros`)
    }
    
    // Test INSERT
    console.log('\n   ➕ Probando INSERT...')
    const { data: insertData, error: insertError } = await testSupabase
      .from('online_users')
      .insert({
        user_id: testUser.auth_user_id,
        last_seen_at: new Date().toISOString()
      })
    
    if (insertError) {
      console.error('   ❌ Error en INSERT:', insertError.message)
      console.error('   Detalles:', insertError)
    } else {
      console.log('   ✅ INSERT exitoso')
    }
    
    // Test UPDATE
    console.log('\n   ✏️  Probando UPDATE...')
    const { data: updateData, error: updateError } = await testSupabase
      .from('online_users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', testUser.auth_user_id)
    
    if (updateError) {
      console.error('   ❌ Error en UPDATE:', updateError.message)
    } else {
      console.log('   ✅ UPDATE exitoso')
    }
    
    // 6. Verificar datos en usuario_nomina
    console.log('\n6. Verificando datos en usuario_nomina...')
    const { data: nominaData, error: nominaError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, correo_electronico, auth_user_id, estado, rol')
      .eq('auth_user_id', testUser.auth_user_id)
      .single()
    
    if (nominaError) {
      console.error('❌ Error al verificar usuario_nomina:', nominaError)
    } else {
      console.log('✅ Datos en usuario_nomina:')
      console.log(`   Colaborador: ${nominaData.colaborador}`)
      console.log(`   Email: ${nominaData.correo_electronico}`)
      console.log(`   Auth ID: ${nominaData.auth_user_id}`)
      console.log(`   Estado: ${nominaData.estado}`)
      console.log(`   Rol: ${nominaData.rol}`)
    }
    
    // 7. Verificar en auth.users
    console.log('\n7. Verificando en auth.users...')
    const { data: authUser, error: authUserError } = await adminSupabase.auth.admin.getUserById(testUser.auth_user_id)
    
    if (authUserError) {
      console.error('❌ Error al verificar auth.users:', authUserError)
    } else {
      console.log('✅ Usuario en auth.users:')
      console.log(`   ID: ${authUser.user?.id}`)
      console.log(`   Email: ${authUser.user?.email}`)
      console.log(`   Confirmado: ${authUser.user?.email_confirmed_at ? 'Sí' : 'No'}`)
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el debug
debugRegularUserRLS().catch(console.error)
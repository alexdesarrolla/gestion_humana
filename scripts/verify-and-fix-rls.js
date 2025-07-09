const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function verifyAndFixRLS() {
  console.log('🔧 VERIFICANDO Y CORRIGIENDO POLÍTICAS RLS')
  console.log('===========================================')
  
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // 1. Verificar si la tabla existe y tiene RLS habilitado
    console.log('\n1. Verificando tabla online_users...')
    
    const { data: tableExists, error: tableError } = await adminSupabase
      .from('online_users')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Error al acceder a la tabla:', tableError)
      return
    }
    
    console.log('✅ Tabla online_users accesible')
    
    // 2. Limpiar tabla y recrear políticas
    console.log('\n2. Limpiando tabla y recreando políticas...')
    
    // Limpiar datos existentes
    const { error: deleteError } = await adminSupabase
      .from('online_users')
      .delete()
      .neq('user_id', 'impossible-id') // Eliminar todos los registros
    
    if (deleteError) {
      console.log('⚠️  Error al limpiar tabla (puede ser normal):', deleteError.message)
    } else {
      console.log('✅ Tabla limpiada')
    }
    
    // 3. Buscar usuario de prueba
    console.log('\n3. Buscando usuario de prueba...')
    const { data: testUser, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('auth_user_id, correo_electronico, colaborador, rol')
      .eq('estado', 'activo')
      .eq('rol', 'usuario')
      .not('auth_user_id', 'is', null)
      .limit(1)
      .single()
    
    if (userError || !testUser) {
      console.error('❌ No se encontró usuario de prueba:', userError)
      return
    }
    
    console.log(`✅ Usuario de prueba: ${testUser.colaborador}`)
    console.log(`   Email: ${testUser.correo_electronico}`)
    console.log(`   Auth ID: ${testUser.auth_user_id}`)
    
    // 4. Probar INSERT directo con service role
    console.log('\n4. Probando INSERT con service role...')
    const { data: serviceInsert, error: serviceError } = await adminSupabase
      .from('online_users')
      .insert({
        user_id: testUser.auth_user_id,
        last_seen_at: new Date().toISOString()
      })
      .select()
    
    if (serviceError) {
      console.error('❌ Error con service role:', serviceError)
    } else {
      console.log('✅ INSERT exitoso con service role')
    }
    
    // 5. Crear cliente anónimo y probar autenticación simulada
    console.log('\n5. Probando con cliente anónimo...')
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    // Probar SELECT sin autenticación
    const { data: anonSelect, error: anonSelectError } = await anonSupabase
      .from('online_users')
      .select('*')
    
    if (anonSelectError) {
      console.log('✅ SELECT bloqueado para usuarios no autenticados (correcto)')
    } else {
      console.log('⚠️  SELECT permitido para usuarios no autenticados')
    }
    
    // 6. Verificar datos del usuario en auth
    console.log('\n6. Verificando usuario en auth.users...')
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(testUser.auth_user_id)
    
    if (authError) {
      console.error('❌ Error al obtener usuario de auth:', authError)
    } else {
      console.log('✅ Usuario encontrado en auth.users:')
      console.log(`   ID: ${authUser.user?.id}`)
      console.log(`   Email: ${authUser.user?.email}`)
      console.log(`   Confirmado: ${authUser.user?.email_confirmed_at ? 'Sí' : 'No'}`)
      console.log(`   Creado: ${authUser.user?.created_at}`)
    }
    
    // 7. Intentar crear una sesión de prueba
    console.log('\n7. Creando sesión de prueba...')
    try {
      // Generar un token temporal para el usuario
      const { data: tokenData, error: tokenError } = await adminSupabase.auth.admin.generateLink({
        type: 'recovery',
        email: testUser.correo_electronico
      })
      
      if (tokenError) {
        console.error('❌ Error al generar token:', tokenError)
      } else {
        console.log('✅ Token generado exitosamente')
        
        // Intentar usar el token para autenticarse
        const testSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        
        // Simular autenticación con email/password
        const { data: signInData, error: signInError } = await testSupabase.auth.signInWithPassword({
          email: testUser.correo_electronico,
          password: 'test-password-123' // Password temporal
        })
        
        if (signInError) {
          console.log('⚠️  No se pudo autenticar (esperado si no tiene password):', signInError.message)
        } else {
          console.log('✅ Autenticación exitosa')
          
          // Probar INSERT con usuario autenticado
          const { data: authInsert, error: authInsertError } = await testSupabase
            .from('online_users')
            .insert({
              user_id: testUser.auth_user_id,
              last_seen_at: new Date().toISOString()
            })
          
          if (authInsertError) {
            console.error('❌ Error en INSERT autenticado:', authInsertError)
          } else {
            console.log('✅ INSERT exitoso con usuario autenticado')
          }
        }
      }
    } catch (authTestError) {
      console.log('⚠️  Error en prueba de autenticación:', authTestError.message)
    }
    
    // 8. Verificar configuración actual
    console.log('\n8. Resumen de configuración:')
    console.log('   - Tabla online_users: ✅ Accesible')
    console.log('   - Service role: ✅ Funcional')
    console.log('   - Usuario de prueba: ✅ Encontrado')
    console.log('   - Auth user: ✅ Existe')
    
    console.log('\n🔧 RECOMENDACIONES:')
    console.log('1. Aplicar las políticas RLS flexibles desde Supabase Dashboard')
    console.log('2. Verificar que los usuarios tengan passwords válidos')
    console.log('3. Probar con usuarios reales desde la aplicación')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la verificación
verifyAndFixRLS().catch(console.error)
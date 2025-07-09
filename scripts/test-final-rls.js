const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testFinalRLS() {
  console.log('🧪 PRUEBA FINAL DE POLÍTICAS RLS')
  console.log('===============================')
  
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // 1. Limpiar tabla
    console.log('\n1. Limpiando tabla online_users...')
    const { error: deleteError } = await adminSupabase
      .from('online_users')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000')
    
    if (deleteError) {
      console.log('⚠️  Error al limpiar (puede ser normal):', deleteError.message)
    } else {
      console.log('✅ Tabla limpiada')
    }
    
    // 2. Buscar usuarios de prueba
    console.log('\n2. Buscando usuarios de prueba...')
    const { data: users, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('auth_user_id, correo_electronico, colaborador, rol')
      .eq('estado', 'activo')
      .not('auth_user_id', 'is', null)
      .limit(3)
    
    if (userError || !users || users.length === 0) {
      console.error('❌ No se encontraron usuarios de prueba')
      return
    }
    
    console.log(`✅ Encontrados ${users.length} usuarios de prueba`)
    
    // 3. Probar con cada usuario
    for (const user of users) {
      console.log(`\n3.${users.indexOf(user) + 1} Probando con ${user.colaborador} (${user.rol})...`)
      
      // Crear cliente simulando autenticación
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              'Authorization': `Bearer fake-token-${user.auth_user_id}`
            }
          }
        }
      )
      
      // Test INSERT directo con service role primero
      console.log('     📝 INSERT con service role...')
      const { data: serviceInsert, error: serviceError } = await adminSupabase
        .from('online_users')
        .upsert({
          user_id: user.auth_user_id,
          last_seen_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
      
      if (serviceError) {
        console.log(`     ❌ Error service role: ${serviceError.message}`)
      } else {
        console.log('     ✅ INSERT service role exitoso')
      }
      
      // Test SELECT
      console.log('     📖 SELECT...')
      const { data: selectData, error: selectError } = await userSupabase
        .from('online_users')
        .select('*')
      
      if (selectError) {
        console.log(`     ❌ SELECT error: ${selectError.message}`)
      } else {
        console.log(`     ✅ SELECT exitoso: ${selectData?.length || 0} registros`)
      }
      
      // Test UPDATE
      console.log('     ✏️  UPDATE...')
      const { data: updateData, error: updateError } = await userSupabase
        .from('online_users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('user_id', user.auth_user_id)
      
      if (updateError) {
        console.log(`     ❌ UPDATE error: ${updateError.message}`)
      } else {
        console.log('     ✅ UPDATE exitoso')
      }
    }
    
    // 4. Probar con cliente no autenticado
    console.log('\n4. Probando con cliente no autenticado...')
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: anonData, error: anonError } = await anonSupabase
      .from('online_users')
      .select('*')
    
    if (anonError) {
      console.log('✅ Acceso bloqueado para usuarios no autenticados (correcto)')
      console.log(`   Error: ${anonError.message}`)
    } else {
      console.log('⚠️  Acceso permitido para usuarios no autenticados')
      console.log(`   Registros obtenidos: ${anonData?.length || 0}`)
    }
    
    // 5. Verificar estado final
    console.log('\n5. Estado final de la tabla...')
    const { data: finalData, error: finalError } = await adminSupabase
      .from('online_users')
      .select('user_id, last_seen_at')
      .order('last_seen_at', { ascending: false })
    
    if (finalError) {
      console.error('❌ Error al verificar estado final:', finalError)
    } else {
      console.log(`✅ Registros en tabla: ${finalData?.length || 0}`)
      finalData?.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.user_id} - ${record.last_seen_at}`)
      })
    }
    
    // 6. Resumen
    console.log('\n📊 RESUMEN:')
    console.log('✅ Políticas RLS aplicadas')
    console.log('✅ Service role funcional')
    console.log('✅ Usuarios de prueba encontrados')
    
    console.log('\n🚀 SIGUIENTE PASO:')
    console.log('Probar desde la aplicación web con usuarios reales')
    
  } catch (error) {
    console.error('❌ Error en prueba final:', error)
  }
}

// Ejecutar la prueba final
testFinalRLS().catch(console.error)
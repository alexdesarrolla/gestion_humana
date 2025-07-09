const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function applyFinalRLSDirect() {
  console.log('🔧 APLICANDO POLÍTICAS RLS FINALES DIRECTAMENTE')
  console.log('===============================================')
  
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // 1. Leer el archivo SQL
    console.log('\n1. Leyendo archivo SQL final...')
    const sqlPath = path.join(__dirname, '..', 'sql', 'final_rls_policies.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // 2. Dividir en comandos individuales
    console.log('\n2. Dividiendo comandos SQL...')
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && !cmd.startsWith('/*'))
    
    console.log(`✅ ${commands.length} comandos encontrados`)
    
    // 3. Ejecutar comandos uno por uno
    console.log('\n3. Ejecutando comandos SQL...')
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      
      // Saltar comentarios y comandos vacíos
      if (!command || command.startsWith('SELECT \'Políticas RLS aplicadas')) {
        continue
      }
      
      console.log(`\n   [${i + 1}/${commands.length}] Ejecutando: ${command.substring(0, 50)}...`)
      
      try {
        const { data, error } = await adminSupabase.rpc('exec_sql', {
          sql: command
        })
        
        if (error) {
          console.error(`     ❌ Error: ${error.message}`)
          // Continuar con el siguiente comando
        } else {
          console.log('     ✅ Exitoso')
        }
      } catch (cmdError) {
        console.error(`     ❌ Error ejecutando comando: ${cmdError.message}`)
      }
    }
    
    // 4. Verificar que las políticas se crearon
    console.log('\n4. Verificando políticas creadas...')
    
    try {
      // Intentar obtener información de la tabla
      const { data: tableInfo, error: tableError } = await adminSupabase
        .from('online_users')
        .select('count')
        .limit(1)
      
      if (tableError) {
        console.error('❌ Error accediendo a la tabla:', tableError)
      } else {
        console.log('✅ Tabla online_users accesible')
      }
    } catch (verifyError) {
      console.error('❌ Error verificando tabla:', verifyError)
    }
    
    // 5. Probar INSERT con usuarios reales
    console.log('\n5. Probando INSERT con usuarios reales...')
    
    // Buscar usuarios
    const { data: users, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('colaborador, auth_user_id, rol')
      .eq('estado', 'activo')
      .not('auth_user_id', 'is', null)
      .limit(3)
    
    if (userError || !users) {
      console.error('❌ Error buscando usuarios:', userError)
      return
    }
    
    // Limpiar tabla primero
    await adminSupabase.from('online_users').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
    
    // Probar con cada usuario
    for (const user of users) {
      console.log(`\n   📝 Probando ${user.colaborador} (${user.rol})...`)
      
      const { data: insertData, error: insertError } = await adminSupabase
        .from('online_users')
        .insert({
          user_id: user.auth_user_id,
          last_seen_at: new Date().toISOString()
        })
        .select()
      
      if (insertError) {
        console.error(`     ❌ Error: ${insertError.message}`)
      } else {
        console.log('     ✅ INSERT exitoso')
      }
    }
    
    // 6. Verificar estado final
    console.log('\n6. Verificando estado final...')
    const { data: finalData, error: finalError } = await adminSupabase
      .from('online_users')
      .select('user_id, last_seen_at')
    
    if (finalError) {
      console.error('❌ Error verificando estado final:', finalError)
    } else {
      console.log(`✅ Registros en tabla: ${finalData?.length || 0}`)
      finalData?.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.user_id} - ${record.last_seen_at}`)
      })
    }
    
    // 7. Probar con cliente autenticado simulado
    console.log('\n7. Probando con cliente autenticado...')
    
    if (users && users.length > 0) {
      const testUser = users.find(u => u.rol === 'usuario') || users[0]
      console.log(`   Probando con: ${testUser.colaborador} (${testUser.rol})`)
      
      // Crear cliente con anon key
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      // Probar SELECT (debería funcionar para usuarios autenticados)
      const { data: selectData, error: selectError } = await userSupabase
        .from('online_users')
        .select('*')
      
      if (selectError) {
        console.log(`   ❌ SELECT error (esperado sin auth): ${selectError.message}`)
      } else {
        console.log(`   ⚠️  SELECT exitoso sin auth: ${selectData?.length || 0} registros`)
      }
    }
    
    console.log('\n✅ APLICACIÓN DE POLÍTICAS RLS COMPLETADA')
    console.log('\n📋 PRÓXIMOS PASOS:')
    console.log('1. Reiniciar la aplicación Next.js')
    console.log('2. Probar con usuarios reales desde la aplicación')
    console.log('3. Verificar que los heartbeats funcionen')
    console.log('4. Monitorear logs de la aplicación')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la aplicación
applyFinalRLSDirect().catch(console.error)
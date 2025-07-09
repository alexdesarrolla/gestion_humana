const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkRLSPolicies() {
  console.log('🔍 VERIFICANDO POLÍTICAS RLS ACTUALES')
  console.log('=====================================')
  
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // 1. Verificar políticas existentes
    console.log('\n1. Consultando políticas RLS actuales...')
    const { data: policies, error: policyError } = await adminSupabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'online_users')
      .order('policyname')
    
    if (policyError) {
      console.error('❌ Error al consultar políticas:', policyError)
      return
    }
    
    console.log(`\n📋 Políticas encontradas: ${policies?.length || 0}`)
    policies?.forEach(policy => {
      console.log(`\n   📝 ${policy.policyname}`)
      console.log(`      Comando: ${policy.cmd}`)
      console.log(`      Roles: ${policy.roles}`)
      console.log(`      Permisivo: ${policy.permissive}`)
      if (policy.qual) {
        console.log(`      USING: ${policy.qual}`)
      }
      if (policy.with_check) {
        console.log(`      WITH CHECK: ${policy.with_check}`)
      }
    })
    
    // 2. Verificar si RLS está habilitado
    console.log('\n2. Verificando estado de RLS...')
    const { data: tableInfo, error: tableError } = await adminSupabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'online_users')
      .single()
    
    if (tableError) {
      console.error('❌ Error al verificar tabla:', tableError)
    } else {
      console.log(`✅ RLS habilitado: ${tableInfo.relrowsecurity ? 'Sí' : 'No'}`)
    }
    
    // 3. Verificar permisos de la tabla
    console.log('\n3. Verificando permisos de tabla...')
    const { data: permissions, error: permError } = await adminSupabase
      .from('information_schema.table_privileges')
      .select('*')
      .eq('table_name', 'online_users')
      .eq('table_schema', 'public')
    
    if (permError) {
      console.error('❌ Error al verificar permisos:', permError)
    } else {
      console.log('📋 Permisos de tabla:')
      permissions?.forEach(perm => {
        console.log(`   ${perm.grantee}: ${perm.privilege_type}`)
      })
    }
    
    // 4. Probar consulta directa con auth context
    console.log('\n4. Probando consulta con contexto de auth...')
    
    // Buscar un usuario de prueba
    const { data: testUser, error: userError } = await adminSupabase
      .from('usuario_nomina')
      .select('auth_user_id, correo_electronico, colaborador')
      .eq('estado', 'activo')
      .eq('rol', 'usuario')
      .not('auth_user_id', 'is', null)
      .limit(1)
      .single()
    
    if (userError || !testUser) {
      console.error('❌ No se encontró usuario de prueba')
      return
    }
    
    console.log(`   Usuario de prueba: ${testUser.colaborador}`)
    console.log(`   Auth ID: ${testUser.auth_user_id}`)
    
    // Probar la condición de la política manualmente
    console.log('\n5. Probando condiciones de política manualmente...')
    
    // Verificar si el usuario está en usuario_nomina con auth_user_id
    const { data: nominaCheck, error: nominaError } = await adminSupabase
      .from('usuario_nomina')
      .select('auth_user_id')
      .eq('auth_user_id', testUser.auth_user_id)
      .eq('estado', 'activo')
      .not('auth_user_id', 'is', null)
    
    if (nominaError) {
      console.error('❌ Error al verificar usuario_nomina:', nominaError)
    } else {
      console.log(`✅ Usuario encontrado en usuario_nomina: ${nominaCheck?.length > 0 ? 'Sí' : 'No'}`)
    }
    
    // Verificar si el usuario existe por email
    const { data: emailCheck, error: emailError } = await adminSupabase
      .from('usuario_nomina')
      .select('correo_electronico')
      .eq('correo_electronico', testUser.correo_electronico)
      .eq('estado', 'activo')
    
    if (emailError) {
      console.error('❌ Error al verificar por email:', emailError)
    } else {
      console.log(`✅ Usuario encontrado por email: ${emailCheck?.length > 0 ? 'Sí' : 'No'}`)
    }
    
    // 6. Verificar estructura de la tabla online_users
    console.log('\n6. Verificando estructura de tabla online_users...')
    const { data: columns, error: colError } = await adminSupabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'online_users')
      .eq('table_schema', 'public')
      .order('ordinal_position')
    
    if (colError) {
      console.error('❌ Error al verificar columnas:', colError)
    } else {
      console.log('📋 Estructura de tabla:')
      columns?.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la verificación
checkRLSPolicies().catch(console.error)
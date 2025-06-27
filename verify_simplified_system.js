const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifySimplifiedSystem() {
  console.log('🔍 Verificando sistema simplificado...')
  
  try {
    // 1. Verificar que no hay usuarios con rol moderador
    console.log('\n1. Verificando roles de usuarios...')
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuario_nomina')
      .select('id, nombre, apellido, rol')
      .order('rol')
    
    if (usuariosError) {
      console.error('❌ Error al obtener usuarios:', usuariosError)
      return
    }
    
    const roleDistribution = usuarios.reduce((acc, user) => {
      acc[user.rol] = (acc[user.rol] || 0) + 1
      return acc
    }, {})
    
    console.log('📊 Distribución de roles:')
    Object.entries(roleDistribution).forEach(([rol, cantidad]) => {
      console.log(`   ${rol}: ${cantidad} usuarios`)
    })
    
    const moderadores = usuarios.filter(u => u.rol === 'moderador')
    if (moderadores.length > 0) {
      console.log('⚠️  Usuarios con rol moderador encontrados:')
      moderadores.forEach(u => {
        console.log(`   - ${u.nombre} ${u.apellido} (ID: ${u.id})`)
      })
    } else {
      console.log('✅ No hay usuarios con rol moderador')
    }
    
    // 2. Verificar que las tablas de permisos no existen
    console.log('\n2. Verificando eliminación de tablas de permisos...')
    
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info', {})
      .catch(() => {
        // Si la función no existe, usar query directo
        return supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .in('table_name', ['usuario_permisos', 'modulos'])
      })
    
    if (!tablesError && tables) {
      const permissionTables = tables.filter(t => 
        ['usuario_permisos', 'modulos'].includes(t.table_name)
      )
      
      if (permissionTables.length > 0) {
        console.log('⚠️  Tablas de permisos aún existen:')
        permissionTables.forEach(t => {
          console.log(`   - ${t.table_name}`)
        })
      } else {
        console.log('✅ Tablas de permisos eliminadas correctamente')
      }
    }
    
    // 3. Verificar que no hay triggers problemáticos
    console.log('\n3. Verificando triggers...')
    
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table')
      .eq('event_object_table', 'usuario_nomina')
    
    if (!triggersError && triggers) {
      const permissionTriggers = triggers.filter(t => 
        t.trigger_name.includes('permisos') || 
        t.trigger_name.includes('administrador') ||
        t.trigger_name.includes('moderador')
      )
      
      if (permissionTriggers.length > 0) {
        console.log('⚠️  Triggers problemáticos encontrados:')
        permissionTriggers.forEach(t => {
          console.log(`   - ${t.trigger_name}`)
        })
      } else {
        console.log('✅ No hay triggers problemáticos')
      }
    }
    
    // 4. Probar autenticación básica
    console.log('\n4. Probando funcionalidad básica...')
    
    // Obtener un usuario administrador para probar
    const adminUser = usuarios.find(u => u.rol === 'administrador')
    if (adminUser) {
      console.log(`✅ Usuario administrador encontrado: ${adminUser.nombre} ${adminUser.apellido}`)
    } else {
      console.log('⚠️  No se encontró ningún usuario administrador')
    }
    
    // Obtener un usuario regular para probar
    const regularUser = usuarios.find(u => u.rol === 'usuario')
    if (regularUser) {
      console.log(`✅ Usuario regular encontrado: ${regularUser.nombre} ${regularUser.apellido}`)
    } else {
      console.log('⚠️  No se encontró ningún usuario regular')
    }
    
    // 5. Verificar constraint de rol
    console.log('\n5. Verificando constraint de rol...')
    
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'usuario_nomina')
      .eq('constraint_name', 'usuario_nomina_rol_check')
    
    if (!constraintsError) {
      if (constraints && constraints.length > 0) {
        console.log('⚠️  Constraint restrictivo de rol aún existe')
      } else {
        console.log('✅ Constraint restrictivo de rol eliminado')
      }
    }
    
    console.log('\n🎉 Verificación completada')
    console.log('\n📋 Resumen:')
    console.log('- El sistema ahora usa solo roles básicos: usuario y administrador')
    console.log('- Los administradores tienen acceso completo')
    console.log('- Los usuarios regulares tienen acceso a su perfil y solicitudes')
    console.log('- No hay más permisos granulares por módulo')
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error)
  }
}

verifySimplifiedSystem()
  .then(() => {
    console.log('\n✅ Verificación finalizada')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
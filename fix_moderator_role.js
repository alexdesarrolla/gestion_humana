const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeSQL(sql, description) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    if (error) {
      console.log(`⚠️  ${description}: ${error.message}`)
      return false
    }
    console.log(`✅ ${description}`)
    return true
  } catch (err) {
    console.log(`⚠️  ${description}: ${err.message}`)
    return false
  }
}

async function fixModeratorRole() {
  try {
    console.log('🚀 Iniciando corrección de rol moderador...')
    
    // 1. Eliminar triggers que causan problemas
    console.log('\n1. Eliminando triggers problemáticos...')
    
    await executeSQL(
      'DROP TRIGGER IF EXISTS trigger_asignar_permisos_administrador ON usuario_nomina;',
      'Trigger de asignación de permisos eliminado'
    )
    
    await executeSQL(
      'DROP TRIGGER IF EXISTS trigger_limpiar_permisos_no_admin ON usuario_nomina;',
      'Trigger de limpieza de permisos eliminado'
    )
    
    await executeSQL(
      'DROP FUNCTION IF EXISTS asignar_permisos_administrador();',
      'Función de asignación de permisos eliminada'
    )
    
    await executeSQL(
      'DROP FUNCTION IF EXISTS limpiar_permisos_no_admin();',
      'Función de limpieza de permisos eliminada'
    )
    
    // 2. Verificar usuarios con rol moderador
    console.log('\n2. Verificando usuarios con rol moderador...')
    const { data: moderadores, error: selectError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, rol, estado')
      .eq('rol', 'moderador')
    
    if (selectError) {
      console.error('❌ Error al buscar moderadores:', selectError)
      return
    }
    
    console.log(`Encontrados ${moderadores.length} usuarios con rol moderador:`)
    moderadores.forEach(mod => {
      console.log(`- ${mod.colaborador} (ID: ${mod.id}, Estado: ${mod.estado})`)
    })
    
    if (moderadores.length === 0) {
      console.log('✅ No hay usuarios con rol moderador para actualizar')
      return
    }
    
    // 3. Actualizar usuarios moderadores a usuarios normales
    console.log('\n3. Actualizando usuarios moderadores a usuarios normales...')
    
    for (const moderador of moderadores) {
      console.log(`Actualizando ${moderador.colaborador}...`)
      
      const { data: updateData, error: updateError } = await supabase
        .from('usuario_nomina')
        .update({ rol: 'usuario' })
        .eq('id', moderador.id)
        .select()
      
      if (updateError) {
        console.error(`❌ Error al actualizar ${moderador.colaborador}:`, updateError)
      } else {
        console.log(`✅ ${moderador.colaborador} actualizado exitosamente`)
      }
    }
    
    // 4. Actualizar constraint de roles
    console.log('\n4. Actualizando constraint de roles...')
    
    await executeSQL(
      'ALTER TABLE usuario_nomina DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;',
      'Constraint anterior eliminado'
    )
    
    await executeSQL(
      "ALTER TABLE usuario_nomina ADD CONSTRAINT usuario_nomina_rol_check CHECK (rol IN ('usuario', 'administrador'));",
      'Nuevo constraint aplicado'
    )
    
    // 5. Verificar resultado final
    console.log('\n5. Verificando resultado final...')
    const { data: finalCheck, error: finalError } = await supabase
      .from('usuario_nomina')
      .select('rol')
      .eq('rol', 'moderador')
    
    if (finalError) {
      console.error('❌ Error en verificación final:', finalError)
      return
    }
    
    console.log(`Usuarios con rol moderador restantes: ${finalCheck.length}`)
    
    if (finalCheck.length === 0) {
      console.log('\n🎉 ¡ÉXITO! Todos los usuarios moderadores han sido convertidos a usuarios normales')
      
      // 6. Mostrar resumen de roles
      const { data: rolesSummary, error: rolesError } = await supabase
        .from('usuario_nomina')
        .select('rol')
      
      if (!rolesError) {
        const userCount = rolesSummary.filter(u => u.rol === 'usuario').length
        const adminCount = rolesSummary.filter(u => u.rol === 'administrador').length
        
        console.log('\n📊 Resumen de roles:')
        console.log(`- Usuarios: ${userCount}`)
        console.log(`- Administradores: ${adminCount}`)
        console.log(`- Moderadores: 0 (eliminados)`)
        
        console.log('\n✅ Sistema simplificado: solo usuarios y administradores')
        console.log('✅ El usuario MARIO ALEXANDER AVELLANEDA BUITRAGO ahora puede ser editado sin errores')
      }
    } else {
      console.log('⚠️  Aún quedan usuarios con rol moderador por actualizar')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

fixModeratorRole()
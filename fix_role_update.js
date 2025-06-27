const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixRoleUpdate() {
  try {
    console.log('🚀 Iniciando corrección de actualización de roles...')
    
    // Paso 1: Eliminar triggers problemáticos
    console.log('\n1. Eliminando triggers problemáticos...')
    
    const dropTriggerSQL = `
      DROP TRIGGER IF EXISTS trigger_limpiar_permisos_no_admin ON usuario_nomina;
      DROP TRIGGER IF EXISTS trigger_limpiar_permisos_no_moderador ON usuario_nomina;
      DROP FUNCTION IF EXISTS limpiar_permisos_no_admin();
      DROP FUNCTION IF EXISTS limpiar_permisos_no_moderador();
    `
    
    // Ejecutar SQL usando una consulta directa
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropTriggerSQL })
    
    if (dropError && !dropError.message.includes('does not exist')) {
      console.log('⚠️  No se pudieron eliminar los triggers (puede que no existan):', dropError.message)
    } else {
      console.log('✅ Triggers eliminados exitosamente')
    }
    
    // Paso 2: Actualizar roles
    console.log('\n2. Actualizando roles de moderador a usuario...')
    
    const { data: moderadores, error: selectError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, rol')
      .eq('rol', 'moderador')
    
    if (selectError) {
      console.error('❌ Error al buscar moderadores:', selectError)
      return
    }
    
    console.log(`Encontrados ${moderadores.length} usuarios moderadores:`)
    moderadores.forEach(mod => {
      console.log(`- ${mod.colaborador} (ID: ${mod.id})`)
    })
    
    if (moderadores.length === 0) {
      console.log('✅ No hay usuarios moderadores para actualizar')
      return
    }
    
    // Actualizar roles
    const { data, error } = await supabase
      .from('usuario_nomina')
      .update({ rol: 'usuario' })
      .eq('rol', 'moderador')
      .select('id, colaborador, rol')
    
    if (error) {
      console.error('❌ Error al actualizar roles:', error)
    } else {
      console.log(`\n✅ Éxito! ${data.length} usuarios actualizados:`)
      data.forEach(u => console.log(`- ${u.colaborador} ahora es ${u.rol}`))
    }
    
    // Paso 3: Actualizar constraint de roles
    console.log('\n3. Actualizando constraint de roles...')
    
    const constraintSQL = `
      ALTER TABLE usuario_nomina 
      DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;
      
      ALTER TABLE usuario_nomina 
      ADD CONSTRAINT usuario_nomina_rol_check 
      CHECK (rol IN ('usuario', 'administrador'));
    `
    
    const { error: constraintError } = await supabase.rpc('exec_sql', { sql: constraintSQL })
    
    if (constraintError) {
      console.log('⚠️  Error al actualizar constraint:', constraintError.message)
    } else {
      console.log('✅ Constraint actualizado exitosamente')
    }
    
    console.log('\n🎉 Proceso completado!')
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

fixRoleUpdate()
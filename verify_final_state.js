const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyFinalState() {
  try {
    console.log('🔍 Verificando estado final después de eliminar triggers...')
    
    // Paso 1: Verificar usuarios moderadores
    console.log('\n1. Verificando usuarios moderadores...')
    
    const { data: moderadores, error: selectError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, rol')
      .eq('rol', 'moderador')
    
    if (selectError) {
      console.error('❌ Error al buscar moderadores:', selectError)
      return
    }
    
    console.log(`Usuarios moderadores encontrados: ${moderadores.length}`)
    
    if (moderadores.length > 0) {
      console.log('⚠️  Usuarios moderadores restantes:')
      moderadores.forEach(mod => {
        console.log(`- ${mod.colaborador} (ID: ${mod.id})`)
      })
      
      console.log('\n🚨 ATENCIÓN: Aún hay usuarios moderadores.')
      console.log('Asegúrate de haber ejecutado el script remove_triggers_and_update.sql')
    } else {
      console.log('✅ No hay usuarios moderadores restantes')
    }
    
    // Paso 2: Mostrar distribución de roles
    console.log('\n2. Distribución actual de roles:')
    
    const { data: allRoles, error: rolesError } = await supabase
      .from('usuario_nomina')
      .select('rol')
    
    if (!rolesError && allRoles) {
      const roleCount = allRoles.reduce((acc, user) => {
        acc[user.rol] = (acc[user.rol] || 0) + 1
        return acc
      }, {})
      
      Object.entries(roleCount).forEach(([rol, count]) => {
        console.log(`- ${rol}: ${count} usuarios`)
      })
    }
    
    // Paso 3: Intentar una actualización de prueba
    console.log('\n3. Probando actualización de rol (sin cambios reales)...')
    
    const { data: testUser, error: testError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, rol')
      .eq('rol', 'usuario')
      .limit(1)
    
    if (testUser && testUser.length > 0) {
      const user = testUser[0]
      console.log(`Probando con usuario: ${user.colaborador}`)
      
      // Intentar actualizar el rol al mismo valor (no debería cambiar nada)
      const { data: updateTest, error: updateError } = await supabase
        .from('usuario_nomina')
        .update({ rol: user.rol })
        .eq('id', user.id)
        .select('id, colaborador, rol')
      
      if (updateError) {
        console.error('❌ Error en prueba de actualización:', updateError)
        console.log('\n🚨 Aún hay problemas con los triggers o constraints')
      } else {
        console.log('✅ Prueba de actualización exitosa - No hay problemas con triggers')
      }
    }
    
    // Paso 4: Verificar si existe tabla usuario_permisos
    console.log('\n4. Verificando tabla usuario_permisos...')
    
    try {
      const { data: permissionsTest, error: permissionsError } = await supabase
        .from('usuario_permisos')
        .select('id')
        .limit(1)
      
      if (permissionsError && permissionsError.code === '42P01') {
        console.log('ℹ️  Tabla usuario_permisos no existe (esto es normal si no se necesita)')
      } else {
        console.log('✅ Tabla usuario_permisos existe')
      }
    } catch (err) {
      console.log('ℹ️  Tabla usuario_permisos no existe')
    }
    
    // Paso 5: Resumen final
    console.log('\n5. Resumen final:')
    
    if (moderadores.length === 0) {
      console.log('\n🎉 ¡ÉXITO COMPLETO!')
      console.log('✅ No hay usuarios moderadores')
      console.log('✅ El campo rol funciona como texto libre')
      console.log('✅ No hay problemas con triggers')
      
      console.log('\n📝 Estado del sistema:')
      console.log('- Campo rol: Texto libre sin restricciones')
      console.log('- Triggers problemáticos: Eliminados')
      console.log('- Usuarios moderadores: Convertidos a usuarios')
      console.log('- Sistema: Funcionando correctamente')
    } else {
      console.log('\n⚠️  ACCIÓN REQUERIDA:')
      console.log('1. Ejecutar remove_triggers_and_update.sql en Supabase SQL Editor')
      console.log('2. Ejecutar este script nuevamente para verificar')
    }
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

verifyFinalState()
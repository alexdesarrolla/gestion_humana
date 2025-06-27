const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateRoleAfterTable() {
  try {
    console.log('🚀 Actualizando roles después de crear tabla usuario_permisos...')
    
    // Paso 1: Verificar que la tabla usuario_permisos existe
    console.log('\n1. Verificando tabla usuario_permisos...')
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('usuario_permisos')
        .select('id')
        .limit(1)
      
      if (testError && testError.code === '42P01') {
        console.log('❌ La tabla usuario_permisos NO existe')
        console.log('\n📋 INSTRUCCIONES:')
        console.log('1. Ve al SQL Editor de Supabase Dashboard')
        console.log('2. Ejecuta el contenido del archivo: create_permissions_table.sql')
        console.log('3. Luego ejecuta este script nuevamente')
        console.log('\n🔗 Archivo SQL: create_permissions_table.sql')
        return
      } else {
        console.log('✅ Tabla usuario_permisos existe')
      }
    } catch (err) {
      console.log('Error al verificar tabla:', err.message)
      return
    }
    
    // Paso 2: Verificar usuarios moderadores
    console.log('\n2. Verificando usuarios moderadores...')
    
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
    
    // Paso 3: Actualizar roles uno por uno
    console.log('\n3. Actualizando roles individualmente...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const moderador of moderadores) {
      console.log(`\nActualizando ${moderador.colaborador}...`)
      
      const { data: userData, error: userError } = await supabase
        .from('usuario_nomina')
        .update({ rol: 'usuario' })
        .eq('id', moderador.id)
        .select('id, colaborador, rol')
      
      if (userError) {
        console.error(`❌ Error al actualizar ${moderador.colaborador}:`, userError)
        errorCount++
      } else {
        console.log(`✅ ${moderador.colaborador} actualizado exitosamente a ${userData[0].rol}`)
        successCount++
      }
      
      // Pequeña pausa entre actualizaciones
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Paso 4: Resumen de resultados
    console.log('\n4. Resumen de actualizaciones:')
    console.log(`✅ Exitosas: ${successCount}`)
    console.log(`❌ Fallidas: ${errorCount}`)
    
    // Paso 5: Verificar resultado final
    console.log('\n5. Verificación final...')
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, rol')
      .eq('rol', 'moderador')
    
    if (finalError) {
      console.error('Error en verificación final:', finalError)
    } else {
      console.log(`\nUsuarios moderadores restantes: ${finalCheck.length}`)
      
      if (finalCheck.length === 0) {
        console.log('\n🎉 ¡ÉXITO COMPLETO! Todos los moderadores han sido convertidos a usuarios')
        console.log('\n📝 Próximos pasos recomendados:')
        console.log('1. Actualizar el constraint de roles para eliminar "moderador"')
        console.log('2. Eliminar triggers y funciones relacionadas con moderador')
        console.log('3. Verificar que la aplicación funcione correctamente')
        console.log('4. Considerar eliminar la tabla usuario_permisos si no se necesita')
      } else {
        console.log('\n⚠️  Usuarios moderadores restantes:')
        finalCheck.forEach(mod => {
          console.log(`- ${mod.colaborador} (ID: ${mod.id})`)
        })
      }
    }
    
    // Paso 6: Verificar todos los roles actuales
    console.log('\n6. Distribución actual de roles:')
    
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
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

updateRoleAfterTable()
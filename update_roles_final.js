const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateRolesFinal() {
  try {
    console.log('🚀 Actualizando roles después de eliminar constraint restrictivo...')
    
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
    
    console.log(`Encontrados ${moderadores.length} usuarios moderadores:`)
    moderadores.forEach(mod => {
      console.log(`- ${mod.colaborador} (ID: ${mod.id})`)
    })
    
    if (moderadores.length === 0) {
      console.log('✅ No hay usuarios moderadores para actualizar')
      
      // Verificar distribución actual de roles
      const { data: allRoles } = await supabase
        .from('usuario_nomina')
        .select('rol')
      
      if (allRoles) {
        console.log('\n📊 Distribución actual de roles:')
        const roleCount = allRoles.reduce((acc, user) => {
          acc[user.rol] = (acc[user.rol] || 0) + 1
          return acc
        }, {})
        
        Object.entries(roleCount).forEach(([rol, count]) => {
          console.log(`- ${rol}: ${count} usuarios`)
        })
      }
      
      return
    }
    
    // Paso 2: Actualizar roles de moderador a usuario
    console.log('\n2. Actualizando roles de moderador a usuario...')
    
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
    
    // Paso 3: Resumen de resultados
    console.log('\n3. Resumen de actualizaciones:')
    console.log(`✅ Exitosas: ${successCount}`)
    console.log(`❌ Fallidas: ${errorCount}`)
    
    // Paso 4: Verificar resultado final
    console.log('\n4. Verificación final...')
    
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
      } else {
        console.log('\n⚠️  Usuarios moderadores restantes:')
        finalCheck.forEach(mod => {
          console.log(`- ${mod.colaborador} (ID: ${mod.id})`)
        })
      }
    }
    
    // Paso 5: Mostrar distribución final de roles
    console.log('\n5. Distribución final de roles:')
    
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
    
    console.log('\n📝 Próximos pasos recomendados:')
    console.log('1. ✅ Constraint restrictivo eliminado')
    console.log('2. ✅ Roles actualizados')
    console.log('3. Verificar que la aplicación funcione correctamente')
    console.log('4. Considerar implementar validación a nivel de aplicación si es necesario')
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

updateRolesFinal()
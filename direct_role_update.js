const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function directRoleUpdate() {
  try {
    console.log('🚀 Actualizando roles directamente...')
    
    // Primero verificar usuarios moderadores
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
    
    // Intentar actualizar cada usuario individualmente
    console.log('\n🔄 Actualizando usuarios uno por uno...')
    
    for (const moderador of moderadores) {
      console.log(`Actualizando ${moderador.colaborador}...`)
      
      const { data, error } = await supabase
        .from('usuario_nomina')
        .update({ rol: 'usuario' })
        .eq('id', moderador.id)
        .select('id, colaborador, rol')
      
      if (error) {
        console.error(`❌ Error al actualizar ${moderador.colaborador}:`, error)
      } else {
        console.log(`✅ ${moderador.colaborador} actualizado exitosamente`)
      }
    }
    
    // Verificar resultado final
    console.log('\n📊 Verificando resultado final...')
    const { data: finalCheck, error: finalError } = await supabase
      .from('usuario_nomina')
      .select('rol')
      .eq('rol', 'moderador')
    
    if (finalError) {
      console.error('Error en verificación final:', finalError)
    } else {
      console.log(`Usuarios moderadores restantes: ${finalCheck.length}`)
      if (finalCheck.length === 0) {
        console.log('🎉 ¡Todos los moderadores han sido convertidos a usuarios!')
      }
    }
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

directRoleUpdate()
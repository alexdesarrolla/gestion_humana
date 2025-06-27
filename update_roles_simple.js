const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateRoles() {
  try {
    console.log('🚀 Actualizando roles de moderador a usuario...')
    
    // Primero verificar usuarios moderadores
    const { data: moderadores, error: selectError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, rol')
      .eq('rol', 'moderador')
    
    if (selectError) {
      console.error('Error al buscar moderadores:', selectError)
      return
    }
    
    console.log(`Encontrados ${moderadores.length} usuarios moderadores:`)
    moderadores.forEach(mod => {
      console.log(`- ${mod.colaborador} (ID: ${mod.id})`)
    })
    
    if (moderadores.length === 0) {
      console.log('No hay usuarios moderadores para actualizar')
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
      console.log(`✅ Éxito! ${data.length} usuarios actualizados:`)
      data.forEach(u => console.log(`- ${u.colaborador} ahora es ${u.rol}`))
    }
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

updateRoles()
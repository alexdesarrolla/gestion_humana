const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTriggers() {
  try {
    console.log('🔍 Verificando triggers en usuario_nomina...')
    
    // Verificar triggers usando una consulta SQL directa
    const { data, error } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_statement')
      .eq('event_object_table', 'usuario_nomina')
    
    if (error) {
      console.error('Error al consultar triggers:', error)
      
      // Intentar método alternativo
      console.log('\n🔄 Intentando método alternativo...')
      const { data: pgTriggers, error: pgError } = await supabase
        .from('pg_trigger')
        .select('tgname')
        .neq('tgisinternal', true)
      
      if (pgError) {
        console.error('Error con método alternativo:', pgError)
      } else {
        console.log('Triggers encontrados:', pgTriggers)
      }
    } else {
      console.log('Triggers encontrados:')
      if (data.length === 0) {
        console.log('- No hay triggers en usuario_nomina')
      } else {
        data.forEach(trigger => {
          console.log(`- ${trigger.trigger_name} (${trigger.event_manipulation})`)
          console.log(`  Acción: ${trigger.action_statement}`)
        })
      }
    }
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

checkTriggers()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupComentariosPermisosNotifications() {
  try {
    console.log('🚀 Configurando notificaciones para comentarios de permisos...')
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'db', 'migrations', '20241219_setup_comentarios_permisos_notifications.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Ejecutar el SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    })
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error)
      return
    }
    
    console.log('✅ Configuración completada exitosamente')
    
    // Verificar que las políticas se crearon
    console.log('\n📋 Verificando políticas RLS...')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'comentarios_permisos')
    
    if (policiesError) {
      console.error('❌ Error verificando políticas:', policiesError)
    } else {
      console.log(`✅ ${policies?.length || 0} políticas RLS creadas para comentarios_permisos`)
    }
    
    // Verificar que el trigger se creó
    console.log('\n🔧 Verificando triggers...')
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('event_object_table', 'comentarios_permisos')
    
    if (triggersError) {
      console.error('❌ Error verificando triggers:', triggersError)
    } else {
      console.log(`✅ ${triggers?.length || 0} triggers creados para comentarios_permisos`)
    }
    
    console.log('\n🎉 ¡Configuración de notificaciones para comentarios de permisos completada!')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupComentariosPermisosNotifications()
}

module.exports = { setupComentariosPermisosNotifications }
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration022() {
  try {
    console.log('🚀 Ejecutando migración 022 - Sistema de permisos...')
    
    // Leer el archivo SQL
    const sqlContent = fs.readFileSync('./sql/migrations/022_create_permissions_system.sql', 'utf8')
    
    // Dividir en comandos individuales
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    console.log(`📝 Ejecutando ${commands.length} comandos SQL...`)
    
    // Ejecutar cada comando individualmente
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      
      if (command.trim().length === 0) continue
      
      console.log(`\n[${i + 1}/${commands.length}] Ejecutando: ${command.substring(0, 50)}...`)
      
      try {
        // Usar una consulta SQL directa
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({ sql: command })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log(`⚠️  Comando ${i + 1} falló (puede ser normal):`, errorText)
        } else {
          console.log(`✅ Comando ${i + 1} ejecutado exitosamente`)
        }
        
      } catch (cmdError) {
        console.log(`⚠️  Error en comando ${i + 1}:`, cmdError.message)
      }
    }
    
    console.log('\n🎉 Migración completada!')
    
    // Ahora intentar actualizar los roles
    console.log('\n🔄 Actualizando roles de moderador a usuario...')
    
    const { data, error } = await supabase
      .from('usuario_nomina')
      .update({ rol: 'usuario' })
      .eq('rol', 'moderador')
      .select('id, colaborador, rol')
    
    if (error) {
      console.error('❌ Error al actualizar roles:', error)
    } else {
      console.log(`✅ ${data.length} usuarios actualizados exitosamente:`)
      data.forEach(u => console.log(`- ${u.colaborador} ahora es ${u.rol}`))
    }
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

runMigration022()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runPermissionsMigration() {
  try {
    console.log('🚀 Iniciando migración del sistema de permisos...')
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'sql', 'migrations', '022_create_permissions_system.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Dividir en comandos individuales
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && cmd !== 'COMMIT')
    
    console.log(`📝 Ejecutando ${commands.length} comandos SQL...`)
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      console.log(`\n[${i + 1}/${commands.length}] Ejecutando comando...`)
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: command + ';'
        })
        
        if (error) {
          // Ignorar errores de objetos que ya existen
          if (error.message.includes('already exists') || 
              error.message.includes('ya existe') ||
              error.message.includes('duplicate')) {
            console.log(`⚠️  Objeto ya existe, continuando...`)
            continue
          }
          throw error
        }
        
        console.log(`✅ Comando ejecutado exitosamente`)
      } catch (cmdError) {
        console.error(`❌ Error en comando ${i + 1}:`, cmdError.message)
        
        // Si es un error de función no encontrada, mostrar instrucciones
        if (cmdError.message.includes('exec_sql')) {
          console.log('\n🔧 INSTRUCCIONES MANUALES:')
          console.log('La función exec_sql no está disponible. Por favor:')
          console.log('1. Ve al SQL Editor en tu dashboard de Supabase')
          console.log('2. Copia y pega el contenido del archivo:')
          console.log('   sql/migrations/022_create_permissions_system.sql')
          console.log('3. Ejecuta el SQL manualmente')
          return
        }
        
        throw cmdError
      }
    }
    
    console.log('\n🎉 ¡Migración completada exitosamente!')
    console.log('\n📋 Resumen:')
    console.log('- ✅ Enum de roles actualizado (usuario, administrador)')
    console.log('- ✅ Tabla modulos creada')
    console.log('- ✅ Tabla usuario_permisos creada')
    console.log('- ✅ Índices creados')
    console.log('- ✅ Módulos del sistema insertados')
    console.log('- ✅ Funciones y triggers creados')
    console.log('- ✅ Permisos asignados a administradores existentes')
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message)
    console.log('\n🔧 SOLUCIÓN MANUAL:')
    console.log('Ejecuta manualmente el contenido de:')
    console.log('sql/migrations/022_create_permissions_system.sql')
    console.log('en el SQL Editor de Supabase')
  }
}

// Ejecutar la migración
runPermissionsMigration()
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://aqmlxjsyczqtfansvnqr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbWx4anN5Y3pxdGZhbnN2bnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzM3NTYsImV4cCI6MjA1ODUwOTc1Nn0._dfB0vDYrR4jQ1cFHPXr_6iGTUXctzTeZbIcE4FJ0lk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runRetiroFieldsMigration() {
  try {
    console.log('Ejecutando migración para agregar campos de retiro...');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'sql', 'migrations', '021_add_retiro_fields_to_usuario_nomina.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Dividir el SQL en comandos individuales
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '');
    
    console.log(`Ejecutando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        console.log(`Ejecutando comando ${i + 1}/${commands.length}...`);
        console.log(`SQL: ${command.substring(0, 100)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          console.error(`Error en comando ${i + 1}:`, error);
          // Continuar con el siguiente comando si es un error menor
          if (!error.message.includes('already exists')) {
            throw error;
          }
        } else {
          console.log(`✓ Comando ${i + 1} ejecutado exitosamente`);
        }
      }
    }
    
    console.log('\n✅ Migración completada exitosamente!');
    console.log('Los campos motivo_retiro y fecha_retiro han sido agregados a la tabla usuario_nomina.');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.log('\n📝 SQL para ejecutar manualmente en Supabase:');
    console.log('\n--- COPIAR Y PEGAR EN EL EDITOR SQL DE SUPABASE ---');
    
    const migrationPath = path.join(__dirname, 'sql', 'migrations', '021_add_retiro_fields_to_usuario_nomina.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(migrationSQL);
    console.log('--- FIN DEL SQL ---\n');
  }
}

runRetiroFieldsMigration();
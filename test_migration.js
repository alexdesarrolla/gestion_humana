const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://aqmlxjsyczqtfansvnqr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbWx4anN5Y3pxdGZhbnN2bnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzM3NTYsImV4cCI6MjA1ODUwOTc1Nn0._dfB0vDYrR4jQ1cFHPXr_6iGTUXctzTeZbIcE4FJ0lk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMigration() {
  try {
    console.log('Verificando si los campos ya existen...');
    
    // Intentar hacer una consulta que incluya los nuevos campos
    const { data, error } = await supabase
      .from('usuario_nomina')
      .select('id, motivo_retiro, fecha_retiro')
      .limit(1);
    
    if (error) {
      console.log('❌ Los campos no existen aún. Error:', error.message);
      console.log('\n📝 Por favor ejecuta el siguiente SQL en el panel de Supabase:');
      console.log('\n--- SQL PARA EJECUTAR ---');
      console.log(`
ALTER TABLE usuario_nomina ADD COLUMN motivo_retiro TEXT;
ALTER TABLE usuario_nomina ADD COLUMN fecha_retiro DATE;
CREATE INDEX idx_usuario_nomina_fecha_retiro ON usuario_nomina(fecha_retiro);
COMMENT ON COLUMN usuario_nomina.motivo_retiro IS 'Motivo del retiro del usuario (solo para usuarios inactivos)';
COMMENT ON COLUMN usuario_nomina.fecha_retiro IS 'Fecha de retiro del usuario (solo para usuarios inactivos)';
`);
      console.log('--- FIN DEL SQL ---\n');
    } else {
      console.log('✅ Los campos motivo_retiro y fecha_retiro ya existen en la tabla usuario_nomina');
      console.log('✅ La migración se completó exitosamente');
    }
    
  } catch (error) {
    console.error('Error durante la verificación:', error);
  }
}

testMigration();
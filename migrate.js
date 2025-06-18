const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://aqmlxjsyczqtfansvnqr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbWx4anN5Y3pxdGZhbnN2bnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzM3NTYsImV4cCI6MjA1ODUwOTc1Nn0._dfB0vDYrR4jQ1cFHPXr_6iGTUXctzTeZbIcE4FJ0lk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Verificando si la tabla comunicados_cargos ya existe...');
    
    // Verificar si la tabla ya existe
    const { data: existingTable, error: checkError } = await supabase
      .from('comunicados_cargos')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('La tabla comunicados_cargos ya existe.');
      return;
    }
    
    console.log('La tabla no existe, creándola manualmente...');
    console.log('Por favor, ejecuta el siguiente SQL en el panel de Supabase:');
    console.log('\n--- SQL PARA EJECUTAR EN SUPABASE ---');
    console.log(`
CREATE TABLE IF NOT EXISTS comunicados_cargos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comunicado_id UUID NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  cargo_id UUID NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comunicado_id, cargo_id)
);

CREATE INDEX IF NOT EXISTS idx_comunicados_cargos_comunicado_id ON comunicados_cargos(comunicado_id);
CREATE INDEX IF NOT EXISTS idx_comunicados_cargos_cargo_id ON comunicados_cargos(cargo_id);

ALTER TABLE comunicados_cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos los usuarios pueden ver comunicados_cargos"
  ON comunicados_cargos
  FOR SELECT
  TO PUBLIC;

CREATE POLICY "Solo los administradores pueden gestionar comunicados_cargos"
  ON comunicados_cargos
  FOR ALL
  USING (auth.uid() IN (
    SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
  ));`);
    console.log('\n--- FIN DEL SQL ---\n');
    
  } catch (err) {
    console.error('Error durante la verificación:', err);
  }
}

runMigration();
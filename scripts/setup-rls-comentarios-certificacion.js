const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupRLSPolicies() {
  console.log('🔧 Configurando políticas RLS para comentarios_certificacion...');

  try {
    // Habilitar RLS
    console.log('📋 Habilitando Row Level Security...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE comentarios_certificacion ENABLE ROW LEVEL SECURITY;'
    });

    // Política para ver comentarios
    console.log('👀 Creando política para ver comentarios...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Usuarios autenticados pueden ver comentarios de certificación"
          ON comentarios_certificacion
          FOR SELECT
          TO authenticated
          USING (true);
      `
    });

    // Política para crear comentarios
    console.log('✍️ Creando política para crear comentarios...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Usuarios autenticados pueden crear comentarios de certificación"
          ON comentarios_certificacion
          FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = usuario_id);
      `
    });

    // Política para actualizar comentarios
    console.log('📝 Creando política para actualizar comentarios...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Usuarios pueden actualizar sus propios comentarios de certificación"
          ON comentarios_certificacion
          FOR UPDATE
          TO authenticated
          USING (auth.uid() = usuario_id)
          WITH CHECK (auth.uid() = usuario_id);
      `
    });

    // Política para eliminar comentarios
    console.log('🗑️ Creando política para eliminar comentarios...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Usuarios pueden eliminar sus propios comentarios de certificación"
          ON comentarios_certificacion
          FOR DELETE
          TO authenticated
          USING (auth.uid() = usuario_id);
      `
    });

    // Política para administradores
    console.log('👑 Creando política para administradores...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Administradores pueden gestionar todos los comentarios de certificación"
          ON comentarios_certificacion
          FOR ALL
          TO authenticated
          USING (auth.uid() IN (
            SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
          ))
          WITH CHECK (auth.uid() IN (
            SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
          ));
      `
    });

    console.log('✅ Políticas RLS configuradas exitosamente para comentarios_certificacion');

  } catch (error) {
    console.error('❌ Error configurando políticas RLS:', error.message);
    process.exit(1);
  }
}

setupRLSPolicies();
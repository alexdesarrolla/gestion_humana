const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixNotificacionesRLS() {
  console.log('🔧 Corrigiendo políticas RLS para notificaciones...');

  try {
    // Usar una consulta SQL directa a través de una función personalizada
    console.log('🗑️ Eliminando política restrictiva...');
    
    const dropPolicySQL = `
      DROP POLICY IF EXISTS "Permitir crear notificaciones" ON notificaciones;
    `;
    
    const createPolicySQL = `
      CREATE POLICY "Permitir crear notificaciones"
        ON notificaciones
        FOR INSERT
        WITH CHECK (
          -- Permitir al service role (para funciones del sistema y triggers)
          auth.role() = 'service_role' OR
          -- Permitir a administradores y moderadores
          auth.uid() IN (
            SELECT auth_user_id FROM usuario_nomina WHERE rol IN ('administrador', 'moderador')
          ) OR
          -- Permitir a usuarios autenticados (necesario para triggers)
          auth.uid() IS NOT NULL
        );
    `;

    // Intentar ejecutar usando una consulta SQL raw
    console.log('✍️ Aplicando corrección de política...');
    
    // Usar el método de consulta SQL directa
    const { data: dropResult, error: dropError } = await supabase
      .rpc('sql', { query: dropPolicySQL });
    
    if (dropError) {
      console.log('⚠️ Error eliminando política (puede que no exista):', dropError.message);
    } else {
      console.log('✅ Política anterior eliminada');
    }

    const { data: createResult, error: createError } = await supabase
      .rpc('sql', { query: createPolicySQL });
    
    if (createError) {
      console.error('❌ Error creando nueva política:', createError.message);
      
      // Si falla, mostrar instrucciones manuales
      console.log('\n📋 Ejecuta manualmente en Supabase Dashboard:');
      console.log(dropPolicySQL);
      console.log(createPolicySQL);
    } else {
      console.log('✅ Nueva política creada exitosamente');
      
      // Verificar que la política se aplicó
      console.log('🔍 Verificando política...');
      const { data: policies, error: verifyError } = await supabase
        .rpc('sql', { 
          query: `
            SELECT policyname, cmd, qual 
            FROM pg_policies 
            WHERE tablename = 'notificaciones' AND cmd = 'INSERT';
          `
        });
      
      if (!verifyError && policies) {
        console.log('📋 Políticas actuales:', policies);
      }
    }

    console.log('\n✅ Proceso completado. Intenta guardar un comentario ahora.');

  } catch (error) {
    console.error('❌ Error general:', error.message);
    
    // Mostrar instrucciones manuales como fallback
    console.log('\n📋 Como alternativa, ejecuta esto en Supabase Dashboard:');
    console.log('\nDROP POLICY IF EXISTS "Permitir crear notificaciones" ON notificaciones;');
    console.log('\nCREATE POLICY "Permitir crear notificaciones"');
    console.log('  ON notificaciones');
    console.log('  FOR INSERT');
    console.log('  WITH CHECK (');
    console.log('    auth.role() = \'service_role\' OR');
    console.log('    auth.uid() IN (');
    console.log('      SELECT auth_user_id FROM usuario_nomina WHERE rol IN (\'administrador\', \'moderador\')');
    console.log('    ) OR');
    console.log('    auth.uid() IS NOT NULL');
    console.log('  );');
  }
}

fixNotificacionesRLS();
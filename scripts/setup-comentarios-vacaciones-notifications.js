const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupComentariosVacacionesNotifications() {
  console.log('🔧 Configurando notificaciones para comentarios de vacaciones...');

  try {
    console.log('\n📋 Ejecuta el siguiente SQL en Supabase Dashboard:');
    
    const sqlScript = `
-- =====================================================
-- CONFIGURACIÓN DE RLS PARA COMENTARIOS_VACACIONES
-- =====================================================

-- Habilitar RLS en la tabla comentarios_vacaciones
ALTER TABLE comentarios_vacaciones ENABLE ROW LEVEL SECURITY;

-- Política para ver comentarios (todos los usuarios autenticados pueden ver comentarios de solicitudes)
CREATE POLICY "Usuarios pueden ver comentarios de vacaciones"
  ON comentarios_vacaciones
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política para crear comentarios (usuarios autenticados pueden crear comentarios)
CREATE POLICY "Usuarios pueden crear comentarios de vacaciones"
  ON comentarios_vacaciones
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Política para actualizar comentarios (solo el autor puede actualizar sus comentarios)
CREATE POLICY "Usuarios pueden actualizar sus comentarios de vacaciones"
  ON comentarios_vacaciones
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Política para eliminar comentarios (solo el autor o administradores pueden eliminar)
CREATE POLICY "Usuarios pueden eliminar sus comentarios de vacaciones"
  ON comentarios_vacaciones
  FOR DELETE
  USING (
    auth.uid() = usuario_id OR
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol IN ('administrador', 'moderador')
    )
  );

-- =====================================================
-- FUNCIÓN PARA CREAR NOTIFICACIONES DE COMENTARIOS
-- =====================================================

CREATE OR REPLACE FUNCTION crear_notificacion_comentario_vacaciones()
RETURNS TRIGGER AS $$
DECLARE
    solicitud_record RECORD;
    usuario_comentario_nombre TEXT;
    usuario_solicitud_id UUID;
    admin_record RECORD;
    titulo_notificacion TEXT;
    mensaje_notificacion TEXT;
BEGIN
    -- Obtener información de la solicitud de vacaciones
    SELECT sv.usuario_id, un.colaborador as nombre_solicitante
    INTO solicitud_record
    FROM solicitudes_vacaciones sv
    JOIN usuario_nomina un ON sv.usuario_id = un.auth_user_id
    WHERE sv.id = NEW.solicitud_id;
    
    -- Obtener el nombre del usuario que comentó
    SELECT colaborador INTO usuario_comentario_nombre
    FROM usuario_nomina
    WHERE auth_user_id = NEW.usuario_id;
    
    -- Si no se encuentra el nombre, usar un valor por defecto
    IF usuario_comentario_nombre IS NULL THEN
        usuario_comentario_nombre := 'Usuario';
    END IF;
    
    -- Determinar el tipo de notificación y destinatarios
    IF NEW.respuesta_a IS NOT NULL THEN
        -- Es una respuesta a un comentario existente
        titulo_notificacion := 'Nueva respuesta en vacaciones';
        mensaje_notificacion := usuario_comentario_nombre || ' respondió a un comentario en tu solicitud de vacaciones';
        
        -- Notificar al dueño de la solicitud (si no es quien comentó)
        IF solicitud_record.usuario_id != NEW.usuario_id THEN
            INSERT INTO notificaciones (
                usuario_id,
                tipo,
                titulo,
                mensaje,
                solicitud_id,
                leida
            ) VALUES (
                solicitud_record.usuario_id,
                'comentario_vacaciones',
                titulo_notificacion,
                mensaje_notificacion,
                NEW.solicitud_id,
                FALSE
            );
        END IF;
        
        -- Notificar al autor del comentario original (si es diferente)
        DECLARE
            autor_comentario_original UUID;
        BEGIN
            SELECT usuario_id INTO autor_comentario_original
            FROM comentarios_vacaciones
            WHERE id = NEW.respuesta_a;
            
            IF autor_comentario_original IS NOT NULL 
               AND autor_comentario_original != NEW.usuario_id 
               AND autor_comentario_original != solicitud_record.usuario_id THEN
                INSERT INTO notificaciones (
                    usuario_id,
                    tipo,
                    titulo,
                    mensaje,
                    solicitud_id,
                    leida
                ) VALUES (
                    autor_comentario_original,
                    'comentario_vacaciones',
                    'Respuesta a tu comentario',
                    usuario_comentario_nombre || ' respondió a tu comentario en una solicitud de vacaciones',
                    NEW.solicitud_id,
                    FALSE
                );
            END IF;
        END;
    ELSE
        -- Es un comentario nuevo (no una respuesta)
        titulo_notificacion := 'Nuevo comentario en vacaciones';
        mensaje_notificacion := usuario_comentario_nombre || ' comentó en una solicitud de vacaciones';
        
        -- Notificar al dueño de la solicitud (si no es quien comentó)
        IF solicitud_record.usuario_id != NEW.usuario_id THEN
            INSERT INTO notificaciones (
                usuario_id,
                tipo,
                titulo,
                mensaje,
                solicitud_id,
                leida
            ) VALUES (
                solicitud_record.usuario_id,
                'comentario_vacaciones',
                titulo_notificacion,
                mensaje_notificacion,
                NEW.solicitud_id,
                FALSE
            );
        END IF;
        
        -- Notificar a administradores y moderadores (si no son quienes comentaron)
        FOR admin_record IN 
            SELECT auth_user_id 
            FROM usuario_nomina 
            WHERE rol IN ('administrador', 'moderador')
              AND auth_user_id != NEW.usuario_id
        LOOP
            INSERT INTO notificaciones (
                usuario_id,
                tipo,
                titulo,
                mensaje,
                solicitud_id,
                leida
            ) VALUES (
                admin_record.auth_user_id,
                'comentario_vacaciones',
                titulo_notificacion,
                mensaje_notificacion,
                NEW.solicitud_id,
                FALSE
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER PARA COMENTARIOS DE VACACIONES
-- =====================================================

DROP TRIGGER IF EXISTS trigger_notificar_comentario_vacaciones ON comentarios_vacaciones;
CREATE TRIGGER trigger_notificar_comentario_vacaciones
    AFTER INSERT ON comentarios_vacaciones
    FOR EACH ROW
    EXECUTE FUNCTION crear_notificacion_comentario_vacaciones();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'comentarios_vacaciones'
ORDER BY cmd, policyname;

-- Verificar que el trigger se creó correctamente
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'comentarios_vacaciones';
`;
    
    console.log(sqlScript);
    console.log('\n✅ Copia y pega el SQL anterior en el SQL Editor de Supabase Dashboard');
    console.log('\n🔍 Después de ejecutar el SQL, podrás:');
    console.log('   • Los usuarios recibirán notificaciones cuando alguien comente en sus solicitudes de vacaciones');
    console.log('   • Los administradores recibirán notificaciones de nuevos comentarios');
    console.log('   • Los usuarios recibirán notificaciones cuando respondan a sus comentarios');
    console.log('   • Las políticas RLS protegerán el acceso a los comentarios');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupComentariosVacacionesNotifications();
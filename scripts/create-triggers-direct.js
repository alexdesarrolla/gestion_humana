// Script para crear triggers usando funciones RPC de Supabase
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function crearTriggersDirecto() {
  try {
    console.log('🔧 Creando triggers usando enfoque directo...')
    
    // Primero, crear una función RPC para crear notificaciones
    console.log('\n1. Creando función RPC para notificaciones...')
    
    const funcionRPC = `
CREATE OR REPLACE FUNCTION crear_notificacion_solicitud(
  p_usuario_id UUID,
  p_tipo_solicitud TEXT,
  p_solicitud_id UUID
)
RETURNS void AS $$
DECLARE
    admin_record RECORD;
    usuario_nombre TEXT;
    titulo_notificacion TEXT;
    mensaje_notificacion TEXT;
BEGIN
    -- Obtener el nombre del usuario que hizo la solicitud
    SELECT colaborador INTO usuario_nombre
    FROM usuario_nomina
    WHERE auth_user_id = p_usuario_id;
    
    -- Si no se encuentra el nombre, usar un valor por defecto
    IF usuario_nombre IS NULL THEN
        usuario_nombre := 'Usuario';
    END IF;
    
    -- Determinar el tipo de notificación
    CASE p_tipo_solicitud
        WHEN 'certificacion' THEN
            titulo_notificacion := 'Nueva solicitud de certificación laboral';
            mensaje_notificacion := 'Tienes una nueva solicitud de certificación laboral de ' || usuario_nombre;
        WHEN 'vacaciones' THEN
            titulo_notificacion := 'Nueva solicitud de vacaciones';
            mensaje_notificacion := 'Tienes una nueva solicitud de vacaciones de ' || usuario_nombre;
        WHEN 'permisos' THEN
            titulo_notificacion := 'Nueva solicitud de permiso';
            mensaje_notificacion := 'Tienes una nueva solicitud de permiso de ' || usuario_nombre;
        WHEN 'incapacidades' THEN
            titulo_notificacion := 'Nueva solicitud de incapacidad';
            mensaje_notificacion := 'Tienes una nueva solicitud de incapacidad de ' || usuario_nombre;
        ELSE
            titulo_notificacion := 'Nueva solicitud';
            mensaje_notificacion := 'Tienes una nueva solicitud de ' || usuario_nombre;
    END CASE;
    
    -- Crear notificaciones para todos los administradores y moderadores
    FOR admin_record IN 
        SELECT auth_user_id 
        FROM usuario_nomina 
        WHERE rol IN ('administrador', 'moderador')
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
            CASE p_tipo_solicitud
                WHEN 'certificacion' THEN 'certificacion_laboral'
                WHEN 'vacaciones' THEN 'vacaciones'
                WHEN 'permisos' THEN 'permisos'
                WHEN 'incapacidades' THEN 'incapacidades'
                ELSE 'general'
            END,
            titulo_notificacion,
            mensaje_notificacion,
            p_solicitud_id,
            false
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`
    
    // Intentar crear la función usando diferentes métodos
    try {
      const { error: rpcError } = await supabase.rpc('exec', { query: funcionRPC })
      if (rpcError) {
        console.log('Método exec no disponible, intentando crear directamente...')
        
        // Crear usando SQL directo en el dashboard de Supabase
        console.log('\n📋 Copia y pega este SQL en el editor SQL de Supabase:')
        console.log('\n' + '='.repeat(80))
        console.log(funcionRPC)
        console.log('='.repeat(80))
        
        // También crear los triggers
        const triggersSQL = `
-- Trigger para solicitudes de certificación
CREATE OR REPLACE FUNCTION trigger_notificar_certificacion()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM crear_notificacion_solicitud(NEW.usuario_id, 'certificacion', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_certificacion ON solicitudes_certificacion;
CREATE TRIGGER trigger_notificar_certificacion
    AFTER INSERT ON solicitudes_certificacion
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notificar_certificacion();

-- Trigger para solicitudes de vacaciones
CREATE OR REPLACE FUNCTION trigger_notificar_vacaciones()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM crear_notificacion_solicitud(NEW.usuario_id, 'vacaciones', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_vacaciones ON solicitudes_vacaciones;
CREATE TRIGGER trigger_notificar_vacaciones
    AFTER INSERT ON solicitudes_vacaciones
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notificar_vacaciones();

-- Trigger para solicitudes de permisos
CREATE OR REPLACE FUNCTION trigger_notificar_permisos()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM crear_notificacion_solicitud(NEW.usuario_id, 'permisos', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_permisos ON solicitudes_permisos;
CREATE TRIGGER trigger_notificar_permisos
    AFTER INSERT ON solicitudes_permisos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notificar_permisos();

-- Trigger para incapacidades
CREATE OR REPLACE FUNCTION trigger_notificar_incapacidades()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM crear_notificacion_solicitud(NEW.usuario_id, 'incapacidades', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificar_incapacidades ON incapacidades;
CREATE TRIGGER trigger_notificar_incapacidades
    AFTER INSERT ON incapacidades
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notificar_incapacidades();`
        
        console.log('\n' + '='.repeat(80))
        console.log(triggersSQL)
        console.log('='.repeat(80))
        
        console.log('\n📝 Instrucciones:')
        console.log('1. Ve al dashboard de Supabase')
        console.log('2. Navega a SQL Editor')
        console.log('3. Copia y pega el SQL de arriba')
        console.log('4. Ejecuta el script')
        console.log('5. Ejecuta el script de prueba nuevamente')
        
      } else {
        console.log('✅ Función RPC creada exitosamente')
      }
    } catch (error) {
      console.log('Error creando función:', error.message)
    }
    
    // Crear una función de prueba manual
    console.log('\n2. Creando función de prueba manual...')
    
    const funcionPrueba = `
CREATE OR REPLACE FUNCTION probar_notificaciones_manual(
  p_usuario_id UUID
)
RETURNS TABLE(notificaciones_creadas INTEGER) AS $$
DECLARE
    solicitud_id UUID;
    count_before INTEGER;
    count_after INTEGER;
BEGIN
    -- Contar notificaciones antes
    SELECT COUNT(*) INTO count_before FROM notificaciones WHERE tipo = 'certificacion_laboral';
    
    -- Crear una solicitud de prueba
    INSERT INTO solicitudes_certificacion (usuario_id, dirigido_a, ciudad)
    VALUES (p_usuario_id, 'Prueba Manual', 'Bogotá')
    RETURNING id INTO solicitud_id;
    
    -- Llamar manualmente a la función de notificación
    PERFORM crear_notificacion_solicitud(p_usuario_id, 'certificacion', solicitud_id);
    
    -- Contar notificaciones después
    SELECT COUNT(*) INTO count_after FROM notificaciones WHERE tipo = 'certificacion_laboral';
    
    -- Limpiar
    DELETE FROM notificaciones WHERE solicitud_id = solicitud_id;
    DELETE FROM solicitudes_certificacion WHERE id = solicitud_id;
    
    -- Retornar el número de notificaciones creadas
    RETURN QUERY SELECT (count_after - count_before);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`
    
    console.log('\n📋 También copia esta función de prueba:')
    console.log('\n' + '='.repeat(80))
    console.log(funcionPrueba)
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('Error:', error)
  }
}

crearTriggersDirecto()
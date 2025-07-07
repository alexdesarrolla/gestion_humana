// Script simplificado para crear triggers de notificaciones
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function crearTriggers() {
  try {
    console.log('Creando función de notificación...')
    
    // Crear la función
    const funcionSQL = `
CREATE OR REPLACE FUNCTION notificar_nueva_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
    usuario_nombre TEXT;
    titulo_notificacion TEXT;
    mensaje_notificacion TEXT;
BEGIN
    -- Obtener el nombre del usuario que hizo la solicitud
    SELECT colaborador INTO usuario_nombre
    FROM usuario_nomina
    WHERE auth_user_id = NEW.usuario_id;
    
    -- Si no se encuentra el nombre, usar un valor por defecto
    IF usuario_nombre IS NULL THEN
        usuario_nombre := 'Usuario';
    END IF;
    
    -- Determinar el tipo de notificación según la tabla
    IF TG_TABLE_NAME = 'solicitudes_certificacion' THEN
        titulo_notificacion := 'Nueva solicitud de certificación laboral';
        mensaje_notificacion := 'Tienes una nueva solicitud de certificación laboral de ' || usuario_nombre;
    ELSIF TG_TABLE_NAME = 'solicitudes_vacaciones' THEN
        titulo_notificacion := 'Nueva solicitud de vacaciones';
        mensaje_notificacion := 'Tienes una nueva solicitud de vacaciones de ' || usuario_nombre;
    ELSIF TG_TABLE_NAME = 'solicitudes_permisos' THEN
        titulo_notificacion := 'Nueva solicitud de permiso';
        mensaje_notificacion := 'Tienes una nueva solicitud de permiso de ' || usuario_nombre;
    ELSIF TG_TABLE_NAME = 'incapacidades' THEN
        titulo_notificacion := 'Nueva solicitud de incapacidad';
        mensaje_notificacion := 'Tienes una nueva solicitud de incapacidad de ' || usuario_nombre;
    ELSE
        titulo_notificacion := 'Nueva solicitud';
        mensaje_notificacion := 'Tienes una nueva solicitud de ' || usuario_nombre;
    END IF;
    
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
            CASE 
                WHEN TG_TABLE_NAME = 'solicitudes_certificacion' THEN 'certificacion_laboral'
                WHEN TG_TABLE_NAME = 'solicitudes_vacaciones' THEN 'vacaciones'
                WHEN TG_TABLE_NAME = 'solicitudes_permisos' THEN 'permisos'
                WHEN TG_TABLE_NAME = 'incapacidades' THEN 'incapacidades'
                ELSE 'general'
            END,
            titulo_notificacion,
            mensaje_notificacion,
            NEW.id,
            false
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`
    
    const { error: funcionError } = await supabase.rpc('exec', { query: funcionSQL })
    
    if (funcionError) {
      console.log('Función creada (puede que ya existiera)')
    } else {
      console.log('✅ Función creada exitosamente')
    }
    
    // Crear triggers
    const triggers = [
      {
        nombre: 'trigger_notificar_certificacion',
        tabla: 'solicitudes_certificacion'
      },
      {
        nombre: 'trigger_notificar_vacaciones', 
        tabla: 'solicitudes_vacaciones'
      },
      {
        nombre: 'trigger_notificar_permisos',
        tabla: 'solicitudes_permisos'
      },
      {
        nombre: 'trigger_notificar_incapacidades',
        tabla: 'incapacidades'
      }
    ]
    
    for (const trigger of triggers) {
      console.log(`Creando trigger ${trigger.nombre}...`)
      
      const triggerSQL = `
DROP TRIGGER IF EXISTS ${trigger.nombre} ON ${trigger.tabla};
CREATE TRIGGER ${trigger.nombre}
    AFTER INSERT ON ${trigger.tabla}
    FOR EACH ROW
    EXECUTE FUNCTION notificar_nueva_solicitud();`
      
      const { error: triggerError } = await supabase.rpc('exec', { query: triggerSQL })
      
      if (triggerError) {
        console.log(`Trigger ${trigger.nombre} creado (puede que ya existiera)`)
      } else {
        console.log(`✅ Trigger ${trigger.nombre} creado exitosamente`)
      }
    }
    
    console.log('\n🎉 Configuración de triggers completada')
    console.log('Ahora las notificaciones se crearán automáticamente cuando se registren nuevas solicitudes.')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

crearTriggers()
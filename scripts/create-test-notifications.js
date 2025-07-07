// Script para crear notificaciones de prueba
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function crearNotificacionesPrueba() {
  const usuarioId = '0638878f-c63a-4f58-bbab-ebd119705f3d'
  
  const notificaciones = [
    {
      usuario_id: usuarioId,
      tipo: 'certificacion_laboral',
      titulo: 'Nueva solicitud de certificación laboral',
      mensaje: 'Tienes una nueva solicitud de certificación laboral de Juan Pérez',
      solicitud_id: '12345678-1234-1234-1234-123456789012',
      leida: false
    },
    {
      usuario_id: usuarioId,
      tipo: 'vacaciones',
      titulo: 'Nueva solicitud de vacaciones',
      mensaje: 'Tienes una nueva solicitud de vacaciones de María García',
      solicitud_id: '12345678-1234-1234-1234-123456789013',
      leida: false
    },
    {
      usuario_id: usuarioId,
      tipo: 'permisos',
      titulo: 'Nueva solicitud de permiso',
      mensaje: 'Tienes una nueva solicitud de permiso de Carlos López',
      solicitud_id: '12345678-1234-1234-1234-123456789014',
      leida: false
    },
    {
      usuario_id: usuarioId,
      tipo: 'incapacidades',
      titulo: 'Nueva solicitud de incapacidad',
      mensaje: 'Tienes una nueva solicitud de incapacidad de Ana Martínez',
      solicitud_id: '12345678-1234-1234-1234-123456789015',
      leida: false
    },
    {
      usuario_id: usuarioId,
      tipo: 'certificacion_laboral',
      titulo: 'Solicitud aprobada',
      mensaje: 'Tu solicitud de certificación laboral ha sido aprobada',
      solicitud_id: '12345678-1234-1234-1234-123456789016',
      leida: false
    }
  ]

  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .insert(notificaciones)
      .select()

    if (error) {
      console.error('Error al crear notificaciones:', error)
      return
    }

    console.log('Notificaciones creadas exitosamente:')
    console.log(data)
    console.log(`Total: ${data.length} notificaciones`)
  } catch (err) {
    console.error('Error:', err)
  }
}

crearNotificacionesPrueba()
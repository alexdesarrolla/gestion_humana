// Script para verificar notificaciones en la base de datos
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verificarNotificaciones() {
  const usuarioId = '0638878f-c63a-4f58-bbab-ebd119705f3d'
  
  try {
    // Verificar todas las notificaciones en la base de datos
    console.log('=== TODAS LAS NOTIFICACIONES ===')
    const { data: todasNotificaciones, error: errorTodas } = await supabase
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })

    if (errorTodas) {
      console.error('Error al obtener todas las notificaciones:', errorTodas)
    } else {
      console.log(`Total notificaciones en BD: ${todasNotificaciones.length}`)
      todasNotificaciones.forEach(notif => {
        console.log(`- ID: ${notif.id}, Usuario: ${notif.usuario_id}, Título: ${notif.titulo}, Leída: ${notif.leida}`)
      })
    }

    console.log('\n=== NOTIFICACIONES DEL USUARIO ESPECÍFICO ===')
    // Verificar notificaciones del usuario específico
    const { data: notificacionesUsuario, error: errorUsuario } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })

    if (errorUsuario) {
      console.error('Error al obtener notificaciones del usuario:', errorUsuario)
    } else {
      console.log(`Notificaciones del usuario ${usuarioId}: ${notificacionesUsuario.length}`)
      notificacionesUsuario.forEach(notif => {
        console.log(`- ID: ${notif.id}, Título: ${notif.titulo}, Leída: ${notif.leida}`)
      })
    }

    console.log('\n=== VERIFICAR USUARIO EN TABLA usuario_nomina ===')
    // Verificar si el usuario existe en la tabla usuario_nomina
    const { data: usuario, error: errorUsuarioNomina } = await supabase
      .from('usuario_nomina')
      .select('*')
      .eq('auth_user_id', usuarioId)

    if (errorUsuarioNomina) {
      console.error('Error al verificar usuario en usuario_nomina:', errorUsuarioNomina)
    } else {
      console.log(`Usuario encontrado en usuario_nomina:`, usuario)
    }

  } catch (err) {
    console.error('Error:', err)
  }
}

verificarNotificaciones()
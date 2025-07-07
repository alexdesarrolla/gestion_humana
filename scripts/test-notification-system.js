// Script para probar el sistema de notificaciones automáticas
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function probarSistemaNotificaciones() {
  try {
    console.log('🧪 Probando el sistema de notificaciones automáticas...')
    
    // 1. Obtener un usuario de prueba
    console.log('\n1. Obteniendo usuario de prueba...')
    const { data: usuarios, error: usuarioError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador, rol')
      .neq('rol', 'administrador')
      .neq('rol', 'moderador')
      .not('auth_user_id', 'is', null)
      .limit(1)
    
    if (usuarioError || !usuarios || usuarios.length === 0) {
      console.error('No se encontró usuario de prueba:', usuarioError)
      return
    }
    
    const usuarioPrueba = usuarios[0]
    console.log(`✅ Usuario de prueba: ${usuarioPrueba.colaborador} (${usuarioPrueba.rol})`)
    console.log(`   Auth User ID: ${usuarioPrueba.auth_user_id}`)
    
    // 2. Contar notificaciones antes
    console.log('\n2. Contando notificaciones existentes...')
    const { count: notificacionesAntes, error: countError1 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'certificacion_laboral')
    
    if (countError1) {
      console.error('Error contando notificaciones:', countError1)
      return
    }
    
    console.log(`📊 Notificaciones de certificación antes: ${notificacionesAntes || 0}`)
    
    // 3. Crear una solicitud de certificación de prueba
    console.log('\n3. Creando solicitud de certificación de prueba...')
    const { data: solicitud, error: solicitudError } = await supabase
      .from('solicitudes_certificacion')
      .insert({
        usuario_id: usuarioPrueba.auth_user_id,
        dirigido_a: 'Empresa de Prueba',
        ciudad: 'Bogotá',
        estado: 'pendiente'
      })
      .select()
      .single()
    
    if (solicitudError) {
      console.error('Error creando solicitud:', solicitudError)
      return
    }
    
    console.log(`✅ Solicitud creada con ID: ${solicitud.id}`)
    
    // 4. Esperar un momento para que se ejecute el trigger
    console.log('\n4. Esperando que se ejecute el trigger...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 5. Contar notificaciones después
    console.log('\n5. Verificando notificaciones creadas...')
    const { count: notificacionesDespues, error: countError2 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'certificacion_laboral')
    
    if (countError2) {
      console.error('Error contando notificaciones después:', countError2)
      return
    }
    
    console.log(`📊 Notificaciones de certificación después: ${notificacionesDespues || 0}`)
    
    // 6. Verificar las nuevas notificaciones
    const { data: nuevasNotificaciones, error: notifError } = await supabase
      .from('notificaciones')
      .select(`
        id,
        titulo,
        mensaje,
        solicitud_id,
        usuario_nomina!inner(colaborador, rol)
      `)
      .eq('solicitud_id', solicitud.id)
      .eq('tipo', 'certificacion_laboral')
    
    if (notifError) {
      console.error('Error obteniendo nuevas notificaciones:', notifError)
      return
    }
    
    console.log('\n6. Notificaciones creadas:')
    if (nuevasNotificaciones && nuevasNotificaciones.length > 0) {
      nuevasNotificaciones.forEach(notif => {
        console.log(`   📧 Para: ${notif.usuario_nomina.colaborador} (${notif.usuario_nomina.rol})`)
        console.log(`      Título: ${notif.titulo}`)
        console.log(`      Mensaje: ${notif.mensaje}`)
        console.log(`      ID Solicitud: ${notif.solicitud_id}`)
        console.log('')
      })
      
      console.log(`🎉 ¡Éxito! Se crearon ${nuevasNotificaciones.length} notificaciones automáticamente`)
    } else {
      console.log('❌ No se crearon notificaciones automáticas')
    }
    
    // 7. Limpiar - eliminar la solicitud de prueba
    console.log('\n7. Limpiando datos de prueba...')
    
    // Eliminar notificaciones de prueba
    if (nuevasNotificaciones && nuevasNotificaciones.length > 0) {
      const { error: deleteNotifError } = await supabase
        .from('notificaciones')
        .delete()
        .eq('solicitud_id', solicitud.id)
      
      if (deleteNotifError) {
        console.log('Advertencia: No se pudieron eliminar las notificaciones de prueba')
      }
    }
    
    // Eliminar solicitud de prueba
    const { error: deleteSolicitudError } = await supabase
      .from('solicitudes_certificacion')
      .delete()
      .eq('id', solicitud.id)
    
    if (deleteSolicitudError) {
      console.log('Advertencia: No se pudo eliminar la solicitud de prueba')
    } else {
      console.log('✅ Datos de prueba eliminados')
    }
    
    console.log('\n🏁 Prueba completada')
    
  } catch (error) {
    console.error('Error en la prueba:', error)
  }
}

probarSistemaNotificaciones()
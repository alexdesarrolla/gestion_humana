require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function probarNotificacionesVacaciones() {
  try {
    console.log('🧪 Probando notificaciones automáticas para solicitudes de vacaciones...')
    
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
      console.error('❌ Error al obtener usuario de prueba:', usuarioError)
      return
    }
    
    const usuarioPrueba = usuarios[0]
    console.log(`✅ Usuario de prueba: ${usuarioPrueba.colaborador} (${usuarioPrueba.rol})`)
    
    // 2. Contar notificaciones existentes
    console.log('\n2. Contando notificaciones existentes...')
    const { data: notificacionesAntes, error: countError1 } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('tipo', 'vacaciones')
    
    if (countError1) {
      console.error('❌ Error al contar notificaciones:', countError1)
      return
    }
    
    console.log(`📊 Notificaciones de vacaciones antes: ${notificacionesAntes?.length || 0}`)
    
    // 3. Crear solicitud de vacaciones de prueba
    console.log('\n3. Creando solicitud de vacaciones de prueba...')
    const fechaInicio = new Date()
    fechaInicio.setDate(fechaInicio.getDate() + 30) // 30 días desde hoy
    const fechaFin = new Date(fechaInicio)
    fechaFin.setDate(fechaFin.getDate() + 5) // 5 días de vacaciones
    
    const { data: solicitudCreada, error: solicitudError } = await supabase
      .from('solicitudes_vacaciones')
      .insert({
        usuario_id: usuarioPrueba.auth_user_id,
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        estado: 'pendiente'
      })
      .select()
      .single()
    
    if (solicitudError) {
      console.error('❌ Error al crear solicitud:', solicitudError)
      return
    }
    
    console.log(`✅ Solicitud creada con ID: ${solicitudCreada.id}`)
    
    // 4. Esperar a que se ejecute el trigger
    console.log('\n4. Esperando que se ejecute el trigger...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 5. Verificar notificaciones creadas
    console.log('\n5. Verificando notificaciones creadas...')
    const { data: notificacionesDespues, error: countError2 } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('tipo', 'vacaciones')
    
    if (countError2) {
      console.error('❌ Error al verificar notificaciones:', countError2)
      return
    }
    
    console.log(`📊 Notificaciones de vacaciones después: ${notificacionesDespues?.length || 0}`)
    
    // 6. Mostrar notificaciones nuevas
    const notificacionesNuevas = notificacionesDespues?.filter(n => 
      n.solicitud_id === solicitudCreada.id
    ) || []
    
    console.log('\n6. Notificaciones creadas:')
    if (notificacionesNuevas.length > 0) {
      for (const notif of notificacionesNuevas) {
        // Obtener datos del usuario que recibió la notificación
        const { data: adminData } = await supabase
          .from('usuario_nomina')
          .select('colaborador, rol')
          .eq('auth_user_id', notif.usuario_id)
          .single()
        
        console.log(`   📧 Para: ${adminData?.colaborador || 'Usuario'} (${adminData?.rol || 'rol'})`)
        console.log(`      Título: ${notif.titulo}`)
        console.log(`      Mensaje: ${notif.mensaje}`)
        console.log(`      ID Solicitud: ${notif.solicitud_id}`)
      }
      
      console.log(`\n🎉 ¡Éxito! Se crearon ${notificacionesNuevas.length} notificaciones automáticamente`)
    } else {
      console.log('   ❌ No se crearon notificaciones automáticamente')
      console.log('   🔍 Verificando si existe el trigger...')
      
      // Verificar trigger
      const { data: triggers, error: triggerError } = await supabase
        .rpc('exec', {
          query: `
            SELECT 
              trigger_name,
              event_manipulation,
              event_object_table,
              action_statement
            FROM information_schema.triggers 
            WHERE event_object_table = 'solicitudes_vacaciones'
              AND trigger_name LIKE '%notificar%'
          `
        })
      
      if (triggerError) {
        console.log('   ⚠️  No se pudo verificar triggers (función exec no disponible)')
      } else {
        console.log('   📋 Triggers encontrados:', triggers)
      }
    }
    
    // 7. Limpiar datos de prueba
    console.log('\n7. Limpiando datos de prueba...')
    
    // Eliminar notificaciones de prueba
    await supabase
      .from('notificaciones')
      .delete()
      .eq('solicitud_id', solicitudCreada.id)
    
    // Eliminar solicitud de prueba
    await supabase
      .from('solicitudes_vacaciones')
      .delete()
      .eq('id', solicitudCreada.id)
    
    console.log('✅ Datos de prueba eliminados')
    
    console.log('\n🏁 Prueba completada')
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error)
  }
}

probarNotificacionesVacaciones()
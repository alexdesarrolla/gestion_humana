// Script para probar las notificaciones de comentarios de permisos
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  console.log('Asegúrate de tener configurado:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function probarNotificacionesComentariosPermisos() {
  try {
    console.log('🧪 Probando notificaciones de comentarios de permisos...')
    
    // 1. Verificar que existe la tabla comentarios_permisos
    console.log('\n1. Verificando tabla comentarios_permisos...')
    const { data: tablaInfo, error: tablaError } = await supabase
      .from('comentarios_permisos')
      .select('id')
      .limit(1)
    
    if (tablaError) {
      console.error('❌ Error accediendo a comentarios_permisos:', tablaError.message)
      return
    }
    
    console.log('✅ Tabla comentarios_permisos accesible')
    
    // 2. Verificar que existe una solicitud de permisos
    console.log('\n2. Buscando solicitud de permisos existente...')
    const { data: solicitudes, error: solicitudError } = await supabase
      .from('solicitudes_permisos')
      .select('id, usuario_id')
      .limit(1)
    
    if (solicitudError || !solicitudes || solicitudes.length === 0) {
      console.log('⚠️  No hay solicitudes de permisos existentes')
      console.log('   Creando una solicitud de prueba...')
      
      // Obtener un usuario para crear la solicitud
      const { data: usuarios, error: usuarioError } = await supabase
        .from('usuario_nomina')
        .select('auth_user_id, colaborador')
        .not('auth_user_id', 'is', null)
        .limit(1)
      
      if (usuarioError || !usuarios || usuarios.length === 0) {
        console.error('❌ No se encontró usuario para crear solicitud')
        return
      }
      
      const usuario = usuarios[0]
      
      // Crear solicitud de permisos de prueba
      const { data: nuevaSolicitud, error: crearError } = await supabase
        .from('solicitudes_permisos')
        .insert({
          usuario_id: usuario.auth_user_id,
          tipo_permiso: 'no_remunerado',
          fecha_inicio: '2024-12-20',
          fecha_fin: '2024-12-20',
          motivo: 'Prueba de notificaciones de comentarios',
          estado: 'pendiente'
        })
        .select()
        .single()
      
      if (crearError) {
        console.error('❌ Error creando solicitud de prueba:', crearError.message)
        return
      }
      
      console.log(`✅ Solicitud de prueba creada: ${nuevaSolicitud.id}`)
      solicitudes.push(nuevaSolicitud)
    }
    
    const solicitudPrueba = solicitudes[0]
    console.log(`✅ Usando solicitud: ${solicitudPrueba.id}`)
    
    // 3. Obtener un usuario diferente para comentar
    console.log('\n3. Obteniendo usuario para comentar...')
    const { data: usuariosComentario, error: usuarioComentarioError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador, rol')
      .neq('auth_user_id', solicitudPrueba.usuario_id)
      .not('auth_user_id', 'is', null)
      .limit(1)
    
    if (usuarioComentarioError || !usuariosComentario || usuariosComentario.length === 0) {
      console.error('❌ No se encontró usuario para comentar')
      return
    }
    
    const usuarioComentario = usuariosComentario[0]
    console.log(`✅ Usuario comentario: ${usuarioComentario.colaborador} (${usuarioComentario.rol})`)
    
    // 4. Contar notificaciones antes
    console.log('\n4. Contando notificaciones antes...')
    const { count: notificacionesAntes, error: countError1 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'comentario_permisos')
    
    if (countError1) {
      console.error('❌ Error contando notificaciones:', countError1)
      return
    }
    
    console.log(`📊 Notificaciones de comentario_permisos antes: ${notificacionesAntes || 0}`)
    
    // 5. Crear comentario de prueba
    console.log('\n5. Creando comentario de prueba...')
    const { data: comentario, error: comentarioError } = await supabase
      .from('comentarios_permisos')
      .insert({
        solicitud_id: solicitudPrueba.id,
        usuario_id: usuarioComentario.auth_user_id,
        contenido: 'Este es un comentario de prueba para verificar las notificaciones automáticas'
      })
      .select()
      .single()
    
    if (comentarioError) {
      console.error('❌ Error creando comentario:', comentarioError.message)
      return
    }
    
    console.log(`✅ Comentario creado: ${comentario.id}`)
    
    // 6. Esperar un momento para que se procesen los triggers
    console.log('\n6. Esperando procesamiento de triggers...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 7. Contar notificaciones después
    console.log('\n7. Contando notificaciones después...')
    const { count: notificacionesDespues, error: countError2 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'comentario_permisos')
    
    if (countError2) {
      console.error('❌ Error contando notificaciones después:', countError2)
      return
    }
    
    console.log(`📊 Notificaciones de comentario_permisos después: ${notificacionesDespues || 0}`)
    
    // 8. Verificar si se crearon nuevas notificaciones
    const nuevasNotificaciones = (notificacionesDespues || 0) - (notificacionesAntes || 0)
    console.log(`\n📈 Nuevas notificaciones creadas: ${nuevasNotificaciones}`)
    
    if (nuevasNotificaciones > 0) {
      console.log('\n✅ ¡Sistema de notificaciones funcionando correctamente!')
      
      // Mostrar las notificaciones creadas
      const { data: notificacionesCreadas, error: notifError } = await supabase
        .from('notificaciones')
        .select(`
          id,
          tipo,
          titulo,
          mensaje,
          usuario_id,
          solicitud_id,
          leida,
          created_at
        `)
        .eq('tipo', 'comentario_permisos')
        .eq('solicitud_id', solicitudPrueba.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (!notifError && notificacionesCreadas) {
        console.log('\n📋 Notificaciones creadas:')
        notificacionesCreadas.forEach((notif, index) => {
          console.log(`   ${index + 1}. ${notif.titulo}`)
          console.log(`      Mensaje: ${notif.mensaje}`)
          console.log(`      Usuario: ${notif.usuario_id}`)
          console.log(`      Leída: ${notif.leida ? 'Sí' : 'No'}`)
          console.log(`      Fecha: ${new Date(notif.created_at).toLocaleString()}`)
          console.log('')
        })
      }
    } else {
      console.log('\n❌ No se crearon notificaciones. Posibles causas:')
      console.log('   - El trigger no está configurado correctamente')
      console.log('   - La función crear_notificacion_comentario_permisos no existe')
      console.log('   - Hay un error en la lógica de la función')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  probarNotificacionesComentariosPermisos()
}

module.exports = { probarNotificacionesComentariosPermisos }
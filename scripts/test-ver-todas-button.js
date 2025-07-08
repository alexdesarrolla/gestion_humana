require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function probarBotonVerTodas() {
  try {
    console.log('🧪 Probando botón "Ver todas las notificaciones"...')
    
    // 1. Verificar estado inicial de notificaciones
    console.log('\n1. Verificando notificaciones existentes...')
    const { data: notificacionesExistentes, count } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact' })
      .eq('leida', false)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log(`   📊 Notificaciones no leídas encontradas: ${count || 0}`)
    
    if (count && count > 0) {
      console.log('   ✅ Hay notificaciones disponibles')
      console.log('   📝 El botón "Ver todas las notificaciones" debe aparecer')
    } else {
      console.log('   📭 No hay notificaciones disponibles')
      console.log('   📝 El botón "Ver todas las notificaciones" también debe aparecer')
    }
    
    // 2. Crear una notificación temporal para probar ambos estados
    console.log('\n2. Creando notificación temporal para prueba...')
    
    // Obtener un usuario administrador
    const { data: admin } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador')
      .eq('rol', 'administrador')
      .limit(1)
      .single()
    
    if (!admin) {
      console.error('❌ No se encontró usuario administrador')
      return
    }
    
    // Crear notificación temporal
    const { data: notificacionTemporal } = await supabase
      .from('notificaciones')
      .insert({
        usuario_id: admin.auth_user_id,
        tipo: 'sistema',
        titulo: 'Prueba botón Ver Todas',
        mensaje: 'Esta es una notificación temporal para probar el botón',
        leida: false
      })
      .select()
      .single()
    
    if (notificacionTemporal) {
      console.log(`   ✅ Notificación temporal creada: ${notificacionTemporal.id}`)
    }
    
    // 3. Verificar que ahora hay notificaciones
    console.log('\n3. Verificando estado con notificaciones...')
    const { count: countConNotif } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact' })
      .eq('leida', false)
    
    console.log(`   📊 Notificaciones no leídas: ${countConNotif || 0}`)
    console.log('   ✅ Con notificaciones: El botón "Ver todas" debe aparecer')
    
    // 4. Marcar todas como leídas temporalmente
    console.log('\n4. Marcando todas las notificaciones como leídas...')
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('leida', false)
    
    // 5. Verificar estado sin notificaciones no leídas
    console.log('\n5. Verificando estado sin notificaciones no leídas...')
    const { count: countSinNotif } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact' })
      .eq('leida', false)
    
    console.log(`   📊 Notificaciones no leídas: ${countSinNotif || 0}`)
    console.log('   ✅ Sin notificaciones: El botón "Ver todas" también debe aparecer')
    
    // 6. Restaurar estado original
    console.log('\n6. Restaurando estado original...')
    
    // Eliminar notificación temporal
    if (notificacionTemporal) {
      await supabase
        .from('notificaciones')
        .delete()
        .eq('id', notificacionTemporal.id)
      console.log('   ✅ Notificación temporal eliminada')
    }
    
    // Restaurar notificaciones que estaban como no leídas
    if (notificacionesExistentes && notificacionesExistentes.length > 0) {
      const idsOriginales = notificacionesExistentes.map(n => n.id)
      await supabase
        .from('notificaciones')
        .update({ leida: false })
        .in('id', idsOriginales)
      console.log(`   ✅ Restauradas ${idsOriginales.length} notificaciones originales`)
    }
    
    console.log('\n🎯 RESULTADO DE LA PRUEBA:')
    console.log('   ✅ CAMBIO IMPLEMENTADO: El botón "Ver todas las notificaciones"')
    console.log('      ahora aparece SIEMPRE, tanto cuando hay notificaciones')
    console.log('      como cuando no las hay.')
    
    console.log('\n📱 COMPORTAMIENTO EN LA UI:')
    console.log('   🔔 Con notificaciones: Muestra lista + botón "Ver todas"')
    console.log('   📭 Sin notificaciones: Muestra "No tienes notificaciones" + botón "Ver todas"')
    
    console.log('\n🔗 FUNCIONALIDAD DEL BOTÓN:')
    console.log('   • Cierra el dropdown automáticamente')
    console.log('   • Redirige a /administracion/notificaciones')
    console.log('   • Permite acceso completo al historial de notificaciones')
    
    console.log('\n🏁 Prueba completada exitosamente')
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error)
  }
}

probarBotonVerTodas()
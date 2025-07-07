// Script para diagnosticar por qué no se están creando notificaciones automáticas
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnosticarProblema() {
  try {
    console.log('🔍 Diagnosticando problema de notificaciones...')
    
    // 1. Verificar si existen las funciones
    console.log('\n1. Verificando funciones en la base de datos...')
    
    const { data: funciones, error: funcionError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .like('routine_name', '%notificar%')
    
    if (funcionError) {
      console.log('❌ Error verificando funciones:', funcionError.message)
    } else {
      console.log('📋 Funciones encontradas:')
      funciones?.forEach(func => {
        console.log(`   - ${func.routine_name} (${func.routine_type})`)
      })
      
      if (!funciones || funciones.length === 0) {
        console.log('❌ No se encontraron funciones de notificación')
        console.log('💡 Solución: Ejecutar el script SQL en Supabase Dashboard')
        return
      }
    }
    
    // 2. Verificar triggers
    console.log('\n2. Verificando triggers...')
    
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table, action_timing, event_manipulation')
      .like('trigger_name', '%notificar%')
    
    if (triggerError) {
      console.log('❌ Error verificando triggers:', triggerError.message)
    } else {
      console.log('🔧 Triggers encontrados:')
      triggers?.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} en ${trigger.event_object_table} (${trigger.action_timing} ${trigger.event_manipulation})`)
      })
      
      if (!triggers || triggers.length === 0) {
        console.log('❌ No se encontraron triggers de notificación')
        console.log('💡 Solución: Ejecutar el script SQL en Supabase Dashboard')
        return
      }
    }
    
    // 3. Verificar solicitudes recientes
    console.log('\n3. Verificando solicitudes recientes...')
    
    const { data: solicitudesRecientes, error: solicitudError } = await supabase
      .from('solicitudes_certificacion')
      .select(`
        id,
        usuario_id,
        fecha_solicitud,
        usuario_nomina!inner(colaborador)
      `)
      .order('fecha_solicitud', { ascending: false })
      .limit(5)
    
    if (solicitudError) {
      console.log('❌ Error obteniendo solicitudes:', solicitudError.message)
    } else {
      console.log('📋 Últimas 5 solicitudes:')
      solicitudesRecientes?.forEach(sol => {
        console.log(`   - ${sol.id} por ${sol.usuario_nomina.colaborador} (${sol.fecha_solicitud})`)
      })
    }
    
    // 4. Verificar notificaciones correspondientes
    if (solicitudesRecientes && solicitudesRecientes.length > 0) {
      console.log('\n4. Verificando notificaciones para estas solicitudes...')
      
      for (const solicitud of solicitudesRecientes) {
        const { data: notificaciones, error: notifError } = await supabase
          .from('notificaciones')
          .select('id, titulo, created_at')
          .eq('solicitud_id', solicitud.id)
        
        if (notifError) {
          console.log(`❌ Error verificando notificaciones para ${solicitud.id}:`, notifError.message)
        } else {
          console.log(`📧 Solicitud ${solicitud.id}: ${notificaciones?.length || 0} notificaciones`)
          notificaciones?.forEach(notif => {
            console.log(`     - ${notif.titulo} (${notif.created_at})`)
          })
        }
      }
    }
    
    // 5. Verificar administradores
    console.log('\n5. Verificando usuarios administradores...')
    
    const { data: admins, error: adminError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador, rol')
      .in('rol', ['administrador', 'moderador'])
    
    if (adminError) {
      console.log('❌ Error obteniendo administradores:', adminError.message)
    } else {
      console.log(`👥 Administradores/Moderadores encontrados: ${admins?.length || 0}`)
      admins?.forEach(admin => {
        console.log(`   - ${admin.colaborador} (${admin.rol}) - ${admin.auth_user_id}`)
      })
    }
    
    // 6. Probar creación manual de notificación
    console.log('\n6. Probando creación manual de notificación...')
    
    if (admins && admins.length > 0 && solicitudesRecientes && solicitudesRecientes.length > 0) {
      const admin = admins[0]
      const solicitud = solicitudesRecientes[0]
      
      const { data: notifPrueba, error: pruebaError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: admin.auth_user_id,
          tipo: 'certificacion_laboral',
          titulo: 'Prueba de notificación manual',
          mensaje: `Notificación de prueba para solicitud ${solicitud.id}`,
          solicitud_id: solicitud.id,
          leida: false
        })
        .select()
      
      if (pruebaError) {
        console.log('❌ Error creando notificación de prueba:', pruebaError.message)
      } else {
        console.log('✅ Notificación de prueba creada exitosamente')
        
        // Limpiar la notificación de prueba
        await supabase
          .from('notificaciones')
          .delete()
          .eq('id', notifPrueba[0].id)
        
        console.log('🧹 Notificación de prueba eliminada')
      }
    }
    
    // 7. Diagnóstico final
    console.log('\n🎯 DIAGNÓSTICO:')
    
    if (!funciones || funciones.length === 0) {
      console.log('❌ PROBLEMA: Las funciones de notificación no están instaladas')
      console.log('💡 SOLUCIÓN: Ejecutar el archivo SQL en Supabase Dashboard')
    } else if (!triggers || triggers.length === 0) {
      console.log('❌ PROBLEMA: Los triggers no están instalados')
      console.log('💡 SOLUCIÓN: Ejecutar el archivo SQL en Supabase Dashboard')
    } else if (!admins || admins.length === 0) {
      console.log('❌ PROBLEMA: No hay usuarios administradores')
      console.log('💡 SOLUCIÓN: Crear al menos un usuario con rol "administrador"')
    } else {
      console.log('✅ CONFIGURACIÓN: Funciones y triggers están instalados')
      console.log('✅ USUARIOS: Hay administradores disponibles')
      console.log('🤔 POSIBLE CAUSA: Los triggers pueden no estar funcionando correctamente')
      console.log('💡 SOLUCIÓN: Re-ejecutar el script SQL completo en Supabase Dashboard')
    }
    
    console.log('\n📋 PASOS RECOMENDADOS:')
    console.log('1. Ir a Supabase Dashboard → SQL Editor')
    console.log('2. Ejecutar: sql/migrations/025_create_notification_system_complete.sql')
    console.log('3. Verificar que no hay errores en la ejecución')
    console.log('4. Crear una nueva solicitud de certificación para probar')
    
  } catch (error) {
    console.error('Error en diagnóstico:', error)
  }
}

diagnosticarProblema()
// Script para verificar si los triggers están funcionando
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verificarTriggers() {
  try {
    console.log('🔍 Verificando triggers en la base de datos...')
    
    // Verificar si existe la función
    console.log('\n1. Verificando función notificar_nueva_solicitud...')
    const funcionSQL = `
      SELECT 
        p.proname as function_name,
        p.prosrc as function_body
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'notificar_nueva_solicitud'
      AND n.nspname = 'public';
    `
    
    const { data: funciones, error: funcionError } = await supabase.rpc('exec', { query: funcionSQL })
    
    if (funcionError) {
      console.log('❌ Error verificando función:', funcionError.message)
    } else {
      console.log('✅ Función encontrada')
    }
    
    // Verificar triggers
    console.log('\n2. Verificando triggers...')
    const triggerSQL = `
      SELECT 
        t.tgname as trigger_name,
        c.relname as table_name,
        p.proname as function_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE t.tgname LIKE 'trigger_notificar_%'
      ORDER BY t.tgname;
    `
    
    const { data: triggers, error: triggerError } = await supabase.rpc('exec', { query: triggerSQL })
    
    if (triggerError) {
      console.log('❌ Error verificando triggers:', triggerError.message)
    } else {
      if (triggers && triggers.length > 0) {
        console.log('✅ Triggers encontrados:')
        triggers.forEach(trigger => {
          console.log(`   - ${trigger.trigger_name} en tabla ${trigger.table_name}`)
        })
      } else {
        console.log('❌ No se encontraron triggers')
      }
    }
    
    // Verificar usuarios administradores
    console.log('\n3. Verificando usuarios administradores...')
    const { data: admins, error: adminError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador, rol')
      .in('rol', ['administrador', 'moderador'])
    
    if (adminError) {
      console.log('❌ Error obteniendo administradores:', adminError.message)
    } else {
      console.log(`✅ Encontrados ${admins?.length || 0} administradores/moderadores:`)
      admins?.forEach(admin => {
        console.log(`   - ${admin.colaborador} (${admin.rol}) - ID: ${admin.auth_user_id}`)
      })
    }
    
    // Probar manualmente la función
    console.log('\n4. Probando función manualmente...')
    
    // Obtener un usuario de prueba
    const { data: usuarios, error: usuarioError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador')
      .neq('rol', 'administrador')
      .neq('rol', 'moderador')
      .not('auth_user_id', 'is', null)
      .limit(1)
    
    if (usuarioError || !usuarios || usuarios.length === 0) {
      console.log('❌ No se encontró usuario de prueba')
      return
    }
    
    const usuario = usuarios[0]
    console.log(`Usando usuario: ${usuario.colaborador}`)
    
    // Crear una solicitud y verificar inmediatamente
    const { data: solicitud, error: solicitudError } = await supabase
      .from('solicitudes_certificacion')
      .insert({
        usuario_id: usuario.auth_user_id,
        dirigido_a: 'Prueba Manual',
        ciudad: 'Bogotá'
      })
      .select()
      .single()
    
    if (solicitudError) {
      console.log('❌ Error creando solicitud de prueba:', solicitudError.message)
      return
    }
    
    console.log(`✅ Solicitud de prueba creada: ${solicitud.id}`)
    
    // Esperar y verificar notificaciones
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const { data: notificaciones, error: notifError } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('solicitud_id', solicitud.id)
    
    if (notifError) {
      console.log('❌ Error verificando notificaciones:', notifError.message)
    } else {
      console.log(`📧 Notificaciones creadas: ${notificaciones?.length || 0}`)
      notificaciones?.forEach(notif => {
        console.log(`   - ${notif.titulo} para usuario ${notif.usuario_id}`)
      })
    }
    
    // Limpiar
    await supabase.from('notificaciones').delete().eq('solicitud_id', solicitud.id)
    await supabase.from('solicitudes_certificacion').delete().eq('id', solicitud.id)
    console.log('✅ Datos de prueba eliminados')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

verificarTriggers()
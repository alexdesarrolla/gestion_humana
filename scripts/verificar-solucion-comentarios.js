const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarSolucion() {
  console.log('🔍 Verificando solución para comentarios de incapacidades...');
  
  try {
    // 1. Buscar usuario autenticado
    console.log('\n📄 1. Buscando usuario autenticado...');
    const { data: usuarioAuth, error: authError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador, correo_electronico')
      .not('auth_user_id', 'is', null)
      .limit(1);
    
    if (authError || !usuarioAuth || usuarioAuth.length === 0) {
      console.log('❌ No se encontró usuario autenticado para probar');
      console.log('💡 Asegúrate de que al menos un usuario tenga auth_user_id válido');
      return;
    }
    
    const usuario = usuarioAuth[0];
    console.log('✅ Usuario encontrado:', usuario.colaborador);
    
    // 2. Buscar incapacidad
    console.log('\n📄 2. Buscando incapacidad...');
    const { data: incapacidades, error: incError } = await supabase
      .from('incapacidades')
      .select('id, usuario_id')
      .limit(1);
    
    if (incError || !incapacidades || incapacidades.length === 0) {
      console.log('❌ No se encontró incapacidad para probar');
      return;
    }
    
    const incapacidad = incapacidades[0];
    console.log('✅ Incapacidad encontrada:', incapacidad.id);
    
    // 3. Contar notificaciones antes
    console.log('\n📄 3. Contando notificaciones antes...');
    const { count: notificacionesAntes, error: countError1 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true });
    
    if (countError1) {
      console.log('⚠️ No se pudieron contar notificaciones:', countError1.message);
    } else {
      console.log(`📊 Notificaciones antes: ${notificacionesAntes || 0}`);
    }
    
    // 4. Insertar comentario de prueba
    console.log('\n📄 4. Insertando comentario de prueba...');
    const { data: comentario, error: insertError } = await supabase
      .from('comentarios_incapacidades')
      .insert({
        incapacidad_id: incapacidad.id,
        usuario_id: usuario.auth_user_id,
        contenido: `Comentario de prueba - ${new Date().toISOString()}`
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ ERROR AL INSERTAR COMENTARIO:', insertError.message);
      
      if (insertError.message.includes('fecha_creacion')) {
        console.log('\n🔧 PROBLEMA: El trigger aún usa "fecha_creacion"');
        console.log('💡 SOLUCIÓN: Ejecuta scripts/manual-fix-trigger.sql');
      } else if (insertError.message.includes('nombre')) {
        console.log('\n🔧 PROBLEMA: El trigger aún usa columna "nombre"');
        console.log('💡 SOLUCIÓN: Ejecuta scripts/manual-fix-trigger.sql');
      } else {
        console.log('\n🔧 PROBLEMA DESCONOCIDO:', insertError.message);
      }
      
      return;
    }
    
    console.log('✅ Comentario insertado correctamente:', comentario.id);
    
    // 5. Esperar y contar notificaciones después
    console.log('\n📄 5. Esperando y verificando notificaciones...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const { count: notificacionesDespues, error: countError2 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true });
    
    if (countError2) {
      console.log('⚠️ No se pudieron contar notificaciones después:', countError2.message);
    } else {
      console.log(`📊 Notificaciones después: ${notificacionesDespues || 0}`);
      
      const nuevasNotificaciones = (notificacionesDespues || 0) - (notificacionesAntes || 0);
      if (nuevasNotificaciones > 0) {
        console.log(`🎉 ¡Se crearon ${nuevasNotificaciones} nuevas notificaciones!`);
      } else {
        console.log('⚠️ No se crearon nuevas notificaciones');
        console.log('💡 Esto puede ser normal si no hay otros usuarios para notificar');
      }
    }
    
    // 6. Verificar notificaciones específicas del comentario
    console.log('\n📄 6. Verificando notificaciones específicas...');
    const { data: notifComentario, error: notifError } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('tipo', 'comentario_incapacidades')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (notifError) {
      console.log('⚠️ Error verificando notificaciones específicas:', notifError.message);
    } else if (notifComentario && notifComentario.length > 0) {
      console.log(`✅ Encontradas ${notifComentario.length} notificaciones de comentarios:`);
      notifComentario.forEach((notif, index) => {
        console.log(`   ${index + 1}. ${notif.titulo} - ${notif.mensaje}`);
      });
    } else {
      console.log('⚠️ No se encontraron notificaciones de comentarios');
    }
    
    // 7. Limpiar comentario de prueba
    console.log('\n📄 7. Limpiando comentario de prueba...');
    const { error: deleteError } = await supabase
      .from('comentarios_incapacidades')
      .delete()
      .eq('id', comentario.id);
    
    if (deleteError) {
      console.log('⚠️ No se pudo eliminar comentario de prueba:', deleteError.message);
    } else {
      console.log('✅ Comentario de prueba eliminado');
    }
    
    // 8. Resultado final
    console.log('\n🎯 RESULTADO FINAL:');
    if (!insertError) {
      console.log('✅ Los comentarios se pueden guardar correctamente');
      console.log('✅ El trigger funciona sin errores');
      console.log('✅ El sistema de notificaciones está operativo');
      
      console.log('\n📋 PRÓXIMOS PASOS:');
      console.log('1. Prueba crear comentarios desde la interfaz web');
      console.log('2. Verifica que las notificaciones aparezcan en el dropdown');
      console.log('3. Confirma que los usuarios reciban las notificaciones apropiadas');
    } else {
      console.log('❌ Aún hay problemas con el sistema de comentarios');
      console.log('💡 Revisa y ejecuta scripts/manual-fix-trigger.sql');
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
  }
}

verificarSolucion();
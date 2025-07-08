const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function arreglarTrigger() {
  console.log('🔧 Verificando y arreglando notificaciones para comentarios de incapacidades...');
  
  try {
    // Verificar que la tabla existe
    console.log('📄 Verificando tabla comentarios_incapacidades...');
    const { data: tablaTest, error: tablaError } = await supabase
      .from('comentarios_incapacidades')
      .select('count')
      .limit(1);
    
    if (tablaError) {
      console.error('❌ Error: La tabla comentarios_incapacidades no existe:', tablaError.message);
      return;
    }
    
    console.log('✅ Tabla comentarios_incapacidades existe');
    
    // Buscar una incapacidad existente para probar
    console.log('📄 Buscando incapacidad para probar...');
    const { data: incapacidades, error: incError } = await supabase
      .from('incapacidades')
      .select('id, usuario_id')
      .limit(1);
    
    if (incError || !incapacidades || incapacidades.length === 0) {
      console.log('⚠️ No se encontraron incapacidades para probar');
      console.log('💡 Crea una incapacidad primero para probar las notificaciones');
      return;
    }
    
    const incapacidadPrueba = incapacidades[0];
    console.log('✅ Usando incapacidad para prueba:', incapacidadPrueba.id);
    
    // Buscar un usuario diferente para hacer el comentario
    console.log('📄 Buscando usuario para hacer comentario...');
    const { data: usuarios, error: usuarioError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador')
      .neq('auth_user_id', incapacidadPrueba.usuario_id)
      .limit(1);
    
    let usuarioComentario = incapacidadPrueba.usuario_id; // Por defecto, el mismo usuario
    if (!usuarioError && usuarios && usuarios.length > 0) {
      usuarioComentario = usuarios[0].auth_user_id;
      console.log('✅ Usando usuario diferente para comentario:', usuarios[0].colaborador);
    } else {
      console.log('⚠️ Usando el mismo usuario de la incapacidad para comentario');
    }
    
    // Contar notificaciones antes
    const { count: notifAntes, error: countError1 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'comentario_incapacidades');
    
    if (countError1) {
      console.error('❌ Error contando notificaciones:', countError1.message);
      return;
    }
    
    console.log(`📊 Notificaciones antes: ${notifAntes || 0}`);
    
    // Crear comentario de prueba
    console.log('📄 Creando comentario de prueba...');
    const { data: comentario, error: comentError } = await supabase
      .from('comentarios_incapacidades')
      .insert({
        incapacidad_id: incapacidadPrueba.id,
        usuario_id: usuarioComentario,
        contenido: `Comentario de prueba para verificar notificaciones - ${new Date().toISOString()}`
      })
      .select()
      .single();
    
    if (comentError) {
      console.error('❌ Error creando comentario:', comentError.message);
      console.log('💡 Esto indica que el trigger tiene un problema. Necesitas ejecutar manualmente:');
      console.log('📄 Archivo SQL: db/migrations/20241219_setup_comentarios_incapacidades_notifications.sql');
      console.log('\n🔧 INSTRUCCIONES MANUALES:');
      console.log('1. Conecta a tu base de datos PostgreSQL (pgAdmin, psql, etc.)');
      console.log('2. Ejecuta este comando para eliminar el trigger problemático:');
      console.log('   DROP TRIGGER IF EXISTS trigger_notificar_comentario_incapacidades ON comentarios_incapacidades;');
      console.log('3. Ejecuta este comando para eliminar la función problemática:');
      console.log('   DROP FUNCTION IF EXISTS crear_notificacion_comentario_incapacidades();');
      console.log('4. Ejecuta todo el contenido del archivo SQL mencionado arriba');
      console.log('5. Ejecuta nuevamente este script para verificar');
      return;
    }
    
    console.log('✅ Comentario de prueba creado:', comentario.id);
    
    // Esperar un momento para que se procese
    console.log('📄 Esperando procesamiento...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Contar notificaciones después
    const { count: notifDespues, error: countError2 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'comentario_incapacidades');
    
    if (countError2) {
      console.error('❌ Error contando notificaciones después:', countError2.message);
    } else {
      console.log(`📊 Notificaciones después: ${notifDespues || 0}`);
      
      const nuevasNotificaciones = (notifDespues || 0) - (notifAntes || 0);
      console.log(`🎯 Nuevas notificaciones generadas: ${nuevasNotificaciones}`);
      
      if (nuevasNotificaciones > 0) {
        console.log('🎉 ¡ÉXITO! Las notificaciones están funcionando correctamente');
        
        // Mostrar las notificaciones creadas
        const { data: nuevasNotifs, error: notifError } = await supabase
          .from('notificaciones')
          .select('usuario_id, titulo, mensaje')
          .eq('tipo', 'comentario_incapacidades')
          .order('fecha_creacion', { ascending: false })
          .limit(nuevasNotificaciones);
        
        if (!notifError && nuevasNotifs) {
          console.log('\n📋 Notificaciones creadas:');
          nuevasNotifs.forEach((notif, index) => {
            console.log(`${index + 1}. ${notif.titulo} - ${notif.mensaje}`);
          });
        }
      } else {
        console.log('❌ No se generaron notificaciones. El trigger NO está funcionando.');
        console.log('💡 Sigue las instrucciones manuales mostradas arriba.');
      }
    }
    
    // Limpiar comentario de prueba
    console.log('\n📄 Limpiando comentario de prueba...');
    const { error: deleteError } = await supabase
      .from('comentarios_incapacidades')
      .delete()
      .eq('id', comentario.id);
    
    if (deleteError) {
      console.log('⚠️ No se pudo eliminar el comentario de prueba:', deleteError.message);
    } else {
      console.log('✅ Comentario de prueba eliminado');
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
  }
}

arreglarTrigger();
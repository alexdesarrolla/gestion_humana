const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function probarNotificacionesIncapacidades() {
  try {
    console.log('🧪 Probando sistema de notificaciones de comentarios de incapacidades...');
    
    // 1. Verificar que existe la tabla comentarios_incapacidades
    console.log('\n1️⃣ Verificando tabla comentarios_incapacidades...');
    const { data: tablaInfo, error: tablaError } = await supabase
      .from('comentarios_incapacidades')
      .select('count')
      .limit(1);
    
    if (tablaError) {
      console.error('❌ Error accediendo a comentarios_incapacidades:', tablaError.message);
      return;
    }
    console.log('✅ Tabla comentarios_incapacidades existe y es accesible');
    
    // 2. Buscar una incapacidad existente o crear una de prueba
    console.log('\n2️⃣ Buscando incapacidad para prueba...');
    const { data: incapacidades, error: incapError } = await supabase
      .from('incapacidades')
      .select('id, usuario_id')
      .limit(1);
    
    if (incapError) {
      console.error('❌ Error buscando incapacidades:', incapError.message);
      return;
    }
    
    if (!incapacidades || incapacidades.length === 0) {
      console.log('⚠️ No se encontraron incapacidades existentes');
      console.log('💡 Necesitas crear una incapacidad primero para probar las notificaciones');
      return;
    }
    
    const incapacidadPrueba = incapacidades[0];
    console.log('✅ Usando incapacidad:', incapacidadPrueba.id);
    
    // 3. Buscar un usuario para hacer el comentario
    console.log('\n3️⃣ Buscando usuario para comentario...');
    const { data: usuarios, error: userError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador')
      .neq('auth_user_id', incapacidadPrueba.usuario_id)
      .limit(1);
    
    if (userError || !usuarios || usuarios.length === 0) {
      console.log('⚠️ No se encontró usuario diferente para hacer comentario');
      console.log('💡 Usando el mismo usuario propietario de la incapacidad');
      
      const { data: propietario, error: propError } = await supabase
        .from('usuario_nomina')
        .select('auth_user_id, colaborador')
        .eq('auth_user_id', incapacidadPrueba.usuario_id)
        .single();
      
      if (propError) {
        console.error('❌ Error obteniendo propietario:', propError.message);
        return;
      }
      
      usuarios[0] = propietario;
    }
    
    const usuarioComentario = usuarios[0];
    console.log('✅ Usuario para comentario:', usuarioComentario.colaborador);
    
    // 4. Contar notificaciones antes del comentario
    console.log('\n4️⃣ Contando notificaciones antes del comentario...');
    const { count: notificacionesAntes, error: countError1 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'comentario_incapacidades');
    
    if (countError1) {
      console.error('❌ Error contando notificaciones:', countError1.message);
      return;
    }
    
    console.log(`📊 Notificaciones de comentarios de incapacidades antes: ${notificacionesAntes || 0}`);
    
    // 5. Crear comentario de prueba
    console.log('\n5️⃣ Creando comentario de prueba...');
    const { data: comentario, error: comentError } = await supabase
      .from('comentarios_incapacidades')
      .insert({
        incapacidad_id: incapacidadPrueba.id,
        usuario_id: usuarioComentario.auth_user_id,
        contenido: `Comentario de prueba para notificaciones - ${new Date().toISOString()}`
      })
      .select()
      .single();
    
    if (comentError) {
      console.error('❌ Error creando comentario:', comentError.message);
      return;
    }
    
    console.log('✅ Comentario creado:', comentario.id);
    
    // 6. Esperar un momento para que se procesen las notificaciones
    console.log('\n6️⃣ Esperando procesamiento de notificaciones...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 7. Contar notificaciones después del comentario
    console.log('\n7️⃣ Contando notificaciones después del comentario...');
    const { count: notificacionesDespues, error: countError2 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'comentario_incapacidades');
    
    if (countError2) {
      console.error('❌ Error contando notificaciones después:', countError2.message);
      return;
    }
    
    console.log(`📊 Notificaciones de comentarios de incapacidades después: ${notificacionesDespues || 0}`);
    
    // 8. Mostrar las nuevas notificaciones
    const nuevasNotificaciones = (notificacionesDespues || 0) - (notificacionesAntes || 0);
    console.log(`\n🎯 Nuevas notificaciones generadas: ${nuevasNotificaciones}`);
    
    if (nuevasNotificaciones > 0) {
      console.log('\n📋 Últimas notificaciones de comentarios de incapacidades:');
      const { data: ultimasNotif, error: ultimasError } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('tipo', 'comentario_incapacidades')
        .order('created_at', { ascending: false })
        .limit(nuevasNotificaciones);
      
      if (!ultimasError && ultimasNotif) {
        ultimasNotif.forEach((notif, index) => {
          console.log(`  ${index + 1}. ${notif.titulo} - ${notif.mensaje}`);
        });
      }
    }
    
    // 9. Limpiar comentario de prueba
    console.log('\n9️⃣ Limpiando comentario de prueba...');
    const { error: deleteError } = await supabase
      .from('comentarios_incapacidades')
      .delete()
      .eq('id', comentario.id);
    
    if (deleteError) {
      console.log('⚠️ No se pudo eliminar el comentario de prueba:', deleteError.message);
    } else {
      console.log('✅ Comentario de prueba eliminado');
    }
    
    console.log('\n🎉 Prueba de notificaciones de comentarios de incapacidades completada');
    
    if (nuevasNotificaciones > 0) {
      console.log('✅ El sistema de notificaciones está funcionando correctamente');
    } else {
      console.log('⚠️ No se generaron notificaciones. Verifica la configuración del trigger.');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

probarNotificacionesIncapacidades();
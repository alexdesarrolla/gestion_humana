const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function configurarNotificaciones() {
  console.log('🚀 Configurando notificaciones para comentarios de incapacidades...');
  
  try {
    // Verificar que la tabla existe
    console.log('📄 Verificando tabla comentarios_incapacidades...');
    const { data: tablaTest, error: tablaError } = await supabase
      .from('comentarios_incapacidades')
      .select('count')
      .limit(1);
    
    if (tablaError) {
      console.error('❌ Error: La tabla comentarios_incapacidades no existe:', tablaError.message);
      console.log('💡 Ejecuta primero la migración para crear la tabla.');
      return;
    }
    
    console.log('✅ Tabla comentarios_incapacidades existe');
    
    // Crear función de notificación usando SQL directo
    console.log('📄 Creando función de notificación...');
    
    // Usar una consulta SQL simple para verificar si podemos ejecutar comandos
    const { data: testQuery, error: testError } = await supabase
      .from('comentarios_incapacidades')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error de conexión:', testError.message);
      return;
    }
    
    console.log('✅ Conexión a la base de datos establecida');
    
    // Verificar si ya existe el trigger
    console.log('📄 Verificando si el trigger ya existe...');
    
    // Intentar crear un comentario de prueba para ver si el trigger funciona
    console.log('📄 Probando si las notificaciones ya están configuradas...');
    
    // Buscar una incapacidad existente
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
    
    // Contar notificaciones antes
    const { count: notifAntes, error: countError1 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'comentario_incapacidades');
    
    if (countError1) {
      console.error('❌ Error contando notificaciones:', countError1.message);
      return;
    }
    
    console.log(`📊 Notificaciones de comentarios de incapacidades antes: ${notifAntes || 0}`);
    
    // Crear comentario de prueba
    console.log('📄 Creando comentario de prueba...');
    const { data: comentario, error: comentError } = await supabase
      .from('comentarios_incapacidades')
      .insert({
        incapacidad_id: incapacidadPrueba.id,
        usuario_id: incapacidadPrueba.usuario_id,
        contenido: `Comentario de prueba para verificar notificaciones - ${new Date().toISOString()}`
      })
      .select()
      .single();
    
    if (comentError) {
      console.error('❌ Error creando comentario:', comentError.message);
      return;
    }
    
    console.log('✅ Comentario de prueba creado:', comentario.id);
    
    // Esperar un momento
    console.log('📄 Esperando procesamiento...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Contar notificaciones después
    const { count: notifDespues, error: countError2 } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'comentario_incapacidades');
    
    if (countError2) {
      console.error('❌ Error contando notificaciones después:', countError2.message);
    } else {
      console.log(`📊 Notificaciones de comentarios de incapacidades después: ${notifDespues || 0}`);
      
      const nuevasNotificaciones = (notifDespues || 0) - (notifAntes || 0);
      console.log(`🎯 Nuevas notificaciones generadas: ${nuevasNotificaciones}`);
      
      if (nuevasNotificaciones > 0) {
        console.log('✅ El sistema de notificaciones YA ESTÁ FUNCIONANDO correctamente');
      } else {
        console.log('❌ No se generaron notificaciones. El trigger NO está configurado.');
        console.log('💡 Necesitas ejecutar manualmente las migraciones SQL en la base de datos.');
        console.log('📄 Archivo de migración: db/migrations/20241219_setup_comentarios_incapacidades_notifications.sql');
      }
    }
    
    // Limpiar comentario de prueba
    console.log('📄 Limpiando comentario de prueba...');
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
    console.error('❌ Error durante la configuración:', error.message);
  }
  
  console.log('\n📋 INSTRUCCIONES PARA CONFIGURAR MANUALMENTE:');
  console.log('1. Conecta a tu base de datos PostgreSQL');
  console.log('2. Ejecuta el contenido del archivo: db/migrations/20241219_setup_comentarios_incapacidades_notifications.sql');
  console.log('3. Verifica que el trigger se creó correctamente');
  console.log('4. Ejecuta nuevamente este script para verificar');
}

configurarNotificaciones();
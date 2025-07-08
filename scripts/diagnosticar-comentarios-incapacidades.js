const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnosticar() {
  console.log('🔍 Diagnosticando problemas con comentarios de incapacidades...');
  
  try {
    // 1. Verificar que la tabla existe
    console.log('\n📄 1. Verificando tabla comentarios_incapacidades...');
    const { data: tablaTest, error: tablaError } = await supabase
      .from('comentarios_incapacidades')
      .select('count')
      .limit(1);
    
    if (tablaError) {
      console.error('❌ Error: La tabla comentarios_incapacidades no existe:', tablaError.message);
      console.log('💡 Ejecuta: db/migrations/20241219_create_comentarios_incapacidades_table.sql');
      return;
    }
    console.log('✅ Tabla comentarios_incapacidades existe');
    
    // 2. Verificar usuarios con auth_user_id null
    console.log('\n📄 2. Verificando usuarios con auth_user_id null...');
    const { data: usuariosNull, error: nullError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, correo_electronico, auth_user_id')
      .is('auth_user_id', null);
    
    if (nullError) {
      console.error('❌ Error verificando usuarios:', nullError.message);
    } else if (usuariosNull && usuariosNull.length > 0) {
      console.log(`⚠️ Encontrados ${usuariosNull.length} usuarios con auth_user_id null:`);
      usuariosNull.slice(0, 5).forEach(u => {
        console.log(`   - ${u.colaborador} (${u.correo_electronico})`);
      });
      if (usuariosNull.length > 5) {
        console.log(`   ... y ${usuariosNull.length - 5} más`);
      }
    } else {
      console.log('✅ Todos los usuarios tienen auth_user_id');
    }
    
    // 3. Buscar usuario autenticado para probar
    console.log('\n📄 3. Buscando usuario autenticado para probar...');
    const { data: usuarioAuth, error: authError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id, colaborador, correo_electronico')
      .not('auth_user_id', 'is', null)
      .limit(1);
    
    if (authError) {
      console.error('❌ Error buscando usuario autenticado:', authError.message);
      return;
    }
    
    if (!usuarioAuth || usuarioAuth.length === 0) {
      console.log('❌ No se encontraron usuarios con auth_user_id válido');
      console.log('💡 SOLUCIÓN: Necesitas vincular usuarios con cuentas de autenticación');
      console.log('   1. Ve a la página de administración de usuarios');
      console.log('   2. Crea cuentas de autenticación para los usuarios');
      console.log('   3. O actualiza manualmente el campo auth_user_id');
      return;
    }
    
    const usuario = usuarioAuth[0];
    console.log('✅ Usuario autenticado encontrado:', usuario.colaborador);
    
    // 4. Buscar incapacidad para probar
    console.log('\n📄 4. Buscando incapacidad para probar...');
    const { data: incapacidades, error: incError } = await supabase
      .from('incapacidades')
      .select('id, usuario_id')
      .limit(1);
    
    if (incError) {
      console.error('❌ Error buscando incapacidades:', incError.message);
      return;
    }
    
    if (!incapacidades || incapacidades.length === 0) {
      console.log('⚠️ No se encontraron incapacidades para probar');
      console.log('💡 Crea una incapacidad primero');
      return;
    }
    
    const incapacidad = incapacidades[0];
    console.log('✅ Incapacidad encontrada:', incapacidad.id);
    
    // 5. Probar inserción directa con usuario válido
    console.log('\n📄 5. Probando inserción directa...');
    const { data: comentario, error: insertError } = await supabase
      .from('comentarios_incapacidades')
      .insert({
        incapacidad_id: incapacidad.id,
        usuario_id: usuario.auth_user_id,
        contenido: `Comentario de prueba diagnóstico - ${new Date().toISOString()}`
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ ERROR AL INSERTAR COMENTARIO:', insertError.message);
      
      if (insertError.message.includes('nombre')) {
        console.log('\n🔧 PROBLEMA IDENTIFICADO: Trigger con columna "nombre" inexistente');
        console.log('💡 SOLUCIÓN: Ejecuta scripts/manual-fix-trigger.sql');
      } else if (insertError.message.includes('auth_user_id')) {
        console.log('\n🔧 PROBLEMA IDENTIFICADO: Usuario sin auth_user_id válido');
        console.log('💡 SOLUCIÓN: Vincula usuarios con cuentas de autenticación');
      } else {
        console.log('\n🔧 POSIBLES CAUSAS:');
        console.log('1. Políticas RLS muy restrictivas');
        console.log('2. Trigger con errores');
        console.log('3. Permisos insuficientes');
        console.log('4. Campos requeridos faltantes');
      }
      
      return;
    }
    
    console.log('✅ Comentario insertado correctamente:', comentario.id);
    
    // 6. Verificar que se crearon notificaciones
    console.log('\n📄 6. Verificando notificaciones generadas...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { count: notificaciones, error: notifError } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'comentario_incapacidades');
    
    if (notifError) {
      console.log('⚠️ No se pudieron verificar notificaciones:', notifError.message);
    } else {
      console.log(`✅ Notificaciones encontradas: ${notificaciones || 0}`);
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
    
    console.log('\n🎉 DIAGNÓSTICO COMPLETADO');
    console.log('✅ Los comentarios de incapacidades funcionan correctamente');
    
    // 8. Mostrar resumen de problemas encontrados
    if (usuariosNull && usuariosNull.length > 0) {
      console.log('\n⚠️ ADVERTENCIA: Usuarios sin auth_user_id');
      console.log(`   ${usuariosNull.length} usuarios no podrán hacer comentarios`);
      console.log('   💡 Solución: Crear cuentas de autenticación para estos usuarios');
    }
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error.message);
  }
}

diagnosticar();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateModuleNames() {
  try {
    console.log('🔄 Iniciando actualización de nombres de módulos...');

    // 1. Eliminar permisos existentes
    console.log('📝 Eliminando permisos existentes...');
    const { error: deletePermisosError } = await supabase
      .from('usuario_permisos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (deletePermisosError) {
      console.error('❌ Error eliminando permisos:', deletePermisosError);
    } else {
      console.log('✅ Permisos eliminados correctamente');
    }

    // 2. Eliminar módulos existentes
    console.log('📝 Eliminando módulos existentes...');
    const { error: deleteModulosError } = await supabase
      .from('modulos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (deleteModulosError) {
      console.error('❌ Error eliminando módulos:', deleteModulosError);
    } else {
      console.log('✅ Módulos eliminados correctamente');
    }

    // 3. Insertar módulos con nombres correctos
    console.log('📝 Insertando módulos actualizados...');
    const modulos = [
      { nombre: 'escritorio', descripcion: 'Panel principal de administración', ruta: '/administracion', icono: 'Home', orden: 1, activo: true },
      { nombre: 'usuarios', descripcion: 'Gestión de usuarios del sistema', ruta: '/administracion/usuarios', icono: 'User', orden: 2, activo: true },
      { nombre: 'cargos', descripcion: 'Gestión de cargos de la empresa', ruta: '/administracion/usuarios/cargos', icono: 'FileText', orden: 3, activo: true },
      { nombre: 'solicitudes', descripcion: 'Gestión de solicitudes', ruta: '/administracion/solicitudes', icono: 'FileText', orden: 4, activo: true },
      { nombre: 'comunicados', descripcion: 'Gestión de comunicados', ruta: '/administracion/comunicados', icono: 'Newspaper', orden: 5, activo: true },
      { nombre: 'novedades', descripcion: 'Gestión de novedades', ruta: '/administracion/novedades', icono: 'FaFileAlt', orden: 6, activo: true },
      { nombre: 'perfil', descripcion: 'Gestión del perfil personal', ruta: '/administracion/perfil', icono: 'Info', orden: 7, activo: true }
    ];

    const { data: modulosInsertados, error: insertModulosError } = await supabase
      .from('modulos')
      .insert(modulos)
      .select();

    if (insertModulosError) {
      console.error('❌ Error insertando módulos:', insertModulosError);
      return;
    }

    console.log('✅ Módulos insertados correctamente:', modulosInsertados.length);

    // 4. Obtener todos los administradores
    console.log('📝 Obteniendo administradores...');
    const { data: administradores, error: adminError } = await supabase
      .from('usuario_nomina')
      .select('auth_user_id')
      .eq('rol', 'administrador');

    if (adminError) {
      console.error('❌ Error obteniendo administradores:', adminError);
      return;
    }

    console.log(`👥 Encontrados ${administradores.length} administradores`);
    administradores.forEach(admin => {
      console.log(`  - ID: ${admin.auth_user_id}`);
    });

    // 5. Asignar permisos completos a administradores
    if (administradores.length > 0 && modulosInsertados.length > 0) {
      console.log('📝 Asignando permisos a administradores...');
      
      const permisos = [];
      administradores.forEach(admin => {
        modulosInsertados.forEach(modulo => {
          permisos.push({
            usuario_id: admin.auth_user_id,
            modulo_id: modulo.id,
            puede_ver: true,
            puede_crear: true,
            puede_editar: true,
            puede_eliminar: true
          });
        });
      });

      const { error: permisosError } = await supabase
        .from('usuario_permisos')
        .insert(permisos);

      if (permisosError) {
        console.error('❌ Error asignando permisos:', permisosError);
        return;
      }

      console.log(`✅ Permisos asignados: ${permisos.length} registros`);
    }

    // 6. Verificar resultados
    console.log('📊 Verificando resultados...');
    
    const { data: modulosFinales } = await supabase
      .from('modulos')
      .select('*')
      .order('orden');

    console.log('📋 Módulos creados:');
    modulosFinales?.forEach(m => {
      console.log(`  - ${m.nombre} (${m.descripcion})`);
    });

    const { data: permisosFinales } = await supabase
      .from('usuario_permisos')
      .select(`
        *,
        modulos(nombre)
      `);

    console.log(`📋 Permisos asignados: ${permisosFinales?.length || 0} registros`);

    console.log('🎉 Actualización completada exitosamente!');
    console.log('💡 Recarga la página para ver los cambios en el sidebar.');

  } catch (error) {
    console.error('💥 Error durante la actualización:', error);
  }
}

// Ejecutar la función
updateModuleNames();
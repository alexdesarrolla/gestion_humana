const { createClient } = require('@supabase/supabase-js');

// Variables de entorno reales
const supabaseUrl = 'https://aqmlxjsyczqtfansvnqr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbWx4anN5Y3pxdGZhbnN2bnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzM3NTYsImV4cCI6MjA1ODUwOTc1Nn0._dfB0vDYrR4jQ1cFHPXr_6iGTUXctzTeZbIcE4FJ0lk';

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan las variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  try {
    console.log('Verificando datos en las tablas...');
    
    // Verificar comunicados
    const { data: comunicados, error: errorComunicados } = await supabase
      .from('comunicados')
      .select('id, titulo, archivos_adjuntos')
      .limit(5);
    
    if (errorComunicados) {
      console.error('Error al obtener comunicados:', errorComunicados);
    } else {
      console.log('\nComunicados encontrados:', comunicados?.length || 0);
      comunicados?.forEach(c => {
        console.log(`- ${c.titulo} (ID: ${c.id})`);
        console.log(`  Archivos adjuntos:`, c.archivos_adjuntos ? 'Sí' : 'No');
      });
    }
    
    // Verificar cargos
    const { data: cargos, error: errorCargos } = await supabase
      .from('cargos')
      .select('id, nombre')
      .limit(5);
    
    if (errorCargos) {
      console.error('Error al obtener cargos:', errorCargos);
    } else {
      console.log('\nCargos encontrados:', cargos?.length || 0);
      cargos?.forEach(c => console.log(`- ${c.nombre} (ID: ${c.id})`));
    }
    
    // Verificar comunicados_cargos
    const { data: comunicadosCargos, error: errorComunicadosCargos } = await supabase
      .from('comunicados_cargos')
      .select('comunicado_id, cargo_id')
      .limit(5);
    
    if (errorComunicadosCargos) {
      console.error('Error al obtener comunicados_cargos:', errorComunicadosCargos);
    } else {
      console.log('\nRelaciones comunicados-cargos encontradas:', comunicadosCargos?.length || 0);
      comunicadosCargos?.forEach(cc => {
        console.log(`- Comunicado: ${cc.comunicado_id}, Cargo: ${cc.cargo_id}`);
      });
    }
    
    // Si hay comunicados y cargos pero no hay relaciones, crear algunas
    if (comunicados && comunicados.length > 0 && cargos && cargos.length > 0 && (!comunicadosCargos || comunicadosCargos.length === 0)) {
      console.log('\nCreando relaciones de prueba...');
      
      const relacionesPrueba = [
        {
          comunicado_id: comunicados[0].id,
          cargo_id: cargos[0].id
        }
      ];
      
      if (cargos.length > 1) {
        relacionesPrueba.push({
          comunicado_id: comunicados[0].id,
          cargo_id: cargos[1].id
        });
      }
      
      const { error: errorInsert } = await supabase
        .from('comunicados_cargos')
        .insert(relacionesPrueba);
      
      if (errorInsert) {
        console.error('Error al insertar relaciones:', errorInsert);
      } else {
        console.log('Relaciones de prueba creadas exitosamente');
      }
    }
    
    // Actualizar un comunicado con archivos adjuntos de prueba si no tiene
    if (comunicados && comunicados.length > 0) {
      const comunicadoSinArchivos = comunicados.find(c => !c.archivos_adjuntos || c.archivos_adjuntos.length === 0);
      
      if (comunicadoSinArchivos) {
        console.log('\nAgregando archivos adjuntos de prueba...');
        
        const archivosPrueba = [
          {
            nombre: 'Documento_ejemplo.pdf',
            tamaño: 1024000,
            tipo: 'application/pdf',
            url: 'https://example.com/documento.pdf'
          },
          {
            nombre: 'Imagen_ejemplo.jpg',
            tamaño: 512000,
            tipo: 'image/jpeg',
            url: 'https://example.com/imagen.jpg'
          }
        ];
        
        const { error: errorUpdate } = await supabase
          .from('comunicados')
          .update({ archivos_adjuntos: archivosPrueba })
          .eq('id', comunicadoSinArchivos.id);
        
        if (errorUpdate) {
          console.error('Error al actualizar archivos adjuntos:', errorUpdate);
        } else {
          console.log('Archivos adjuntos de prueba agregados exitosamente');
        }
      }
    }
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

checkData();
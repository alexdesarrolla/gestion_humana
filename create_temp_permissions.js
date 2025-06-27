const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTempPermissions() {
  try {
    console.log('🚀 Creando tabla usuario_permisos temporal...')
    
    // Crear tabla temporal usuario_permisos
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS usuario_permisos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID,
        modulo_id UUID,
        puede_ver BOOLEAN DEFAULT false,
        puede_crear BOOLEAN DEFAULT false,
        puede_editar BOOLEAN DEFAULT false,
        puede_eliminar BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    // Intentar crear usando una consulta SQL directa
    const { error: createError } = await supabase.rpc('sql', { query: createTableSQL })
    
    if (createError) {
      console.log('⚠️  Error al crear tabla (intentando método alternativo):', createError.message)
      
      // Método alternativo: usar el cliente de Supabase para crear registros dummy
      try {
        const { error: insertError } = await supabase
          .from('usuario_permisos')
          .insert({ usuario_id: '00000000-0000-0000-0000-000000000000' })
        
        if (insertError && insertError.code === '42P01') {
          console.log('❌ La tabla usuario_permisos definitivamente no existe')
          console.log('\n🔧 Intentando actualizar rol sin triggers...')
          
          // Intentar actualizar usando SQL raw
          const updateSQL = "UPDATE usuario_nomina SET rol = 'usuario' WHERE rol = 'moderador';"
          const { error: updateError } = await supabase.rpc('sql', { query: updateSQL })
          
          if (updateError) {
            console.error('❌ Error con SQL directo:', updateError)
          } else {
            console.log('✅ Actualización exitosa con SQL directo')
          }
        }
      } catch (err) {
        console.log('Error en método alternativo:', err.message)
      }
    } else {
      console.log('✅ Tabla usuario_permisos creada exitosamente')
      
      // Ahora intentar actualizar roles
      console.log('\n🔄 Actualizando roles...')
      const { data, error } = await supabase
        .from('usuario_nomina')
        .update({ rol: 'usuario' })
        .eq('rol', 'moderador')
        .select('id, colaborador, rol')
      
      if (error) {
        console.error('❌ Error al actualizar roles:', error)
      } else {
        console.log(`✅ ${data.length} usuarios actualizados exitosamente`)
        data.forEach(u => console.log(`- ${u.colaborador} ahora es ${u.rol}`))
      }
    }
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

createTempPermissions()
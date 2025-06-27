const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function finalRoleFix() {
  try {
    console.log('🚀 Solución final para actualizar roles...')
    
    // Paso 1: Crear tabla usuario_permisos mínima para satisfacer el trigger
    console.log('\n1. Creando tabla usuario_permisos temporal...')
    
    const createTableQuery = `
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
    
    // Intentar crear la tabla usando el método de inserción
    try {
      const { error: insertError } = await supabase
        .from('usuario_permisos')
        .insert({ usuario_id: '00000000-0000-0000-0000-000000000000' })
      
      if (insertError && insertError.code === '42P01') {
        console.log('⚠️  Tabla usuario_permisos no existe, necesita ser creada manualmente')
        console.log('\n📋 INSTRUCCIONES MANUALES:')
        console.log('1. Ve al SQL Editor de Supabase')
        console.log('2. Ejecuta el siguiente SQL:')
        console.log('\n```sql')
        console.log(createTableQuery)
        console.log('```\n')
        console.log('3. Luego ejecuta este script nuevamente')
        return
      } else {
        console.log('✅ Tabla usuario_permisos ya existe')
        // Eliminar el registro dummy si se insertó
        await supabase
          .from('usuario_permisos')
          .delete()
          .eq('usuario_id', '00000000-0000-0000-0000-000000000000')
      }
    } catch (err) {
      console.log('Error al verificar tabla:', err.message)
    }
    
    // Paso 2: Verificar usuarios moderadores
    console.log('\n2. Verificando usuarios moderadores...')
    
    const { data: moderadores, error: selectError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, rol')
      .eq('rol', 'moderador')
    
    if (selectError) {
      console.error('❌ Error al buscar moderadores:', selectError)
      return
    }
    
    console.log(`Encontrados ${moderadores.length} usuarios moderadores:`)
    moderadores.forEach(mod => {
      console.log(`- ${mod.colaborador} (ID: ${mod.id})`)
    })
    
    if (moderadores.length === 0) {
      console.log('✅ No hay usuarios moderadores para actualizar')
      return
    }
    
    // Paso 3: Actualizar roles
    console.log('\n3. Actualizando roles...')
    
    const { data, error } = await supabase
      .from('usuario_nomina')
      .update({ rol: 'usuario' })
      .eq('rol', 'moderador')
      .select('id, colaborador, rol')
    
    if (error) {
      console.error('❌ Error al actualizar roles:', error)
      
      // Si aún falla, intentar actualización individual
      console.log('\n🔄 Intentando actualización individual...')
      
      for (const moderador of moderadores) {
        console.log(`Actualizando ${moderador.colaborador}...`)
        
        const { data: userData, error: userError } = await supabase
          .from('usuario_nomina')
          .update({ rol: 'usuario' })
          .eq('id', moderador.id)
          .select('id, colaborador, rol')
        
        if (userError) {
          console.error(`❌ Error al actualizar ${moderador.colaborador}:`, userError)
        } else {
          console.log(`✅ ${moderador.colaborador} actualizado exitosamente`)
        }
      }
    } else {
      console.log(`\n✅ ${data.length} usuarios actualizados exitosamente:`)
      data.forEach(u => console.log(`- ${u.colaborador} ahora es ${u.rol}`))
    }
    
    // Paso 4: Verificar resultado final
    console.log('\n4. Verificación final...')
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('usuario_nomina')
      .select('rol')
      .eq('rol', 'moderador')
    
    if (finalError) {
      console.error('Error en verificación final:', finalError)
    } else {
      console.log(`Usuarios moderadores restantes: ${finalCheck.length}`)
      if (finalCheck.length === 0) {
        console.log('\n🎉 ¡ÉXITO! Todos los moderadores han sido convertidos a usuarios')
        console.log('\n📝 Próximos pasos recomendados:')
        console.log('1. Actualizar el constraint de roles en la base de datos')
        console.log('2. Eliminar triggers relacionados con moderador')
        console.log('3. Verificar que la aplicación funcione correctamente')
      } else {
        console.log('⚠️  Aún quedan usuarios moderadores por actualizar')
      }
    }
    
  } catch (err) {
    console.error('❌ Error general:', err)
  }
}

finalRoleFix()
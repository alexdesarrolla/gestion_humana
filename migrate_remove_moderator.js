const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function removeModerator() {
  try {
    console.log('🚀 Iniciando eliminación del rol moderador...')
    
    // 1. Verificar usuarios moderadores existentes
    console.log('1. Verificando usuarios moderadores existentes...')
    const { data: moderadores, error: modError } = await supabase
      .from('usuario_nomina')
      .select('id, colaborador, rol')
      .eq('rol', 'moderador')
    
    if (modError) {
      console.error('Error al obtener moderadores:', modError)
      return
    }
    
    console.log(`Encontrados ${moderadores.length} usuarios con rol moderador:`)
    moderadores.forEach(mod => {
      console.log(`- ${mod.colaborador} (ID: ${mod.id})`)
    })
    
    if (moderadores.length > 0) {
      // 2. Convertir moderadores a usuarios
      console.log('\n2. Convirtiendo moderadores a usuarios...')
      const { error: updateError } = await supabase
        .from('usuario_nomina')
        .update({ rol: 'usuario', updated_at: new Date().toISOString() })
        .eq('rol', 'moderador')
      
      if (updateError) {
        console.error('Error al actualizar roles:', updateError)
        return
      }
      
      console.log(`✅ ${moderadores.length} usuarios convertidos de moderador a usuario`)
    }
    
    // 3. Eliminar permisos de ex-moderadores
    console.log('\n3. Eliminando permisos de ex-moderadores...')
    const { error: deletePermError } = await supabase
      .from('usuario_permisos')
      .delete()
      .in('usuario_id', moderadores.map(m => m.id).filter(id => id))
    
    if (deletePermError) {
      console.error('Error al eliminar permisos:', deletePermError)
    } else {
      console.log('✅ Permisos de ex-moderadores eliminados')
    }
    
    // 4. Verificar estado final
    console.log('\n4. Verificando estado final...')
    const { data: finalUsers, error: finalError } = await supabase
      .from('usuario_nomina')
      .select('rol')
      .in('rol', ['usuario', 'administrador'])
    
    if (finalError) {
      console.error('Error al verificar estado final:', finalError)
      return
    }
    
    const userCount = finalUsers.filter(u => u.rol === 'usuario').length
    const adminCount = finalUsers.filter(u => u.rol === 'administrador').length
    
    console.log('\n📊 Estado final del sistema:')
    console.log(`- Usuarios: ${userCount}`)
    console.log(`- Administradores: ${adminCount}`)
    console.log(`- Moderadores: 0 (eliminados)`)
    
    console.log('\n🎉 ¡Eliminación del rol moderador completada exitosamente!')
    console.log('\n📋 Resumen de cambios:')
    console.log('- ✅ Usuarios moderadores convertidos a usuarios normales')
    console.log('- ✅ Permisos de ex-moderadores eliminados')
    console.log('- ✅ Sistema simplificado: solo usuarios y administradores')
    console.log('\n⚠️  Nota: Recuerda ejecutar el script SQL remove_moderator_role.sql')
    console.log('   para actualizar las restricciones de la base de datos.')
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
  }
}

removeModerator()
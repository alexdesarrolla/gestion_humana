require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function cleanupOnlineUsers() {
  console.log('🧹 LIMPIANDO TABLA ONLINE_USERS')
  console.log('===============================')
  
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // 1. Mostrar registros actuales
    console.log('\n1. Verificando registros actuales en online_users...')
    const { data: currentUsers, error: selectError } = await adminSupabase
      .from('online_users')
      .select('*')
    
    if (selectError) {
      console.error('❌ Error al consultar online_users:', selectError)
      return
    }
    
    console.log(`📊 Registros encontrados: ${currentUsers?.length || 0}`)
    if (currentUsers && currentUsers.length > 0) {
      currentUsers.forEach(user => {
        console.log(`   - User ID: ${user.user_id}, Last seen: ${user.last_seen_at}`)
      })
    }
    
    // 2. Verificar usuarios válidos en usuario_nomina
    console.log('\n2. Verificando usuarios válidos en usuario_nomina...')
    const { data: validUsers, error: validError } = await adminSupabase
      .from('usuario_nomina')
      .select('auth_user_id, correo_electronico, estado')
      .not('auth_user_id', 'is', null)
      .eq('estado', 'activo')
    
    if (validError) {
      console.error('❌ Error al consultar usuario_nomina:', validError)
      return
    }
    
    console.log(`📊 Usuarios válidos en usuario_nomina: ${validUsers?.length || 0}`)
    const validUserIds = validUsers?.map(u => u.auth_user_id) || []
    
    // 3. Identificar registros huérfanos en online_users
    const orphanedUsers = currentUsers?.filter(ou => !validUserIds.includes(ou.user_id)) || []
    
    if (orphanedUsers.length > 0) {
      console.log(`\n⚠️  Registros huérfanos encontrados: ${orphanedUsers.length}`)
      orphanedUsers.forEach(user => {
        console.log(`   - User ID huérfano: ${user.user_id}`)
      })
      
      // 4. Eliminar registros huérfanos
      console.log('\n3. Eliminando registros huérfanos...')
      const orphanedIds = orphanedUsers.map(u => u.user_id)
      
      const { error: deleteError } = await adminSupabase
        .from('online_users')
        .delete()
        .in('user_id', orphanedIds)
      
      if (deleteError) {
        console.error('❌ Error al eliminar registros huérfanos:', deleteError)
        return
      }
      
      console.log(`✅ ${orphanedUsers.length} registros huérfanos eliminados`)
    } else {
      console.log('\n✅ No se encontraron registros huérfanos')
    }
    
    // 5. Verificar estado final
    console.log('\n4. Verificando estado final...')
    const { data: finalUsers, error: finalError } = await adminSupabase
      .from('online_users')
      .select('*')
    
    if (finalError) {
      console.error('❌ Error al verificar estado final:', finalError)
      return
    }
    
    console.log(`📊 Registros restantes: ${finalUsers?.length || 0}`)
    if (finalUsers && finalUsers.length > 0) {
      finalUsers.forEach(user => {
        console.log(`   - User ID válido: ${user.user_id}, Last seen: ${user.last_seen_at}`)
      })
    }
    
    console.log('\n🎉 LIMPIEZA COMPLETADA EXITOSAMENTE')
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
  }
}

if (require.main === module) {
  cleanupOnlineUsers()
}

module.exports = { cleanupOnlineUsers }
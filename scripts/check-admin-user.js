const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkAdminUser() {
  console.log('🔍 VERIFICANDO USUARIO ADMINISTRADOR')
  console.log('==================================')
  
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // 1. Buscar el usuario en usuario_nomina
    console.log('\n1. Buscando usuario admin@gestionhumana.co en usuario_nomina...')
    
    const { data: adminUser, error: adminError } = await adminSupabase
      .from('usuario_nomina')
      .select('*')
      .eq('correo_electronico', 'admin@gestionhumana.co')
      .single()
    
    if (adminError) {
      console.log(`❌ Usuario no encontrado en usuario_nomina: ${adminError.message}`)
      
      // Verificar si existe con otro email
      const { data: allAdmins, error: allAdminsError } = await adminSupabase
        .from('usuario_nomina')
        .select('correo_electronico, colaborador, rol, estado, auth_user_id')
        .eq('rol', 'administrador')
      
      if (!allAdminsError && allAdmins && allAdmins.length > 0) {
        console.log('\n📋 Administradores encontrados:')
        allAdmins.forEach((admin, index) => {
          console.log(`   ${index + 1}. ${admin.colaborador || 'Sin nombre'}`)
          console.log(`      Email: ${admin.correo_electronico}`)
          console.log(`      Estado: ${admin.estado}`)
          console.log(`      Auth ID: ${admin.auth_user_id || 'No configurado'}`)
          console.log('')
        })
      }
      return
    }
    
    console.log('✅ Usuario encontrado en usuario_nomina:')
    console.log(`   Nombre: ${adminUser.colaborador}`)
    console.log(`   Email: ${adminUser.correo_electronico}`)
    console.log(`   Rol: ${adminUser.rol}`)
    console.log(`   Estado: ${adminUser.estado}`)
    console.log(`   Auth ID: ${adminUser.auth_user_id}`)
    
    // 2. Verificar si tiene auth_user_id
    if (!adminUser.auth_user_id) {
      console.log('\n❌ El usuario no tiene auth_user_id configurado')
      console.log('   Esto significa que no puede hacer login')
      
      // Buscar en auth.users si existe
      console.log('\n2. Buscando en auth.users...')
      
      const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers()
      
      if (!authError && authUsers && authUsers.users) {
        const authUser = authUsers.users.find(u => u.email === 'admin@gestionhumana.co')
        
        if (authUser) {
          console.log('✅ Usuario encontrado en auth.users:')
          console.log(`   ID: ${authUser.id}`)
          console.log(`   Email: ${authUser.email}`)
          console.log(`   Confirmado: ${authUser.email_confirmed_at ? 'Sí' : 'No'}`)
          console.log(`   Creado: ${authUser.created_at}`)
          
          // Actualizar auth_user_id en usuario_nomina
          console.log('\n3. Actualizando auth_user_id en usuario_nomina...')
          
          const { error: updateError } = await adminSupabase
            .from('usuario_nomina')
            .update({ auth_user_id: authUser.id })
            .eq('correo_electronico', 'admin@gestionhumana.co')
          
          if (updateError) {
            console.log(`❌ Error actualizando: ${updateError.message}`)
          } else {
            console.log('✅ auth_user_id actualizado correctamente')
          }
        } else {
          console.log('❌ Usuario no encontrado en auth.users')
          console.log('   Necesita ser creado en Supabase Auth')
        }
      }
    } else {
      console.log('\n2. Verificando usuario en auth.users...')
      
      const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(adminUser.auth_user_id)
      
      if (authError) {
        console.log(`❌ Error obteniendo usuario de auth: ${authError.message}`)
      } else {
        console.log('✅ Usuario encontrado en auth.users:')
        console.log(`   ID: ${authUser.user.id}`)
        console.log(`   Email: ${authUser.user.email}`)
        console.log(`   Confirmado: ${authUser.user.email_confirmed_at ? 'Sí' : 'No'}`)
        console.log(`   Último login: ${authUser.user.last_sign_in_at || 'Nunca'}`)
      }
    }
    
    // 3. Probar login
    console.log('\n4. Probando login con credenciales...')
    
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: loginData, error: loginError } = await userSupabase.auth.signInWithPassword({
      email: 'admin@gestionhumana.co',
      password: '1q2w3e4r'
    })
    
    if (loginError) {
      console.log(`❌ Error en login: ${loginError.message}`)
      
      // Intentar resetear la contraseña
      console.log('\n5. Intentando resetear contraseña...')
      
      const { error: resetError } = await adminSupabase.auth.admin.updateUserById(
        adminUser.auth_user_id,
        { password: '1q2w3e4r' }
      )
      
      if (resetError) {
        console.log(`❌ Error reseteando contraseña: ${resetError.message}`)
      } else {
        console.log('✅ Contraseña reseteada correctamente')
        
        // Probar login nuevamente
        console.log('\n6. Probando login después del reset...')
        
        const { data: newLoginData, error: newLoginError } = await userSupabase.auth.signInWithPassword({
          email: 'admin@gestionhumana.co',
          password: '1q2w3e4r'
        })
        
        if (newLoginError) {
          console.log(`❌ Login aún falla: ${newLoginError.message}`)
        } else {
          console.log('✅ Login exitoso después del reset')
          console.log(`   Token: ${newLoginData.session?.access_token?.substring(0, 30)}...`)
        }
      }
    } else {
      console.log('✅ Login exitoso')
      console.log(`   Token: ${loginData.session?.access_token?.substring(0, 30)}...`)
    }
    
    console.log('\n📋 RESUMEN:')
    console.log('============')
    if (adminUser.auth_user_id) {
      console.log('✅ Usuario existe en usuario_nomina')
      console.log('✅ Tiene auth_user_id configurado')
      console.log('✅ Debería poder hacer login')
    } else {
      console.log('✅ Usuario existe en usuario_nomina')
      console.log('❌ No tiene auth_user_id configurado')
      console.log('⚠️  Necesita configuración adicional')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar la verificación
checkAdminUser().catch(console.error)
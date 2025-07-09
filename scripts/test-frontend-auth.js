const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

// Cliente como lo usa el frontend
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFrontendAuth() {
  console.log('🧪 Probando autenticación desde perspectiva del frontend...');
  
  try {
    // 1. Verificar si hay usuarios para probar
    console.log('\n1️⃣ Verificando usuarios disponibles...');
    
    // Intentar hacer login con credenciales de prueba
    console.log('\n2️⃣ Intentando autenticación...');
    console.log('💡 Nota: Necesitas tener un usuario creado en tu aplicación');
    console.log('💡 Si no tienes uno, ve a /login y crea una cuenta');
    
    // Verificar sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error al obtener sesión:', sessionError.message);
      return;
    }
    
    if (!session) {
      console.log('⚠️  No hay sesión activa');
      console.log('\n📋 PASOS PARA PROBAR:');
      console.log('1. Ve a tu aplicación en el navegador');
      console.log('2. Inicia sesión con un usuario válido');
      console.log('3. Abre las herramientas de desarrollador (F12)');
      console.log('4. Ve a la consola y ejecuta este código:');
      console.log('');
      console.log('// Probar heartbeat manualmente');
      console.log('const testHeartbeat = async () => {');
      console.log('  const { data: { session } } = await window.supabase.auth.getSession();');
      console.log('  if (!session?.access_token) {');
      console.log('    console.log("No hay token de acceso");');
      console.log('    return;');
      console.log('  }');
      console.log('  ');
      console.log('  const response = await fetch("/api/online-users", {');
      console.log('    method: "POST",');
      console.log('    headers: {');
      console.log('      "Authorization": `Bearer ${session.access_token}`,');
      console.log('      "Content-Type": "application/json"');
      console.log('    }');
      console.log('  });');
      console.log('  ');
      console.log('  if (response.ok) {');
      console.log('    console.log("✅ Heartbeat exitoso");');
      console.log('  } else {');
      console.log('    console.log("❌ Error en heartbeat:", await response.text());');
      console.log('  }');
      console.log('};');
      console.log('');
      console.log('testHeartbeat();');
      console.log('');
      return;
    }
    
    console.log('✅ Sesión activa encontrada');
    console.log(`👤 Usuario: ${session.user.email}`);
    console.log(`🔑 Token disponible: ${session.access_token ? 'Sí' : 'No'}`);
    
    // 3. Probar heartbeat con sesión real
    console.log('\n3️⃣ Probando heartbeat con sesión real...');
    
    const response = await fetch('http://localhost:3000/api/online-users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Heartbeat exitoso desde script');
      
      // Probar GET también
      const getResponse = await fetch('http://localhost:3000/api/online-users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (getResponse.ok) {
        const data = await getResponse.json();
        console.log('✅ GET usuarios en línea exitoso');
        console.log(`📊 Usuarios en línea: ${data.count}`);
        if (data.users && data.users.length > 0) {
          console.log('👥 Usuarios:');
          data.users.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.colaborador || 'Usuario'} (${user.user_id.substring(0, 8)}...)`);
          });
        }
      } else {
        console.log('❌ Error en GET:', await getResponse.text());
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Error en heartbeat:', errorText);
      
      if (response.status === 500) {
        console.log('🔍 Error 500 sugiere problema en el servidor o RLS');
        console.log('📝 Verifica que hayas ejecutado: sql/fix_online_users_rls_policies.sql');
      }
    }
    
    // 4. Verificar directamente con Supabase client
    console.log('\n4️⃣ Probando inserción directa con Supabase client...');
    
    const { error: directInsertError } = await supabase
      .from('online_users')
      .upsert({
        user_id: session.user.id,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (directInsertError) {
      console.log('❌ Error en inserción directa:', directInsertError.message);
      if (directInsertError.code === '42501') {
        console.log('🔍 Error RLS - Las políticas están bloqueando la operación');
        console.log('📝 SOLUCIÓN: Ejecuta el archivo SQL en Supabase Dashboard:');
        console.log('   sql/fix_online_users_rls_policies.sql');
      }
    } else {
      console.log('✅ Inserción directa exitosa');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testFrontendAuth();
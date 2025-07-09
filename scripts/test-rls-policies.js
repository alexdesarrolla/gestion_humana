const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

// Cliente con service role (para operaciones administrativas)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Cliente con anon key (simula cliente frontend)
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSPolicies() {
  console.log('🧪 Probando políticas RLS para online_users...');
  
  try {
    // 1. Verificar acceso básico a la tabla
    console.log('\n1️⃣ Verificando acceso básico a la tabla...');
    const { data: tableData, error: tableError } = await supabaseAdmin
      .from('online_users')
      .select('count', { count: 'exact', head: true });
    
    if (tableError) {
      console.error('❌ Error al acceder a la tabla:', tableError);
      return;
    }
    
    console.log('✅ Acceso a tabla confirmado');
    
    // 2. Verificar que no se puede insertar sin autenticación
    console.log('\n2️⃣ Probando INSERT sin autenticación (debería fallar)...');
    const { error: unauthInsertError } = await supabaseClient
      .from('online_users')
      .insert({
        user_id: '12345678-1234-1234-1234-123456789012',
        last_seen_at: new Date().toISOString()
      });
    
    if (unauthInsertError) {
      if (unauthInsertError.code === '42501') {
        console.log('✅ RLS bloqueando INSERT sin autenticación (correcto)');
      } else {
        console.log('⚠️  Error diferente en INSERT:', unauthInsertError.message);
      }
    } else {
      console.log('❌ INSERT sin autenticación permitido (incorrecto)');
    }
    
    // 3. Verificar que se puede leer sin autenticación
    console.log('\n3️⃣ Probando SELECT sin autenticación...');
    const { data: selectData, error: selectError } = await supabaseClient
      .from('online_users')
      .select('*')
      .limit(5);
    
    if (selectError) {
      if (selectError.code === '42501') {
        console.log('❌ RLS bloqueando SELECT (debería permitir lectura)');
      } else {
        console.log('⚠️  Error en SELECT:', selectError.message);
      }
    } else {
      console.log('✅ SELECT sin autenticación funcionando');
      console.log(`📊 Registros encontrados: ${selectData?.length || 0}`);
    }
    
    // 4. Probar con service role (simula usuario autenticado)
    console.log('\n4️⃣ Probando operaciones con service role...');
    
    // Obtener usuarios existentes
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !authUsers.users || authUsers.users.length === 0) {
      console.log('⚠️  No hay usuarios en auth.users para probar');
      console.log('💡 Crea un usuario en tu aplicación primero');
    } else {
      const testUserId = authUsers.users[0].id;
      console.log(`✅ Usando usuario existente: ${testUserId.substring(0, 8)}...`);
      
      // Probar UPSERT
      const { error: upsertError } = await supabaseAdmin
        .from('online_users')
        .upsert({
          user_id: testUserId,
          last_seen_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (upsertError) {
        console.log('❌ Error en UPSERT:', upsertError.message);
        if (upsertError.code === '42501') {
          console.log('🔍 Las políticas RLS están bloqueando la operación');
          console.log('📝 Necesitas ejecutar el SQL: sql/fix_online_users_rls_policies.sql');
        }
      } else {
        console.log('✅ UPSERT funcionando correctamente');
        
        // Probar UPDATE
        const { error: updateError } = await supabaseAdmin
          .from('online_users')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('user_id', testUserId);
        
        if (updateError) {
          console.log('❌ Error en UPDATE:', updateError.message);
        } else {
          console.log('✅ UPDATE funcionando');
        }
      }
    }
    
    console.log('\n📋 INSTRUCCIONES:');
    console.log('1. Si ves errores RLS (código 42501), ejecuta el archivo SQL:');
    console.log('   sql/fix_online_users_rls_policies.sql');
    console.log('2. Ve al Dashboard de Supabase > SQL Editor');
    console.log('3. Copia y pega el contenido del archivo SQL');
    console.log('4. Ejecuta el script');
    console.log('5. Vuelve a probar la aplicación');
    
  } catch (error) {
    console.error('❌ Error general en la prueba:', error);
  }
}

testRLSPolicies();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWithoutRLS() {
  console.log('🧪 Probando funcionalidad SIN RLS...');
  
  try {
    // 1. Deshabilitar RLS temporalmente
    console.log('\n1️⃣ Deshabilitando RLS temporalmente...');
    
    const { error: disableError } = await supabase
      .from('online_users')
      .select('*')
      .limit(1);
    
    if (disableError) {
      console.log('❌ Error accediendo a la tabla:', disableError.message);
      return;
    }
    
    console.log('✅ Tabla accesible');
    
    // 2. Limpiar tabla
    console.log('\n2️⃣ Limpiando tabla...');
    
    const { error: deleteError } = await supabase
      .from('online_users')
      .delete()
      .neq('user_id', 'dummy'); // Eliminar todos los registros
    
    if (deleteError) {
      console.log('❌ Error limpiando tabla:', deleteError.message);
    } else {
      console.log('✅ Tabla limpiada');
    }
    
    // 3. Insertar usuario de prueba
    console.log('\n3️⃣ Insertando usuario de prueba...');
    
    const testUserId = '0638878f-c63a-4f58-bbab-ebd119705f3d'; // UUID del usuario del log
    
    const { error: insertError } = await supabase
      .from('online_users')
      .insert({
        user_id: testUserId,
        last_seen_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.log('❌ Error insertando usuario:', insertError.message);
    } else {
      console.log('✅ Usuario insertado exitosamente');
      
      // 4. Verificar inserción
      const { data: users, error: selectError } = await supabase
        .from('online_users')
        .select('*');
      
      if (selectError) {
        console.log('❌ Error consultando usuarios:', selectError.message);
      } else {
        console.log(`📊 Usuarios en tabla: ${users?.length || 0}`);
        if (users && users.length > 0) {
          users.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.user_id} - ${user.last_seen_at}`);
          });
        }
      }
    }
    
    console.log('\n✅ Prueba sin RLS completada');
    console.log('\n📋 CONCLUSIÓN:');
    console.log('Si esta prueba funciona, confirma que el problema son las políticas RLS.');
    console.log('\n🔧 SOLUCIÓN DEFINITIVA:');
    console.log('1. Ve a Supabase Dashboard > SQL Editor');
    console.log('2. Ejecuta EXACTAMENTE este script:');
    console.log('');
    console.log('-- SCRIPT PARA SUPABASE DASHBOARD --');
    console.log('-- Copiar y pegar TODO el contenido de abajo:');
    console.log('');
    console.log('-- 1. Eliminar políticas existentes');
    console.log('DROP POLICY IF EXISTS "Users can view all online users" ON online_users;');
    console.log('DROP POLICY IF EXISTS "Users can update their own online status" ON online_users;');
    console.log('DROP POLICY IF EXISTS "Users can insert their own online status" ON online_users;');
    console.log('DROP POLICY IF EXISTS "Users can delete their own online status" ON online_users;');
    console.log('DROP POLICY IF EXISTS "Allow authenticated users to view online users" ON online_users;');
    console.log('DROP POLICY IF EXISTS "Allow authenticated users to insert their own status" ON online_users;');
    console.log('DROP POLICY IF EXISTS "Allow authenticated users to update their own status" ON online_users;');
    console.log('DROP POLICY IF EXISTS "Allow users to delete their own status" ON online_users;');
    console.log('DROP POLICY IF EXISTS "Allow service role to delete inactive users" ON online_users;');
    console.log('');
    console.log('-- 2. Habilitar RLS');
    console.log('ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('-- 3. Crear políticas correctas');
    console.log('CREATE POLICY "Allow authenticated users to view online users" ON online_users');
    console.log('  FOR SELECT TO authenticated USING (true);');
    console.log('');
    console.log('CREATE POLICY "Allow authenticated users to insert their own status" ON online_users');
    console.log('  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);');
    console.log('');
    console.log('CREATE POLICY "Allow authenticated users to update their own status" ON online_users');
    console.log('  FOR UPDATE TO authenticated');
    console.log('  USING (auth.uid() = user_id)');
    console.log('  WITH CHECK (auth.uid() = user_id);');
    console.log('');
    console.log('CREATE POLICY "Allow users to delete their own status" ON online_users');
    console.log('  FOR DELETE TO authenticated USING (auth.uid() = user_id);');
    console.log('');
    console.log('CREATE POLICY "Allow service role to delete inactive users" ON online_users');
    console.log('  FOR DELETE TO service_role USING (true);');
    console.log('');
    console.log('-- FIN DEL SCRIPT --');
    console.log('');
    console.log('3. Después de ejecutar, reinicia tu aplicación');
    console.log('4. Inicia sesión y verifica que funcione');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testWithoutRLS();
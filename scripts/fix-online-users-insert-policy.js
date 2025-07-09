const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para ejecutar SQL directo
async function executeSql(query) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey
    },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL Error: ${error}`);
  }
  
  return response.json();
}

async function fixOnlineUsersInsertPolicy() {
  console.log('🔧 Corrigiendo políticas RLS para online_users...');
  
  try {
    // 1. Eliminar políticas existentes
    console.log('📝 Eliminando políticas existentes...');
    const dropQueries = [
      `DROP POLICY IF EXISTS "Users can update their own online status" ON online_users;`,
      `DROP POLICY IF EXISTS "Users can insert their own online status" ON online_users;`,
      `DROP POLICY IF EXISTS "Users can delete their own online status" ON online_users;`
    ];
    
    for (const query of dropQueries) {
      try {
        await executeSql(query);
        console.log('✅ Política eliminada');
      } catch (error) {
        console.log('⚠️  Error al eliminar política (puede no existir):', error.message);
      }
    }
    
    // 2. Crear nuevas políticas específicas
    console.log('📝 Creando nuevas políticas...');
    
    const createQueries = [
      {
        name: 'INSERT',
        query: `CREATE POLICY "Users can insert their own online status" ON online_users FOR INSERT WITH CHECK (auth.uid() = user_id);`
      },
      {
        name: 'UPDATE', 
        query: `CREATE POLICY "Users can update their own online status" ON online_users FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
      },
      {
        name: 'DELETE',
        query: `CREATE POLICY "Users can delete their own online status" ON online_users FOR DELETE USING (auth.uid() = user_id);`
      }
    ];
    
    for (const { name, query } of createQueries) {
      try {
        await executeSql(query);
        console.log(`✅ Política ${name} creada correctamente`);
      } catch (error) {
        console.error(`❌ Error al crear política ${name}:`, error.message);
      }
    }
    
    console.log('\n✅ Corrección de políticas RLS completada');
    console.log('💡 Los usuarios autenticados ahora pueden insertar, actualizar y eliminar sus registros en online_users');
    
  } catch (error) {
    console.error('❌ Error general:', error);
    
    // Método alternativo: usar SQL directo sin exec_sql
    console.log('\n🔄 Intentando método alternativo...');
    
    try {
      // Crear políticas usando el cliente de Supabase directamente
      console.log('📝 Creando políticas usando método alternativo...');
      
      // Primero, verificar si podemos hacer una consulta simple
      const { data, error } = await supabase
        .from('online_users')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ Error al acceder a la tabla:', error);
      } else {
        console.log('✅ Acceso a tabla confirmado');
        console.log('\n⚠️  NOTA IMPORTANTE:');
        console.log('Las políticas RLS deben configurarse manualmente en el Dashboard de Supabase:');
        console.log('1. Ve a tu proyecto en https://supabase.com/dashboard');
        console.log('2. Navega a Database > Tables > online_users');
        console.log('3. Ve a la pestaña "RLS disabled"');
        console.log('4. Agrega estas políticas:');
        console.log('   - INSERT: auth.uid() = user_id');
        console.log('   - UPDATE: auth.uid() = user_id');
        console.log('   - DELETE: auth.uid() = user_id');
        console.log('   - SELECT: true (ya existe)');
      }
      
    } catch (altError) {
      console.error('❌ Error en método alternativo:', altError);
    }
  }
}

fixOnlineUsersInsertPolicy();
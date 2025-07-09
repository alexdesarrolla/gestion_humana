require('dotenv').config();
// Usar fetch nativo de Node.js (disponible desde v18)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno SUPABASE');
  console.log('Necesitas:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function executeSQL(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function applyRLSPoliciesViaREST() {
  console.log('🔧 Aplicando políticas RLS via REST API...');
  
  try {
    // Script SQL completo
    const fullSQL = `
-- 1. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view all online users" ON online_users;
DROP POLICY IF EXISTS "Users can update their own online status" ON online_users;
DROP POLICY IF EXISTS "Users can insert their own online status" ON online_users;
DROP POLICY IF EXISTS "Users can delete their own online status" ON online_users;
DROP POLICY IF EXISTS "Allow authenticated users to view online users" ON online_users;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own status" ON online_users;
DROP POLICY IF EXISTS "Allow authenticated users to update their own status" ON online_users;
DROP POLICY IF EXISTS "Allow users to delete their own status" ON online_users;
DROP POLICY IF EXISTS "Allow service role to delete inactive users" ON online_users;

-- 2. Habilitar RLS
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para SELECT
CREATE POLICY "Allow authenticated users to view online users" ON online_users
  FOR SELECT 
  TO authenticated
  USING (true);

-- 4. Crear política para INSERT
CREATE POLICY "Allow authenticated users to insert their own status" ON online_users
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. Crear política para UPDATE
CREATE POLICY "Allow authenticated users to update their own status" ON online_users
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Crear política para DELETE (usuarios)
CREATE POLICY "Allow users to delete their own status" ON online_users
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Crear política para DELETE (service role)
CREATE POLICY "Allow service role to delete inactive users" ON online_users
  FOR DELETE 
  TO service_role
  USING (true);
    `;
    
    console.log('\n1️⃣ Ejecutando script SQL completo...');
    
    try {
      await executeSQL(fullSQL);
      console.log('✅ Script SQL ejecutado exitosamente');
    } catch (error) {
      console.log('❌ Error ejecutando script completo:', error.message);
      
      if (error.message.includes('exec_sql')) {
        console.log('\n⚠️  La función exec_sql no está disponible');
        console.log('\n📋 SOLUCIÓN MANUAL REQUERIDA:');
        console.log('1. Ve a Supabase Dashboard > SQL Editor');
        console.log('2. Ejecuta el siguiente script:');
        console.log('\n' + '='.repeat(50));
        console.log(fullSQL);
        console.log('='.repeat(50));
        console.log('\n3. Después de ejecutar, reinicia tu aplicación');
        return;
      }
    }
    
    // Verificar si las políticas se aplicaron
    console.log('\n2️⃣ Verificando políticas aplicadas...');
    
    try {
      const policies = await executeSQL(`
        SELECT policyname, cmd, roles 
        FROM pg_policies 
        WHERE tablename = 'online_users' 
        ORDER BY policyname;
      `);
      
      if (policies && policies.length > 0) {
        console.log('📋 Políticas encontradas:');
        policies.forEach((policy, index) => {
          console.log(`   ${index + 1}. ${policy.policyname} (${policy.cmd}) - ${policy.roles}`);
        });
      } else {
        console.log('⚠️  No se encontraron políticas');
      }
    } catch (error) {
      console.log('⚠️  No se pudieron verificar las políticas:', error.message);
    }
    
    console.log('\n✅ Proceso completado');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Reinicia tu aplicación (Ctrl+C y npm run dev)');
    console.log('2. Inicia sesión en la aplicación');
    console.log('3. Verifica que los usuarios en línea aparezcan');
    
  } catch (error) {
    console.error('❌ Error general:', error);
    
    console.log('\n🔧 SOLUCIÓN MANUAL:');
    console.log('1. Ve a Supabase Dashboard > SQL Editor');
    console.log('2. Ejecuta el contenido completo de: sql/fix_online_users_rls_policies.sql');
    console.log('3. Reinicia tu aplicación');
  }
}

applyRLSPoliciesViaREST();
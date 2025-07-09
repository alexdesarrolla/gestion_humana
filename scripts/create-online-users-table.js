require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function createOnlineUsersTable() {
  try {
    console.log('Connecting to Supabase...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Creating online_users table...');
    
    // Crear la tabla
    const { data: tableData, error: tableError } = await supabase
      .from('online_users')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      console.log('Table does not exist, creating it manually...');
      
      // Usar SQL directo a través de la API REST
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          query: `
            -- Crear tabla para usuarios en línea
            CREATE TABLE IF NOT EXISTS online_users (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
              last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Crear índice único para user_id para evitar duplicados
            CREATE UNIQUE INDEX IF NOT EXISTS idx_online_users_user_id ON online_users(user_id);
            
            -- Crear índice para last_seen_at para consultas eficientes
            CREATE INDEX IF NOT EXISTS idx_online_users_last_seen ON online_users(last_seen_at);
            
            -- Habilitar RLS (Row Level Security)
            ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;
          `
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('Table created successfully!');
      
      // Crear políticas RLS
      const policyResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          query: `
            -- Política para que los usuarios puedan ver todos los usuarios en línea
            DROP POLICY IF EXISTS "Users can view all online users" ON online_users;
            CREATE POLICY "Users can view all online users" ON online_users
              FOR SELECT USING (true);
            
            -- Política para que los usuarios solo puedan actualizar su propio registro
            DROP POLICY IF EXISTS "Users can update their own online status" ON online_users;
            CREATE POLICY "Users can update their own online status" ON online_users
              FOR ALL USING (auth.uid() = user_id);
          `
        })
      });
      
      if (!policyResponse.ok) {
        console.warn('Warning: Could not create RLS policies');
      } else {
        console.log('RLS policies created successfully!');
      }
      
      // Crear funciones
      const functionResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          query: `
            -- Función para limpiar usuarios inactivos
            CREATE OR REPLACE FUNCTION cleanup_inactive_users()
            RETURNS void AS $$
            BEGIN
              DELETE FROM online_users 
              WHERE last_seen_at < NOW() - INTERVAL '2 minutes';
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para actualizar updated_at
            CREATE OR REPLACE FUNCTION update_online_users_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = NOW();
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Trigger para actualizar updated_at automáticamente
            DROP TRIGGER IF EXISTS update_online_users_updated_at_trigger ON online_users;
            CREATE TRIGGER update_online_users_updated_at_trigger
              BEFORE UPDATE ON online_users
              FOR EACH ROW
              EXECUTE FUNCTION update_online_users_updated_at();
          `
        })
      });
      
      if (!functionResponse.ok) {
        console.warn('Warning: Could not create functions and triggers');
      } else {
        console.log('Functions and triggers created successfully!');
      }
      
    } else if (tableError) {
      throw tableError;
    } else {
      console.log('Table already exists!');
    }
    
    // Verificar que la tabla funciona
    console.log('Testing table...');
    const { data: testData, error: testError } = await supabase
      .from('online_users')
      .select('*')
      .limit(1);
    
    if (testError) {
      throw testError;
    }
    
    console.log('✅ online_users table is ready!');
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createOnlineUsersTable();
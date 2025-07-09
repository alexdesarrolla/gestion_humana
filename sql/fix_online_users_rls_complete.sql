-- =====================================================
-- SOLUCIÓN COMPLETA PARA POLÍTICAS RLS DE ONLINE_USERS
-- Fecha: 2024-12-19
-- Descripción: Script completo para resolver el error 42501 de RLS
-- =====================================================

-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Users can view all online users" ON online_users;
DROP POLICY IF EXISTS "Users can update their own online status" ON online_users;
DROP POLICY IF EXISTS "Users can insert their own online status" ON online_users;
DROP POLICY IF EXISTS "Users can delete their own online status" ON online_users;
DROP POLICY IF EXISTS "Allow authenticated users to view online users" ON online_users;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own status" ON online_users;
DROP POLICY IF EXISTS "Allow authenticated users to update their own status" ON online_users;
DROP POLICY IF EXISTS "Allow users to delete their own status" ON online_users;
DROP POLICY IF EXISTS "Allow service role to delete inactive users" ON online_users;
DROP POLICY IF EXISTS "Enable read access for all users" ON online_users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON online_users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON online_users;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON online_users;

-- 2. DESHABILITAR RLS TEMPORALMENTE PARA LIMPIAR
ALTER TABLE online_users DISABLE ROW LEVEL SECURITY;

-- 3. LIMPIAR DATOS EXISTENTES
DELETE FROM online_users;

-- 4. HABILITAR RLS NUEVAMENTE
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- 5. CREAR POLÍTICAS NUEVAS Y CORRECTAS

-- Política SELECT: Permitir que todos los usuarios registrados en usuario_nomina vean usuarios en línea
CREATE POLICY "online_users_select_policy" ON online_users
  FOR SELECT 
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE estado = 'activo'
    )
  );

-- Política INSERT: Permitir que usuarios registrados en usuario_nomina inserten su propio registro
CREATE POLICY "online_users_insert_policy" ON online_users
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE estado = 'activo'
    )
  );

-- Política UPDATE: Permitir que usuarios registrados en usuario_nomina actualicen su propio registro
CREATE POLICY "online_users_update_policy" ON online_users
  FOR UPDATE 
  TO authenticated
  USING (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE estado = 'activo'
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE estado = 'activo'
    )
  );

-- Política DELETE: Permitir que usuarios registrados en usuario_nomina eliminen su propio registro
CREATE POLICY "online_users_delete_policy" ON online_users
  FOR DELETE 
  TO authenticated
  USING (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE estado = 'activo'
    )
  );

-- Política especial para service_role (limpieza automática)
CREATE POLICY "online_users_service_role_policy" ON online_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. VERIFICAR LA ESTRUCTURA DE LA TABLA
-- Asegurar que la tabla tenga la estructura correcta
ALTER TABLE online_users 
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN last_seen_at SET DEFAULT NOW();

-- 7. RECREAR ÍNDICES SI NO EXISTEN
CREATE UNIQUE INDEX IF NOT EXISTS idx_online_users_user_id ON online_users(user_id);
CREATE INDEX IF NOT EXISTS idx_online_users_last_seen ON online_users(last_seen_at);

-- 8. GRANT PERMISOS EXPLÍCITOS
GRANT SELECT, INSERT, UPDATE, DELETE ON online_users TO authenticated;
GRANT ALL ON online_users TO service_role;

-- 9. VERIFICAR LAS POLÍTICAS CREADAS
-- Ejecuta esta consulta para verificar:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'online_users'
-- ORDER BY policyname;

-- 10. INSERTAR UN REGISTRO DE PRUEBA (OPCIONAL)
-- INSERT INTO online_users (user_id, last_seen_at) 
-- VALUES ('00000000-0000-0000-0000-000000000000', NOW())
-- ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW();

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Este script elimina TODAS las políticas existentes
-- 2. Limpia los datos existentes para evitar conflictos
-- 3. Crea políticas con nombres únicos y claros
-- 4. Incluye política especial para service_role
-- 5. Otorga permisos explícitos a los roles
-- 6. Mantiene la integridad referencial con auth.users
-- =====================================================

-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- 1. Reinicia tu aplicación Next.js
-- 2. Verifica que los usuarios aparezcan en línea
-- 3. Revisa los logs del servidor para confirmar que no hay errores RLS
-- =====================================================
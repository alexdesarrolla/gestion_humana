-- =====================================================
-- POLÍTICAS RLS FINALES PARA ONLINE_USERS
-- Fecha: 2024-12-19
-- Descripción: Políticas simplificadas que funcionan para usuarios regulares
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
DROP POLICY IF EXISTS "online_users_select_policy" ON online_users;
DROP POLICY IF EXISTS "online_users_insert_policy" ON online_users;
DROP POLICY IF EXISTS "online_users_update_policy" ON online_users;
DROP POLICY IF EXISTS "online_users_delete_policy" ON online_users;
DROP POLICY IF EXISTS "online_users_service_role_policy" ON online_users;
DROP POLICY IF EXISTS "online_users_select_all" ON online_users;
DROP POLICY IF EXISTS "online_users_insert_flexible" ON online_users;
DROP POLICY IF EXISTS "online_users_update_flexible" ON online_users;
DROP POLICY IF EXISTS "online_users_delete_flexible" ON online_users;
DROP POLICY IF EXISTS "online_users_service_role_all" ON online_users;
DROP POLICY IF EXISTS "online_users_select_simple" ON online_users;
DROP POLICY IF EXISTS "online_users_insert_simple" ON online_users;
DROP POLICY IF EXISTS "online_users_update_simple" ON online_users;
DROP POLICY IF EXISTS "online_users_delete_simple" ON online_users;
DROP POLICY IF EXISTS "online_users_service_role" ON online_users;

-- 2. DESHABILITAR RLS TEMPORALMENTE
ALTER TABLE online_users DISABLE ROW LEVEL SECURITY;

-- 3. LIMPIAR DATOS EXISTENTES
DELETE FROM online_users;

-- 4. HABILITAR RLS
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- 5. CREAR POLÍTICAS SIMPLIFICADAS Y FUNCIONALES

-- Política SELECT: Permitir que todos los usuarios autenticados vean usuarios en línea
CREATE POLICY "online_users_select_final" ON online_users
  FOR SELECT 
  TO authenticated
  USING (true);

-- Política INSERT: Permitir insertar solo su propio registro si está en usuario_nomina
CREATE POLICY "online_users_insert_final" ON online_users
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT auth_user_id 
      FROM usuario_nomina 
      WHERE auth_user_id IS NOT NULL 
      AND estado = 'activo'
    )
  );

-- Política UPDATE: Permitir actualizar solo su propio registro
CREATE POLICY "online_users_update_final" ON online_users
  FOR UPDATE 
  TO authenticated
  USING (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT auth_user_id 
      FROM usuario_nomina 
      WHERE auth_user_id IS NOT NULL 
      AND estado = 'activo'
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT auth_user_id 
      FROM usuario_nomina 
      WHERE auth_user_id IS NOT NULL 
      AND estado = 'activo'
    )
  );

-- Política DELETE: Permitir eliminar solo su propio registro
CREATE POLICY "online_users_delete_final" ON online_users
  FOR DELETE 
  TO authenticated
  USING (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT auth_user_id 
      FROM usuario_nomina 
      WHERE auth_user_id IS NOT NULL 
      AND estado = 'activo'
    )
  );

-- Política especial para service_role (limpieza automática)
CREATE POLICY "online_users_service_role_final" ON online_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. CONFIGURAR PERMISOS EXPLÍCITOS
GRANT SELECT, INSERT, UPDATE, DELETE ON online_users TO authenticated;
GRANT ALL ON online_users TO service_role;

-- 7. ASEGURAR ESTRUCTURA DE TABLA
ALTER TABLE online_users 
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN last_seen_at SET DEFAULT NOW();

-- 8. RECREAR ÍNDICES
CREATE UNIQUE INDEX IF NOT EXISTS idx_online_users_user_id ON online_users(user_id);
CREATE INDEX IF NOT EXISTS idx_online_users_last_seen ON online_users(last_seen_at);

-- 9. COMENTARIOS
COMMENT ON TABLE online_users IS 'Tabla para rastrear usuarios activos en línea - RLS habilitado';
COMMENT ON COLUMN online_users.user_id IS 'ID del usuario de auth.users';
COMMENT ON COLUMN online_users.last_seen_at IS 'Última vez que el usuario fue visto activo';

-- =====================================================
-- VERIFICACIÓN DE POLÍTICAS
-- Ejecuta esta consulta para verificar las políticas creadas:
-- =====================================================
/*
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'online_users'
ORDER BY policyname;
*/

-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================
-- 1. Ejecutar este script completo en Supabase Dashboard > SQL Editor
-- 2. Verificar que las políticas se crearon correctamente
-- 3. Reiniciar la aplicación Next.js
-- 4. Probar con usuarios reales que tengan auth_user_id válido
-- 5. Los usuarios sin auth_user_id deben completar validación en /validacion
-- =====================================================

-- Mensaje de confirmación
SELECT 'Políticas RLS aplicadas exitosamente para online_users' as resultado;
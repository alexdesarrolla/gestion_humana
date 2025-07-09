-- =====================================================
-- SOLUCIÓN FLEXIBLE PARA POLÍTICAS RLS DE ONLINE_USERS
-- Fecha: 2024-12-19
-- Descripción: Políticas RLS que funcionan para todos los usuarios
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

-- 2. DESHABILITAR RLS TEMPORALMENTE PARA LIMPIAR
ALTER TABLE online_users DISABLE ROW LEVEL SECURITY;

-- 3. LIMPIAR DATOS EXISTENTES
DELETE FROM online_users;

-- 4. HABILITAR RLS NUEVAMENTE
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- 5. CREAR POLÍTICAS FLEXIBLES

-- Política SELECT: Permitir que todos los usuarios autenticados vean usuarios en línea
-- (sin restricciones adicionales para máxima compatibilidad)
CREATE POLICY "online_users_select_all" ON online_users
  FOR SELECT 
  TO authenticated
  USING (true);

-- Política INSERT: Permitir que usuarios autenticados inserten su propio registro
-- Verificar que el usuario existe en usuario_nomina O que es el mismo auth.uid()
CREATE POLICY "online_users_insert_flexible" ON online_users
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Usuario ha completado validación
      auth.uid() IN (SELECT auth_user_id FROM usuario_nomina WHERE auth_user_id IS NOT NULL AND estado = 'activo')
      OR
      -- Usuario existe en usuario_nomina pero no ha completado validación
      EXISTS (
        SELECT 1 FROM usuario_nomina 
        WHERE correo_electronico = auth.email() AND estado = 'activo'
      )
    )
  );

-- Política UPDATE: Permitir que usuarios autenticados actualicen su propio registro
CREATE POLICY "online_users_update_flexible" ON online_users
  FOR UPDATE 
  TO authenticated
  USING (
    auth.uid() = user_id AND (
      -- Usuario ha completado validación
      auth.uid() IN (SELECT auth_user_id FROM usuario_nomina WHERE auth_user_id IS NOT NULL AND estado = 'activo')
      OR
      -- Usuario existe en usuario_nomina pero no ha completado validación
      EXISTS (
        SELECT 1 FROM usuario_nomina 
        WHERE correo_electronico = auth.email() AND estado = 'activo'
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Usuario ha completado validación
      auth.uid() IN (SELECT auth_user_id FROM usuario_nomina WHERE auth_user_id IS NOT NULL AND estado = 'activo')
      OR
      -- Usuario existe en usuario_nomina pero no ha completado validación
      EXISTS (
        SELECT 1 FROM usuario_nomina 
        WHERE correo_electronico = auth.email() AND estado = 'activo'
      )
    )
  );

-- Política DELETE: Permitir que usuarios autenticados eliminen su propio registro
CREATE POLICY "online_users_delete_flexible" ON online_users
  FOR DELETE 
  TO authenticated
  USING (
    auth.uid() = user_id AND (
      -- Usuario ha completado validación
      auth.uid() IN (SELECT auth_user_id FROM usuario_nomina WHERE auth_user_id IS NOT NULL AND estado = 'activo')
      OR
      -- Usuario existe en usuario_nomina pero no ha completado validación
      EXISTS (
        SELECT 1 FROM usuario_nomina 
        WHERE correo_electronico = auth.email() AND estado = 'activo'
      )
    )
  );

-- Política especial para service_role (limpieza automática)
CREATE POLICY "online_users_service_role_all" ON online_users
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

-- 10. COMENTARIOS EXPLICATIVOS
COMMENT ON TABLE online_users IS 'Tabla para rastrear usuarios activos en línea';
COMMENT ON COLUMN online_users.user_id IS 'ID del usuario de auth.users';
COMMENT ON COLUMN online_users.last_seen_at IS 'Última vez que el usuario fue visto activo';

-- =====================================================
-- INSTRUCCIONES DE USO:
-- 1. Ejecutar este script en Supabase Dashboard > SQL Editor
-- 2. Reiniciar la aplicación Next.js
-- 3. Probar con usuarios que han completado validación
-- 4. Los usuarios sin validar deben ir a /validacion
-- =====================================================
-- Script para configurar correctamente las políticas RLS de la tabla online_users
-- Este script debe ejecutarse en el SQL Editor de Supabase Dashboard

-- 1. Eliminar todas las políticas existentes para empezar limpio
DROP POLICY IF EXISTS "Users can view all online users" ON online_users;
DROP POLICY IF EXISTS "Users can update their own online status" ON online_users;
DROP POLICY IF EXISTS "Users can insert their own online status" ON online_users;
DROP POLICY IF EXISTS "Users can delete their own online status" ON online_users;

-- 2. Asegurar que RLS esté habilitado
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para SELECT - Permitir que todos los usuarios autenticados vean usuarios en línea
CREATE POLICY "Allow authenticated users to view online users" ON online_users
  FOR SELECT 
  TO authenticated
  USING (true);

-- 4. Crear política para INSERT - Permitir que usuarios autenticados inserten su propio registro
CREATE POLICY "Allow authenticated users to insert their own status" ON online_users
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. Crear política para UPDATE - Permitir que usuarios autenticados actualicen su propio registro
CREATE POLICY "Allow authenticated users to update their own status" ON online_users
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Crear política para DELETE - Permitir que usuarios autenticados eliminen su propio registro
-- También permitir eliminación para limpieza automática (usando service_role)
CREATE POLICY "Allow users to delete their own status" ON online_users
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Política adicional para permitir limpieza automática con service_role
CREATE POLICY "Allow service role to delete inactive users" ON online_users
  FOR DELETE 
  TO service_role
  USING (true);

-- 8. Verificar las políticas creadas
-- Ejecuta esta consulta para ver todas las políticas:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'online_users';

-- Comentarios importantes:
-- - TO authenticated: Especifica que las políticas se aplican solo a usuarios autenticados
-- - TO service_role: Permite operaciones del service role para limpieza automática
-- - auth.uid() = user_id: Asegura que los usuarios solo puedan modificar sus propios registros
-- - USING y WITH CHECK: USING controla qué filas se pueden leer/modificar, WITH CHECK controla qué valores se pueden insertar/actualizar
-- - La política de SELECT permite ver todos los usuarios en línea (necesario para el contador)
-- - Las políticas de INSERT/UPDATE/DELETE están restringidas al propio usuario
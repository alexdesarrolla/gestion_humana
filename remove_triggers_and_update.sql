-- Script para eliminar triggers problemáticos y actualizar roles
-- Ejecutar este script MANUALMENTE en el SQL Editor de Supabase

-- 1. Eliminar triggers que causan problemas con usuario_permisos
DROP TRIGGER IF EXISTS trigger_asignar_permisos_administrador ON usuario_nomina;
DROP TRIGGER IF EXISTS trigger_limpiar_permisos_no_admin ON usuario_nomina;
DROP TRIGGER IF EXISTS trigger_limpiar_permisos_no_moderador ON usuario_nomina;

-- 2. Eliminar funciones asociadas a los triggers
DROP FUNCTION IF EXISTS asignar_permisos_administrador();
DROP FUNCTION IF EXISTS limpiar_permisos_no_admin();
DROP FUNCTION IF EXISTS limpiar_permisos_no_moderador();

-- 3. Eliminar el constraint restrictivo del campo rol
ALTER TABLE usuario_nomina 
DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;

-- 4. Actualizar roles de moderador a usuario
UPDATE usuario_nomina 
SET rol = 'usuario' 
WHERE rol = 'moderador';

-- 5. Verificar que no quedan usuarios moderadores
SELECT 
    COUNT(*) as usuarios_moderadores_restantes
FROM usuario_nomina 
WHERE rol = 'moderador';

-- 6. Mostrar distribución final de roles
SELECT 
    rol,
    COUNT(*) as cantidad_usuarios
FROM usuario_nomina 
GROUP BY rol
ORDER BY rol;

-- 7. Verificar que no hay triggers relacionados con rol
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'usuario_nomina'
AND (action_statement LIKE '%rol%' OR action_statement LIKE '%permisos%');

-- 8. Mensaje de confirmación
SELECT 'Triggers eliminados y roles actualizados exitosamente' as mensaje;
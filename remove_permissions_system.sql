-- Script para eliminar completamente el sistema de permisos granulares
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

-- 5. Eliminar tabla usuario_permisos completamente
DROP TABLE IF EXISTS usuario_permisos CASCADE;

-- 6. Eliminar tabla modulos si existe (ya que no se usa sin permisos granulares)
DROP TABLE IF EXISTS modulos CASCADE;

-- 7. Verificar que no quedan usuarios moderadores
SELECT 
    COUNT(*) as usuarios_moderadores_restantes
FROM usuario_nomina 
WHERE rol = 'moderador';

-- 8. Mostrar distribución final de roles
SELECT 
    rol,
    COUNT(*) as cantidad_usuarios
FROM usuario_nomina 
GROUP BY rol
ORDER BY rol;

-- 9. Verificar que no hay triggers relacionados con permisos
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'usuario_nomina'
AND (action_statement LIKE '%rol%' OR action_statement LIKE '%permisos%');

-- 10. Verificar que las tablas fueron eliminadas
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usuario_permisos', 'modulos');

-- 11. Mensaje de confirmación
SELECT 'Sistema de permisos granulares eliminado exitosamente. Solo quedan roles básicos: usuario y administrador' as mensaje;
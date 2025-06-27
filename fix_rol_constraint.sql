-- Script para eliminar el constraint restrictivo del campo rol
-- y permitir que sea un campo de texto libre
-- Ejecutar este script MANUALMENTE en el SQL Editor de Supabase

-- 1. Eliminar el constraint restrictivo del campo rol
ALTER TABLE usuario_nomina 
DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;

-- 2. Verificar que el constraint fue eliminado
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'usuario_nomina'::regclass 
AND conname LIKE '%rol%';

-- 3. Verificar los roles actuales en la tabla
SELECT 
    rol,
    COUNT(*) as cantidad_usuarios
FROM usuario_nomina 
GROUP BY rol
ORDER BY rol;

-- 4. Mensaje de confirmación
SELECT 'Constraint de rol eliminado exitosamente. El campo rol ahora es texto libre.' as mensaje;
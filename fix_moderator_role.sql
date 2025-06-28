-- Script para corregir el rol de moderador y eliminar triggers problemáticos
-- Ejecutar este script COMPLETO en el SQL Editor de Supabase

-- 1. Eliminar triggers que causan problemas con la tabla usuario_permisos
DROP TRIGGER IF EXISTS trigger_asignar_permisos_administrador ON usuario_nomina;
DROP TRIGGER IF EXISTS trigger_limpiar_permisos_no_admin ON usuario_nomina;
DROP FUNCTION IF EXISTS asignar_permisos_administrador();
DROP FUNCTION IF EXISTS limpiar_permisos_no_admin();

-- 2. Verificar usuarios con rol moderador antes de la actualización
SELECT 
    'ANTES DE LA ACTUALIZACIÓN:' as estado,
    id,
    colaborador,
    rol,
    estado as estado_usuario
FROM usuario_nomina 
WHERE rol = 'moderador';

-- 3. Actualizar usuarios moderadores a usuarios normales
UPDATE usuario_nomina 
SET rol = 'usuario' 
WHERE rol = 'moderador';

-- 4. Eliminar constraint anterior de roles
ALTER TABLE usuario_nomina 
DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;

-- 5. Agregar constraint correcto que solo permite 'usuario' y 'administrador'
ALTER TABLE usuario_nomina 
ADD CONSTRAINT usuario_nomina_rol_check 
CHECK (rol IN ('usuario', 'administrador'));

-- 6. Verificar que no quedan usuarios con rol moderador
SELECT 
    'DESPUÉS DE LA ACTUALIZACIÓN:' as estado,
    id,
    colaborador,
    rol,
    estado as estado_usuario
FROM usuario_nomina 
WHERE rol = 'moderador';

-- 7. Mostrar resumen final de todos los roles
SELECT 
    'RESUMEN FINAL DE ROLES:' as titulo,
    rol,
    COUNT(*) as cantidad_usuarios
FROM usuario_nomina 
GROUP BY rol
ORDER BY rol;

-- 8. Mensaje de confirmación
SELECT 
    '✅ CORRECCIÓN COMPLETADA' as resultado,
    'El usuario MARIO ALEXANDER AVELLANEDA BUITRAGO ahora tiene rol "usuario"' as detalle,
    'Ya no habrá errores al intentar editarlo' as beneficio;
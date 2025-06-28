-- Script simplificado para corregir el rol de moderador
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar usuarios con rol moderador antes de la actualización
SELECT 
    'ANTES DE LA ACTUALIZACIÓN:' as estado,
    id,
    colaborador,
    rol,
    estado as estado_usuario
FROM usuario_nomina 
WHERE rol = 'moderador';

-- 2. Eliminar constraint anterior de roles (si existe)
ALTER TABLE usuario_nomina 
DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;

-- 3. Actualizar usuarios moderadores a usuarios normales
UPDATE usuario_nomina 
SET rol = 'usuario' 
WHERE rol = 'moderador';

-- 4. Agregar constraint correcto que solo permite 'usuario' y 'administrador'
ALTER TABLE usuario_nomina 
ADD CONSTRAINT usuario_nomina_rol_check 
CHECK (rol IN ('usuario', 'administrador'));

-- 5. Verificar que no quedan usuarios con rol moderador
SELECT 
    'DESPUÉS DE LA ACTUALIZACIÓN:' as estado,
    id,
    colaborador,
    rol,
    estado as estado_usuario
FROM usuario_nomina 
WHERE rol = 'moderador';

-- 6. Mostrar resumen final de todos los roles
SELECT 
    'RESUMEN FINAL DE ROLES:' as titulo,
    rol,
    COUNT(*) as cantidad_usuarios
FROM usuario_nomina 
GROUP BY rol
ORDER BY rol;

-- 7. Mensaje de confirmación
SELECT 
    '✅ CORRECCIÓN COMPLETADA' as resultado,
    'El usuario MARIO ALEXANDER AVELLANEDA BUITRAGO ahora tiene rol "usuario"' as detalle,
    'Ya no habrá errores al intentar editarlo' as beneficio;
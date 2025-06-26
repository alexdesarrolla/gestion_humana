-- Script para asignar permisos completos de administrador al usuario ID 607
-- Fecha: $(date)
-- Descripción: Corregir permisos del usuario administrador principal
-- NOTA: Ejecutar después de aplicar la migración 022_create_permissions_system.sql actualizada

BEGIN;

-- 1. Verificar que el usuario existe y actualizar su rol a administrador
UPDATE usuario_nomina 
SET rol = 'administrador'
WHERE id = 607;

-- 2. Eliminar permisos existentes del usuario para evitar conflictos
DELETE FROM usuario_permisos 
WHERE usuario_id = (
    SELECT auth_user_id 
    FROM usuario_nomina 
    WHERE id = 607
);

-- 3. Asignar todos los permisos completos al usuario 607
INSERT INTO usuario_permisos (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT 
    u.auth_user_id,
    m.id,
    true,  -- puede_ver
    true,  -- puede_crear
    true,  -- puede_editar
    true   -- puede_eliminar
FROM usuario_nomina u
CROSS JOIN modulos m
WHERE u.id = 607 AND m.activo = true
ON CONFLICT (usuario_id, modulo_id) 
DO UPDATE SET 
    puede_ver = true,
    puede_crear = true,
    puede_editar = true,
    puede_eliminar = true,
    updated_at = NOW();

-- 4. Verificar que los permisos se asignaron correctamente
SELECT 
    u.id as usuario_id,
    u.colaborador,
    u.rol,
    m.nombre as modulo,
    up.puede_ver,
    up.puede_crear,
    up.puede_editar,
    up.puede_eliminar
FROM usuario_nomina u
JOIN usuario_permisos up ON u.auth_user_id = up.usuario_id
JOIN modulos m ON up.modulo_id = m.id
WHERE u.id = 607
ORDER BY m.orden;

COMMIT;

-- Mensaje de confirmación
SELECT 'Permisos de administrador asignados correctamente al usuario ID 607' as resultado;
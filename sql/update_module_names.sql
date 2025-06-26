-- Script para actualizar nombres de módulos existentes
-- Fecha: $(date)
-- Descripción: Corregir nombres de módulos para que coincidan con el sidebar

BEGIN;

-- 1. Eliminar módulos existentes para evitar conflictos
DELETE FROM usuario_permisos;
DELETE FROM modulos;

-- 2. Insertar módulos con nombres correctos
INSERT INTO modulos (nombre, descripcion, ruta, icono, orden) VALUES
('escritorio', 'Panel principal de administración', '/administracion', 'Home', 1),
('usuarios', 'Gestión de usuarios del sistema', '/administracion/usuarios', 'User', 2),
('cargos', 'Gestión de cargos de la empresa', '/administracion/usuarios/cargos', 'FileText', 3),
('solicitudes', 'Gestión de solicitudes', '/administracion/solicitudes', 'FileText', 4),
('comunicados', 'Gestión de comunicados', '/administracion/comunicados', 'Newspaper', 5),
('novedades', 'Gestión de novedades', '/administracion/novedades', 'FaFileAlt', 6),
('perfil', 'Gestión del perfil personal', '/administracion/perfil', 'Info', 7);

-- 3. Asignar permisos completos a todos los administradores existentes
INSERT INTO usuario_permisos (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT u.auth_user_id, m.id, true, true, true, true
FROM usuario_nomina u
CROSS JOIN modulos m
WHERE u.rol = 'administrador' AND m.activo = true;

-- 4. Verificar módulos creados
SELECT * FROM modulos ORDER BY orden;

-- 5. Verificar permisos asignados a administradores
SELECT 
    u.id as usuario_id,
    u.nombre_completo,
    u.rol,
    m.nombre as modulo,
    up.puede_ver,
    up.puede_crear,
    up.puede_editar,
    up.puede_eliminar
FROM usuario_nomina u
JOIN usuario_permisos up ON u.auth_user_id = up.usuario_id
JOIN modulos m ON up.modulo_id = m.id
WHERE u.rol = 'administrador'
ORDER BY u.id, m.orden;

COMMIT;

-- Mensaje de confirmación
SELECT 'Módulos actualizados y permisos reasignados correctamente' as resultado;
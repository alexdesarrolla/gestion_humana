-- Script para corregir los datos de permisos existentes
-- El problema es que usuario_permisos.usuario_id debe referenciar usuario_nomina.id, no auth_user_id

BEGIN;

-- 1. Eliminar todos los permisos existentes que pueden estar mal referenciados
DELETE FROM usuario_permisos;

-- 2. Insertar permisos correctos para administradores
-- Usar usuario_nomina.id en lugar de auth_user_id
INSERT INTO usuario_permisos (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT u.id, m.id, true, true, true, true
FROM usuario_nomina u
CROSS JOIN modulos m
WHERE u.rol = 'administrador' AND m.activo = true
ON CONFLICT (usuario_id, modulo_id) DO NOTHING;

-- 3. Los usuarios normales no tienen permisos especiales de administración

-- 4. Actualizar las funciones para usar el ID correcto
CREATE OR REPLACE FUNCTION asignar_permisos_administrador()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo procesar si el rol cambió a administrador o si es un nuevo administrador
    IF NEW.rol = 'administrador' AND (TG_OP = 'INSERT' OR OLD.rol != 'administrador') THEN
        -- Eliminar permisos existentes para evitar duplicados
        DELETE FROM usuario_permisos WHERE usuario_id = NEW.id;
        
        -- Insertar todos los permisos para el administrador
        INSERT INTO usuario_permisos (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
        SELECT NEW.id, m.id, true, true, true, true
        FROM modulos m
        WHERE m.activo = true;
        
        -- Actualizar timestamp
        NEW.updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Actualizar función de limpieza
CREATE OR REPLACE FUNCTION limpiar_permisos_no_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el usuario ya no es administrador, eliminar sus permisos
    IF OLD.rol = 'administrador' AND NEW.rol = 'usuario' THEN
        DELETE FROM usuario_permisos WHERE usuario_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
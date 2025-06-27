-- Script para eliminar el rol de moderador del sistema
-- Convierte todos los moderadores a usuarios normales

BEGIN;

-- 1. Actualizar todos los usuarios con rol 'moderador' a 'usuario'
UPDATE usuario_nomina 
SET rol = 'usuario'
WHERE rol = 'moderador';

-- 2. Verificar si la tabla usuario_permisos existe antes de eliminar
-- (La tabla puede no existir si no se ha migrado el sistema de permisos)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuario_permisos') THEN
        DELETE FROM usuario_permisos 
        WHERE usuario_id IN (
            SELECT auth_user_id 
            FROM usuario_nomina 
            WHERE rol = 'usuario' 
            AND auth_user_id IS NOT NULL
        );
        RAISE NOTICE 'Permisos de ex-moderadores eliminados de usuario_permisos';
    ELSE
        RAISE NOTICE 'Tabla usuario_permisos no existe, saltando eliminación de permisos';
    END IF;
END $$;

-- 3. Actualizar el constraint de roles para eliminar 'moderador'
ALTER TABLE usuario_nomina 
DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;

ALTER TABLE usuario_nomina 
ADD CONSTRAINT usuario_nomina_rol_check 
CHECK (rol IN ('usuario', 'administrador'));

-- 4. Eliminar funciones y triggers relacionados con moderador si existen
DROP TRIGGER IF EXISTS trigger_limpiar_permisos_no_moderador ON usuario_nomina;
DROP FUNCTION IF EXISTS limpiar_permisos_no_moderador();

-- 5. Crear nueva función y trigger para administradores únicamente
CREATE OR REPLACE FUNCTION limpiar_permisos_no_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el usuario ya no es administrador, eliminar sus permisos
    IF OLD.rol = 'administrador' AND NEW.rol = 'usuario' THEN
        -- Verificar si la tabla usuario_permisos existe antes de eliminar
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuario_permisos') THEN
            DELETE FROM usuario_permisos WHERE usuario_id = NEW.auth_user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_limpiar_permisos_no_admin
    AFTER UPDATE OF rol ON usuario_nomina
    FOR EACH ROW
    EXECUTE FUNCTION limpiar_permisos_no_admin();

COMMIT;

-- Mostrar resumen de cambios
SELECT 
    'Usuarios por rol' as categoria,
    rol,
    COUNT(*) as cantidad
FROM usuario_nomina 
GROUP BY rol
ORDER BY rol;
-- Script final para corregir el rol de moderador
-- Ejecutar paso a paso en el SQL Editor de Supabase

-- PASO 1: Eliminar todas las funciones y triggers relacionados con usuario_permisos
DROP TRIGGER IF EXISTS trigger_asignar_permisos_administrador ON usuario_nomina CASCADE;
DROP TRIGGER IF EXISTS trigger_limpiar_permisos_no_admin ON usuario_nomina CASCADE;
DROP TRIGGER IF EXISTS trigger_limpiar_permisos_no_moderador ON usuario_nomina CASCADE;

DROP FUNCTION IF EXISTS asignar_permisos_administrador() CASCADE;
DROP FUNCTION IF EXISTS limpiar_permisos_no_admin() CASCADE;
DROP FUNCTION IF EXISTS limpiar_permisos_no_moderador() CASCADE;

-- PASO 2: Verificar usuarios con rol moderador
SELECT 'USUARIOS CON ROL MODERADOR:' as info, id, colaborador, rol FROM usuario_nomina WHERE rol = 'moderador';

-- PASO 3: Eliminar constraint de roles existente
ALTER TABLE usuario_nomina DROP CONSTRAINT IF EXISTS usuario_nomina_rol_check;
ALTER TABLE usuario_nomina DROP CONSTRAINT IF EXISTS check_rol;
ALTER TABLE usuario_nomina DROP CONSTRAINT IF EXISTS usuario_nomina_rol_constraint;

-- PASO 4: Actualizar directamente el rol sin triggers
UPDATE usuario_nomina SET rol = 'usuario' WHERE rol = 'moderador';

-- PASO 5: Verificar que se actualizó
SELECT 'DESPUÉS DE ACTUALIZAR:' as info, id, colaborador, rol FROM usuario_nomina WHERE id = 604;

-- PASO 6: Agregar constraint final
ALTER TABLE usuario_nomina ADD CONSTRAINT usuario_nomina_rol_check CHECK (rol IN ('usuario', 'administrador'));

-- PASO 7: Verificación final
SELECT 'RESUMEN FINAL:' as titulo, rol, COUNT(*) as cantidad FROM usuario_nomina GROUP BY rol ORDER BY rol;

SELECT '✅ CORRECCIÓN COMPLETADA - Usuario 604 ahora es usuario normal' as resultado;
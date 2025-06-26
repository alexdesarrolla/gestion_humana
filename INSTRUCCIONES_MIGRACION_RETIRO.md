# Migración: Agregar Campos de Retiro a Usuario Nómina

## Descripción
Esta migración agrega dos nuevos campos a la tabla `usuario_nomina` para manejar información de usuarios inactivos:
- `motivo_retiro`: Campo de texto para especificar el motivo del retiro
- `fecha_retiro`: Campo de fecha para registrar cuándo se retiró el usuario

## Instrucciones para Ejecutar la Migración

### Opción 1: Ejecutar en el Panel de Supabase
1. Accede al panel de administración de Supabase
2. Ve a la sección "SQL Editor"
3. Copia y pega el siguiente SQL:

```sql
-- Agregar campo motivo_retiro
ALTER TABLE usuario_nomina
ADD COLUMN motivo_retiro TEXT;

-- Agregar campo fecha_retiro
ALTER TABLE usuario_nomina
ADD COLUMN fecha_retiro DATE;

-- Crear índice para mejorar el rendimiento en consultas por fecha de retiro
CREATE INDEX idx_usuario_nomina_fecha_retiro ON usuario_nomina(fecha_retiro);

-- Comentarios descriptivos de las columnas
COMMENT ON COLUMN usuario_nomina.motivo_retiro IS 'Motivo del retiro del usuario (solo para usuarios inactivos)';
COMMENT ON COLUMN usuario_nomina.fecha_retiro IS 'Fecha de retiro del usuario (solo para usuarios inactivos)';
```

4. Ejecuta el SQL haciendo clic en "Run"

### Opción 2: Verificar que la Migración se Ejecutó
Para verificar que los campos se agregaron correctamente, ejecuta:

```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'usuario_nomina' AND column_name IN ('motivo_retiro', 'fecha_retiro');
```

## Cambios en la Aplicación

### Archivos Modificados:
1. **sql/migrations/021_add_retiro_fields_to_usuario_nomina.sql** - Nueva migración
2. **app/administracion/usuarios/page.tsx** - Formulario actualizado con nuevos campos

### Funcionalidad Agregada:
- Los campos `motivo_retiro` y `fecha_retiro` aparecen en el formulario de edición de usuarios
- Los campos solo se muestran cuando el estado del usuario es "inactivo"
- Los campos se guardan automáticamente cuando se actualiza un usuario inactivo
- Los campos se limpian automáticamente cuando un usuario cambia de "inactivo" a "activo"

## Uso de los Nuevos Campos

1. **Para marcar un usuario como inactivo:**
   - Ve a Administración > Usuarios
   - Haz clic en "Editar" en el usuario deseado
   - Cambia el estado a "Inactivo"
   - Aparecerán los campos "Motivo de Retiro" y "Fecha de Retiro"
   - Completa la información y guarda

2. **Para reactivar un usuario:**
   - Cambia el estado a "Activo"
   - Los campos de retiro se ocultarán y se limpiarán automáticamente

## Notas Técnicas
- Los campos son opcionales (nullable)
- Solo se guardan cuando el estado es "inactivo"
- Se incluye un índice en `fecha_retiro` para optimizar consultas
- Los campos tienen comentarios descriptivos en la base de datos
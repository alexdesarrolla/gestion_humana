# Sistema de Permisos Simplificado

## Resumen de Cambios

Se ha simplificado el sistema de permisos granulares para resolver los errores persistentes relacionados con la tabla `usuario_permisos` que no existía. El sistema ahora funciona únicamente con roles básicos.

## Problema Original

- El sistema intentaba usar una tabla `usuario_permisos` que no existía
- Había triggers que causaban errores al intentar acceder a esta tabla
- Un usuario con rol 'moderador' no podía ser actualizado debido a constraints restrictivos
- El sistema de permisos granulares era complejo y no se estaba utilizando completamente

## Solución Implementada

### 1. Eliminación del Sistema de Permisos Granulares

**Archivos modificados:**
- `hooks/use-permissions.ts` - Simplificado para usar solo roles
- `components/ui/permissions-manager.tsx` - Convertido en componente informativo
- `app/administracion/usuarios/page.tsx` - Eliminadas referencias a usuario_permisos

**Scripts creados:**
- `remove_permissions_system.sql` - Elimina tablas y triggers problemáticos
- `verify_simplified_system.js` - Verifica que el sistema funcione correctamente

### 2. Sistema de Roles Simplificado

#### Roles Disponibles:
- **administrador**: Acceso completo a todas las funciones
- **usuario**: Acceso limitado a su perfil y solicitudes

#### Permisos por Rol:

**Administrador:**
- Acceso a `/administracion/*` (todas las rutas administrativas)
- Puede gestionar usuarios, comunicados, solicitudes, etc.
- Acceso completo de lectura, creación, edición y eliminación

**Usuario:**
- Acceso a `/perfil/*` (rutas de perfil personal)
- Puede ver y crear solicitudes propias
- Puede ver comunicados y novedades
- No puede editar ni eliminar (excepto sus propias solicitudes)

## Instrucciones de Implementación

### Paso 1: Ejecutar Script SQL

1. Abrir Supabase SQL Editor
2. Ejecutar el contenido de `remove_permissions_system.sql`
3. Verificar que no hay errores

### Paso 2: Verificar el Sistema

```bash
node verify_simplified_system.js
```

Este script verificará:
- No hay usuarios con rol 'moderador'
- Las tablas de permisos fueron eliminadas
- No hay triggers problemáticos
- Los roles están distribuidos correctamente

### Paso 3: Probar la Aplicación

1. Iniciar la aplicación
2. Probar login con usuario administrador
3. Probar login con usuario regular
4. Verificar que no hay errores en consola

## Funciones del Hook `usePermissions`

```typescript
const {
  userData,        // Datos del usuario actual
  loading,         // Estado de carga
  error,           // Errores
  canAccess,       // Verificar acceso a ruta
  hasPermission,   // Verificar permiso específico
  isAdministrator, // Es administrador
  isAdmin,         // Alias de isAdministrator
  refreshPermissions // Recargar datos
} = usePermissions()
```

### Ejemplos de Uso:

```typescript
// Verificar si puede acceder a una ruta
if (canAccess('/administracion/usuarios')) {
  // Mostrar enlace de administración
}

// Verificar permiso específico
if (hasPermission('/perfil/solicitudes', 'crear')) {
  // Mostrar botón de crear solicitud
}

// Verificar si es administrador
if (isAdmin()) {
  // Mostrar opciones de administrador
}
```

## Rutas y Permisos

### Rutas de Administrador:
- `/administracion/*` - Todas las rutas administrativas

### Rutas de Usuario:
- `/perfil` - Perfil personal
- `/perfil/solicitudes` - Solicitudes personales
- `/perfil/comunicados` - Comunicados
- `/perfil/novedades` - Novedades

## Beneficios del Sistema Simplificado

1. **Eliminación de Errores**: No más errores de `usuario_permisos`
2. **Simplicidad**: Fácil de entender y mantener
3. **Rendimiento**: Menos consultas a la base de datos
4. **Mantenibilidad**: Código más limpio y directo
5. **Escalabilidad**: Fácil agregar nuevos roles si es necesario

## Migración de Datos

- Todos los usuarios con rol 'moderador' se convierten a 'usuario'
- Los roles 'administrador' y 'usuario' se mantienen
- No se pierden datos de usuarios

## Consideraciones Futuras

Si en el futuro se necesita un sistema de permisos más granular:

1. Se puede implementar una tabla de permisos más simple
2. Se pueden agregar más roles específicos
3. Se puede implementar permisos por funcionalidad específica

Pero por ahora, el sistema simplificado cubre todas las necesidades actuales del proyecto.

## Archivos Afectados

### Modificados:
- `hooks/use-permissions.ts`
- `components/ui/permissions-manager.tsx`
- `app/administracion/usuarios/page.tsx`

### Creados:
- `remove_permissions_system.sql`
- `verify_simplified_system.js`
- `SISTEMA_SIMPLIFICADO.md` (este archivo)

### Obsoletos (pueden eliminarse):
- Scripts relacionados con `usuario_permisos`
- Migraciones de permisos granulares
- Archivos de verificación de permisos complejos
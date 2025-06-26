# Eliminación del Rol Moderador

Este documento describe los cambios realizados para eliminar el rol de moderador del sistema, manteniendo únicamente los roles de **usuario** y **administrador**.

## Cambios Realizados

### 1. Archivos de Frontend Actualizados

- **`components/ui/sidebar.tsx`**: Eliminada lógica de menús de moderador, ahora solo maneja menús de administrador
- **`app/middleware.ts`**: Simplificado el control de acceso, solo administradores pueden acceder a rutas de administración
- **`components/ui/profile-card.tsx`**: Eliminadas pestañas y referencias a permisos de moderador
- **`hooks/use-permissions.ts`**: Actualizado el tipo de rol y eliminada función `isModerator`
- **`app/administracion/usuarios/page.tsx`**: Eliminadas opciones de moderador en selectores y filtros
- **`components/ui/permissions-manager.tsx`**: Actualizado texto descriptivo

### 2. Archivos de Base de Datos Actualizados

- **`sql/migrations/022_create_permissions_system.sql`**: Actualizado constraint de roles y funciones
- **`fix_permissions_data.sql`**: Eliminada lógica de permisos para moderadores
- **`fix_permissions.js`**: Eliminada creación de permisos para moderadores
- **`find_auth_users.js`**: Actualizado para buscar solo administradores
- **`run_permissions_migration.js`**: Actualizado mensaje de resumen

### 3. Nuevos Archivos Creados

- **`sql/remove_moderator_role.sql`**: Script SQL para limpiar la base de datos
- **`migrate_remove_moderator.js`**: Script Node.js para migrar datos existentes

## Pasos para Completar la Migración

### Paso 1: Ejecutar Script de Migración de Datos

```bash
node migrate_remove_moderator.js
```

Este script:
- Identifica todos los usuarios con rol 'moderador'
- Los convierte a usuarios normales
- Elimina sus permisos especiales
- Muestra un resumen de los cambios

### Paso 2: Ejecutar Script SQL

Ejecuta el archivo `sql/remove_moderator_role.sql` en tu base de datos Supabase:

```sql
-- El script actualiza:
-- 1. Constraint de roles (elimina 'moderador')
-- 2. Funciones y triggers relacionados
-- 3. Limpieza final de datos
```

### Paso 3: Verificar Cambios

Después de ejecutar ambos scripts, verifica:

1. **Usuarios**: Todos los ex-moderadores ahora son usuarios normales
2. **Permisos**: No hay permisos residuales de moderador
3. **Interfaz**: Las opciones de moderador han desaparecido
4. **Acceso**: Solo administradores pueden acceder a rutas de administración

## Impacto en el Sistema

### ✅ Beneficios
- **Simplicidad**: Sistema más simple con solo 2 roles
- **Claridad**: Roles más claros y definidos
- **Mantenimiento**: Menos código y lógica compleja
- **Seguridad**: Control de acceso más directo

### ⚠️ Consideraciones
- **Ex-moderadores**: Perderán acceso a funciones administrativas
- **Permisos**: Sistema de permisos granulares solo para administradores
- **Reversión**: Para revertir, sería necesario restaurar desde backup

## Estructura Final de Roles

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **usuario** | Usuario estándar del sistema | Perfil personal, solicitudes, comunicados |
| **administrador** | Administrador completo | Acceso total a todas las funciones |

## Archivos de Configuración

Los siguientes archivos mantienen la nueva estructura:
- Tipos TypeScript actualizados
- Validaciones de formulario actualizadas
- Middleware de autenticación simplificado
- Componentes UI actualizados

## Notas Técnicas

- El sistema de permisos granulares se mantiene pero solo se usa para administradores
- Los usuarios normales no tienen permisos especiales asignados
- La tabla `usuario_permisos` se mantiene para futura extensibilidad
- Todos los triggers y funciones han sido actualizados

---

**Fecha de implementación**: $(date)
**Desarrollador**: Sistema de Gestión Humana
**Estado**: Completado
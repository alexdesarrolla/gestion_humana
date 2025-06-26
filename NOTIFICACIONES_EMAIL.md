# Funcionalidad de Notificaciones por Correo Electrónico

## Descripción
Se ha implementado un sistema de notificaciones por correo electrónico que se activa automáticamente cuando se **publica** un comunicado en el sistema.

## Funcionamiento

### 1. Creación de Comunicados
Cuando un administrador crea y **publica** un comunicado:
- El comunicado se guarda en la base de datos
- Se establecen las relaciones con los cargos seleccionados
- **Automáticamente** se envían notificaciones por correo a todos los usuarios que pertenecen a esos cargos

### 2. Destinatarios
Los correos se envían a:
- Todos los usuarios que tienen asignado alguno de los cargos seleccionados en el comunicado
- Solo usuarios que tengan un correo electrónico registrado en el campo `correo_electronico` de la tabla `usuario_nomina`

### 3. Contenido del Correo
Cada correo incluye:
- **Asunto**: "Nuevo Comunicado: [Título del comunicado]"
- **Contenido HTML** con formato profesional que incluye:
  - Título del comunicado
  - Descripción completa
  - Enlace para ver el comunicado completo en el sistema
  - Pie de página con información del sistema
- **Versión de texto plano** como respaldo

## Configuración Técnica

### Variables de Entorno
En el archivo `.env.local` se han configurado las siguientes variables:

```env
# Configuración SMTP
SMTP_HOST=mail.orpainversiones.com
SMTP_PORT=587
SMTP_USER=smtpbdatam@orpainversiones.com
SMTP_PASS=&k&)&lTpnq8E

# URL del sitio para enlaces en correos
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Archivos Modificados

1. **`/app/api/comunicados/email-notification/route.ts`** (NUEVO)
   - API endpoint para envío de correos
   - Configuración de nodemailer con SMTP
   - Lógica para obtener usuarios por cargos
   - Plantilla HTML para correos

2. **`/app/administracion/comunicados/nuevo/page.tsx`** (MODIFICADO)
   - Integración con la API de notificaciones
   - Llamada automática al publicar comunicados
   - Manejo de errores y mensajes de éxito

3. **`.env.local`** (MODIFICADO)
   - Agregadas variables de configuración SMTP
   - URL del sitio para enlaces

## Flujo de Trabajo

1. **Administrador crea comunicado**
   - Completa título, descripción, categoría
   - Selecciona uno o más cargos destinatarios
   - Hace clic en "Publicar Comunicado"

2. **Sistema procesa la publicación**
   - Guarda el comunicado en estado "publicado"
   - Crea relaciones en tabla `comunicados_cargos`
   - Llama a la API de notificaciones

3. **API de notificaciones**
   - Obtiene los cargos asociados al comunicado
   - Busca usuarios con esos cargos
   - Filtra usuarios con correo electrónico válido
   - Envía correos individuales a cada usuario
   - Retorna estadísticas de envío

4. **Confirmación al administrador**
   - Muestra mensaje de éxito con número de notificaciones enviadas
   - En caso de error, informa que el comunicado se publicó pero hubo problemas con las notificaciones

## Consideraciones de Seguridad

- Las credenciales SMTP están almacenadas en variables de entorno
- No se exponen credenciales en el código fuente
- Los correos se envían de forma asíncrona para no bloquear la interfaz
- Se manejan errores de envío sin afectar la publicación del comunicado

## Monitoreo y Logs

- Los resultados de envío se registran en la consola del servidor
- Se retornan estadísticas detalladas (exitosos/fallidos)
- Los errores de envío individual no afectan el proceso general

## Notas Importantes

- **Solo se envían notificaciones cuando se PUBLICA un comunicado**, no cuando se guarda como borrador
- **Solo se envían notificaciones si hay cargos seleccionados**
- Los usuarios sin correo electrónico registrado no recibirán notificaciones
- El sistema es tolerante a fallos: si hay problemas con el envío de correos, el comunicado se publica de todas formas

## Personalización

Para personalizar el contenido de los correos, editar el archivo:
`/app/api/comunicados/email-notification/route.ts`

La plantilla HTML se encuentra en la variable `htmlContent` y puede modificarse según las necesidades de diseño y contenido.
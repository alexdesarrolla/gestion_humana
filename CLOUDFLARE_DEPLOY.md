# Despliegue en Cloudflare Pages

Este proyecto está configurado para ser desplegado en Cloudflare Pages. A continuación, se detallan los pasos necesarios para completar el despliegue.

## Pasos para el despliegue

1. **Crear una cuenta en Cloudflare** (si aún no tienes una)
   - Regístrate en [Cloudflare](https://dash.cloudflare.com/sign-up)

2. **Conectar tu repositorio de GitHub**
   - Ve a la sección de Pages en el dashboard de Cloudflare
   - Haz clic en "Create a project"
   - Conecta tu cuenta de GitHub y selecciona el repositorio de este proyecto

3. **Configurar el proyecto**
   - **Framework preset**: Selecciona Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
   - **Root directory**: `/` (directorio raíz)
   - **Node.js version**: 18 (o superior)
   - **Importante**: NO uses `npx wrangler deploy` como comando de implementación

4. **Variables de entorno** (si son necesarias)
   - Configura las variables de entorno necesarias en la sección "Environment variables"

5. **Desplegar**
   - Haz clic en "Save and Deploy"

## Archivos de configuración

Se han creado/modificado los siguientes archivos para facilitar el despliegue en Cloudflare Pages:

- `next.config.ts`: Configurado con `output: 'export'` y otras opciones necesarias para Cloudflare Pages
- `.pages.dev.json`: Configuración específica para Cloudflare Pages
- `public/_redirects`: Configuración de redirecciones
- `public/_headers`: Configuración de encabezados HTTP
- `wrangler.toml`: Configuración para Cloudflare Workers (opcional)

## Configuración actualizada

Se ha simplificado el archivo `wrangler.toml` para eliminar campos innecesarios que causaban advertencias durante el despliegue. La configuración actual está optimizada para un despliegue exitoso en Cloudflare Pages.

### Corrección de errores de despliegue

**Importante**: El comando de implementación debe ser `npm run build` y NO `npx wrangler deploy`. El despliegue se realiza automáticamente a través de la interfaz de Cloudflare Pages después de la compilación exitosa.

## Notas adicionales

- Este proyecto utiliza Next.js 15.2.3 con React 19
- La configuración está optimizada para un despliegue rápido y eficiente en Cloudflare Pages
- Si encuentras algún problema durante el despliegue, consulta la [documentación oficial de Cloudflare Pages](https://developers.cloudflare.com/pages/)
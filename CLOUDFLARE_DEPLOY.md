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
   - **Build output directory**: `.next`
   - **Root directory**: `/` (directorio raíz)
   - **Node.js version**: 18 (o superior)

4. **Variables de entorno** (si son necesarias)
   - Configura las variables de entorno necesarias en la sección "Environment variables"

5. **Desplegar**
   - Haz clic en "Save and Deploy"

## Archivos de configuración

Se han creado/modificado los siguientes archivos para facilitar el despliegue en Cloudflare Pages:

- `next.config.ts`: Configurado con `output: 'standalone'` y otras opciones necesarias para Cloudflare Pages
- `.pages.dev.json`: Configuración específica para Cloudflare Pages
- `public/_redirects`: Configuración de redirecciones
- `public/_headers`: Configuración de encabezados HTTP
- `wrangler.toml`: Configuración para Cloudflare Workers (opcional)

## Completar la configuración

En el archivo `wrangler.toml`, deberás completar los siguientes campos con tus datos de Cloudflare:

```toml
account_id = "" # Tu ID de cuenta de Cloudflare
zone_id = ""    # Tu Zone ID si tienes un dominio personalizado
```

## Notas adicionales

- Este proyecto utiliza Next.js 15.2.3 con React 19
- La configuración está optimizada para un despliegue rápido y eficiente en Cloudflare Pages
- Si encuentras algún problema durante el despliegue, consulta la [documentación oficial de Cloudflare Pages](https://developers.cloudflare.com/pages/)
# Configuración de Variables de Entorno para Vercel

Este archivo contiene las variables de entorno que deben configurarse en Vercel para que el envío de correos funcione correctamente.

## Variables SMTP Requeridas

Configura las siguientes variables en tu panel de Vercel (Settings > Environment Variables):

### Variables Obligatorias

```
SMTP_HOST=mail.orpainversiones.com
SMTP_PORT=587
SMTP_USER=smtpgh360@orpainversiones.com
SMTP_PASS=ECpkuCgdy2n
```

### Variables Opcionales

```
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
```

## Configuración Recomendada por Proveedor

### Gmail/Google Workspace
```
SMTP_HOST=mail.orpainversiones.com
SMTP_PORT=587
SMTP_USER=smtpgh360@orpainversiones.com
SMTP_PASS=ECpkuCgdy2n
```

### Outlook/Hotmail
```
SMTP_HOST=mail.orpainversiones.com
SMTP_PORT=587
SMTP_USER=smtpgh360@orpainversiones.com
SMTP_PASS=ECpkuCgdy2n
```

### Proveedores Empresariales
```
SMTP_HOST=mail.orpainversiones.com
SMTP_PORT=587
SMTP_USER=smtpgh360@orpainversiones.com
SMTP_PASS=ECpkuCgdy2n
```

## Notas Importantes

1. **Puerto 587**: Se recomienda usar el puerto 587 con STARTTLS en lugar del puerto 587 con SSL para mejor compatibilidad con Vercel.

2. **Seguridad**: Nunca hardcodees credenciales en el código. Siempre usa variables de entorno.

3. **Gmail**: Si usas Gmail, necesitas generar una "App Password" en lugar de usar tu contraseña normal.

4. **Timeouts**: El código ahora incluye timeouts de 30 segundos por email y 4 minutos globalmente para evitar problemas en Vercel.

5. **Pool de Conexiones**: Se configuró un pool de conexiones para optimizar el rendimiento en el entorno serverless.

## Verificación

Después de configurar las variables:

1. Redeploya tu aplicación en Vercel
2. Prueba el envío de correos desde la aplicación
3. Revisa los logs de Vercel para verificar que no hay errores de conexión SMTP

## Troubleshooting

Si sigues teniendo problemas:

1. Verifica que todas las variables estén configuradas correctamente
2. Asegúrate de que tu proveedor SMTP permita conexiones desde Vercel
3. Considera usar servicios como SendGrid, Resend o Amazon SES para mayor confiabilidad
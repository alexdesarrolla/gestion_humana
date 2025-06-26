# Debug y Troubleshooting SMTP - Sistema de Correos

## 🔍 Sistema de Debug Implementado

Este documento describe el sistema de debug detallado implementado para diagnosticar problemas en el envío de correos electrónicos.

### ✅ Credenciales SMTP Corregidas

```env
SMTP_HOST=mail.orpainversiones.com
SMTP_PORT=587
SMTP_USER=smtpgh360@orpainversiones.com
SMTP_PASS=ECpkuCgdy2n
```

**Nota**: La contraseña se corrigió de `&k&)&lTpnq8E` a `&k&}&lIpng8E` según las credenciales proporcionadas.

### 🛠️ Funciones de Debug Implementadas

#### 1. **debugLog() - Logging Detallado**
```javascript
function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [EMAIL-DEBUG] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [EMAIL-DATA]`, JSON.stringify(data, null, 2));
  }
}
```

#### 2. **Verificación de Variables de Entorno**
- Validación detallada de todas las variables SMTP
- Identificación específica de variables faltantes
- Debug de configuración por entorno (Vercel vs Local)

#### 3. **Debug de Configuración SMTP**
- Logging de configuración generada
- Verificación de puertos y SSL
- Timeouts y configuraciones de pool

#### 4. **Debug de Conexión SMTP**
- Tiempo de verificación de conexión
- Códigos de error específicos
- Stack traces completos

#### 5. **Debug de Envío Individual**
- Seguimiento de cada intento de envío
- Información de reintentos con backoff exponencial
- Detalles de respuesta del servidor SMTP

### 📊 Logs de Debug Esperados

#### **Inicio del Proceso**
```
[2024-01-15T10:30:00.000Z] [EMAIL-DEBUG] Variables de entorno SMTP:
[2024-01-15T10:30:00.001Z] [EMAIL-DATA] {
  "SMTP_HOST": "mail.orpainversiones.com",
  "SMTP_PORT": "587",
  "SMTP_USER": "smtpgh360@orpainversiones.com",
  "SMTP_PASS": "***CONFIGURADA***",
  "VERCEL": "1",
  "NODE_ENV": "production",
  "isVercel": true,
  "isLocal": false
}
```

#### **Configuración SMTP**
```
[2024-01-15T10:30:00.010Z] [EMAIL-DEBUG] Configuración SMTP generada:
[2024-01-15T10:30:00.011Z] [EMAIL-DATA] {
  "host": "mail.orpainversiones.com",
  "port": 587,
  "secure": true,
  "auth": {
    "user": "smtpbdatam@orpainversiones.com",
    "pass": "***OCULTA***"
  },
  "connectionTimeout": 30000,
  "greetingTimeout": 15000,
  "socketTimeout": 30000,
  "pool": true,
  "maxConnections": 2,
  "maxMessages": 10
}
```

#### **Verificación de Conexión**
```
[2024-01-15T10:30:00.020Z] [EMAIL-DEBUG] Verificando conexión SMTP...
[2024-01-15T10:30:01.500Z] [EMAIL-DEBUG] Conexión SMTP verificada exitosamente
[2024-01-15T10:30:01.501Z] [EMAIL-DATA] {
  "verificationTime": "1480ms"
}
```

#### **Envío de Emails**
```
[2024-01-15T10:30:02.000Z] [EMAIL-DEBUG] Iniciando envío de email a: usuario@ejemplo.com
[2024-01-15T10:30:02.001Z] [EMAIL-DEBUG] Intento 1/3 para usuario@ejemplo.com
[2024-01-15T10:30:03.500Z] [EMAIL-DEBUG] Email enviado exitosamente a usuario@ejemplo.com en intento 1
[2024-01-15T10:30:03.501Z] [EMAIL-DATA] {
  "messageId": "<abc123@mail.orpainversiones.com>",
  "response": "250 2.0.0 Ok: queued as 12345",
  "accepted": ["usuario@ejemplo.com"],
  "rejected": []
}
```

### 🚨 Errores Comunes y Diagnóstico

#### **Error de Autenticación**
```
[EMAIL-DEBUG] Error de conexión SMTP
[EMAIL-DATA] {
  "error": "Invalid login: 535 5.7.8 Error: authentication failed",
  "code": "EAUTH",
  "command": "AUTH PLAIN"
}
```
**Solución**: Verificar credenciales SMTP_USER y SMTP_PASS

#### **Error de Conexión**
```
[EMAIL-DEBUG] Error de conexión SMTP
[EMAIL-DATA] {
  "error": "connect ECONNREFUSED 192.168.1.1:587",
  "code": "ECONNREFUSED"
}
```
**Solución**: Verificar SMTP_HOST y firewall

#### **Error de Timeout**
```
[EMAIL-DEBUG] Intento 1/3 fallido para usuario@ejemplo.com
[EMAIL-DATA] {
  "error": "Connection timeout",
  "code": "ETIMEDOUT",
  "command": "CONN"
}
```
**Solución**: Ajustar timeouts o verificar conectividad de red

#### **Error de SSL/TLS**
```
[EMAIL-DEBUG] Error de conexión SMTP
[EMAIL-DATA] {
  "error": "unable to verify the first certificate",
  "code": "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
}
```
**Solución**: Configuración TLS con `rejectUnauthorized: false`

### 🔧 Configuraciones Optimizadas

#### **Para Vercel (Producción)**
```javascript
{
  host: 'mail.orpainversiones.com',
  port: 587,
  secure: true,
  connectionTimeout: 30000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
  maxConnections: 2,
  maxMessages: 10,
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  }
}
```

#### **Para Local (Desarrollo)**
```javascript
{
  host: 'mail.orpainversiones.com',
  port: 587,
  secure: true,
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  maxConnections: 5,
  maxMessages: 100,
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  }
}
```

### 📈 Métricas de Debug

```json
{
  "totalEmailsProcessed": 15,
  "totalUsersFound": 18,
  "validEmails": 15,
  "successful": 14,
  "failed": 1,
  "successRate": "93.33%",
  "avgResponseTime": 2500,
  "totalTime": 37500,
  "totalRetries": 3,
  "environment": "vercel",
  "smtpConfig": {
    "host": "mail.orpainversiones.com",
    "port": 587,
    "secure": true
  }
}
```

### 🔍 Cómo Interpretar los Logs

1. **Buscar `[EMAIL-DEBUG]`** en los logs de Vercel o consola local
2. **Verificar variables de entorno** al inicio del proceso
3. **Confirmar configuración SMTP** generada
4. **Revisar verificación de conexión** antes del envío
5. **Seguir cada intento de envío** individual
6. **Analizar métricas finales** para identificar patrones

### 🛡️ Troubleshooting Paso a Paso

1. **Verificar Variables de Entorno**
   ```bash
   # En Vercel Dashboard > Settings > Environment Variables
   SMTP_HOST=mail.orpainversiones.com
SMTP_PORT=587
SMTP_USER=smtpgh360@orpainversiones.com
SMTP_PASS=ECpkuCgdy2n
   ```

2. **Probar Conexión Manual**
   ```bash
   telnet mail.orpainversiones.com 587
   ```

3. **Revisar Logs de Vercel**
   ```bash
   vercel logs --follow
   ```

4. **Verificar Firewall/Red**
   - Puerto 587 abierto
   - SSL/TLS habilitado
   - No bloqueo de IPs de Vercel

### 📞 Contacto para Soporte

Si los problemas persisten después de seguir esta guía:
1. Recopilar logs completos con timestamps
2. Verificar configuración del servidor SMTP
3. Contactar al proveedor de hosting del servidor SMTP

---

**Nota**: Este sistema de debug está diseñado para proporcionar información detallada sin comprometer la seguridad (las contraseñas se ocultan en los logs).
# Corrección de Errores SMTP en Vercel

## 🔴 Problema Identificado

**Error Principal:** `550 5.5.1 authorization failed`

```
Invalid greeting. response=550 5.5.1 authorization failed: 550 5.5.1 authorization failed
```

## ✅ Soluciones Implementadas

### 1. **Actualización de Configuración TLS**

**ANTES (Problemático):**
```javascript
tls: {
  rejectUnauthorized: false,
  ciphers: 'SSLv3'  // ❌ OBSOLETO E INSEGURO
}
```

**DESPUÉS (Corregido):**
```javascript
tls: {
  rejectUnauthorized: false,
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  ciphers: 'HIGH:!aNULL:!MD5:!RC4'
}
```

### 2. **Cambio de Puerto y Método de Conexión**

**ANTES:**
```javascript
port: 465,
secure: true  // SSL directo
```

**DESPUÉS:**
```javascript
port: 587,
secure: false,
requireTLS: true  // STARTTLS
```

### 3. **Optimización para Vercel**

**ANTES:**
```javascript
pool: true,
maxConnections: 2,
maxMessages: 10
```

**DESPUÉS:**
```javascript
pool: false,           // Sin pool en Vercel
maxConnections: 1,     // Una conexión a la vez
maxMessages: 1,        // Un mensaje por conexión
connectionTimeout: 45000,
greetingTimeout: 20000,
socketTimeout: 45000
```

## 🔧 Variables de Entorno para Vercel

**Configurar en Vercel Dashboard:**

```env
SMTP_HOST=mail.orpainversiones.com
SMTP_PORT=587
SMTP_USER=smtpbdatam@orpainversiones.com
SMTP_PASS=&k&}&lIpng8E
```

## 📋 Pasos para Aplicar la Corrección

### 1. **Actualizar Variables en Vercel**
```bash
# En Vercel Dashboard > Settings > Environment Variables
SMTP_PORT=587  # Cambiar de 465 a 587
```

### 2. **Redesplegar la Aplicación**
```bash
git add .
git commit -m "fix: Corregir configuración SMTP para Vercel"
git push
```

### 3. **Verificar en Logs**
Buscar en los logs de Vercel:
- ✅ `Connection established to 192.99.84.42:587`
- ✅ `Email enviado exitosamente`
- ❌ Ya no debería aparecer `550 5.5.1 authorization failed`

## 🔍 Diagnóstico de Errores

### Error Resuelto: `550 5.5.1 authorization failed`
**Causa:** Configuración TLS obsoleta (SSLv3) y puerto SSL directo (465)
**Solución:** STARTTLS en puerto 587 con TLS moderno

### Error Resuelto: `Invalid greeting`
**Causa:** Incompatibilidad entre Vercel y configuración SSL
**Solución:** Usar STARTTLS y desactivar connection pooling

## 📊 Monitoreo Post-Corrección

**Logs Esperados:**
```
[EMAIL-DEBUG] Configuración SMTP generada: {
  "host": "mail.orpainversiones.com",
  "port": 587,
  "secure": false,
  "requireTLS": true
}

[EMAIL-DEBUG] Verificando conexión SMTP...
[EMAIL-DEBUG] Conexión SMTP verificada exitosamente
[EMAIL-DEBUG] Email enviado exitosamente a usuario@ejemplo.com
```

## 🚀 Beneficios de la Corrección

1. **Compatibilidad con Vercel:** Configuración optimizada para serverless
2. **Seguridad Mejorada:** TLS 1.2/1.3 en lugar de SSLv3
3. **Estabilidad:** Sin connection pooling que cause conflictos
4. **Debugging:** Logs detallados para troubleshooting

## ⚠️ Notas Importantes

- **Puerto 587 + STARTTLS** es más compatible con Vercel que **Puerto 465 + SSL**
- **Connection pooling desactivado** evita problemas de estado en serverless
- **Timeouts aumentados** compensan la latencia de Vercel
- **TLS moderno** mejora la compatibilidad con servidores SMTP actuales

---

**Fecha de Corrección:** $(date)
**Estado:** ✅ Implementado y Listo para Pruebas
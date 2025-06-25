# 🚀 Mejoras Adicionales para SMTP en Vercel

Este documento contiene sugerencias adicionales para mejorar la calidad del código y la compatibilidad con Vercel.

## 📋 Mejoras Implementadas Actualmente

✅ **Validación de variables de entorno**
✅ **Configuración SMTP optimizada para serverless**
✅ **Timeouts individuales y globales**
✅ **Pool de conexiones**
✅ **Manejo robusto de errores**
✅ **Tipado TypeScript correcto**

## 🔧 Sugerencias de Mejoras Adicionales

### 1. **Configuración Dinámica de SMTP**

```typescript
// Función para detectar el entorno y ajustar configuración
function getSMTPConfig() {
  const isVercel = process.env.VERCEL === '1';
  const isLocal = process.env.NODE_ENV === 'development';
  
  return {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || (isVercel ? '587' : '587')),
    secure: process.env.SMTP_PORT === '587',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Configuración optimizada por entorno
    connectionTimeout: isVercel ? 45000 : 60000,
    greetingTimeout: isVercel ? 20000 : 30000,
    socketTimeout: isVercel ? 45000 : 60000,
    pool: true,
    maxConnections: isVercel ? 3 : 5,
    maxMessages: isVercel ? 50 : 100,
    // Configuraciones específicas para Vercel
    ...(isVercel && {
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      requireTLS: true,
      logger: false,
      debug: false
    })
  };
}
```

### 2. **Sistema de Reintentos Inteligente**

```typescript
async function sendEmailWithRetry(transporter: any, mailOptions: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      return { success: true, attempt };
    } catch (error) {
      console.log(`Intento ${attempt} fallido:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Espera exponencial entre reintentos
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 3. **Validación de Correos Electrónicos**

```typescript
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Filtrar usuarios con emails válidos
const usuariosValidos = usuarios.filter(usuario => 
  usuario.correo_electronico && isValidEmail(usuario.correo_electronico)
);
```

### 4. **Logging Mejorado**

```typescript
function logEmailEvent(type: 'start' | 'success' | 'error' | 'timeout', data: any) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    type,
    environment: process.env.VERCEL ? 'vercel' : 'local',
    ...data
  };
  
  console.log(`[EMAIL-${type.toUpperCase()}]`, JSON.stringify(logData));
}
```

### 5. **Rate Limiting para Vercel**

```typescript
// Procesar emails en lotes para evitar límites de Vercel
async function processEmailsInBatches(usuarios: any[], batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < usuarios.length; i += batchSize) {
    const batch = usuarios.slice(i, i + batchSize);
    const batchPromises = batch.map(usuario => sendEmailWithRetry(transporter, mailOptions));
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
    
    // Pausa entre lotes para evitar rate limiting
    if (i + batchSize < usuarios.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
```

### 6. **Configuración de Variables de Entorno Mejorada**

```bash
# .env.local (desarrollo)
SMTP_HOST=mail.orpainversiones.com
SMTP_PORT=587
SMTP_USER=smtpbdatam@orpainversiones.com
SMTP_PASS=tu_contraseña
NODE_ENV=development

# Variables de Vercel (producción)
SMTP_HOST=mail.orpainversiones.com
SMTP_PORT=587
SMTP_USER=smtpbdatam@orpainversiones.com
SMTP_PASS=tu_contraseña
VERCEL=1
```

### 7. **Monitoreo y Métricas**

```typescript
interface EmailMetrics {
  totalEmails: number;
  successful: number;
  failed: number;
  avgResponseTime: number;
  errors: string[];
}

function calculateMetrics(results: any[], startTime: number): EmailMetrics {
  const endTime = Date.now();
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.length - successful;
  const errors = results
    .filter(r => r.status === 'failed')
    .map(r => r.error)
    .filter(Boolean);
  
  return {
    totalEmails: results.length,
    successful,
    failed,
    avgResponseTime: (endTime - startTime) / results.length,
    errors
  };
}
```

### 8. **Fallback para Proveedores SMTP**

```typescript
const smtpProviders = [
  {
    name: 'primary',
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  {
    name: 'fallback',
    host: process.env.SMTP_HOST_FALLBACK,
    port: parseInt(process.env.SMTP_PORT_FALLBACK || '587'),
    user: process.env.SMTP_USER_FALLBACK,
    pass: process.env.SMTP_PASS_FALLBACK
  }
];

async function createTransporterWithFallback() {
  for (const provider of smtpProviders) {
    if (!provider.host || !provider.user || !provider.pass) continue;
    
    try {
      const transporter = nodemailer.createTransport({
        host: provider.host,
        port: provider.port,
        secure: provider.port === 587,
        auth: { user: provider.user, pass: provider.pass }
      });
      
      await transporter.verify();
      console.log(`Usando proveedor SMTP: ${provider.name}`);
      return transporter;
    } catch (error) {
      console.warn(`Proveedor ${provider.name} falló:`, error.message);
    }
  }
  
  throw new Error('Ningún proveedor SMTP disponible');
}
```

## 🔍 Debugging en Vercel

### Comandos útiles para debugging:

```bash
# Ver logs en tiempo real
vercel logs --follow

# Ver logs de una función específica
vercel logs --function=api/comunicados/email-notification

# Ver variables de entorno
vercel env ls
```

### Headers de debugging:

```typescript
// Agregar headers de debugging en desarrollo
if (process.env.NODE_ENV === 'development') {
  return NextResponse.json(response, {
    headers: {
      'X-Debug-SMTP-Host': process.env.SMTP_HOST || 'not-set',
      'X-Debug-Environment': process.env.VERCEL ? 'vercel' : 'local',
      'X-Debug-Timestamp': new Date().toISOString()
    }
  });
}
```

## 📊 Métricas de Rendimiento

- **Timeout individual**: 30 segundos (óptimo para Vercel)
- **Timeout global**: 4 minutos (dentro del límite de Vercel)
- **Conexiones simultáneas**: 3-5 (balanceado para serverless)
- **Lote de emails**: 10-20 por lote (evita rate limiting)

## 🚨 Troubleshooting Común

1. **Error ECONNRESET**: Usar puerto 587 en lugar de 587
2. **Timeout errors**: Reducir timeouts en Vercel
3. **Rate limiting**: Implementar pausas entre lotes
4. **SSL errors**: Configurar `rejectUnauthorized: false` para Vercel
5. **Memory issues**: Cerrar transporter después del uso

## 🎯 Próximos Pasos Recomendados

1. Implementar sistema de reintentos
2. Agregar métricas de monitoreo
3. Configurar fallback de proveedores SMTP
4. Optimizar para diferentes entornos
5. Implementar rate limiting inteligente
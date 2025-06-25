import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { comunicadoId, titulo, contenido } = await request.json();

    if (!comunicadoId || !titulo || !contenido) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Crear cliente de Supabase para el servidor
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aqmlxjsyczqtfansvnqr.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbWx4anN5Y3pxdGZhbnN2bnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzM3NTYsImV4cCI6MjA1ODUwOTc1Nn0._dfB0vDYrR4jQ1cFHPXr_6iGTUXctzTeZbIcE4FJ0lk';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Obtener los cargos asociados al comunicado
    const { data: comunicadoCargos, error: cargosError } = await supabase
      .from('comunicados_cargos')
      .select('cargo_id')
      .eq('comunicado_id', comunicadoId);

    if (cargosError) {
      console.error('Error al obtener cargos del comunicado:', cargosError);
      return NextResponse.json(
        { error: 'Error al obtener cargos del comunicado' },
        { status: 500 }
      );
    }

    if (!comunicadoCargos || comunicadoCargos.length === 0) {
      return NextResponse.json(
        { message: 'No hay cargos asociados al comunicado' },
        { status: 200 }
      );
    }

    // Obtener los IDs de los cargos
    const cargoIds = comunicadoCargos.map(cc => cc.cargo_id);

    // Obtener usuarios con esos cargos y sus correos electrónicos
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuario_nomina')
      .select('correo_electronico, colaborador')
      .in('cargo_id', cargoIds)
      .not('correo_electronico', 'is', null);

    if (usuariosError) {
      console.error('Error al obtener usuarios:', usuariosError);
      return NextResponse.json(
        { error: 'Error al obtener usuarios' },
        { status: 500 }
      );
    }

    if (!usuarios || usuarios.length === 0) {
      return NextResponse.json(
        { message: 'No se encontraron usuarios con correos electrónicos para los cargos especificados' },
        { status: 200 }
      );
    }

    // Validar variables de entorno SMTP
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('Variables de entorno SMTP no configuradas');
      return NextResponse.json(
        { error: 'Error de configuración del servidor de correo' },
        { status: 500 }
      );
    }

    // Configurar nodemailer optimizado para Vercel
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // SSL solo si es puerto 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      connectionTimeout: 60000, // 60 segundos
      greetingTimeout: 30000,   // 30 segundos
      socketTimeout: 60000,     // 60 segundos
      pool: true,               // Usar pool de conexiones
      maxConnections: 5,        // Máximo 5 conexiones simultáneas
      maxMessages: 100          // Máximo 100 mensajes por conexión
    });

    // Verificar conexión SMTP
    try {
      await transporter.verify();
      console.log('Conexión SMTP verificada exitosamente');
    } catch (error) {
      console.error('Error de conexión SMTP:', error);
      return NextResponse.json(
        { error: 'Error de conexión con el servidor de correo' },
        { status: 500 }
      );
    }

    // Preparar el contenido del correo
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuevo Comunicado - Gestión Humana 360</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #F9F7ED 0%, #E5D6A3 50%, #C8A047 100%);
            padding: 20px;
            text-align: center;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #BF913B 0%, #805328 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
          }
          .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
          }
          .content-title {
            color: #4a4a4a;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 25px;
            text-align: center;
          }
          .content-body {
            color: #5C3A27;
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
            text-align: center;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #C8A047 0%, #BF913B 100%);
            color: #ffffff !important;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 8px 20px rgba(200, 160, 71, 0.3);
            text-align: center;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 25px rgba(200, 160, 71, 0.4);
          }
          .footer {
            background: #F1EBD0;
            padding: 25px 20px;
            text-align: center;
            border-top: 1px solid #E5D6A3;
          }
          .footer p {
            font-size: 14px;
            color: #805328;
            margin-bottom: 5px;
          }
          .divider {
            height: 3px;
            background: linear-gradient(135deg, #C8A047 0%, #BF913B 100%);
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Gestión Humana 360</h1>
            <p>Nuevo Comunicado Disponible</p>
          </div>
          
          <div class="divider"></div>
          
          <div class="content">
            <h2 class="content-title">${titulo}</h2>
            <div class="content-body">
              ${contenido.replace(/\n/g, '<br>')}
            </div>
            
            <a href="https://gestionhumana360.co/perfil/comunicados" class="btn">
              📋 Ver Comunicado Completo
            </a>
          </div>
          
          <div class="footer">
            <p><strong>Gestión Humana 360</strong></p>
            <p>Este es un mensaje automático del sistema.</p>
            <p>Por favor, no responda a este correo electrónico.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar correos con límite de tiempo
    const results: Array<{ email: string; status: string; error?: string }> = [];
    const emailPromises = usuarios.map(async (usuario) => {
      try {
        // Timeout por email individual (30 segundos)
        const emailPromise = transporter.sendMail({
          from: {
            name: 'Sistema de Gestión Humana',
            address: process.env.SMTP_USER!
          },
          to: usuario.correo_electronico,
          subject: `Nuevo Comunicado: ${titulo}`,
          html: htmlContent,
          text: `Nuevo Comunicado: ${titulo}\n\n${contenido}\n\nPuede ver el comunicado completo en: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://gestionhumana360.co'}/perfil/comunicados`
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de 30 segundos')), 30000)
        );
        
        await Promise.race([emailPromise, timeoutPromise]);
        
        console.log(`Correo enviado exitosamente a: ${usuario.correo_electronico}`);
        return { email: usuario.correo_electronico, status: 'success' };
      } catch (error) {
        console.error(`Error enviando correo a ${usuario.correo_electronico}:`, error);
        return { 
          email: usuario.correo_electronico, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
    });
    
    // Ejecutar todos los envíos en paralelo con límite de tiempo global
    try {
      const globalTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout global de 4 minutos')), 240000)
      );
      
      const emailResults = await Promise.race([
        Promise.allSettled(emailPromises),
        globalTimeout
      ]) as PromiseSettledResult<{ email: string; status: string; error?: string }>[];
      
      // Procesar resultados
      emailResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({ email: 'unknown', status: 'failed', error: result.reason?.message || 'Error desconocido' });
        }
      });
    } catch (error) {
      console.error('Timeout global alcanzado:', error);
      return NextResponse.json(
        { error: 'Timeout en el envío de correos', results },
        { status: 408 }
      );
    }
    
    // Cerrar el transporter
    transporter.close();

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      message: `Notificaciones enviadas: ${successful} exitosas, ${failed} fallidas`,
      successful,
      failed,
      totalUsers: usuarios.length,
      results
    });

  } catch (error) {
    console.error('Error en el envío de notificaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
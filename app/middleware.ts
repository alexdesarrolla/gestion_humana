import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  try {
    // Verificar si el usuario está autenticado
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      // Si no está autenticado, redirigir al login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Obtener el rol del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuario_nomina')
      .select('rol')
      .eq('auth_user_id', session.user.id)
      .single();

    if (userError) {
      throw userError;
    }

    // Verificar acceso según el rol
    const path = request.nextUrl.pathname;

    if (path.startsWith('/administracion') && userData.rol !== 'administrador') {
      // Si intenta acceder a la sección de administración sin ser administrador, redirigir a perfil
      return NextResponse.redirect(new URL('/perfil', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // En caso de error, redirigir al login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/perfil/:path*',
    '/administracion/:path*'
  ]
};
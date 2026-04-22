import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    
    // Forzamos las claves para evitar errores de entorno en el Edge Runtime
    const supabase = createMiddlewareClient({ 
      req, 
      res 
    }, {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    // Intentamos obtener la sesión de forma segura
    const { data: { session } } = await supabase.auth.getSession();

    const pathname = req.nextUrl.pathname;

    // Rutas públicas y archivos estáticos
    const isPublicPath = 
      pathname === '/login' || 
      pathname === '/signup' || 
      pathname === '/' || 
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.includes('.');

    // Redirección si no hay sesión
    if (!session && !isPublicPath) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }

    // Redirección si hay sesión e intenta ir a login
    if (session && (pathname === '/login' || pathname === '/signup')) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/resumen';
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (e) {
    // Si el middleware falla por cualquier motivo técnico, permitimos el paso
    // y dejamos que el AuthGuard (cliente) maneje la seguridad.
    // Esto evita el error 500 que bloquea toda la web.
    console.error('Middleware Error:', e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.png$).*)'],
};

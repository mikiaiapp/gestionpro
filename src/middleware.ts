import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Omitimos maxAge para que sea de sesión
            const sessionOptions = { ...options };
            delete sessionOptions.maxAge;

            request.cookies.set({ name, value, ...sessionOptions });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value, ...sessionOptions });
          },
          remove(name: string, options: CookieOptions) {
            const sessionOptions = { ...options };
            delete sessionOptions.maxAge;

            request.cookies.set({ name, value: '', ...sessionOptions });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value: '', ...sessionOptions });
          },
        },
      }
    );

    // IMPORTANTE: Usamos getUser() para validar la sesión de forma real en el servidor
    const { data: { user } } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isPublicPath = 
      pathname === '/login' || 
      pathname === '/signup' || 
      pathname === '/' || 
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.includes('.');

    if (!user && !isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (user && (pathname === '/login' || pathname === '/signup')) {
      const url = request.nextUrl.clone();
      url.pathname = '/resumen';
      return NextResponse.redirect(url);
    }
  } catch (e) {
    console.error('Middleware Critical Error:', e);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.png$).*)'],
};

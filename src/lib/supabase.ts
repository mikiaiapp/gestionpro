import { createBrowserClient } from '@supabase/ssr';

// Cliente de Supabase configurado para "Solo Sesión"
// Al usar sessionStorage y omitir la expiración de la cookie, 
// el usuario deberá validarse cada vez que cierre el navegador.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      storageKey: 'gp-auth-session',
      // Usamos sessionStorage para que los datos mueran al cerrar la pestaña/ventana
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    },
    cookieOptions: {
      // Al no definir maxAge, la cookie se vuelve de sesión (se borra al cerrar el navegador)
      name: 'sb-auth-token',
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }
  }
);

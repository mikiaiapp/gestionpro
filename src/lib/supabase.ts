import { createBrowserClient } from '@supabase/ssr'

// Cliente de Supabase optimizado para el navegador
// Gestiona la sesión automáticamente sincronizándola con las cookies del middleware
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      storageKey: 'gp-auth-token',
    },
    cookieOptions: {
      // Forzamos que la cookie sea de sesión (se borra al cerrar el navegador)
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }
  }
)

import { createBrowserClient } from '@supabase/ssr';

// Creamos el cliente de Supabase para el navegador
// Esto gestiona automáticamente la sincronización de sesión con el servidor vía cookies
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

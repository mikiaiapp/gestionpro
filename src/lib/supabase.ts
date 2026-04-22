import { createClient } from '@supabase/supabase-js';

// Usamos el cliente estándar de supabase-js para máxima estabilidad en el navegador
// Esta versión es más robusta y menos propensa a errores de inicialización que la versión SSR
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'gp-auth-token',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

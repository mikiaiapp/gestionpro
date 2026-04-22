import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Exportamos una función para obtener el cliente o una instancia persistente
// Esto evita que falle durante el 'prerendering' en el servidor de Vercel
let supabaseInstance: any;

export const getSupabaseClient = () => {
  // Durante el build (SSR/Prerendering), devolvemos un proxy o un objeto vacío
  // para evitar que 'createClientComponentClient' intente acceder a cookies inexistentes
  if (typeof window === 'undefined') {
    return {} as any;
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClientComponentClient();
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();

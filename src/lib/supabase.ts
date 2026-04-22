import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Exportamos el cliente para componentes de cliente
// Esto gestiona automáticamente las cookies para que el Middleware funcione
export const supabase = createClientComponentClient();

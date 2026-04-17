
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const possible = ['condiciones_legales', 'condiciones', 'terminos', 'legal', 'lopd_text', 'lopd', 'privacidad', 'proteccion_datos'];
  const results = {};
  for (const col of possible) {
    const { error } = await supabase.from('perfil_negocio').select(col).limit(0);
    results[col] = !error;
  }
  console.log('Column Discovery:', results);
}
check();

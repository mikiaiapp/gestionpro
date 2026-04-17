
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const possible = ['lopd_text', 'lopd', 'pd_text', 'pd_texto', 'texto_lopd', 'clausula_lopd', 'privacidad_text'];
  const results = {};
  for (const col of possible) {
    const { error } = await supabase.from('perfil_negocio').select(col).limit(0);
    results[col] = !error;
  }
  console.log('LOPD Col Discovery:', results);
}
check();

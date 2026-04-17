
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: estados } = await supabase.from('proyectos').select('estado');
  const uniqueEstados = [...new Set((estados || []).map(e => e.estado))];
  console.log('Unique Estados:', uniqueEstados);
  
  const { data: projs } = await supabase.from('proyectos').select('*').limit(5);
  console.log('Sample Projects:', JSON.stringify(projs, null, 2));
}
check();

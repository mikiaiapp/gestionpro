
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('ventas').select('*').limit(1);
  if (error) console.error(error);
  else console.log('Ventas Columns:', data.length > 0 ? Object.keys(data[0]) : 'No data');
  
  const { data: projs, error: e2 } = await supabase.from('proyectos').select('*').limit(1);
  if (e2) console.error(e2);
  else console.log('Proyectos Columns:', projs.length > 0 ? Object.keys(projs[0]) : 'No data');
}
check();

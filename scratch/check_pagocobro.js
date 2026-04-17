
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Pagos Table ---');
  const { data: p, error: pe } = await supabase.from('pagos').select('*').limit(1);
  if (pe) console.error(pe);
  else if (p && p.length > 0) console.log(Object.keys(p[0]));
  else console.log('Empty table - checking schema cache indirectly');

  console.log('--- Cobros Table ---');
  const { data: c, error: ce } = await supabase.from('cobros').select('*').limit(1);
  if (ce) console.error(ce);
  else if (c && c.length > 0) console.log(Object.keys(c[0]));
  else console.log('Empty table');
}
check();

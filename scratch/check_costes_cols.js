
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: colsProbe } = await supabase.from('costes').select('*').limit(1);
  const realKeys = colsProbe && colsProbe.length > 0 ? Object.keys(colsProbe[0]) : [];
  console.log('Costes Columns:', realKeys);
}
check();

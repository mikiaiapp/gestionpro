
import { supabase } from './src/lib/supabase';

async function checkSchema() {
  const { data: vts } = await supabase.from('ventas').select('*').limit(1);
  console.log('Ventas keys:', vts ? Object.keys(vts[0]) : 'No data');
}
checkSchema();

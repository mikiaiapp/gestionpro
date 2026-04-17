
import { supabase } from './src/lib/supabase';

async function checkSchema() {
  const { data: pagos } = await supabase.from('pagos').select('*').limit(1);
  console.log('Pagos keys:', pagos ? Object.keys(pagos[0]) : 'No data');
  
  const { data: costes } = await supabase.from('costes').select('*').limit(1);
  console.log('Costes keys:', costes ? Object.keys(costes[0]) : 'No data');
}
checkSchema();


const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Select * and check keys of the first row (if any)
  const { data, error } = await supabase.from('perfil_negocio').select('*');
  if (error) {
    console.error('Error fetching perfil_negocio:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Sample Data Key Names:', Object.keys(data[0]));
    console.log('Full data:', data[0]);
  } else {
    console.log('No rows in perfil_negocio table.');
  }
}
check();

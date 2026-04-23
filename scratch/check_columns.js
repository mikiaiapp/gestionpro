const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log("Checking columns of perfil_negocio...");
  const { data, error } = await supabase.from('perfil_negocio').select('*').limit(1);
  if (error) {
    console.error("Error fetching data:", error.message);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns found:", Object.keys(data[0]));
  } else {
    console.log("Table is empty (or no rows returned). Can't check columns this way.");
  }
}

checkColumns();

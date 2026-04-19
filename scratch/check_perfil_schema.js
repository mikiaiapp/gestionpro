const { createClient } = require('@supabase/supabase-js');

// These values are usually in .env but I'll try to get them from the environment if possible
// Since I'm an agent, I'll assume I can use the same lib as the app or I'll just look for .env.local
const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('perfil_negocio')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching perfil_negocio:", error);
  } else {
    console.log("Columns found in perfil_negocio:", Object.keys(data[0] || {}));
  }
}

checkColumns();

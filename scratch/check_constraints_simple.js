const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Probing for constraints and duplicates...");
  const { data, error } = await supabase.from('perfil_negocio').select('user_id');
  if (error) {
    console.error("Error:", error.message);
    return;
  }
  
  const ids = data.map(r => r.user_id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  console.log("Total rows:", data.length);
  console.log("Duplicate user_ids:", duplicates);
  
  if (duplicates.length > 0) {
    console.warn("CRITICAL: table has duplicate user_ids. ON CONFLICT will fail unless it targets a specific unique index.");
  }
}

check();

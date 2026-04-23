const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking for multiple profiles per user...");
  const { data, error } = await supabase.from('perfil_negocio').select('user_id, id');
  if (error) {
    console.error("Error:", error.message);
    return;
  }
  
  const counts = {};
  data.forEach(row => {
    counts[row.user_id] = (counts[row.user_id] || 0) + 1;
  });
  
  console.log("Profile counts by user_id:", counts);
  
  const duplicates = Object.entries(counts).filter(([id, count]) => count > 1);
  if (duplicates.length > 0) {
    console.warn("⚠️ FOUND DUPLICATES! Users with more than one profile row:", duplicates);
    console.log("Full data of duplicates:", data.filter(d => duplicates.some(([uid]) => uid === d.user_id)));
  } else {
    console.log("No duplicates found per user_id.");
  }
}

check();

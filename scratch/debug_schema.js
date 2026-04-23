const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking columns in perfil_negocio...");
  const { data, error } = await supabase.from('perfil_negocio').select('*').limit(1);
  if (error) {
    console.error("Error fetching perfil_negocio:", error.message);
  } else if (data && data.length > 0) {
    const keys = Object.keys(data[0]);
    console.log("Columns found:", keys);
    console.log("Has smtp_email?", keys.includes('smtp_email'));
    console.log("Has smtp_app_password?", keys.includes('smtp_app_password'));
  } else {
    console.log("No data found in perfil_negocio to check columns.");
    // Try to describe if possible (select generic)
    const { error: error2 } = await supabase.from('perfil_negocio').select('smtp_email').limit(0);
    console.log("Probe for smtp_email column error:", error2 ? error2.message : "None (Exists)");
  }
}

check();

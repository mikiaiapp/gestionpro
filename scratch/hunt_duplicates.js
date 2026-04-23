const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Listing all rows for user...");
  const { data, error } = await supabase.from('perfil_negocio').select('*');
  if (error) {
    console.error("Error:", error.message);
    return;
  }
  
  console.log(`Found ${data.length} total rows.`);
  data.forEach((row, idx) => {
    console.log(`Row ${idx}: ID=${row.id}, UserID=${row.user_id}, Email=${row.smtp_email}, HasPass=${!!row.smtp_app_password}, Host=${row.smtp_host}`);
  });
}

check();

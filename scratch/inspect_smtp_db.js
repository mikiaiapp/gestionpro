const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking perfil_negocio content...");
  const { data, error } = await supabase.from('perfil_negocio').select('user_id, smtp_email, smtp_app_password');
  if (error) {
    console.error("Error:", error.message);
    return;
  }
  
  data.forEach((row, i) => {
    console.log(`Row ${i}:`);
    console.log(`  User ID: ${row.user_id}`);
    console.log(`  SMTP Email: ${row.smtp_email}`);
    console.log(`  SMTP Pass (Raw): ${row.smtp_app_password}`);
    const parts = row.smtp_app_password ? row.smtp_app_password.split(':') : [];
    console.log(`  Has colons: ${row.smtp_app_password?.includes(':')}`);
    console.log(`  Parts length: ${parts.length}`);
  });
}

check();

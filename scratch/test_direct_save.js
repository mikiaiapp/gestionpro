const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSave() {
  const targetUserId = '818f15f5-f1de-4e32-b76a-a56067c90af6';
  console.log(`Attempting to save SMTP data for user ${targetUserId}...`);
  
  const payload = {
    user_id: targetUserId,
    smtp_email: 'test@example.com',
    smtp_app_password: 'test_password_123'
  };
  
  const { data, error } = await supabase
    .from('perfil_negocio')
    .upsert(payload, { onConflict: 'user_id' });
    
  if (error) {
    console.error("❌ Save failed:", error.message);
  } else {
    console.log("✅ Save successful! Verification follow-up...");
    const { data: checkData } = await supabase
      .from('perfil_negocio')
      .select('smtp_email, smtp_app_password')
      .eq('user_id', targetUserId)
      .single();
    console.log("Verified data:", checkData);
  }
}

testSave();

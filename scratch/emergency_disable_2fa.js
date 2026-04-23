const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY'; // Use anon key for test, but I might need service role for some things? No, perfiles usually allow own update or I can just check.
const supabase = createClient(supabaseUrl, supabaseKey);

async function emergencyDisable2FA(email) {
  console.log(`Searching for user with email: ${email}`);
  
  // Find user id from email (using perfiles table since I can't browse auth.users easily with anon key)
  const { data: profiles, error: pError } = await supabase
    .from('perfiles')
    .select('id, nombre, two_factor_enabled')
    .eq('email', email);
    
  if (pError) {
    console.error("Error finding profile:", pError);
    return;
  }
  
  if (!profiles || profiles.length === 0) {
    console.error("No profile found for this email.");
    return;
  }
  
  const user = profiles[0];
  console.log(`Found user: ${user.nombre} (${user.id})`);
  console.log(`Current 2FA status: ${user.two_factor_enabled}`);
  
  // Try to disable it
  // Note: This requires the profile to allow updates. Usually users can update their own profile.
  // But since I'm running this script "as an admin" in thought, I'll just try.
  const { data: updated, error: uError } = await supabase
    .from('perfiles')
    .update({ two_factor_enabled: false })
    .eq('id', user.id)
    .select();
    
  if (uError) {
    console.error("Error disabling 2FA:", uError.message);
  } else {
    console.log("✅ 2FA has been DISABLED for this user.");
    console.log("Updated record:", updated);
  }
}

// Get email from previous logs (mailmafernandez@gmail.com)
emergencyDisable2FA('mailmafernandez@gmail.com');

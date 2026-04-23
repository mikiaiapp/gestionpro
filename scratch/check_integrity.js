const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIntegrity() {
  const { data, error } = await supabase.from('perfil_negocio').select('user_id');
  if (error) {
    console.error(error);
    return;
  }
  
  const ids = data.map(r => r.user_id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  console.log("Duplicate User IDs found:", dupes);
  
  if (dupes.length > 0) {
    console.log("CRITICAL: Multiple profiles detected for these users. This will break upsert logic.");
    // Let's see the rows for one dupe
    const { data: rows } = await supabase.from('perfil_negocio').select('*').eq('user_id', dupes[0]);
    console.log("Sample duplicate rows:", rows);
  } else {
    console.log("No duplicates found. Row-level integrity is preserved.");
  }
  
  // Try to find the user from the app logs (using the row 0/1 from before)
  const targetId = '93b50923-e03b-4bb4-8670-6e964bbabad3';
  const { data: profile } = await supabase.from('perfil_negocio').select('*').eq('user_id', targetId);
  console.log(`Profile for ${targetId}:`, profile);
}

checkIntegrity();


const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseAnonKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  console.log("Checking columns for 'proyectos'...");
  const { data, error } = await supabase.from('proyectos').select('*').limit(1);
  if (error) {
    console.error(error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Found record:", data[0]);
    console.log("Column keys:", Object.keys(data[0]));
  } else {
    console.log("No records found in 'proyectos'.");
  }
}

checkColumns();

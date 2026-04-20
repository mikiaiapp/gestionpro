
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://iocnfkrvwsaeoikvxuvw.supabase.co",
  "sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY"
);

async function checkTriggers() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error al leer perfiles:', error);
  } else {
    console.log('Estructura de perfiles:', data);
  }
}

checkTriggers();

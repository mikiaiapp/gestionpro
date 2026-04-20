
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://iocnfkrvwsaeoikvxuvw.supabase.co",
  "sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY"
);

async function checkIsolation() {
  const tables = ['proyectos', 'ventas', 'costes', 'perfiles'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error en ${table}:`, error.message);
    } else {
      console.log(`Columnas en ${table}:`, data.length > 0 ? Object.keys(data[0]) : 'Sin datos para inspeccionar');
    }
  }
}

checkIsolation();

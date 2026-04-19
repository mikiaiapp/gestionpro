const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await s.from('proyectos').select('*').limit(1);
  if (error) console.error(error);
  else console.log(JSON.stringify(Object.keys(data[0] || {}), null, 2));
})();

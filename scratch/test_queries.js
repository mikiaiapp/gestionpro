
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Testing Ventas complex select...');
  const { data: vts, error: vErr } = await supabase.from("ventas").select("*, clientes(*), proyectos(nombre), venta_lineas(*), cobros(importe)").limit(1);
  if (vErr) console.error('Ventas Query Error:', vErr);
  else console.log('Ventas Query Success');

  console.log('Testing Costes complex select...');
  const { data: csts, error: cErr } = await supabase.from("costes").select("*, proveedores(nombre), proyectos(nombre), coste_lineas(*), pagos(importe)").limit(1);
  if (cErr) console.error('Costes Query Error:', cErr);
  else console.log('Costes Query Success');
}
check();

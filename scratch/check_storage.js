
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iocnfkrvwsaeoikvxuvw.supabase.co';
const supabaseAnonKey = 'sb_publishable_8p8k8oT-5z9RQ8rEwPUdHA_Y-i_azbY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStorage() {
  console.log("Checking buckets...");
  const { data: buckets, error: bError } = await supabase.storage.listBuckets();
  if (bError) {
    console.error("Error listing buckets:", bError);
    return;
  }
  console.log("Buckets:", buckets.map(b => b.name));

  for (const bucket of buckets) {
    console.log(`\nChecking files in bucket: ${bucket.name}`);
    
    // Root files
    const { data: rootFiles } = await supabase.storage.from(bucket.name).list('', { limit: 10 });
    console.log(`- Root files:`, rootFiles?.map(f => f.name));

    // Common folders
    for (const folder of ['emitidas', 'recibidas', 'facturas', 'documents']) {
      const { data: folderFiles } = await supabase.storage.from(bucket.name).list(folder, { limit: 10 });
      if (folderFiles && folderFiles.length > 0) {
        console.log(`- Files in /${folder}:`, folderFiles?.map(f => f.name));
      }
    }
  }
}

checkStorage();

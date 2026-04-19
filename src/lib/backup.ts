import { supabase } from "./supabase";
import JSZip from "jszip";

/**
 * Realiza una copia de seguridad integral (Datos + PDFs) 
 * y la sube a la nube si es la primera vez en el día.
 */
export async function runAutoBackup() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const lastBackupKey = `last_auto_backup_${user.id}`;
    const lastBackupDate = localStorage.getItem(lastBackupKey);

    if (lastBackupDate === today) return;

    console.log("🚀 Generando Backup Completo (ZIP)...");
    const zipBlob = await createFullBackupZIP(user);
    if (!zipBlob) return;

    const fileName = `FULL_AUTO_${today}_${Date.now()}.zip`;
    const path = `backups/${fileName}`;

    // Subir a Storage
    const { error: uploadError } = await supabase.storage
      .from('facturas')
      .upload(path, zipBlob);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path);

    // Registrar en DB
    await supabase.from('backups').insert([{
      nombre: `Cloud Backup Completo ${today}`,
      archivo_url: publicUrl,
      size: zipBlob.size,
      user_id: user.id
    }]);

    // Limpieza (Mantener solo 5)
    const { data: oldBackups } = await supabase.from('backups').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (oldBackups && oldBackups.length > 5) {
      for (const b of oldBackups.slice(5)) {
        const storePath = b.archivo_url.split('/facturas/')[1];
        if (storePath) await supabase.storage.from('facturas').remove([storePath]);
        await supabase.from('backups').delete().eq('id', b.id);
      }
    }

    localStorage.setItem(lastBackupKey, today);
    console.log("✅ Backup Integral completado.");
  } catch (err) {
    console.error("❌ Fallo en Backup:", err);
  }
}

/**
 * Crea un Blob de tipo ZIP con el JSON de datos y todos los PDFs vinculados.
 */
export async function createFullBackupZIP(user: any) {
  const zip = new JSZip();
  const tables = [
    'clientes', 'proveedores', 'proyectos', 'proyecto_lineas', 
    'ventas', 'venta_lineas', 'costes', 'coste_lineas', 
    'cobros', 'pagos', 'perfil_negocio', 'tipos_iva', 
    'tipos_irpf', 'perfiles', 'proyecto_documentos'
  ];
  
  const backupData: any = { version: "3.0", timestamp: new Date().toISOString(), user: user.email, data: {} };
  const allUrls: string[] = [];
  
  for (const table of tables) {
    const { data } = await supabase.from(table).select('*');
    backupData.data[table] = data || [];
    if (data) {
      data.forEach((row: any) => {
        ['pdf_url', 'archivo_url', 'url_archivo', 'logo_url', 'imagen_corporativa_url'].forEach(col => {
          if (row[col] && typeof row[col] === 'string' && row[col].startsWith('http')) {
            allUrls.push(row[col]);
          }
        });
      });
    }
  }

  zip.file("data.json", JSON.stringify(backupData, null, 2));
  
  const docsFolder = zip.folder("documentos");
  const uniqueUrls = Array.from(new Set(allUrls));
  
  for (const url of uniqueUrls) {
    try {
      const filename = url.split('/').pop()?.split('?')[0] || `doc_${Math.random().toString(36).substr(2, 5)}.pdf`;
      const resp = await fetch(url);
      if (resp.ok) {
        const blob = await resp.blob();
        docsFolder?.file(filename, blob);
      }
    } catch (e) { console.warn("No se pudo incluir el archivo:", url); }
  }

  return await zip.generateAsync({ type: "blob" });
}

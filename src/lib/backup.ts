import { supabase } from "./supabase";

/**
 * Realiza una copia de seguridad automática si es la primera vez en el día.
 * Mantiene solo las últimas 5 copias en Supabase Storage.
 */
export async function runAutoBackup() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const lastBackupKey = `last_auto_backup_${user.id}`;
    const lastBackupDate = localStorage.getItem(lastBackupKey);

    // Si ya se ha hecho backup hoy, no hacemos nada
    if (lastBackupDate === today) return;

    console.log("🚀 Iniciando Copia de Seguridad Automática Diaria...");

    const tables = [
      'clientes', 'proveedores', 'proyectos', 'proyecto_lineas', 
      'ventas', 'venta_lineas', 'costes', 'coste_lineas', 
      'cobros', 'pagos', 'perfil_negocio', 'tipos_iva', 
      'tipos_irpf', 'perfiles', 'proyecto_documentos'
    ];
    
    const backupData: any = {
      version: "1.0-AUTO",
      timestamp: new Date().toISOString(),
      user: user.email,
      data: {}
    };
    
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*');
      backupData.data[table] = data || [];
    }
    
    const fileName = `AUTO_${today}_${Date.now()}.json`;
    const path = `backups/${fileName}`;
    const fileContent = JSON.stringify(backupData, null, 2);
    const blob = new Blob([fileContent], { type: 'application/json' });

    // Subir a Storage
    const { error: uploadError } = await supabase.storage
      .from('facturas') // Usamos el mismo bucket por simplicidad o uno nuevo si prefieres
      .upload(path, blob);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path);

    // Registrar en DB
    await supabase.from('backups').insert([{
      nombre: `Copia Automática ${today}`,
      archivo_url: publicUrl,
      size: blob.size,
      user_id: user.id
    }]);

    // Gestión de versiones (Mantener solo 5)
    const { data: oldBackups } = await supabase
      .from('backups')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (oldBackups && oldBackups.length > 5) {
      const toDelete = oldBackups.slice(5);
      for (const b of toDelete) {
        // Eliminar de Storage
        const storePath = b.archivo_url.split('/facturas/')[1];
        if (storePath) await supabase.storage.from('facturas').remove([storePath]);
        // Eliminar de DB
        await supabase.from('backups').delete().eq('id', b.id);
      }
    }

    localStorage.setItem(lastBackupKey, today);
    console.log("✅ Copia de Seguridad Automática completada con éxito.");

  } catch (err) {
    console.error("❌ Fallo en Backup Automático:", err);
  }
}

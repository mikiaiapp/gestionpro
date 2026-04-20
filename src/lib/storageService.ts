
import { supabase } from './supabase';

export const uploadInvoiceFile = async (
  file: File | Blob, 
  type: 'ventas' | 'costes' | 'presupuestos', 
  metadata: { number: string; entity: string }
): Promise<string> => {
  // Obtener usuario para aislamiento
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa para subir archivos");

  // Limpiar nombre de entidad
  const cleanEntity = metadata.entity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^a-z0-9]/gi, '_')     
    .toLowerCase()
    .substring(0, 30);

  const prefixes = { ventas: 'EMI', costes: 'REC', presupuestos: 'PRE' };
  const folders = { ventas: 'emitidas', costes: 'recibidas', presupuestos: 'presupuestos' };
  
  const fileName = `${prefixes[type]}_${metadata.number}_${cleanEntity}.pdf`.replace(/__+/g, '_');
  
  // RUTA ESTANCA POR USUARIO: {user_id}/{folder}/{file}
  const path = `${user.id}/${folders[type]}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('facturas')
    .upload(path, file, {
      upsert: true,
      contentType: 'application/pdf'
    });

  if (error) {
    console.error("Error uploading file:", error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('facturas')
    .getPublicUrl(path);

  return publicUrl;
};

export const deleteInvoiceFile = async (url: string) => {
  if (!url) return;
  try {
    // Extraer el path relativo después del nombre del bucket
    // Ej: .../storage/v1/object/public/facturas/{user_id}/recibidas/file.pdf
    const parts = url.split('/facturas/');
    const path = parts.length > 1 ? parts[1] : null;
    
    if (path) {
      await supabase.storage.from('facturas').remove([path]);
    }
  } catch (err) {
    console.warn("Could not delete file:", err);
  }
};

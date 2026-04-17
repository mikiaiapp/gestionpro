
import { supabase } from './supabase';

export const uploadInvoiceFile = async (
  file: File | Blob, 
  type: 'ventas' | 'costes', 
  metadata: { number: string; entity: string }
): Promise<string> => {
  // Limpiar nombre de entidad para evitar caracteres raros en el nombre de archivo
  const cleanEntity = metadata.entity.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 20);
  const prefix = type === 'ventas' ? 'EMI' : 'REC';
  const fileName = `${prefix}_${metadata.number}_${cleanEntity}.pdf`;
  const folder = type === 'ventas' ? 'emitidas' : 'recibidas';
  const path = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('facturas')
    .upload(path, file, {
      upsert: true, // Esto permite "reemplazar" si ya existe
      contentType: 'application/pdf'
    });

  if (error) {
    console.error("Error uploading file:", error);
    throw error;
  }

  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('facturas')
    .getPublicUrl(path);

  return publicUrl;
};

export const deleteInvoiceFile = async (url: string) => {
  if (!url) return;
  try {
    const path = url.split('/facturas/')[1];
    if (path) {
      await supabase.storage.from('facturas').remove([path]);
    }
  } catch (err) {
    console.warn("Could not delete file:", err);
  }
};

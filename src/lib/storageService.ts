
import { supabase } from './supabase';

export const uploadInvoiceFile = async (
  file: File | Blob, 
  type: 'ventas' | 'costes' | 'presupuestos', 
  metadata: { number: string; entity: string }
): Promise<string> => {
  // Limpiar nombre de entidad de forma estricta para evitar subcarpetas accidentales o caracteres raros
  const cleanEntity = metadata.entity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar tildes
    .replace(/[^a-z0-9]/gi, '_')     // Quitar todo lo que no sea alfanumérico
    .toLowerCase()
    .substring(0, 30);

  const prefixes = { ventas: 'EMI', costes: 'REC', presupuestos: 'PRE' };
  const folders = { ventas: 'emitidas', costes: 'recibidas', presupuestos: 'presupuestos' };
  
  // Nombre de archivo: [PREFIJO]_[NUMERO]_[ENTIDAD].pdf
  const fileName = `${prefixes[type]}_${metadata.number}_${cleanEntity}.pdf`.replace(/__+/g, '_');
  const path = `${folders[type]}/${fileName}`;

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

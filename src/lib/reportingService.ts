
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { formatCurrency } from './format';

interface VATBookEntry {
  fecha: string;
  num_factura: string;
  nif: string;
  nombre: string;
  base_imponible: number;
  iva_pct: number;
  iva_importe: number;
  retencion_pct?: number;
  retencion_importe?: number;
  total: number;
}

export const getVATBookPDF = (type: 'ventas' | 'costes', data: any[], perfil: any): jsPDF => {
  const doc = new jsPDF('l', 'mm', 'a4'); // Paisaje para que quepan las columnas
  const title = type === 'ventas' ? 'LIBRO REGISTRO DE FACTURAS EXPEDIDAS (IVA REPERCUTIDO)' : 'LIBRO REGISTRO DE FACTURAS RECIBIDAS (IVA SOPORTADO)';
  
  // Cabecera del informe
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 15);
  
  doc.setFontSize(10);
  doc.text(`Empresa: ${perfil?.nombre || ''}`, 14, 22);
  doc.text(`NIF: ${perfil?.nif || ''}`, 14, 27);
  doc.text(`Fecha Generación: ${new Date().toLocaleDateString()}`, 250, 22, { align: 'right' });

  const tableData = data.map((v, idx) => [
    type === 'costes' ? v.num_interno : (idx + 1),
    new Date(v.fecha).toLocaleDateString(),
    type === 'ventas' ? `${v.serie}-${v.num_factura}` : v.num_factura_proveedor,
    type === 'ventas' ? v.clientes?.nif : v.proveedores?.nif,
    type === 'ventas' ? v.clientes?.nombre : v.proveedores?.nombre,
    formatCurrency(v.base_imponible || 0),
    `${v.iva_pct || 0}%`,
    formatCurrency(v.iva_importe || 0),
    `${v.retencion_pct || 0}%`,
    formatCurrency(v.retencion_importe || 0),
    formatCurrency(v.total || 0)
  ]);

  (doc as any).autoTable({
    startY: 35,
    head: [[
      type === 'costes' ? 'Reg.' : 'Nº',
      'Fecha',
      'Factura',
      'NIF',
      'Razón Social',
      'Base Imp.',
      'IVA %',
      'Cuota IVA',
      'RE %',
      'Cuota RE',
      'TOTAL'
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillStyle: 'bold', fillColor: [40, 40, 40], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      5: { halign: 'right' },
      6: { halign: 'center' },
      7: { halign: 'right' },
      8: { halign: 'center' },
      9: { halign: 'right' },
      10: { halign: 'right' }
    }
  });

  return doc;
};

export const exportVATBookPDF = (type: 'ventas' | 'costes', data: any[], perfil: any) => {
  const doc = getVATBookPDF(type, data, perfil);
  doc.save(`${type === 'ventas' ? 'Libro_IVA_Repercutido' : 'Libro_IVA_Soportado'}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportVATBookExcel = (type: 'ventas' | 'costes', data: any[]) => {
  const preparedData = data.map((v, idx) => ({
    'Registro/Nº': type === 'costes' ? v.num_interno : (idx + 1),
    'Fecha': new Date(v.fecha).toLocaleDateString(),
    'Número Factura': type === 'ventas' ? `${v.serie}-${v.num_factura}` : v.num_factura_proveedor,
    'NIF': type === 'ventas' ? v.clientes?.nif : v.proveedores?.nif,
    'Nombre / Razón Social': type === 'ventas' ? v.clientes?.nombre : v.proveedores?.nombre,
    'Base Imponible': v.base_imponible || 0,
    '% IVA': v.iva_pct || 0,
    'Cuota IVA': v.iva_importe || 0,
    '% Retención': v.retencion_pct || 0,
    'Cuota Retención': v.retencion_importe || 0,
    'TOTAL': v.total || 0
  }));

  const worksheet = XLSX.utils.json_to_sheet(preparedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Libro IVA');
  
  // Ajustar anchos de columna
  const wscols = [
    { wch: 8 },  // Registro
    { wch: 12 }, // Fecha
    { wch: 15 }, // Factura
    { wch: 15 }, // NIF
    { wch: 30 }, // Nombre
    { wch: 15 }, // Base
    { wch: 8 },  // IVA %
    { wch: 15 }, // IVA Cuota
    { wch: 8 },  // Ret %
    { wch: 15 }, // Ret Cuota
    { wch: 15 }, // Total
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, `${type === 'ventas' ? 'Libro_IVA_Repercutido' : 'Libro_IVA_Soportado'}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const generateFiscalPack = async (
  periodName: string,
  ventas: any[],
  costes: any[],
  perfil: any
) => {
  const zip = new JSZip();
  const folderName = `Pack_Fiscal_${periodName.replace(/\s+/g, '_')}`;
  const root = zip.folder(folderName);
  
  // 1. Generar Libros de IVA en PDF
  const libVentasDoc = getVATBookPDF('ventas', ventas, perfil);
  const libCostesDoc = getVATBookPDF('costes', costes, perfil);
  
  root?.file('Libro_IVA_Repercutido.pdf', libVentasDoc.output('blob'));
  root?.file('Libro_IVA_Soportado.pdf', libCostesDoc.output('blob'));
  
  // 2. Carpeta de Facturas Emitidas
  const emitidasFolder = root?.folder('Facturas_Emitidas');
  for (const v of ventas) {
    if (v.pdf_url) {
      try {
        const response = await fetch(v.pdf_url);
        const blob = await response.blob();
        const fileName = `Factura_${v.serie}-${v.num_factura}.pdf`;
        emitidasFolder?.file(fileName, blob);
      } catch (e) {
        console.error(`Error al descargar factura emitida ${v.num_factura}:`, e);
      }
    }
  }
  
  // 3. Carpeta de Facturas Recibidas
  const recibidasFolder = root?.folder('Facturas_Recibidas');
  for (const c of costes) {
    if (c.pdf_url) {
      try {
        const response = await fetch(c.pdf_url);
        const blob = await response.blob();
        const fileName = `Gasto_${c.num_factura_proveedor || c.id.substring(0,8)}.pdf`;
        recibidasFolder?.file(fileName, blob);
      } catch (e) {
        console.error(`Error al descargar factura recibida ${c.num_factura_proveedor}:`, e);
      }
    }
  }
  
  // 4. Generar y descargar ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${folderName}.zip`;
  link.click();
  window.URL.revokeObjectURL(url);
};

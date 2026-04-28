import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency } from './format';

export const exportVATBookPDF = async (tipo: 'ventas' | 'costes', data: any[], perfil: any) => {
  const doc = new jsPDF('l', 'mm', 'a4') as any;
  const isVentas = tipo === 'ventas';
  const title = isVentas ? 'Libro Registro de Facturas Expedidas' : 'Libro Registro de Facturas Recibidas';
  
  // Agrupar por factura y por tipo de IVA
  const vts = data || [];
  const grouped = vts.reduce((acc: any, v: any) => {
    const invoiceLines = (isVentas ? v.venta_lineas : v.coste_lineas) || [];
    
    // Agrupar líneas por porcentaje de IVA
    const linesByIva = invoiceLines.reduce((lineAcc: any, line: any) => {
      const ivaPct = line.iva_pct ?? 21;
      if (!lineAcc[ivaPct]) {
        lineAcc[ivaPct] = { base: 0, iva: 0 };
      }
      lineAcc[ivaPct].base += line.unidades * line.precio_unitario;
      lineAcc[ivaPct].iva += (line.unidades * line.precio_unitario * (ivaPct / 100));
      return lineAcc;
    }, {});

    Object.entries(linesByIva).forEach(([ivaPct, totals]: [string, any]) => {
      const internalNum = (v.num_interno || v.registro_interno || v.numero || "").toString();
      acc.push({
        registro: internalNum,
        fecha: v.fecha,
        factura: isVentas ? v.num_factura : v.num_factura_proveedor,
        nif: isVentas ? v.clientes?.nif : v.proveedores?.nif,
        entidad: isVentas ? v.clientes?.nombre : v.proveedores?.nombre,
        base: totals.base,
        iva_pct: parseInt(ivaPct),
        iva_importe: totals.iva,
        total: totals.base + totals.iva - (v.retencion_importe || 0)
      });
    });
    return acc;
  }, []);

  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Empresa: ${perfil?.nombre || ''} - NIF: ${perfil?.nif || ''}`, 14, 28);
  doc.text(`Ejercicio: ${new Date().getFullYear()}`, 14, 34);

  const tableData = grouped.map((item: any) => [
    item.registro,
    new Date(item.fecha).toLocaleDateString(),
    item.factura,
    item.nif,
    item.entidad,
    formatCurrency(item.base),
    `${item.iva_pct}%`,
    formatCurrency(item.iva_importe),
    formatCurrency(item.total)
  ]);

  doc.autoTable({
    startY: 40,
    head: [['Nº Reg.', 'Fecha', 'Factura', 'NIF', isVentas ? 'Cliente' : 'Proveedor', 'Base Imp.', 'IVA', 'Cuota IVA', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillGray: 200, textColor: 20, fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: {
      5: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' }
    }
  });

  doc.save(`Libro_IVA_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportVATBookExcel = (tipo: 'ventas' | 'costes', data: any[]) => {
  const isVentas = tipo === 'ventas';
  
  const vts = data || [];
  const grouped = vts.reduce((acc: any, v: any) => {
    const invoiceLines = (isVentas ? v.venta_lineas : v.coste_lineas) || [];
    
    // Agrupar líneas por porcentaje de IVA
    const linesByIva = invoiceLines.reduce((lineAcc: any, line: any) => {
      const ivaPct = line.iva_pct ?? 21;
      if (!lineAcc[ivaPct]) {
        lineAcc[ivaPct] = { base: 0, iva: 0 };
      }
      lineAcc[ivaPct].base += line.unidades * line.precio_unitario;
      lineAcc[ivaPct].iva += (line.unidades * line.precio_unitario * (ivaPct / 100));
      return lineAcc;
    }, {});

    Object.entries(linesByIva).forEach(([ivaPct, totals]: [string, any]) => {
      const internalNum = (v.num_interno || v.registro_interno || v.numero || "").toString();
      acc.push({
        'Nº Registro': internalNum,
        'Fecha': new Date(v.fecha).toLocaleDateString(),
        'Factura': isVentas ? v.num_factura : v.num_factura_proveedor,
        'NIF': isVentas ? v.clientes?.nif : v.proveedores?.nif,
        [isVentas ? 'Cliente' : 'Proveedor']: isVentas ? v.clientes?.nombre : v.proveedores?.nombre,
        'Base Imponible': totals.base,
        'IVA %': parseInt(ivaPct),
        'Cuota IVA': totals.iva,
        'Total Factura': totals.base + totals.iva - (v.retencion_importe || 0)
      });
    });
    return acc;
  }, []);

  const ws = XLSX.utils.json_to_sheet(grouped);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Libro IVA");
  XLSX.writeFile(wb, `Libro_IVA_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

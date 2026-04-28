
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

const applyCorporateStyle = (doc: jsPDF) => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  
  const drawBackground = () => {
    // Fondo crema corporativo (#ede8e0)
    doc.setFillColor(237, 232, 224); 
    doc.rect(0, 0, width, height, 'F');
  };

  drawBackground();

  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = function() {
    const result = originalAddPage();
    drawBackground();
    return result;
  };
};

export const getVATBookPDF = (type: 'ventas' | 'costes', data: any[], perfil: any): jsPDF => {
  const doc = new jsPDF('l', 'mm', 'a4');
  applyCorporateStyle(doc);

  const title = type === 'ventas' ? 'LIBRO REGISTRO DE FACTURAS EXPEDIDAS (IVA REPERCUTIDO)' : 'LIBRO REGISTRO DE FACTURAS RECIBIDAS (IVA SOPORTADO)';
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();

  // Cabecera Premium
  if (perfil?.logo_url) {
    try {
      doc.addImage(perfil.logo_url, 'PNG', 14, 10, 30, 0);
    } catch (e) {}
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55); // Gray 800
  doc.text(title, perfil?.logo_url ? 50 : 14, 18);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // Gray 500
  doc.text(`Empresa: ${perfil?.nombre || ''}`, perfil?.logo_url ? 50 : 14, 25);
  doc.text(`NIF: ${perfil?.nif || ''}`, perfil?.logo_url ? 50 : 14, 30);
  
  const ejercicio = data.length > 0 ? new Date(data[0].fecha).getFullYear() : new Date().getFullYear();
  doc.text(`Ejercicio: ${ejercicio}`, perfil?.logo_url ? 50 : 14, 35);

  doc.setFontSize(9);
  doc.text(`Fecha Generación: ${new Date().toLocaleDateString()}`, PAGE_WIDTH - 14, 25, { align: 'right' });
  doc.text(`Software: GestiónPro v1.7.1`, PAGE_WIDTH - 14, 30, { align: 'right' });

  // Línea divisoria elegante
  doc.setDrawColor(229, 231, 235);
  doc.line(14, 40, PAGE_WIDTH - 14, 40);

  // Agrupar datos por factura y tipo de IVA
  const reportRows: any[] = [];

  data.forEach(invoice => {
    const lines = type === 'ventas' ? (invoice.venta_lineas || []) : (invoice.coste_lineas || []);
    const ivaGroups: { [key: number]: { base: number, cuota: number } } = {};
    
    if (lines.length > 0) {
      lines.forEach((l: any) => {
        const rate = Number(l.iva_pct) || 0;
        if (!ivaGroups[rate]) ivaGroups[rate] = { base: 0, cuota: 0 };
        const subtotal = (Number(l.unidades) || 1) * (Number(l.precio_unitario) || 0);
        ivaGroups[rate].base += subtotal;
        ivaGroups[rate].cuota += (subtotal * rate) / 100;
      });
    } else {
      const rate = Number(invoice.iva_pct) || 0;
      ivaGroups[rate] = { 
        base: Number(invoice.base_imponible) || Number(invoice.total) / (1 + rate/100) || 0, 
        cuota: Number(invoice.iva_importe) || 0 
      };
    }

    Object.keys(ivaGroups).forEach((rateStr) => {
      const rate = Number(rateStr);
      const group = ivaGroups[rate];
      
      const totalInvoiceBase = Object.values(ivaGroups).reduce((acc, g) => acc + g.base, 0);
      const ratio = totalInvoiceBase > 0 ? group.base / totalInvoiceBase : 0;
      const partialRetencion = (Number(invoice.retencion_importe) || 0) * ratio;

      reportRows.push({
        registro: invoice.num_interno || invoice.registro_interno || invoice.numero || '-',
        fecha: invoice.fecha,
        factura: type === 'ventas' ? `${invoice.serie}-${invoice.num_factura}` : (invoice.num_factura_proveedor || invoice.num_factura || '-'),
        nif: type === 'ventas' 
          ? (invoice.clientes?.nif || invoice.nif_cliente || '-') 
          : (invoice.proveedores?.nif || invoice.nif_proveedor || invoice.proveedor_nif || invoice.nif_provider || '-'),
        razon: type === 'ventas' 
          ? (invoice.clientes?.nombre || invoice.nombre_cliente || '-') 
          : (invoice.proveedores?.nombre || invoice.nombre_proveedor || invoice.proveedor_nombre || '-'),
        base: group.base,
        iva_pct: rate,
        iva_cuota: group.cuota,
        re_pct: invoice.retencion_pct || 0,
        re_cuota: partialRetencion,
        total: group.base + group.cuota - partialRetencion
      });
    });
  });

  reportRows.sort((a, b) => {
    const regComp = a.registro.toString().localeCompare(b.registro.toString(), undefined, { numeric: true });
    if (regComp !== 0) return regComp;
    return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
  });

  const tableData = reportRows.map(row => [
    row.registro,
    new Date(row.fecha).toLocaleDateString(),
    row.factura,
    row.nif,
    row.razon,
    formatCurrency(row.base),
    `${row.iva_pct}%`,
    formatCurrency(row.iva_cuota),
    `${row.re_pct}%`,
    formatCurrency(row.re_cuota),
    formatCurrency(row.total)
  ]);

  (doc as any).autoTable({
    startY: 45,
    head: [[
      type === 'costes' ? 'Nº Reg.' : 'Nº',
      'Fecha',
      'Factura',
      'NIF',
      'Proveedor / Cliente',
      'Base Imp.',
      'IVA',
      'Cuota IVA',
      'RE/Ret',
      'Cuota RE',
      'TOTAL'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [17, 24, 39], // Slate 900 (Elegant dark)
      textColor: 255, 
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 7.5, 
      cellPadding: 2.5, 
      valign: 'middle',
      font: 'helvetica'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'left', cellWidth: 25 },
      3: { halign: 'left', cellWidth: 25 },
      5: { halign: 'right' },
      6: { halign: 'center' },
      7: { halign: 'right' },
      8: { halign: 'center' },
      9: { halign: 'right' },
      10: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // Finalización y Numeración de Páginas (X de Y)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    const str = `Página ${i} de ${totalPages}`;
    doc.text(str, PAGE_WIDTH / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  return doc;
};

export const exportVATBookPDF = (type: 'ventas' | 'costes', data: any[], perfil: any) => {
  const doc = getVATBookPDF(type, data, perfil);
  doc.save(`${type === 'ventas' ? 'Libro_IVA_Repercutido' : 'Libro_IVA_Soportado'}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportVATBookExcel = (type: 'ventas' | 'costes', data: any[]) => {
  const preparedData = data.map((v, idx) => ({
    'Registro/Nº': type === 'costes' ? (v.num_interno || v.registro_interno || v.numero || '-') : (idx + 1),
    'Fecha': new Date(v.fecha).toLocaleDateString(),
    'Número Factura': type === 'ventas' ? `${v.serie}-${v.num_factura}` : (v.num_factura_proveedor || v.num_factura || '-'),
    'NIF': type === 'ventas' 
      ? (v.clientes?.nif || v.nif_cliente || '-') 
      : (v.proveedores?.nif || v.nif_proveedor || v.proveedor_nif || v.nif_provider || '-'),
    'Nombre / Razón Social': type === 'ventas' 
      ? (v.clientes?.nombre || v.nombre_cliente || '-') 
      : (v.proveedores?.nombre || v.nombre_proveedor || v.proveedor_nombre || '-'),
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
  
  const wscols = [
    { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 35 },
    { wch: 15 }, { wch: 8 },  { wch: 15 }, { wch: 8 },  { wch: 15 }, { wch: 15 }
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, `${type === 'ventas' ? 'Libro_IVA_Repercutido' : 'Libro_IVA_Soportado'}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const generateFiscalPack = async (periodName: string, ventas: any[], costes: any[], perfil: any) => {
  const zip = new JSZip();
  const folderName = `Pack_Fiscal_${periodName.replace(/\s+/g, '_')}`;
  const root = zip.folder(folderName);
  
  const libVentasDoc = getVATBookPDF('ventas', ventas, perfil);
  const libCostesDoc = getVATBookPDF('costes', costes, perfil);
  
  root?.file('Libro_IVA_Repercutido.pdf', libVentasDoc.output('blob'));
  root?.file('Libro_IVA_Soportado.pdf', libCostesDoc.output('blob'));
  
  const emitidasFolder = root?.folder('Facturas_Emitidas');
  for (const v of ventas) {
    if (v.archivo_url || v.pdf_url) {
      try {
        const response = await fetch(v.archivo_url || v.pdf_url);
        const blob = await response.blob();
        emitidasFolder?.file(`Factura_${v.serie}-${v.num_factura}.pdf`, blob);
      } catch (e) { console.error(e); }
    }
  }
  
  const recibidasFolder = root?.folder('Facturas_Recibidas');
  for (const c of costes) {
    if (c.archivo_url || c.pdf_url) {
      try {
        const response = await fetch(c.archivo_url || c.pdf_url);
        const blob = await response.blob();
        recibidasFolder?.file(`Gasto_${c.num_factura_proveedor || c.id.substring(0,8)}.pdf`, blob);
      } catch (e) { console.error(e); }
    }
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${folderName}.zip`;
  link.click();
};

export const getProjectSummaryPDF = (project: any, perfil: any): jsPDF => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const MARGIN = 14;
  applyCorporateStyle(doc);

  if (perfil?.logo_url) {
    try { doc.addImage(perfil.logo_url, 'PNG', MARGIN, 10, 30, 0); } catch (e) {}
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('RESUMEN DE PROYECTO', perfil?.logo_url ? 50 : MARGIN, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text(`Empresa: ${perfil?.nombre || ''}`, perfil?.logo_url ? 50 : MARGIN, 27);
  doc.text(`NIF: ${perfil?.nif || ''}`, perfil?.logo_url ? 50 : MARGIN, 32);

  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN, 40, 210 - MARGIN, 40);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(`PROYECTO: ${project.nombre}`, MARGIN, 50);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(`CLIENTE: ${project.clientes?.nombre || 'Particular'}`, MARGIN, 57);
  doc.text(`ESTADO: ${project.estado?.toUpperCase()}`, MARGIN, 62);

  const econData = [
    ['VENTA (Facturación)', formatCurrency(project.previstoVenta), formatCurrency(project.totalVentas), formatCurrency(project.totalVentas - project.previstoVenta)],
    ['COSTE (Gastos)', formatCurrency(project.previstoCoste), formatCurrency(project.totalCostes), formatCurrency(project.totalCostes - project.previstoCoste)],
    ['MARGEN BRUTO', formatCurrency(project.margenPrevisto), formatCurrency(project.margen), formatCurrency(project.desviacionMargen)]
  ];

  (doc as any).autoTable({
    startY: 70,
    head: [['Concepto', 'Presupuesto', 'Real (Actual)', 'Desviación']],
    body: econData,
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55], textColor: 255 },
    styles: { font: 'helvetica', fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
  });

  const lastTable = (doc as any).lastAutoTable;
  const finalY = (lastTable ? lastTable.finalY : 100) + 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Rentabilidad:', MARGIN, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Margen sobre ventas: ${project.margenPct.toFixed(2)}%`, MARGIN, finalY + 7);

  if (project.ventas?.length > 0) {
    (doc as any).autoTable({
        startY: finalY + 20,
        head: [['Factura', 'Fecha', 'Total', 'Cobrado']],
        body: project.ventas.map((v: any) => [
            `${v.serie}-${v.num_factura}`,
            new Date(v.fecha).toLocaleDateString(),
            formatCurrency(v.total),
            formatCurrency((project.cobros || []).filter((c: any) => c.venta_id === v.id).reduce((acc: number, c: any) => acc + c.importe, 0))
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
    });
  }

  return doc;
};

export const exportProjectSummaryPDF = (project: any, perfil: any) => {
  const doc = getProjectSummaryPDF(project, perfil);
  doc.save(`Resumen_Proyecto_${project.nombre.replace(/\s+/g, '_')}.pdf`);
};

export const generateProjectSummaryPDF = async (projects: any[], perfil: any) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    applyCorporateStyle(doc);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    doc.text('RESUMEN DE MARGEN POR PROYECTO', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`${perfil.nombre} - Analítica de Explotación`, 14, 28);

    const tableHead = [['PROYECTO / CLIENTE', 'PRESUPUESTO (VTA)', 'GASTOS REALES', 'MARGEN NETO', '% MARGEN', 'FACTURADO', 'COBRADO']];
    const tableBody = projects.map(p => [
      `${p.nombre}\n${p.clientes?.nombre || 'S/C'}`,
      formatCurrency(p.total || 0),
      formatCurrency(p.total_gastos || 0),
      formatCurrency((p.total || 0) - (p.total_gastos || 0)),
      `${(p.total > 0 ? (((p.total - p.total_gastos) / p.total) * 100) : 0).toFixed(1)}%`,
      formatCurrency(p.facturado || 0),
      formatCurrency(p.cobrado || 0)
    ]);

    (doc as any).autoTable({
      startY: 35,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 55], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: { 3: { fontStyle: 'bold' } }
    });

    doc.save(`resumen_global_proyectos.pdf`);
};

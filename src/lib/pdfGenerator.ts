import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from './format';

// Extender tipos para jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface PDFData {
  tipo: 'PRESUPUESTO' | 'FACTURA';
  numero: string;
  fecha: string;
  cliente: {
    nombre: string;
    nif: string;
    direccion: string;
    poblacion: string;
    cp: string;
    provincia: string;
    email?: string;
    telefono?: string;
  };
  perfil: {
    nombre: string;
    nif: string;
    direccion: string;
    poblacion: string;
    cp: string;
    provincia: string;
    cuenta_bancaria: string;
    condiciones_legales?: string;
    lopd_text?: string;
    texto_aceptacion?: string;
    email?: string;
    logo_url?: string;
    imagen_corporativa_url?: string;
  };
  condiciones_particulares?: string;
  lineas: Array<{
    unidades: number;
    descripcion: string;
    precio_unitario: number;
  }>;
  totales: {
    base: number;
    iva_pct: number;
    iva_importe: number;
    retencion_pct: number;
    retencion_importe: number;
    total: number;
  };
}

const getBase64FromUrl = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Could not fetch image for PDF:", url);
    return "";
  }
};

export const generatePDF = async (data: PDFData) => {
  const doc = new jsPDF();
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const MARGIN = 14;

  const drawPageBackground = () => {
    doc.setFillColor(237, 232, 224); // #ede8e0
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  };

  // Sobrescribir addPage para que todas las páginas nuevas tengan el fondo
  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = function() {
    const result = originalAddPage();
    drawPageBackground();
    return result;
  };

  const drawPageBranding = async () => {
    let y = 10;
    if (data.perfil.logo_url) {
      const b64 = await getBase64FromUrl(data.perfil.logo_url);
      if (b64) doc.addImage(b64, 'PNG', MARGIN, y, 35, 0);
    }
  };

  // --- PÁGINA 1: DATOS OPERATIVOS ---
  drawPageBackground();
  await drawPageBranding();

  // Datos Emisor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(data.perfil.nombre.toUpperCase(), MARGIN, 85);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  const emisorLines = [
    `NIF: ${data.perfil.nif}`,
    data.perfil.email,
    data.perfil.direccion,
    `${data.perfil.cp} ${data.perfil.poblacion} (${data.perfil.provincia})`
  ].filter(Boolean);
  doc.text(emisorLines, MARGIN, 90);

  if (data.perfil.cuenta_bancaria) {
    doc.setFont('helvetica', 'bold');
    doc.text(`IBAN: ${data.perfil.cuenta_bancaria}`, MARGIN, 105);
    doc.setFont('helvetica', 'normal');
  }

  // Título y Detalles (Derecha)
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(121, 85, 72); 
  doc.text(data.tipo, PAGE_WIDTH - MARGIN, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Referencia: ${data.numero}`, PAGE_WIDTH - MARGIN, 30, { align: 'right' });
  doc.text(`Fecha: ${new Date(data.fecha).toLocaleDateString('es-ES')}`, PAGE_WIDTH - MARGIN, 35, { align: 'right' });

  // Cuadro Cliente
  const clientX = 120;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(data.tipo === 'FACTURA' ? 'FACTURAR A:' : 'PRESUPUESTADO A:', clientX, 50);
  
  doc.setFont('helvetica', 'normal');
  const clienteLines = [
    data.cliente.nombre,
    data.cliente.nif ? `NIF: ${data.cliente.nif}` : '',
    data.cliente.email ? `Email: ${data.cliente.email}` : '',
    data.cliente.telefono ? `Tel: ${data.cliente.telefono}` : '',
    data.cliente.direccion,
    `${data.cliente.cp || ''} ${data.cliente.poblacion || ''} ${data.cliente.provincia ? `(${data.cliente.provincia})` : ''}`
  ].filter(Boolean);
  doc.text(clienteLines, clientX, 55);

  // Tabla Simplificada (Descripción e Importe)
  const tableHead = [['DESCRIPCIÓN / CONCEPTO', 'IMPORTE']];
  const tableBody = data.lineas.map(l => [
    l.descripcion,
    formatCurrency(l.precio_unitario || 0)
  ]);

  doc.autoTable({
    startY: 120,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [245, 243, 239], textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 4, font: 'helvetica', fillColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
    }
  });

  // Totales
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalsX = 140;
  doc.setFontSize(9);
  doc.setTextColor(0);
  
  doc.text('Base Imponible:', totalsX, finalY);
  doc.text(formatCurrency(data.totales.base), PAGE_WIDTH - MARGIN, finalY, { align: 'right' });
  
  doc.text(`IVA (${data.totales.iva_pct}%):`, totalsX, finalY + 7);
  doc.text(formatCurrency(data.totales.iva_importe), PAGE_WIDTH - MARGIN, finalY + 7, { align: 'right' });

  if (data.totales.retencion_pct > 0) {
    doc.setTextColor(150, 0, 0);
    doc.text(`Retención IRPF (${data.totales.retencion_pct}%):`, totalsX, finalY + 14);
    doc.text(`-${formatCurrency(data.totales.retencion_importe)}`, PAGE_WIDTH - MARGIN, finalY + 14, { align: 'right' });
  }

  const grandTotalY = finalY + (data.totales.retencion_pct > 0 ? 25 : 18);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(121, 85, 72);
  doc.text('TOTAL:', totalsX, grandTotalY);
  doc.text(formatCurrency(data.totales.total), PAGE_WIDTH - MARGIN, grandTotalY, { align: 'right' });

  // Pie P1
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text(`Página 1 de 2 - Generado por GestiónPro`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, { align: 'center' });

  // --- PÁGINA 2: ANEXO LEGAL Y FIRMA ---
  doc.addPage();
  
  let footerY_P2 = 10;

  if (data.tipo === 'PRESUPUESTO') {
    // Imagen Corporativa Grande SOLO para presupuestos
    if (data.perfil.imagen_corporativa_url) {
      const b64corp = await getBase64FromUrl(data.perfil.imagen_corporativa_url);
      if (b64corp) {
          doc.addImage(b64corp, 'PNG', MARGIN, footerY_P2, PAGE_WIDTH - (MARGIN * 2), 55, undefined, 'FAST');
          footerY_P2 += 65;
      }
    } else if (data.perfil.logo_url) {
      const b64 = await getBase64FromUrl(data.perfil.logo_url);
      if (b64) doc.addImage(b64, 'PNG', MARGIN, footerY_P2, 50, 0);
      footerY_P2 += 35;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(121, 85, 72);
    doc.text("ANEXO LEGAL Y ACEPTACIÓN", MARGIN, footerY_P2);
    
    let currentY = footerY_P2 + 8;
    doc.setFontSize(7);
    doc.setTextColor(60);

    const userEmail = data.perfil.email || "";
    const processText = (t: string) => (t || "").replace(/EMAIL_PLACEHOLDER/g, userEmail);

    const sections = [
      { title: "CONDICIONES PARTICULARES", content: data.condiciones_particulares },
      { title: "CONDICIONES GENERALES", content: data.perfil.condiciones_legales },
      { title: "PROTECCIÓN DE DATOS (LOPD)", content: data.perfil.lopd_text }
    ];

    sections.forEach(sec => {
      if (sec.content && sec.content.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.text(sec.title + ":", MARGIN, currentY);
        currentY += 4;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(processText(sec.content), PAGE_WIDTH - (MARGIN * 2));
        doc.text(lines, MARGIN, currentY);
        currentY += (lines.length * 3.2) + 5;
      }
    });

    // Espacio de Firma
    if (currentY > PAGE_HEIGHT - 60) {
      doc.addPage();
      currentY = 20;
    }

    currentY += 6;
    doc.setDrawColor(121, 85, 72);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, currentY, PAGE_WIDTH - MARGIN, currentY);
    
    currentY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("ACEPTACIÓN DEL CLIENTE:", MARGIN, currentY);
    
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const aceptacionText = data.perfil.texto_aceptacion || "Acepto el presente documento y todas las condiciones descritas.";
    const aceptacionLines = doc.splitTextToSize(processText(aceptacionText), PAGE_WIDTH - (MARGIN * 2));
    doc.text(aceptacionLines, MARGIN, currentY);

    currentY += (aceptacionLines.length * 4) + 15;
    
    doc.line(MARGIN + 10, currentY, MARGIN + 80, currentY);
    doc.setFontSize(8);
    doc.text("Firma o Sello del Cliente", MARGIN + 45, currentY + 5, { align: 'center' });
    doc.text(`Fecha de aceptación: ___ / ___ / 202_`, PAGE_WIDTH - MARGIN - 60, currentY);

  } else {
    // FACTURA: Solo LOPD y QR
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(121, 85, 72);
    doc.text("INFORMACIÓN LEGAL Y VERIFICACIÓN", MARGIN, footerY_P2);
    
    let currentY = footerY_P2 + 10;
    doc.setFontSize(7);
    doc.setTextColor(60);
    
    doc.setFont('helvetica', 'bold');
    doc.text("PROTECCIÓN DE DATOS (LOPD):", MARGIN, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'normal');
    const lopdLines = doc.splitTextToSize(data.perfil.lopd_text || "", PAGE_WIDTH - MARGIN * 2 - 40);
    doc.text(lopdLines, MARGIN, currentY);

    // QR Verifactu
    const qrSize = 35;
    const qrX = PAGE_WIDTH - MARGIN - qrSize;
    const qrY = footerY_P2 + 5;
    
    doc.setFontSize(6);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text("SISTEMA VERI*FACTU", qrX + qrSize/2, qrY + qrSize + 4, { align: 'center' });
    
    const qrData = `https://www2.agenciatributaria.gob.es/wlpl/zsce-itst/verifactu/verificar-factura?nif=${data.perfil.nif}&numero=${data.numero}&fecha=${data.fecha}&importe=${data.totales.total}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
    const qrBase64 = await getBase64FromUrl(qrUrl);
    if (qrBase64) doc.addImage(qrBase64, 'PNG', qrX, qrY, qrSize, qrSize);
  }

  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text(`Página 2 de 2 - Generado por GestiónPro`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, { align: 'center' });

  // Guardar
  doc.save(`${data.tipo.toLowerCase()}_${data.numero}.pdf`);
  return doc;
};

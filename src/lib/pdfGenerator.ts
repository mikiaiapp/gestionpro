import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
    email?: string;
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

const CONDICIONADO_GRAL = ``;

export const generatePDF = async (data: PDFData) => {
  const doc = new jsPDF();
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const MARGIN = 14;
  
  // Fondo Crema (igual que el Sidebar #ede8e0)
  doc.setFillColor(237, 232, 224);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  
  // 1. Logo y Datos Emisor (Izquierda)
  if (data.perfil.logo_url) {
    try {
      doc.addImage(data.perfil.logo_url, 'PNG', MARGIN, 10, 35, 0);
    } catch (err) {
      console.error('Error cargando logo:', err);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(data.perfil.nombre.toUpperCase(), MARGIN, 45);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  const emisorLines = [
    `NIF: ${data.perfil.nif}`,
    data.perfil.email,
    data.perfil.direccion,
    `${data.perfil.cp} ${data.perfil.poblacion} (${data.perfil.provincia})`
  ].filter(Boolean);
  doc.text(emisorLines, MARGIN, 50);

  if (data.perfil.cuenta_bancaria) {
    doc.setFont('helvetica', 'bold');
    doc.text(`IBAN: ${data.perfil.cuenta_bancaria}`, MARGIN, 65);
    doc.setFont('helvetica', 'normal');
  }

  // 2. Título y Detalles del Documento (Derecha)
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(121, 85, 72); // Marrón corporativo #795548
  doc.text(data.tipo, PAGE_WIDTH - MARGIN, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Referencia: ${data.numero}`, PAGE_WIDTH - MARGIN, 30, { align: 'right' });
  doc.text(`Fecha: ${new Date(data.fecha).toLocaleDateString('es-ES')}`, PAGE_WIDTH - MARGIN, 35, { align: 'right' });

  // 3. Cuadro de Cliente (Derecha Abajo)
  const clientX = 120;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(data.tipo === 'FACTURA' ? 'FACTURAR A:' : 'PRESUPUESTADO A:', clientX, 50);
  
  doc.setFont('helvetica', 'normal');
  const clienteLines = [
    data.cliente.nombre,
    data.cliente.nif ? `NIF: ${data.cliente.nif}` : '',
    data.cliente.direccion,
    `${data.cliente.cp || ''} ${data.cliente.poblacion || ''} ${data.cliente.provincia ? `(${data.cliente.provincia})` : ''}`
  ].filter(Boolean);
  doc.text(clienteLines, clientX, 55);

  // 4. Tabla de Partidas
  const tableHead = [['CANT.', 'DESCRIPCIÓN', 'PRECIO UD.', 'TOTAL']];
  const tableBody = data.lineas.map(l => [
    l.unidades,
    l.descripcion,
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(l.precio_unitario),
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(l.unidades * l.precio_unitario)
  ]);

  doc.autoTable({
    startY: 85,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 4, font: 'helvetica' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
    }
  });

  // 5. Bloque de Totales
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalsX = 140;
  doc.setFontSize(9);
  
  doc.text('Base Imponible:', totalsX, finalY);
  doc.text(new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.totales.base), PAGE_WIDTH - MARGIN, finalY, { align: 'right' });
  
  doc.text(`IVA (${data.totales.iva_pct}%):`, totalsX, finalY + 7);
  doc.text(new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.totales.iva_importe), PAGE_WIDTH - MARGIN, finalY + 7, { align: 'right' });

  if (data.totales.retencion_pct > 0) {
    doc.setTextColor(150, 0, 0);
    doc.text(`Retención IRPF (${data.totales.retencion_pct}%):`, totalsX, finalY + 14);
    doc.text(`-${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.totales.retencion_importe)}`, PAGE_WIDTH - MARGIN, finalY + 14, { align: 'right' });
  }

  const grandTotalY = finalY + (data.totales.retencion_pct > 0 ? 25 : 18);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(121, 85, 72);
  doc.text('TOTAL:', totalsX, grandTotalY);
  doc.text(new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(data.totales.total), PAGE_WIDTH - MARGIN, grandTotalY, { align: 'right' });

  // 6. Pie Legal (Condiciones y LOPD)
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Reemplazar marcador o referencia genérica por el email real
  const userEmail = data.perfil.email || "empresa@gestionpro.com";
  const injectEmail = (text: string) => (text || "")
    .replace("EMAIL_PLACEHOLDER", userEmail)
    .replace("el email facilitado en este documento", userEmail)
    .replace("cristinamoya@gmail.com", userEmail);

  // Construir bloques legales
  let legalBlocks: string[] = [];

  if (data.condiciones_particulares && data.condiciones_particulares.trim()) {
    legalBlocks.push("CONDICIONES PARTICULARES:\n" + injectEmail(data.condiciones_particulares));
  }

  const mainFooter = data.perfil.condiciones_legales;
  // Solo mostramos condicionado general si no es una FACTURA (ej. en presupuestos)
  if (data.tipo !== 'FACTURA' && mainFooter && mainFooter.trim()) {
    legalBlocks.push("CONDICIONES GENERALES:\n" + injectEmail(mainFooter));
  }

  const fullFooterText = legalBlocks.join("\n\n");
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  
  // Dividir el texto en líneas que quepan en el ancho de la página
  const footerLines = doc.splitTextToSize(fullFooterText, PAGE_WIDTH - (MARGIN * 2));
  
  // Calcular posición: 15mm desde el fondo por cada línea o un margen fijo
  const footerHeight = footerLines.length * 3.5;
  const footerY = pageHeight - MARGIN - footerHeight;

  // Dibujar líneas con formato inteligente
  footerLines.forEach((line: string, index: number) => {
    const yPos = footerY + (index * 3.2);
    doc.setFont('helvetica', 'bold');
    doc.text(line, MARGIN, yPos);
  });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text(`Página 1 de 1 - Documento profesional generado por GestiónPro`, PAGE_WIDTH / 2, pageHeight - 5, { align: 'center' });

  // 7. Bloque VERIFACTU (Solo para facturas)
  if (data.tipo === 'FACTURA') {
    const qrSize = 25;
    const qrX = PAGE_WIDTH - MARGIN - qrSize;
    const qrY = pageHeight - MARGIN - 38; // Subido para no solapar con LOPD
    
    // Texto legal VeriFactu
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text("Factura verificable en la sede", qrX - 5, qrY + 8, { align: 'right' });
    doc.text("electrónica de la AEAT", qrX - 5, qrY + 11, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("SISTEMA VERI*FACTU", qrX - 5, qrY + 17, { align: 'right' });

    // Función auxiliar para cargar imagen como Base64 (evita fallos de carga asíncrona en jspdf)
    const getBase64FromUrl = async (url: string): Promise<string> => {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    };

    const qrData = `https://www2.agenciatributaria.gob.es/wlpl/zsce-itst/verifactu/verificar-factura?nif=${data.perfil.nif}&numero=${data.numero}&fecha=${data.fecha}&importe=${data.totales.total}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;
    
    try {
      const qrBase64 = await getBase64FromUrl(qrUrl);
      doc.addImage(qrBase64, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (err) {
      console.warn("No se pudo cargar el QR de VeriFactu:", err);
    }
  }

  // Guardar archivo
  doc.save(`${data.tipo.toLowerCase()}_${data.numero}.pdf`);
  return doc;
};

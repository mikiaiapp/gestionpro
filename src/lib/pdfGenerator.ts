import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from './format';
import { decrypt } from './encryption';
import { NATASHA_REGULAR, NATASHA_BOLD } from './fonts';

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
    web?: string;
    logo_url?: string;
    imagen_corporativa_url?: string;
    forma_pago_default?: string;
  };
  condiciones_particulares?: string;
  forma_pago?: string;
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
  // Crear el documento con soporte para UTF-8 y Identity-H (importante para fuentes personalizadas)
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true
  });
  
  // Registrar fuentes Natasha Walker
  // Usamos extensiones .ttf virtualmente ya que jsPDF las gestiona mejor así internamente
  doc.addFileToVFS('Natasha-Regular.ttf', NATASHA_REGULAR);
  doc.addFont('Natasha-Regular.ttf', 'Natasha', 'normal');
  doc.addFileToVFS('Natasha-Bold.ttf', NATASHA_BOLD);
  doc.addFont('Natasha-Bold.ttf', 'Natasha', 'bold');

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const MARGIN = 14;
  const BG_COLOR = [237, 232, 224]; // #ede8e0
  const FONT_FAMILY = 'Natasha';
  const HEADER_BROWN = [141, 110, 99]; // Marrón más suave (antes 101, 75, 62)

  const drawPageBackground = () => {
    doc.setFillColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
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
    if (data.perfil.logo_url) {
      const b64 = await getBase64FromUrl(data.perfil.logo_url);
      if (b64) doc.addImage(b64, 'PNG', MARGIN, 10, 35, 0);
    }
  };

  // --- PÁGINA 1: DATOS OPERATIVOS ---
  drawPageBackground();
  await drawPageBranding();

  // Limpiar número (quitar título si viene incluido con " - ")
  const displayNumero = data.numero.split(' - ')[0];

  // Datos Emisor
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(11); // Antes 10
  doc.setTextColor(0, 0, 0);
  doc.text(data.perfil.nombre.toUpperCase(), MARGIN, 85);
  
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9.5); // Antes 8.5
  doc.setTextColor(0, 0, 0);
  const emisorLines = [
    `NIF: ${data.perfil.nif}`,
    data.perfil.email,
    data.perfil.direccion,
    `${data.perfil.cp} ${data.perfil.poblacion} (${data.perfil.provincia})`
  ].filter(Boolean);
  doc.text(emisorLines, MARGIN, 90);

  if (data.perfil.cuenta_bancaria) {
    const rawIBAN = data.perfil.cuenta_bancaria;
    const decryptedIBAN = rawIBAN.includes(':') ? decrypt(rawIBAN) : rawIBAN;
    
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`IBAN: ${decryptedIBAN}`, MARGIN, 105);
    doc.setFont(FONT_FAMILY, 'normal');
  }

  // Título y Detalles (Derecha)
  doc.setFontSize(22);
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setTextColor(0, 0, 0); 
  doc.text(data.tipo, PAGE_WIDTH - MARGIN, 20, { align: 'right' });
  
  doc.setFontSize(10.5); // Antes 10
  doc.setTextColor(0, 0, 0);
  doc.text(`Número: ${displayNumero}`, PAGE_WIDTH - MARGIN, 30, { align: 'right' });
  doc.text(`Fecha: ${new Date(data.fecha).toLocaleDateString('es-ES')}`, PAGE_WIDTH - MARGIN, 35, { align: 'right' });

  // Cuadro Cliente
  const clientX = 120;
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(10); // Antes 9
  doc.setTextColor(0, 0, 0);
  doc.text(data.tipo === 'FACTURA' ? 'FACTURAR A:' : 'PRESUPUESTADO A:', clientX, 50);
  
  // Nombre del cliente en negrita y un punto más grande
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(10.5);
  doc.text(data.cliente.nombre, clientX, 56);

  // Resto de datos del cliente en normal
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9.5);
  const clienteLines = [
    data.cliente.nif ? `NIF: ${data.cliente.nif}` : '',
    data.cliente.email ? `Email: ${data.cliente.email}` : '',
    data.cliente.telefono ? `Tel: ${data.cliente.telefono}` : '',
    data.cliente.direccion,
    `${data.cliente.cp || ''} ${data.cliente.poblacion || ''} ${data.cliente.provincia ? `(${data.cliente.provincia})` : ''}`
  ].filter(Boolean);
  doc.text(clienteLines, clientX, 61);

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
    headStyles: { 
      fillColor: HEADER_BROWN, 
      textColor: [255, 255, 255], 
      lineWidth: 0.1, 
      fontStyle: 'bold',
      font: FONT_FAMILY
    },
    styles: { 
      fontSize: 9.5, // Antes 8.5
      cellPadding: 4, 
      font: FONT_FAMILY, 
      fillColor: BG_COLOR, 
      textColor: [0, 0, 0] 
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
    },
    didDrawCell: (data: any) => {
      // Si es la columna de descripción y tiene HTML
      if (data.section === 'body' && data.column.index === 0 && data.cell.raw.includes('<')) {
        // Limpiamos el texto que puso autotable por defecto
        doc.setFillColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
        doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
        
        // Renderizamos con formato
        renderRichText(
          doc, 
          data.cell.raw, 
          data.cell.x + 4, 
          data.cell.y + 7, 
          data.cell.width - 8, 
          9.5, 
          FONT_FAMILY, 
          4.5, 
          false, 
          MARGIN
        );
      }
    }
  });

  // Totales
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  const totalsX = 130;
  doc.setFontSize(10); // Antes 9
  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT_FAMILY, 'normal');
  
  doc.text('Base Imponible:', totalsX, finalY);
  doc.text(formatCurrency(data.totales.base), PAGE_WIDTH - MARGIN, finalY, { align: 'right' });
  
  doc.text(`IVA (${data.totales.iva_pct}%):`, totalsX, finalY + 8);
  doc.text(formatCurrency(data.totales.iva_importe), PAGE_WIDTH - MARGIN, finalY + 8, { align: 'right' });

  let currentY = finalY + 8;

  if (data.totales.retencion_pct > 0) {
    currentY += 8;
    doc.setTextColor(150, 0, 0);
    doc.text(`Retención IRPF (${data.totales.retencion_pct}%):`, totalsX, currentY);
    doc.text(`-${formatCurrency(data.totales.retencion_importe)}`, PAGE_WIDTH - MARGIN, currentY, { align: 'right' });
  }

  const grandTotalY = currentY + 12;
  doc.setFontSize(13); // Antes 12
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL:', totalsX, grandTotalY);
  doc.text(formatCurrency(data.totales.total), PAGE_WIDTH - MARGIN, grandTotalY, { align: 'right' });

  // El pie de página se genera al final del documento para todas las páginas

  // --- AYUDANTES COMPARTIDOS ---
  const userEmail = data.perfil.email || "";
  const processText = (t: string) => (t || "").replace(/EMAIL_PLACEHOLDER/g, userEmail);

  const renderJustifiedLine = (line: string, x: number, y: number, width: number) => {
    const words = line.trim().split(/\s+/);
    if (words.length <= 1) {
      doc.text(line.trim(), x, y);
      return;
    }
    const totalWordsWidth = words.reduce((acc, w) => acc + doc.getTextWidth(w), 0);
    const totalSpaceWidth = width - totalWordsWidth;
    const individualSpaceWidth = totalSpaceWidth / (words.length - 1);
    let currentX = x;
    words.forEach((word) => {
      doc.text(word, currentX, y);
      currentX += doc.getTextWidth(word) + individualSpaceWidth;
    });
  };

  // --- CONTENIDO ESPECÍFICO ---
  if (data.tipo === 'PRESUPUESTO') {
    // --- PÁGINA 2: CONDICIONES ---
    doc.addPage();
    let currentY = 20;

    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("CONDICIONES DEL PRESUPUESTO", MARGIN, currentY);
    currentY += 10;

    const sections = [
      { title: "CONDICIONES DE PAGO", content: data.forma_pago || data.perfil.forma_pago_default },
      { title: "CONDICIONES PARTICULARES", content: data.condiciones_particulares },
      { title: "CONDICIONES GENERALES", content: data.perfil.condiciones_legales },
      { title: "PROTECCIÓN DE DATOS (LOPD)", content: data.perfil.lopd_text }
    ];

    for (const sec of sections) {
      if (sec.content && sec.content.trim()) {
        doc.setFont(FONT_FAMILY, 'bold');
        doc.setFontSize(10);
        doc.text(sec.title + ":", MARGIN, currentY);
        currentY += 5;
        
        // Usar el renderizador de texto enriquecido
        currentY = renderRichText(
          doc, 
          processText(sec.content), 
          MARGIN, 
          currentY, 
          PAGE_WIDTH - (MARGIN * 2), 
          8.5, 
          FONT_FAMILY, 
          4.8, 
          true, 
          MARGIN
        );
        currentY += 4;
      }
    }

    // --- PÁGINA 3: LOGO Y ACEPTACIÓN ---
    doc.addPage();
    
    if (data.perfil.imagen_corporativa_url || data.perfil.logo_url) {
      const logoUrl = data.perfil.imagen_corporativa_url || data.perfil.logo_url;
      const b64 = await getBase64FromUrl(logoUrl!);
      if (b64) {
        doc.addImage(b64, 'PNG', MARGIN, 20, PAGE_WIDTH - (MARGIN * 2), 0, undefined, 'MEDIUM');
      }
    }
    
    let aceptacionY = (PAGE_HEIGHT * 0.75);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, aceptacionY - 5, PAGE_WIDTH - MARGIN, aceptacionY - 5);
    
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("ACEPTACIÓN DEL CLIENTE", MARGIN, aceptacionY);
    
    aceptacionY += 7;
    aceptacionY = renderRichText(
      doc, 
      processText(data.perfil.texto_aceptacion || "Acepto el presente documento y todas las condiciones descritas."), 
      MARGIN, 
      aceptacionY, 
      PAGE_WIDTH - (MARGIN * 2), 
      8.5, 
      FONT_FAMILY, 
      4.8, 
      true, 
      MARGIN
    );

    aceptacionY += 10;
    doc.setDrawColor(0, 0, 0);
    doc.line(MARGIN + 10, aceptacionY + 15, MARGIN + 80, aceptacionY + 15);
    doc.setFontSize(8);
    doc.text("Firma o Sello del Cliente", MARGIN + 45, aceptacionY + 20, { align: 'center' });
    doc.text(`Fecha de aceptación: ___ / ___ / 202_`, PAGE_WIDTH - MARGIN - 60, aceptacionY + 15);

  } else {
    // --- FACTURA: QR EN PÁGINA 1 ---
    let qrY = grandTotalY + 10;
    const qrSize = 30;
    
    // Si no cabe el QR en la página 1, forzamos salto
    if (qrY + qrSize > PAGE_HEIGHT - MARGIN - 10) {
      doc.addPage();
      qrY = 20;
    }

    const qrData = `https://www2.agenciatributaria.gob.es/wlpl/zsce-itst/verifactu/verificar-factura?nif=${data.perfil.nif}&numero=${data.numero}&fecha=${data.fecha}&importe=${data.totales.total}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
    const qrBase64 = await getBase64FromUrl(qrUrl);
    
    if (qrBase64) {
      doc.addImage(qrBase64, 'PNG', PAGE_WIDTH - MARGIN - qrSize, qrY, qrSize, qrSize);
      doc.setFontSize(6.5);
      doc.setFont(FONT_FAMILY, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("SISTEMA VERI*FACTU", PAGE_WIDTH - MARGIN - (qrSize/2), qrY + qrSize + 4, { align: 'center' });
      
      doc.setFontSize(6);
      doc.setFont(FONT_FAMILY, 'normal');
      const verifactuInfo = [
        "Factura generada por un sistema informático que cumple con los requisitos del Reglamento",
        "que establece las especificaciones técnicas y funcionales de los sistemas de facturación."
      ];
      doc.text(verifactuInfo, PAGE_WIDTH - MARGIN - qrSize - 5, qrY + 10, { align: 'right' });
    }

    // --- PÁGINA 2: CONDICIONES LEGALES FACTURA ---
    doc.addPage();
    let currentY = 20;

    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("INFORMACIÓN LEGAL", MARGIN, currentY);
    currentY += 10;

    const sectionsFact = [
      { title: "FORMA DE PAGO", content: data.forma_pago || data.perfil.forma_pago_default },
      { title: "PROTECCIÓN DE DATOS (LOPD)", content: data.perfil.lopd_text }
    ];

    for (const sec of sectionsFact) {
      if (sec.content && sec.content.trim()) {
        doc.setFont(FONT_FAMILY, 'bold');
        doc.setFontSize(10);
        doc.text(sec.title + ":", MARGIN, currentY);
        currentY += 5;
        
        currentY = renderRichText(
          doc, 
          processText(sec.content), 
          MARGIN, 
          currentY, 
          PAGE_WIDTH - (MARGIN * 2), 
          8.5, 
          FONT_FAMILY, 
          4.8, 
          true, 
          MARGIN
        );
        currentY += 5;
      }
    }
  }

  // --- FINALIZACIÓN Y PIE DE PÁGINA GLOBAL ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Pie de página: Web (Centro) y Numeración (Derecha)
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150); // Gris suave para la numeración
    doc.setFont(FONT_FAMILY, 'normal');
    doc.text(`Pág: ${i}/${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
    
    if (data.perfil.web) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont(FONT_FAMILY, 'bold');
      doc.text(data.perfil.web.toLowerCase(), PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
    }
  }

  const filename = `${data.tipo.toLowerCase()}_${data.numero.replace(/\//g, '_')}.pdf`;
  doc.save(filename);
  return doc;
};

/**
 * Renderiza texto que puede contener etiquetas HTML básicas (<b>, <strong>, <i>, <em>, <u>)
 * Soporta saltos de línea y justificación simple.
 */
/**
 * Renderiza texto que puede contener etiquetas HTML básicas (<b>, <strong>, <i>, <em>, <u>)
 * Soporta saltos de línea, justificación por palabras y limpieza de entidades HTML.
 */
const renderRichText = (
  doc: jsPDF, 
  html: string, 
  x: number, 
  y: number, 
  width: number, 
  fontSize: number, 
  fontFamily: string,
  lineHeight: number = 4.8,
  justify: boolean = true,
  pageMargin: number = 14
): number => {
  doc.setFontSize(fontSize);
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  
  // 1. Limpieza y pre-procesamiento de HTML
  let cleanHtml = (html || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<br\s*\/?>/gi, "\n");
  
  // 2. Separar en párrafos por etiquetas <p> o saltos de línea
  const paragraphs = cleanHtml.split(/<p>|<\/p>|\r?\n/i).filter(p => p.trim().length > 0);
  
  let currentY = y;

  for (const p of paragraphs) {
    // 3. Tokenización del párrafo preservando formato
    // Dividimos por etiquetas <b>, <strong>, <i>, <em>, <u>
    const parts = p.split(/(<b>|<strong>|<i>|<em>|<u>|<\/b>|<\/strong>|<\/i>|<\/em>|<\/u>)/gi);
    
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    
    const allTokens: Array<{ text: string, bold: boolean, italic: boolean, underline: boolean }> = [];
    
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower === '<b>' || lower === '<strong>') { isBold = true; continue; }
      if (lower === '</b>' || lower === '</strong>') { isBold = false; continue; }
      if (lower === '<i>' || lower === '<em>') { isItalic = true; continue; }
      if (lower === '</i>' || lower === '</em>') { isItalic = false; continue; }
      if (lower === '<u>') { isUnderline = true; continue; }
      if (lower === '</u>') { isUnderline = false; continue; }
      
      // Dividimos el texto en palabras y espacios
      const words = part.split(/(\s+)/);
      for (const word of words) {
        if (word) {
          allTokens.push({ text: word, bold: isBold, italic: isItalic, underline: isUnderline });
        }
      }
    }

    // 4. Procesamiento de líneas (Word Wrapping)
    let lineTokens: typeof allTokens = [];
    let currentLineWidth = 0;
    const safetyBuffer = 0.5; // Margen de seguridad de 0.5mm

    const renderLine = (tokens: typeof allTokens, isLastLine: boolean) => {
      if (tokens.length === 0) return;
      
      // Trim de espacios al inicio y final de la línea para el cálculo de justificación
      let startIdx = 0;
      while (startIdx < tokens.length && tokens[startIdx].text.trim() === '') startIdx++;
      let endIdx = tokens.length - 1;
      while (endIdx >= startIdx && tokens[endIdx].text.trim() === '') endIdx--;
      
      const lineWords = tokens.slice(startIdx, endIdx + 1);
      if (lineWords.length === 0) return;

      // Salto de página si es necesario
      if (currentY > PAGE_HEIGHT - pageMargin - 10) {
        doc.addPage();
        currentY = 20;
      }

      // Cálculo de anchos de palabras individuales
      const wordWidths = lineWords.map(t => {
        const style = (t.bold && t.italic) ? 'bolditalic' : t.bold ? 'bold' : t.italic ? 'italic' : 'normal';
        try {
          doc.setFont(fontFamily, style);
        } catch (e) {
          doc.setFont(fontFamily, t.bold ? 'bold' : 'normal');
        }
        return doc.getTextWidth(t.text);
      });

      const totalWordsWidth = wordWidths.reduce((a, b) => a + b, 0);
      const spaceLeft = width - totalWordsWidth;
      const numGaps = lineWords.length - 1;
      
      // Solo justificamos si NO es la última línea del párrafo y hay más de una palabra
      const isJustified = justify && !isLastLine && numGaps > 0;
      const gapWidth = isJustified ? (spaceLeft / numGaps) : doc.getTextWidth(' ');

      let cursorX = x;
      lineWords.forEach((t, idx) => {
        const style = (t.bold && t.italic) ? 'bolditalic' : t.bold ? 'bold' : t.italic ? 'italic' : 'normal';
        try {
          doc.setFont(fontFamily, style);
        } catch (e) {
          doc.setFont(fontFamily, t.bold ? 'bold' : 'normal');
        }
        
        doc.text(t.text, cursorX, currentY);
        
        // Dibujar subrayado si aplica
        if (t.underline) {
          const w = wordWidths[idx];
          doc.setLineWidth(0.2);
          doc.line(cursorX, currentY + 0.5, cursorX + w, currentY + 0.5);
        }
        
        cursorX += wordWidths[idx] + (idx < numGaps ? gapWidth : 0);
      });

      currentY += lineHeight;
    };

    for (let i = 0; i < allTokens.length; i++) {
      const token = allTokens[i];
      const style = (token.bold && token.italic) ? 'bolditalic' : token.bold ? 'bold' : token.italic ? 'italic' : 'normal';
      try {
        doc.setFont(fontFamily, style);
      } catch (e) {
        doc.setFont(fontFamily, token.bold ? 'bold' : 'normal');
      }
      
      const tokenWidth = doc.getTextWidth(token.text);

      // Si es un espacio y la línea está vacía, lo ignoramos
      if (token.text.trim() === '' && lineTokens.length === 0) continue;

      if (currentLineWidth + tokenWidth > width - safetyBuffer && lineTokens.length > 0) {
        // La palabra actual no cabe, renderizamos la línea actual
        renderLine(lineTokens, false);
        lineTokens = [];
        currentLineWidth = 0;
        
        // Si el token que disparó el wrap era un espacio, lo ignoramos al inicio de la nueva línea
        if (token.text.trim() === '') continue;
      }
      
      lineTokens.push(token);
      currentLineWidth += tokenWidth;
    }

    // Renderizar la última línea del párrafo
    renderLine(lineTokens, true);
    currentY += 1.5; // Espacio extra entre párrafos
  }
  
  return currentY;
};


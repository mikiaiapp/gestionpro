
export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `
    Analiza esta factura de gastos y extrae la información necesaria. 
    Es CRÍTICO que detectes si hay varios tipos de IVA o retención IRPF.
    
    Devuelve estrictamente un objeto JSON con este formato (sin etiquetas markdown, solo el JSON):
    {
      "proveedor_nombre": "Nombre Fiscal",
      "proveedor_nif": "NIF/CIF",
      "num_factura": "Número de factura",
      "fecha": "YYYY-MM-DD",
      "lineas": [
        { "descripcion": "Concepto", "unidades": 1, "precio_unitario": 100.00, "iva_pct": 21 }
      ],
      "retencion_pct": 0
    }
    
    Si hay retención (IRPF), indica el porcentaje (ej: 15). Si hay varios IVAs, crea una línea por cada tipo de IVA.
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { 
              inline_data: { 
                mime_type: "application/pdf", 
                data: base64File.split(',')[1] || base64File 
              } 
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Limpieza de posibles marcas de markdown
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error en extracción IA:", error);
    throw new Error("No se pudo procesar la factura con IA.");
  }
}

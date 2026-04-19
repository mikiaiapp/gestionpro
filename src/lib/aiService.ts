// Versión Estabilizada de IA - Sin rotaciones experimentales
export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `
    Analiza esta factura de gastos y extrae la información necesaria. 
    Es CRÍTICO que detectes si hay varios tipos de IVA o retención IRPF.
    
    Devuelve estrictamente un objeto JSON con este formato (sin etiquetas markdown):
    {
      "proveedor_nombre": "Nombre Fiscal",
      "proveedor_nif": "NIF/CIF",
      "proveedor_direccion": "Calle",
      "proveedor_cp": "Código Postal",
      "num_factura": "Número factura",
      "fecha": "YYYY-MM-DD",
      "lineas": [
        { "descripcion": "Concepto", "unidades": 1, "precio_unitario": 0, "iva_pct": 21 }
      ],
      "retencion_pct": 0
    }
  `;

  const cleanApiKey = apiKey.trim();
  const modelName = "gemini-1.5-flash"; // El modelo más estable de Google

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${cleanApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: "application/pdf", data: base64File.split(",")[1] || base64File } }
          ]
        }],
        generationConfig: {
          temperature: 0.1
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No se ha podido leer el contenido de la factura.");

    // Limpiamos la respuesta por si la IA añade bloques de código markdown
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(text);
  } catch (error: any) {
    console.error("Error en extracción IA:", error);
    throw new Error(`Error de IA: ${error.message}. Por favor, espera un minuto e intenta de nuevo.`);
  }
}

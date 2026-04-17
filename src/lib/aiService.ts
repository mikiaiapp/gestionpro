
async function findBestModel(apiKey: string): Promise<string> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);
    
    const models = data.models || [];
    
    // Prioridad de modelos (de más moderno/rápido a más estable)
    // Prioridad de modelos (de más moderno/rápido a más estable)
    const priorities = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b", // Modelo ultra-ligero, casi siempre disponible
      "gemini-1.5-pro-latest",
      "gemini-1.5-pro"
    ];

    for (const modelId of priorities) {
      const found = models.find((m: any) => 
        m.name.includes(modelId) && 
        m.supportedGenerationMethods.includes("generateContent")
      );
      if (found) return found.name;
    }

    // Fallback al primero que soporte generación si ninguno coincide
    const fallback = models.find((m: any) => m.supportedGenerationMethods.includes("generateContent"));
    return fallback?.name || "models/gemini-1.5-flash";
  } catch (error) {
    console.warn("No se pudo listar modelos, usando fallback predeterminado:", error);
    return "models/gemini-1.5-flash";
  }
}

export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `
    Analiza esta factura de gastos y extrae la información necesaria. 
    Es CRÍTICO que detectes si hay varios tipos de IVA o retención IRPF.
    
    Devuelve estrictamente un objeto JSON con este formato (sin etiquetas markdown, solo el JSON):
    {
      "proveedor_nombre": "Nombre Fiscal",
      "proveedor_nif": "NIF/CIF",
      "proveedor_direccion": "Calle, número...",
      "proveedor_cp": "Código Postal",
      "num_factura": "Número de factura",
      "fecha": "YYYY-MM-DD",
      "lineas": [
        { "descripcion": "Concepto", "unidades": 1, "precio_unitario": 100.00, "iva_pct": 21 }
      ],
      "retencion_pct": 0
    }
    
    Si hay retención (IRPF), indica el porcentaje (ej: 15). Si hay varios IVAs, crea una línea por cada tipo de IVA.
  `;

  let lastError = null;
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const cleanApiKey = apiKey.trim();
      const modelName = await findBestModel(cleanApiKey);
      console.log(`Intento ${attempt + 1}: Usando modelo ${modelName}`);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${cleanApiKey}`, {
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
      
      if (data.error) {
        // Si el error es por saturación (503 / High Demand), reintentamos tras una pausa
        if (data.error.code === 503 || data.error.message.includes("high demand")) {
          console.warn("Gemini saturado, esperando reintento...");
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); // Pausa incremental
          lastError = new Error(`API Gemini: ${data.error.message}`);
          continue; 
        }
        throw new Error(`API Gemini: ${data.error.message}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error("La IA no pudo generar una respuesta clara.");
      }
      
      // Limpieza y parseo
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(jsonStr);

    } catch (error: any) {
      console.error(`Error en intento ${attempt + 1}:`, error);
      lastError = error;
      // Si el error no es de saturación, no reintentes
      if (!error.message.includes("high demand") && !error.message.includes("503")) break;
    }
  }

  throw lastError || new Error("No se pudo procesar la factura tras varios intentos.");
}

// Caché en memoria para el modelo preferido
let cachedModel: string | null = null;
const blacklistedModels = new Set<string>();

async function getBestModel(apiKey: string): Promise<string> {
  if (cachedModel && !blacklistedModels.has(cachedModel)) return cachedModel;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    const models = data.models || [];
    const priorities = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-8b", "gemini-2.0-flash"];

    for (const modelId of priorities) {
      const found = models.find((m: any) => 
        m.name.includes(modelId) && m.supportedGenerationMethods.includes("generateContent") && !blacklistedModels.has(m.name)
      );
      if (found) {
        cachedModel = found.name;
        return found.name;
      }
    }
    const fallback = models.find((m: any) => m.supportedGenerationMethods.includes("generateContent") && !blacklistedModels.has(m.name));
    return fallback?.name || "models/gemini-1.5-flash";
  } catch (error) {
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
  `;

  let lastErrorMsg = "Error desconocido";
  const MAX_RETRIES = 4;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let currentModel = "";
    try {
      const cleanApiKey = apiKey.trim();
      currentModel = await getBestModel(cleanApiKey);
      
      console.log(`[${attempt + 1}/${MAX_RETRIES}] IA intentando con ${currentModel}...`);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${currentModel}:generateContent?key=${cleanApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: "application/pdf", data: base64File.split(',')[1] || base64File } }
            ]
          }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.1 }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        lastErrorMsg = data.error.message;
        const lowerMsg = lastErrorMsg.toLowerCase();
        
        if (data.error.code === 429 || lowerMsg.includes("quota") || lowerMsg.includes("limit")) {
          console.warn("⏳ Cuota agotada. Pausando 4.5 segundos antes de probar otro modelo...");
          blacklistedModels.add(currentModel);
          cachedModel = null;
          await new Promise(r => setTimeout(r, 4500)); // PAUSA REAL
          continue; 
        }
        
        if (data.error.code === 404) {
          blacklistedModels.add(currentModel);
          cachedModel = null;
          continue;
        }
        throw new Error(lastErrorMsg);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("La IA no devolvió datos");
      
      return JSON.parse(text.trim());

    } catch (error: any) {
      console.error(`Error en intento ${attempt + 1}:`, error);
      lastErrorMsg = error.message;
      if (currentModel) blacklistedModels.add(currentModel);
      cachedModel = null;
      if (attempt === MAX_RETRIES - 1) break;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw new Error(`IA Saturada. Por favor, espera 60 segundos y reintenta. Detalle: ${lastErrorMsg}`);
}

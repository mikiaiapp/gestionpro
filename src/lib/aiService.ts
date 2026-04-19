// Caché en memoria y lista de excluidos temporalmente (por saturación)
let cachedModel: string | null = null;
const blacklistedModels = new Set<string>();

async function getBestModel(apiKey: string, forceDiscovery = false): Promise<string> {
  // Si ya tenemos un modelo y no se pide redescubrimiento, lo devolvemos
  if (cachedModel && !forceDiscovery) return cachedModel;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    const models = data.models || [];
    
    // Jerarquía de preferencia (Ordenado por estabilidad y generosidad de cuota)
    const priorities = [
      "gemini-1.5-flash",        // Balance perfecto velocidad/cuota
      "gemini-1.5-flash-latest", 
      "gemini-1.5-flash-8b",     // Más rápido pero cuotas más bajas
      "gemini-2.0-flash",        // Muy rápido pero límites experimentales estrictos
      "gemini-1.5-pro"           // Más preciso pero lento
    ];

    for (const modelId of priorities) {
      const found = models.find((m: any) => 
        m.name.includes(modelId) && 
        m.supportedGenerationMethods.includes("generateContent") &&
        !blacklistedModels.has(m.name) // Evitar modelos que sabemos que están saturados
      );
      if (found) {
        cachedModel = found.name;
        return cachedModel!;
      }
    }

    const fallback = models.find((m: any) => m.supportedGenerationMethods.includes("generateContent") && !blacklistedModels.has(m.name));
    cachedModel = fallback?.name || "models/gemini-1.5-flash";
    return cachedModel!;
  } catch (error) {
    return "models/gemini-1.5-flash";
  }
}

export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `Extract invoice data: {proveedor_nombre, proveedor_nif, proveedor_direccion, proveedor_cp, num_factura, fecha, lineas: [{descripcion, unidades, precio_unitario, iva_pct}], retencion_pct}. If multiple IVAs, separate into lines. output JSON only.`;

  let lastError = null;
  const MAX_RETRIES = 3; 

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let currentModel = "";
    try {
      const cleanApiKey = apiKey.trim();
      currentModel = await getBestModel(cleanApiKey);
      
      console.log(`⚡ Extracción inteligente (intento ${attempt + 1}) con ${currentModel}`);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${currentModel}:generateContent?key=${cleanApiKey}`, {
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
          }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        const errorMsg = data.error.message.toLowerCase();
        
        // Si el error es de cuota (429) o saturación (503 / 429), penalizamos el modelo y reintentamos con otro
        if (data.error.code === 429 || data.error.code === 503 || errorMsg.includes("quota") || errorMsg.includes("limit")) {
          console.warn(`⚠️ Modelo ${currentModel} saturado o sin cuota. Buscando alternativa...`);
          blacklistedModels.add(currentModel); // Lo banneamos temporalmente
          cachedModel = null; // Forzamos búsqueda de otro modelo
          await new Promise(r => setTimeout(r, 1000)); // Breve pausa para limpiar el aire
          continue; 
        }
        
        if (data.error.code === 404 || data.error.code === 400) {
          blacklistedModels.add(currentModel);
          cachedModel = null;
          continue;
        }

        throw new Error(`API Gemini: ${data.error.message}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Sin respuesta de IA");
      
      return JSON.parse(text.trim());

    } catch (error: any) {
      console.error(`Error en intento ${attempt + 1}:`, error);
      lastError = error;
      
      // Si el error parece de conectividad o de la API misma, probamos otro modelo
      if (currentModel) {
        blacklistedModels.add(currentModel);
        cachedModel = null;
      }

      if (attempt === MAX_RETRIES - 1) break;
      await new Promise(r => setTimeout(r, 500));
    }
  }

  throw lastError || new Error("Fallo en extracción inteligente tras varios intentos");
}

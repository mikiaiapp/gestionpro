// Caché en memoria para evitar consultas repetidas al listado de modelos en la misma sesión
let cachedModel: string | null = null;

async function getBestModel(apiKey: string): Promise<string> {
  if (cachedModel) return cachedModel;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);
    
    const models = data.models || [];
    
    // Jerarquía de preferencia (de más moderno/rápido a estable)
    const priorities = [
      "gemini-2.0-flash", // Futuras versiones
      "gemini-1.5-flash-8b", 
      "gemini-1.5-flash",
      "gemini-1.0-flash",
      "gemini-1.5-pro"
    ];

    for (const modelId of priorities) {
      const found = models.find((m: any) => 
        m.name.includes(modelId) && 
        m.supportedGenerationMethods.includes("generateContent")
      );
      if (found) {
        cachedModel = found.name;
        return cachedModel!;
      }
    }

    // Fallback absoluto
    const fallback = models.find((m: any) => m.supportedGenerationMethods.includes("generateContent"));
    cachedModel = fallback?.name || "models/gemini-1.5-flash";
    return cachedModel!;
  } catch (error) {
    console.warn("Error detectando modelos, usando fallback predeterminado:", error);
    return "models/gemini-1.5-flash";
  }
}

export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `Extract invoice data: {proveedor_nombre, proveedor_nif, proveedor_direccion, proveedor_cp, num_factura, fecha, lineas: [{descripcion, unidades, precio_unitario, iva_pct}], retencion_pct}. If multiple IVAs, separate into lines. output JSON only.`;

  let lastError = null;
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const cleanApiKey = apiKey.trim();
      
      // Auto-detección dinámica del mejor modelo disponible
      const modelName = await getBestModel(cleanApiKey);
      
      console.log(`⚡ Extracción inteligente (intento ${attempt + 1}) con ${modelName}`);

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
          }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        // Si el modelo específico falla (ej: cuotas o disponibilidad), limpiamos caché para probar otro en el reintento
        if (data.error.code === 404 || data.error.code === 400) cachedModel = null;

        if (data.error.code === 503 || data.error.message.includes("high demand")) {
          await new Promise(r => setTimeout(r, 800)); 
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
      cachedModel = null; // Forzar re-detección en caso de error de red o similar
      if (!error.message.includes("high demand") && !error.message.includes("503")) break;
    }
  }

  throw lastError || new Error("Fallo en extracción inteligente");
}

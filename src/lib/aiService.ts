// Caché en memoria para el modelo preferido
let cachedModel: string | null = null;

async function getBestModel(apiKey: string, excluded: Set<string> = new Set()): Promise<string> {
  // Si tenemos un modelo en caché y no está excluido, lo usamos
  if (cachedModel && !excluded.has(cachedModel)) return cachedModel;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    const models = data.models || [];
    const priorities = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest", 
      "gemini-1.5-flash-8b",
      "gemini-2.0-flash",
      "gemini-1.5-pro"
    ];

    for (const modelId of priorities) {
      const found = models.find((m: any) => 
        m.name.includes(modelId) && 
        m.supportedGenerationMethods.includes("generateContent") &&
        !excluded.has(m.name)
      );
      if (found) {
        cachedModel = found.name;
        return found.name;
      }
    }

    const fallback = models.find((m: any) => m.supportedGenerationMethods.includes("generateContent") && !excluded.has(m.name));
    return fallback?.name || "models/gemini-1.5-flash";
  } catch (error) {
    return "models/gemini-1.5-flash";
  }
}

export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `Extract invoice data: {proveedor_nombre, proveedor_nif, proveedor_direccion, proveedor_cp, num_factura, fecha, lineas: [{descripcion, unidades, precio_unitario, iva_pct}], retencion_pct}. output JSON only.`;

  let lastErrorMsg = "Error desconocido";
  const excludedThisSession = new Set<string>();
  const MAX_RETRIES = 5; // Suficientes intentos para rotar por todos los modelos

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let currentModel = "";
    try {
      const cleanApiKey = apiKey.trim();
      currentModel = await getBestModel(cleanApiKey, excludedThisSession);
      
      console.log(`⚡ [Intento ${attempt + 1}/${MAX_RETRIES}] Probando con ${currentModel}`);

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
        const code = data.error.code;

        // Si es error de cuota o saturación, marcamos este modelo como "lleno" para este proceso y reintentamos con otro
        if (code === 429 || code === 503 || lastErrorMsg.toLowerCase().includes("quota") || lastErrorMsg.toLowerCase().includes("limit")) {
          console.warn(`⏳ Modelo ${currentModel} agotado. Rotando...`);
          excludedThisSession.add(currentModel);
          if (cachedModel === currentModel) cachedModel = null;
          await new Promise(r => setTimeout(r, 1000));
          continue; 
        }
        
        // Si el modelo no existe o no es compatible, lo descartamos
        if (code === 404 || code === 400) {
          excludedThisSession.add(currentModel);
          if (cachedModel === currentModel) cachedModel = null;
          continue;
        }

        throw new Error(lastErrorMsg);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("La IA no devolvió datos");
      
      return JSON.parse(text.trim());

    } catch (error: any) {
      console.error(`❌ Error en ${currentModel}:`, error);
      lastErrorMsg = error.message;
      excludedThisSession.add(currentModel);
      if (cachedModel === currentModel) cachedModel = null;
      if (attempt === MAX_RETRIES - 1) break;
      await new Promise(r => setTimeout(r, 500));
    }
  }

  throw new Error(`Fallo en IA tras agotar rotación de modelos. Último error: ${lastErrorMsg}`);
}

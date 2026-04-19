// Motor de IA Auto-Suficiente (Futurista y Resiliente)
let cachedModel: string | null = null; 

export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const cleanApiKey = apiKey.trim();
  const PROMPT = "Extrae JSON: {proveedor_nombre, proveedor_nif, proveedor_direccion, proveedor_cp, num_factura, fecha (YYYY-MM-DD), lineas:[{descripcion, unidades, precio_unitario, iva_pct}], retencion_pct}. Sé preciso con NIF e importes.";

  // Función interna para encontrar qué modelos tiene Google para esta clave hoy
  const discoverBestModel = async () => {
    console.log("🔍 Detectando modelos de Google para tu cuenta...");
    const versions = ["v1", "v1beta"]; // Probamos ambas versiones de API
    
    for (const v of versions) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${cleanApiKey}`);
        const data = await res.json();
        
        if (data.models) {
          // Buscamos el mejor disponible: que soporte generación y preferiblemente sea 'flash'
          const best = data.models.find((m: any) => 
            m.supportedGenerationMethods.includes("generateContent") && 
            m.name.toLowerCase().includes("flash")
          ) || data.models.find((m: any) => m.supportedGenerationMethods.includes("generateContent"));
          
          if (best) return { version: v, name: best.name };
        }
      } catch (e) { continue; }
    }
    return null;
  };

  try {
    // 1. Si no hay modelo en memoria, lo descubrimos
    if (!cachedModel) {
      const discovered = await discoverBestModel();
      if (discovered) cachedModel = `${discovered.version}/${discovered.name}`;
      else throw new Error("No se han encontrado modelos compatibles en tu cuenta de Google.");
    }

    // 2. Intentamos la extracción
    const [apiVersion, modelPath] = cachedModel.split("/");
    const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/${modelPath}:generateContent?key=${cleanApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: "application/pdf", data: base64File.split(",")[1] || base64File } }
          ]
        }],
        generationConfig: { temperature: 0.1 }
      })
    });

    const data = await response.json();

    // 3. Si el modelo falla por no ser encontrado (cambio de Google), borramos memoria y reintentamos UNA vez
    if (data.error && (data.error.code === 404 || data.error.message.includes("not found"))) {
      console.warn("⚠️ Modelo antiguo no disponible. Re-escaneando...");
      cachedModel = null;
      return extractDataFromInvoice(base64File, apiKey); // Reintento recursivo una sola vez
    }

    if (data.error) throw new Error(data.error.message);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("IA sin respuesta.");

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);

  } catch (error: any) {
    console.error("Error en motor IA Auto-Suficiente:", error.message);
    throw new Error(`Motor IA: ${error.message}`);
  }
}

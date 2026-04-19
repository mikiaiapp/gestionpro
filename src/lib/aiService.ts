// Motor de IA Optimizado (Bajo Consumo de Cuota y Tokens)
let cachedModel: string | null = null; // Caché persistente en memoria

export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const cleanApiKey = apiKey.trim();

  // Prompt ultra-comprimido (Ahorro de tokens)
  const PROMPT = "Extrae JSON: {proveedor_nombre, proveedor_nif, proveedor_direccion, proveedor_cp, num_factura, fecha (YYYY-MM-DD), lineas:[{descripcion, unidades, precio_unitario, iva_pct}], retencion_pct}. Sé preciso con NIF e importes.";

  try {
    // Escaneo inteligente: Solo ejecutamos ListModels si no hay caché
    if (!cachedModel) {
      console.log("🔍 Descubriendo modelo compatible...");
      const mRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanApiKey}`);
      const mData = await mRes.json();
      
      if (mData.error) throw new Error(mData.error.message);
      
      // Priorizamos 1.5-flash por eficiencia
      cachedModel = mData.models?.find((m: any) => m.name.includes("gemini-1.5-flash"))?.name 
                   || mData.models?.[0]?.name;
      
      console.log(`✅ Modelo seleccionado: ${cachedModel}`);
    }

    // Llamada directa: Ahorramos 1 petición (RPS) por cada factura
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${cachedModel}:generateContent?key=${cleanApiKey}`, {
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

    if (data.error) {
      // Si el modelo guardado da error de disponibilidad, reseteamos caché para el próximo intento
      if (data.error.code === 404) cachedModel = null;
      throw new Error(data.error.message);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("IA sin respuesta.");

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);

  } catch (error: any) {
    console.error("Error en IA (Bajo Consumo):", error.message);
    throw new Error(`IA: ${error.message}`);
  }
}

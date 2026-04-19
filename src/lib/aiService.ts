// Versión de Compatibilidad Universal (Sistema de Cascadas)
export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const cleanApiKey = apiKey.trim();
  const PROMPT = "Extrae JSON: {proveedor_nombre, proveedor_nif, proveedor_direccion, proveedor_cp, num_factura, fecha (YYYY-MM-DD), lineas:[{descripcion, unidades, precio_unitario, iva_pct}], retencion_pct}. Sé preciso con NIF e importes.";

  // Lista de estrategias (versión API + modelo) para probar en cascada
  const strategies = [
    { v: "v1beta", m: "gemini-1.5-flash" },
    { v: "v1beta", m: "gemini-1.5-flash-latest" },
    { v: "v1", m: "gemini-1.5-flash" },
    { v: "v1beta", m: "gemini-pro" }
  ];

  let lastError = null;

  for (const s of strategies) {
    try {
      console.log(`Intentando estrategia: ${s.v} / ${s.m}`);
      const response = await fetch(`https://generativelanguage.googleapis.com/${s.v}/models/${s.m}:generateContent?key=${cleanApiKey}`, {
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
        // Si el modelo no existe o no es soportado, probamos el siguiente de la lista
        if (data.error.code === 404 || data.error.message.includes("not found") || data.error.message.includes("not supported")) {
          console.warn(`Estrategia ${s.m} fallida: No encontrado.`);
          continue;
        }
        throw new Error(data.error.message);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("IA sin respuesta.");

      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);

    } catch (error: any) {
      console.error(`Error con ${s.m}:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`Se han agotado todas las estrategias de IA. Último error: ${lastError?.message}. Por favor, verifica que tu clave API tenga permisos para los modelos Gemini.`);
}

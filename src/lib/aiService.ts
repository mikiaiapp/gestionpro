// Volviendo a la Robustez Original (Modelo Fijo + Bajo Consumo)
export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const cleanApiKey = apiKey.trim();

  // Prompt optimizado al máximo para ahorrar tokens y cuota
  const PROMPT = "Extrae JSON: {proveedor_nombre, proveedor_nif, proveedor_direccion, proveedor_cp, num_factura, fecha (YYYY-MM-DD), lineas:[{descripcion, unidades, precio_unitario, iva_pct}], retencion_pct}. Sé preciso con NIF e importes.";

  try {
    // Usamos el modelo 1.5-flash directamente (es el que tiene los límites más altos en el plan gratuito)
    // Forzamos la versión v1beta que es la más compatible con PDF en el plan Free
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanApiKey}`, {
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
          temperature: 0.1,
          topP: 0.1,
          topK: 1
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      if (data.error.code === 429) {
        throw new Error(`Límite de Google alcanzado. Por favor, realiza esta factura de nuevo en 60 segundos.`);
      }
      throw new Error(data.error.message);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Sin respuesta de la IA.");

    // Limpieza de JSON por si la IA añade bloques markdown
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);

  } catch (error: any) {
    console.error("Fallo IA:", error.message);
    throw new Error(`Atención: ${error.message}`);
  }
}

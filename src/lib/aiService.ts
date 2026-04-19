// Lista de modelos por orden de velocidad/eficiencia para extracción
const FAST_MODELS = [
  "gemini-1.5-flash-8b",   // El más rápido para estas tareas
  "gemini-1.5-flash", 
  "gemini-2.0-flash-exp"
];

export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `Extract invoice data: {proveedor_nombre, proveedor_nif, proveedor_direccion, proveedor_cp, num_factura, fecha, lineas: [{descripcion, unidades, precio_unitario, iva_pct}], retencion_pct}. If multiple IVAs, separate into lines. output JSON only.`;

  let lastError = null;
  const MAX_RETRIES = 2; // Reducimos reintentos para no bloquear la UI

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const cleanApiKey = apiKey.trim();
      // Usamos el modelo más rápido disponible en nuestra lista estática
      const modelName = `models/${FAST_MODELS[attempt % FAST_MODELS.length]}`;
      
      console.log(`⚡ Extracción rápida (intento ${attempt + 1}) con ${modelName}`);

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
            response_mime_type: "application/json", // FORZAR JSON - Ahorra tiempo de parseo
            temperature: 0.1, // Menos creatividad = más velocidad en estos modelos
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        if (data.error.code === 503 || data.error.message.includes("high demand")) {
          await new Promise(r => setTimeout(r, 800)); 
          continue; 
        }
        throw new Error(`API Gemini: ${data.error.message}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Sin respuesta de IA");
      
      // Con response_mime_type, el texto ya viene como JSON puro
      return JSON.parse(text.trim());

    } catch (error: any) {
      console.error(`Error en intento ${attempt + 1}:`, error);
      lastError = error;
      if (!error.message.includes("high demand") && !error.message.includes("503")) break;
    }
  }

  throw lastError || new Error("Fallo en extracción rápida");
}

// Configuración definitiva de Estabilidad
export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `
    Analiza esta factura de gastos con precisión absoluta.
    Es vital que extraigas los datos fiscales correctamente (NIF, CP, Direcciones).
    Si hay IRPF (retenciones de autónomo), identifícalo.
    
    Responde estrictamente con un JSON (sin markdown):
    {
      "proveedor_nombre": "Nombre completo",
      "proveedor_nif": "NIF/CIF",
      "proveedor_direccion": "Calle Completa",
      "proveedor_cp": "CP",
      "num_factura": "Número factura",
      "fecha": "YYYY-MM-DD",
      "lineas": [
        { "descripcion": "Concepto", "unidades": 1, "precio_unitario": 0, "iva_pct": 21 }
      ],
      "retencion_pct": 0
    }
  `;

  const cleanApiKey = apiKey.trim();
  let lastError = null;
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`⚡ [Intento ${attempt + 1}] Reestableciendo IA estable (gemini-1.5-flash)...`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: "application/pdf", data: base64File.split(',')[1] || base64File } }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        lastError = new Error(data.error.message);
        // Si el error es de cuota, esperamos 5 segundos para que Google RESETEE el contador
        if (data.error.code === 429 || data.error.message.includes("quota")) {
          console.warn("⏳ Límite de cuota detectado. Pausando 5s para recuperación...");
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        throw lastError;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Sin respuesta de IA.");
      
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);

    } catch (error: any) {
      console.error("Error en extracción:", error);
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  throw lastError || new Error("Error en extracción inteligente.");
}

// Motor de IA Estabilizado (v1 Estable + Cascada)
export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `
    Analiza esta factura y responde SOLO con un JSON:
    {
      "proveedor_nombre": "Nombre",
      "proveedor_nif": "NIF",
      "proveedor_direccion": "Dirección",
      "proveedor_cp": "CP",
      "num_factura": "Número",
      "fecha": "YYYY-MM-DD",
      "lineas": [
        { "descripcion": "Concepto", "unidades": 1, "precio_unitario": 0, "iva_pct": 21 }
      ],
      "retencion_pct": 0
    }
  `;

  const cleanApiKey = apiKey.trim();
  
  // Lista de modelos en orden de prioridad (v1 es preferible)
  const STRATEGIES = [
    { version: "v1", model: "gemini-1.5-flash" },
    { version: "v1beta", model: "gemini-1.5-flash-latest" },
    { version: "v1beta", model: "gemini-1.5-flash" },
    { version: "v1beta", model: "gemini-1.5-pro-latest" }
  ];

  let lastErrorMessage = "";

  for (const strategy of STRATEGIES) {
    try {
      console.log(`⚡ Intentando ${strategy.version} con ${strategy.model}...`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/${strategy.version}/models/${strategy.model}:generateContent?key=${cleanApiKey}`, {
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
        lastErrorMessage = data.error.message;
        // Si no está el modelo, probamos la siguiente estrategia
        if (data.error.code === 404 || lastErrorMessage.includes("not found")) continue;
        // Si hay error de cuota o similar, lo lanzamos para que el usuario espere
        throw new Error(lastErrorMessage);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);

    } catch (error: any) {
      console.warn(`Fallo estrategia ${strategy.model}:`, error.message);
      lastErrorMessage = error.message;
    }
  }

  throw new Error(`Error de IA Definitivo: ${lastErrorMessage}. (Sugerencia: Crea una nueva API Key en Google AI Studio)`);
}

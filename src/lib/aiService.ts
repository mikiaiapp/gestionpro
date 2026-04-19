// Motor de IA Auto-Adaptativo (Resistente a errores de Google)
export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `
    Analiza esta factura y extrae:
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
  
  // Lista de modelos a probar en cascada
  const MODELS_TO_TRY = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro-latest"
  ];

  let lastError = null;

  for (const modelId of MODELS_TO_TRY) {
    try {
      console.log(`🔍 Intentando con modelo: ${modelId}...`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${cleanApiKey}`, {
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
        // Si el modelo no se encuentra o no es soportado, saltamos al siguiente sin mostrar error al usuario
        if (data.error.code === 404 || data.error.message.includes("not found") || data.error.message.includes("not supported")) {
          console.warn(`⚠️ Modelo ${modelId} no disponible en esta cuenta. Probando siguiente...`);
          continue; 
        }
        
        // Si es error de cuota (429), esperamos un poco pero seguimos intentando otros
        if (data.error.code === 429) {
          console.warn(`⏳ Límite de cuota en ${modelId}.`);
          lastError = new Error("Límite de cuota excedido en Google Gemini. Por favor, espera 60 segundos.");
          continue;
        }

        throw new Error(data.error.message);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);

    } catch (error: any) {
      console.error(`Fallo con ${modelId}:`, error);
      lastError = error;
    }
  }

  throw lastError || new Error("No se ha encontrado ningún modelo de IA compatible con tu cuenta de Google.");
}

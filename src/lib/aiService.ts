// Motor de IA con Autodescubrimiento (Universal y Resistente)
export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const cleanApiKey = apiKey.trim();

  const PROMPT = `
    Analiza esta factura y responde solo con un JSON:
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

  try {
    console.log("🔍 Escaneando modelos disponibles en tu cuenta...");
    
    // Paso 1: Preguntar a Google qué modelos tiene el usuario
    const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanApiKey}`);
    const modelsData = await modelsResponse.json();

    if (modelsData.error) {
      throw new Error(`Error al consultar modelos: ${modelsData.error.message}`);
    }

    // Paso 2: Filtrar los que soportan generación de contenido
    const availableModels = modelsData.models
      ?.filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
      .map((m: any) => m.name) || [];

    if (availableModels.length === 0) {
      throw new Error("No hay modelos de generación disponibles para esta clave API.");
    }

    // Paso 3: Priorizar el mejor para facturas (1.5-flash)
    let selectedModel = availableModels.find((name: string) => name.includes("gemini-1.5-flash")) || availableModels[0];
    
    console.log(`✅ Usando modelo detectado: ${selectedModel}`);

    // Paso 4: Realizar la extracción con el modelo confirmado
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${cleanApiKey}`, {
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
      throw new Error(data.error.message);
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Sin respuesta de IA.");

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);

  } catch (error: any) {
    console.error("Error en extracción dinámica:", error);
    throw new Error(`Fallo de IA: ${error.message}. Por favor, verifica que tu clave API sea válida.`);
  }
}

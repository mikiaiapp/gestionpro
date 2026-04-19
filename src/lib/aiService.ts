// Versión de Máxima Compatibilidad (v1beta + 1.5-flash)
export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  const PROMPT = `
    Analiza esta factura y extrae la información en este formato JSON (sin markdown):
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
  const modelName = "gemini-1.5-flash"; 

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanApiKey}`, {
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
          temperature: 0.1
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No se ha podido leer la factura.");

    // Limpieza manual de JSON
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Error en IA:", error);
    throw new Error(`Error de IA: ${error.message}. Por favor, si el error persiste, espera 60 segundos.`);
  }
}

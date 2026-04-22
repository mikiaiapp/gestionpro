import { NextResponse } from 'next/server';

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { base64File, apiKey } = await req.json();
    const cleanApiKey = apiKey?.trim();

    if (!cleanApiKey) {
      return NextResponse.json({ error: "Falta la clave API de Google Gemini." }, { status: 400 });
    }

    // 1. Modelos a intentar (en orden de prioridad)
    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.0-pro-vision-latest"
    ];

    const PROMPT = `Analiza esta factura y extrae los datos en formato JSON estricto:
    {
      "proveedor_nombre": "Nombre del emisor",
      "proveedor_nif": "NIF/CIF",
      "proveedor_direccion": "Dirección completa",
      "proveedor_cp": "Código Postal",
      "num_factura": "Número de factura",
      "fecha": "YYYY-MM-DD",
      "lineas": [{"descripcion": "Base imponible al X%", "unidades": 1, "precio_unitario": 0.00, "iva_pct": X}],
      "retencion_pct": X
    }
    REGLA CRÍTICA: Agrupa los artículos por tipo de IVA. Crea una única línea por cada porcentaje de IVA (ej: "Base imponible al 21%"). El precio_unitario será la suma de todas las bases de ese tipo.`;

    let lastError = null;
    let responseData = null;

    // Intentamos con varios modelos si uno falla por saturación
    for (const modelName of modelsToTry) {
      console.log(`Intentando extracción con ${modelName}...`);
      
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
              temperature: 0.1,
              response_mime_type: "application/json" // Forzamos modo JSON si el modelo lo soporta
            }
          })
        });

        const data = await response.json();

        if (data.error) {
          lastError = data.error.message;
          // Si es saturación o cuota, saltamos al siguiente modelo inmediatamente
          if (lastError.toLowerCase().includes("high demand") || data.error.code === 429 || data.error.code === 503) {
            continue;
          }
          throw new Error(lastError);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          responseData = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
          break; // ¡Éxito! Salimos del bucle de modelos
        }
      } catch (e: any) {
        lastError = e.message;
        console.warn(`Fallo con ${modelName}:`, lastError);
      }
    }

    if (responseData) {
      return NextResponse.json(responseData);
    }

    return NextResponse.json({ 
      error: `No se pudo completar la extracción tras varios intentos. Último error: ${lastError}` 
    }, { status: 500 });

  } catch (error: any) {
    console.error("AI Route Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { base64File, apiKey } = await req.json();
    const cleanApiKey = apiKey?.trim();

    if (!cleanApiKey) {
      return NextResponse.json({ error: "Falta la clave API de Google Gemini." }, { status: 400 });
    }

    // Modelos modernos compatibles con v1beta y procesamiento de PDF
    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash-8b" // Modelo ultra-ligero, excelente alternativa si los demás están llenos
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
    REGLA: Agrupa los artículos por tipo de IVA. Crea una única línea por cada porcentaje de IVA (ej: "Base imponible al 21%"). El precio_unitario es la suma de las bases de ese tipo.`;

    let lastError = null;
    let responseData = null;

    for (const modelName of modelsToTry) {
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
              response_mime_type: "application/json"
            }
          })
        });

        const data = await response.json();

        if (data.error) {
          lastError = data.error.message;
          // Si el error es saturación, pasamos al siguiente modelo
          if (lastError.toLowerCase().includes("demand") || data.error.code === 429 || data.error.code === 503) {
            console.log(`Modelo ${modelName} saturado, saltando...`);
            continue;
          }
          throw new Error(lastError);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          responseData = JSON.parse(text.trim());
          break; 
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (responseData) {
      return NextResponse.json(responseData);
    }

    return NextResponse.json({ 
      error: `Google Gemini sigue saturado en todos sus modelos. Por favor, espera 1 minuto. (Último error: ${lastError})` 
    }, { status: 503 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

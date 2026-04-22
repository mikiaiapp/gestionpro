import { NextResponse } from 'next/server';

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { base64File, apiKey } = await req.json();
    const cleanApiKey = apiKey?.trim();

    if (!cleanApiKey) {
      return NextResponse.json({ error: "Falta la clave API de Google Gemini." }, { status: 400 });
    }

    // 1. Descubrimiento dinámico de modelos
    let availableModels: string[] = [];
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanApiKey}`);
      const data = await res.json();
      if (data.models) {
        availableModels = data.models
          .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
          .map((m: any) => m.name);
      }
    } catch (e) {
      console.warn("Error en descubrimiento.");
    }

    const priority = ["gemini-1.5-flash", "gemini-1.5-pro", "flash"];
    const modelsToTry = [
      ...availableModels.sort((a, b) => {
        const aScore = priority.findIndex(p => a.includes(p));
        const bScore = priority.findIndex(p => b.includes(p));
        return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
      }),
      "models/gemini-1.5-flash",
      "models/gemini-1.5-pro"
    ];

    const uniqueModels = [...new Set(modelsToTry)];

    // PROMPT REFORZADO: Instrucciones de agrupación más agresivas y al principio
    const PROMPT = `INSTRUCCIÓN CRÍTICA: NO EXTRAIGAS ARTÍCULOS INDIVIDUALES. 
    Debes generar un resumen contable agrupado por tipo de IVA.

    Extrae los datos en este formato JSON:
    {
      "proveedor_nombre": "Nombre",
      "proveedor_nif": "NIF",
      "proveedor_direccion": "Dirección",
      "proveedor_cp": "CP",
      "num_factura": "Número",
      "fecha": "YYYY-MM-DD",
      "lineas": [
        {
          "descripcion": "Base imponible al X%", 
          "unidades": 1, 
          "precio_unitario": SUMA_DE_BASES_DE_ESE_IVA, 
          "iva_pct": X
        }
      ],
      "retencion_pct": X
    }

    REGLAS DE ORO:
    1. Si hay 10 artículos al 21% de IVA, genera una ÚNICA línea con la descripción "Base imponible al 21%".
    2. El "precio_unitario" de esa línea debe ser la suma total de las bases imponibles de todos los artículos de ese tipo de IVA.
    3. Si hay varios tipos de IVA (ej: 21% y 10%), genera exactamente una línea para cada tipo.`;

    let lastError = "No se pudieron encontrar modelos compatibles.";
    
    for (const fullModelName of uniqueModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fullModelName}:generateContent?key=${cleanApiKey}`, {
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
          if (lastError.toLowerCase().includes("demand") || lastError.toLowerCase().includes("quota") || data.error.code === 429) {
            continue;
          }
          throw new Error(lastError);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return NextResponse.json(JSON.parse(text.trim()));
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    return NextResponse.json({ 
      error: `Error de saturación en Google. (Último error: ${lastError})` 
    }, { status: 503 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

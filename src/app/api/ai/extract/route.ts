import { NextResponse } from 'next/server';

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { base64File, apiKey } = await req.json();
    const cleanApiKey = apiKey?.trim();

    if (!cleanApiKey) {
      return NextResponse.json({ error: "Falta la clave API de Google Gemini." }, { status: 400 });
    }

    // 1. Descubrimiento dinámico de modelos disponibles para esta clave
    let availableModels: string[] = [];
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanApiKey}`);
      const data = await res.json();
      if (data.models) {
        availableModels = data.models
          .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
          .map((m: any) => m.name); // Ya incluyen el prefijo "models/"
      }
    } catch (e) {
      console.warn("Error en descubrimiento, usando lista estática.");
    }

    // Prioridad: Flash 1.5 -> Pro 1.5 -> Cualquier otro disponible
    const priority = ["gemini-1.5-flash", "gemini-1.5-pro", "flash"];
    const modelsToTry = [
      ...availableModels.sort((a, b) => {
        const aScore = priority.findIndex(p => a.includes(p));
        const bScore = priority.findIndex(p => b.includes(p));
        return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
      }),
      "models/gemini-1.5-flash", // Fallbacks manuales por si falla el descubrimiento
      "models/gemini-1.5-pro"
    ];

    // Eliminamos duplicados
    const uniqueModels = [...new Set(modelsToTry)];

    const PROMPT = `Extrae datos de esta factura en JSON estricto:
    {
      "proveedor_nombre", "proveedor_nif", "proveedor_direccion", "proveedor_cp",
      "num_factura", "fecha" (YYYY-MM-DD),
      "lineas": [{"descripcion": "Base imponible al X%", "unidades": 1, "precio_unitario": 0.00, "iva_pct": X}],
      "retencion_pct": X
    }
    REGLA: Agrupa por tipo de IVA. Una línea por cada % de IVA. El precio es la suma de las bases.`;

    let lastError = "No se pudieron encontrar modelos compatibles.";
    
    // Intentamos con todos los modelos disponibles hasta que uno responda
    for (const fullModelName of uniqueModels) {
      try {
        console.log(`Probando modelo: ${fullModelName}`);
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
            generationConfig: { temperature: 0.1 }
          })
        });

        const data = await response.json();

        if (data.error) {
          lastError = data.error.message;
          // Si el error es de saturación o límite, pasamos al siguiente inmediatamente
          if (lastError.toLowerCase().includes("demand") || lastError.toLowerCase().includes("quota") || data.error.code === 429) {
            continue;
          }
          // Si es otro error (ej: archivo muy grande), paramos
          throw new Error(lastError);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
          return NextResponse.json(JSON.parse(cleanJson));
        }
      } catch (e: any) {
        lastError = e.message;
        console.warn(`Fallo con ${fullModelName}:`, lastError);
      }
    }

    return NextResponse.json({ 
      error: `Saturación total en Google. Todos los modelos (${uniqueModels.length}) han fallado. Por favor, espera 1 minuto a que se libere tu cuota gratuita. (Último error: ${lastError})` 
    }, { status: 503 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

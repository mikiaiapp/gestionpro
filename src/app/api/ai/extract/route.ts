import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { base64File, apiKey } = await req.json();
    const cleanApiKey = apiKey.trim();

    // 1. Descubrimiento dinámico de modelo
    let selectedModel = null;
    let selectedVersion = "v1beta";

    const versions = ["v1", "v1beta"];
    for (const v of versions) {
      try {
        const mRes = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${cleanApiKey}`);
        const mData = await mRes.json();
        if (mData.models) {
          const best = mData.models.find((m: any) => 
            m.supportedGenerationMethods.includes("generateContent") && 
            m.name.toLowerCase().includes("flash")
          ) || mData.models.find((m: any) => m.supportedGenerationMethods.includes("generateContent"));
          
          if (best) {
            selectedModel = best.name;
            selectedVersion = v;
            break;
          }
        }
      } catch (e) { continue; }
    }

    if (!selectedModel) {
      return NextResponse.json({ error: "No se encontraron modelos compatibles." }, { status: 404 });
    }

    const PROMPT = `Extrae JSON de factura: {
      proveedor_nombre, 
      proveedor_nif, 
      proveedor_direccion, 
      proveedor_cp, 
      num_factura, 
      fecha (YYYY-MM-DD), 
      lineas: [{descripcion, unidades: 1, precio_unitario, iva_pct}], 
      retencion_pct
    }. 
    IMPORTANTE: Agrupa los conceptos por tipo de IVA. No listes cada artículo. 
    Crea una única línea por cada tipo de IVA encontrado con la descripción "Base imponible al X%" y el total de esa base como precio_unitario.`;

    // 2. Ejecución con Reintentos Automáticos (Máximo 3)
    let lastError = null;
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/${selectedVersion}/${selectedModel}:generateContent?key=${cleanApiKey}`, {
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
        
        // Si hay error de demanda o cuota, esperamos y reintentamos
        if (data.error) {
          lastError = data.error.message;
          if (data.error.message.includes("high demand") || data.error.code === 429) {
            await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Espera exponencial
            continue;
          }
          throw new Error(data.error.message);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("La IA no devolvió contenido.");
        
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return NextResponse.json(JSON.parse(cleanJson));

      } catch (e: any) {
        lastError = e.message;
        if (i === 2) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    throw new Error(lastError || "Error desconocido en el servidor IA.");

  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

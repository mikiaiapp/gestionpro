import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { base64File, apiKey } = await req.json();
    const cleanApiKey = apiKey.trim();

    // 1. Descubrimiento dinámico de modelo (En el servidor es 100% fiable)
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

    // 2. Extracción directa
    const PROMPT = "Extrae JSON de factura: {proveedor_nombre, proveedor_nif, proveedor_direccion, proveedor_cp, num_factura, fecha (YYYY-MM-DD), lineas:[{descripcion, unidades, precio_unitario, iva_pct}], retencion_pct}";

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
    if (data.error) throw new Error(data.error.message);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return NextResponse.json(JSON.parse(cleanJson));

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

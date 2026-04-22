import { NextResponse } from 'next/server';

// Incrementamos la duración máxima permitida en Vercel
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { base64File, apiKey } = await req.json();
    const cleanApiKey = apiKey?.trim();

    if (!cleanApiKey) {
      return NextResponse.json({ error: "Falta la clave API de Google Gemini." }, { status: 400 });
    }

    // 1. Descubrimiento de modelo (Priorizamos Flash por disponibilidad)
    let selectedModel = "gemini-1.5-flash"; 
    let selectedVersion = "v1beta";

    try {
      const mRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanApiKey}`);
      const mData = await mRes.json();
      if (mData.models) {
        const best = mData.models.find((m: any) => 
          m.name.includes("gemini-1.5-flash") || m.name.includes("flash")
        );
        if (best) selectedModel = best.name;
      }
    } catch (e) {
      console.warn("Error listando modelos, usando fallback flash.");
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
    IMPORTANTE: Agrupa los conceptos por tipo de IVA. 
    Crea una única línea por cada tipo de IVA encontrado con la descripción "Base imponible al X%" y el total de esa base como precio_unitario.`;

    // 2. Ejecución con reintentos y lógica de error clara
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      attempts++;
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
            generationConfig: { 
              temperature: 0.1,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 2048,
            }
          })
        });

        const data = await response.json();

        if (data.error) {
          const msg = data.error.message || "";
          lastError = msg;
          
          if (msg.toLowerCase().includes("high demand") || data.error.code === 429 || data.error.code === 503) {
            if (attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 2000 * attempts));
              continue;
            }
            return NextResponse.json({ 
              error: "Saturación en Google: El servidor de IA está recibiendo demasiadas peticiones. Por favor, espera 30 segundos e inténtalo de nuevo." 
            }, { status: 503 });
          }

          return NextResponse.json({ error: `Error de Google: ${msg}` }, { status: response.status || 500 });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("La IA no generó respuesta.");

        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return NextResponse.json(JSON.parse(cleanJson));

      } catch (e: any) {
        lastError = e.message;
        if (attempts >= maxAttempts) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    throw new Error(lastError || "Error desconocido");

  } catch (error: any) {
    console.error("Critical AI Route Error:", error);
    return NextResponse.json({ 
      error: `Error en la extracción: ${error.message}` 
    }, { status: 500 });
  }
}

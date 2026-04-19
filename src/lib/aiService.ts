// Servicio de IA Protegido (vía Proxy del Servidor)
// Esto evita errores de red, CORS y bloqueos de AdBlockers
export async function extractDataFromInvoice(base64File: string, apiKey: string) {
  try {
    console.log("⚡ Iniciando extracción segura vía Servidor...");

    const response = await fetch("/api/ai/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64File, apiKey })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error desconocido en el servidor.");
    }

    return await response.json();

  } catch (error: any) {
    console.error("Error en servicio de IA:", error.message);
    throw new Error(`Servidor IA: ${error.message}`);
  }
}

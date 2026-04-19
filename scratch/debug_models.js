import { supabase } from '../lib/supabase';

async function checkModels() {
  // Obtenemos la clave de API del perfil (como hace la app)
  const { data: profile } = await supabase.from('perfiles').select('gemini_api_key').single();
  const apiKey = profile?.gemini_api_key;

  if (!apiKey) {
    console.error("No hay clave de API en el perfil");
    return;
  }

  console.log("Consultando modelos disponibles para tu clave...");
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.error) {
      console.error("Error de Google:", data.error.message);
      return;
    }

    console.log("--- MODELOS DISPONIBLES ---");
    data.models?.forEach((m: any) => {
      console.log(`- ${m.name} [${m.supportedGenerationMethods.join(', ')}]`);
    });
    console.log("---------------------------");

  } catch (e) {
    console.error("Fallo de red:", e);
  }
}

checkModels();

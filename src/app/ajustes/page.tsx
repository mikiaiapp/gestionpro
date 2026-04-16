"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Settings, Save, CreditCard, Building, Plus, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AjustesPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Datos del Emisor
  const [nombre, setNombre] = useState("");
  const [nif, setNif] = useState("");
  const [cuentaBancaria, setCuentaBancaria] = useState("");
  const [direccion, setDireccion] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiStatus, setGeminiStatus] = useState({ msg: "", type: "muted" });
  
  // Formas de Cobro
  const [formasCobro, setFormasCobro] = useState<any[]>([]);
  const [nuevaForma, setNuevaForma] = useState("");

  useEffect(() => {
    fetchAjustes();
  }, [supabase]);

  const fetchAjustes = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    // Fail-safe: liberar la UI en 2 segundos si hay lag
    const timeout = setTimeout(() => setLoading(false), 2000);

    try {
      console.log("Fetching Ajustes data...");
      // Intentar cargar perfil (ID 1 es el fijo)
      const { data: perfil } = await supabase.from("perfil_negocio").select("*").eq("id", 1).maybeSingle();
      if (perfil) {
        setNombre(perfil.nombre || "");
        setNif(perfil.nif || "");
        setCuentaBancaria(perfil.cuenta_bancaria || "");
        setDireccion(perfil.direccion || "");
        setGeminiKey(perfil.gemini_key || "");
      }

      // Cargar formas de cobro
      const { data: fbc } = await supabase.from("formas_cobro").select("*").order("nombre");
      setFormasCobro(fbc || []);
    } catch (e: any) {
      console.error("Error cargando ajustes:", e);
    } finally {
      console.log("Ajustes load finished.");
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleSavePerfil = async () => {
    setIsSaving(true);
    const { error } = await supabase.from("perfil_negocio").upsert({
      id: 1, // Usamos un ID fijo para el perfil único
      nombre,
      nif,
      cuenta_bancaria: cuentaBancaria,
      direccion,
      gemini_key: geminiKey
    });
    
    if (error) alert("Error al guardar: " + error.message);
    else alert("Configuración guardada correctamente");
    setIsSaving(false);
  };

  const handleAddForma = async () => {
    if (!nuevaForma) return;
    const { error } = await supabase.from("formas_cobro").insert([{ nombre: nuevaForma }]);
    if (!error) {
      setNuevaForma("");
      fetchAjustes();
    }
  };

  const handleDeleteForma = async (id: string) => {
    const { error } = await supabase.from("formas_cobro").delete().eq("id", id);
    if (!error) fetchAjustes();
  };

  const testGeminiKey = async () => {
    if (!geminiKey) {
      setGeminiStatus({ msg: "Introduce la clave primero", type: "red" });
      return;
    }
    setGeminiStatus({ msg: "Verificando...", type: "muted" });
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}&pageSize=1`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setGeminiStatus({ msg: "✓ Conexión establecida correctamente", type: "green" });
    } catch (e: any) {
      setGeminiStatus({ msg: "✕ Error: " + e.message, type: "red" });
    }
  };

  if (loading) return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent)]" size={40} />
      </div>
    </div>
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Ajustes</h1>
          <p className="text-[var(--muted)] font-medium">Configuración de empresa, identidad fiscal y tesorería.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* PERFIL EMPRESA / EMISOR */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm p-8 h-fit">
            <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
              <Building className="text-[var(--accent)]" /> Datos del Emisor
            </h2>
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50 mb-6">
                <div className="w-16 h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-300">
                  <ImageIcon size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">Logo de Empresa</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Click para subir (PNG/JPG)</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Nombre Comercial / Razón Social</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--accent)] font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">NIF / CIF</label>
                  <input type="text" value={nif} onChange={e => setNif(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--accent)] uppercase" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Cuenta Bancaria (IBAN)</label>
                  <input type="text" value={cuentaBancaria} onChange={e => setCuentaBancaria(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--accent)] font-mono text-sm" placeholder="ES00 0000..." />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Dirección Fiscal</label>
                <textarea value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--accent)] text-sm" rows={3} />
              </div>

              <button 
                onClick={handleSavePerfil}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--accent)] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? "Guardando..." : "Guardar Configuración"}
              </button>
            </div>
          </div>

          {/* INTELIGENCIA ARTIFICIAL (GEMINI) */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm p-8 h-fit">
            <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
              <span className="text-xl">✨</span> Inteligencia Artificial (Gemini)
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">Configura tu API Key de Google para activar el importador automático de facturas en PDF.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Google Gemini API KEY</label>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    value={geminiKey} 
                    onChange={e => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
                  />
                  <button onClick={testGeminiKey} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors">
                    Probar
                  </button>
                </div>
                {geminiStatus.msg && (
                  <p className={`text-[10px] mt-2 font-bold uppercase ${geminiStatus.type === 'green' ? 'text-green-600' : 'text-red-500'}`}>
                    {geminiStatus.msg}
                  </p>
                )}
                <p className="text-[10px] mt-3 text-gray-400">
                  Consigue tu clave gratuita en <a href="https://aistudio.google.com/apikey" target="_blank" className="text-[var(--accent)] underline">Google AI Studio</a>.
                </p>
              </div>
            </div>
          </div>

          {/* FORMAS DE COBRO */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm p-8 h-fit">
            <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
              <CreditCard className="text-[var(--accent)]" /> Formas de Cobro
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">Estas opciones aparecerán en el editor al crear nuevas facturas.</p>
            
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={nuevaForma} 
                onChange={e => setNuevaForma(e.target.value)}
                placeholder="Ej: Transferencia 30 días"
                className="flex-1 p-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-[var(--accent)] transition-colors"
                onKeyPress={e => e.key === 'Enter' && handleAddForma()}
              />
              <button onClick={handleAddForma} className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {formasCobro.map(f => (
                <div key={f.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-all group">
                  <span className="font-bold text-gray-700">{f.nombre}</span>
                  <button onClick={() => handleDeleteForma(f.id)} className="p-2 text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {formasCobro.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 italic text-sm">
                  No hay formas de cobro definidas.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

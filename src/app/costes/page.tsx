"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Download, Plus, Search, MoreHorizontal, Loader2, Factory, FolderKanban, FileText, Sparkles, X, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CostesPage() {
  const [costes, setCostes] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");

  // Formulario
  const [serie, setSerie] = useState("A");
  const [numInterno, setNumInterno] = useState("");
  const [numFactProv, setNumFactProv] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [proveedorId, setProveedorId] = useState("");
  const [tipoGasto, setTipoGasto] = useState("general");
  const [proyectoId, setProyectoId] = useState("");
  const [baseImponible, setBaseImponible] = useState("");
  const [tipoIva, setTipoIva] = useState(21);

  useEffect(() => {
    fetchData();
    // Fail-safe: desbloquear carga tras 2 segundos máximo
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [supabase]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: csts } = await supabase
        .from("costes")
        .select("*, proveedores(nombre), proyectos(nombre)")
        .order("fecha", { ascending: false });

      const { data: provs } = await supabase.from("proveedores").select("id, nombre").order("nombre");
      const { data: projs } = await supabase.from("proyectos").select("id, nombre").order("nombre");
      const { data: perfil } = await supabase.from("perfil_negocio").select("gemini_key").maybeSingle();

      setCostes(csts || []);
      setProveedores(provs || []);
      setProyectos(projs || []);
      if (perfil?.gemini_key) setGeminiKey(perfil.gemini_key);
    } catch (e: any) {
      console.error("Error cargando costes:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !geminiKey) {
      if (!geminiKey) alert("Configura primero la Gemini API Key en Ajustes.");
      return;
    }

    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        
        const prompt = `Analiza esta factura y responde ÚNICAMENTE con un objeto JSON válido, sin explicaciones, sin markdown, sin backticks. 
        JSON: { "nif": "CIF emisor", "proveedor": "Nombre emisor", "numfact": "Nº factura", "fecha": "YYYY-MM-DD", "base": 0.00, "ivaPct": 21, "total": 0.00 }`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: 'application/pdf', data: base64 } },
                { text: prompt }
              ]
            }]
          })
        });

        // NOTA: 'gemini-pro-vision' es un ejemplo, usaremos la lógica de rotación similar a legacy si es necesario.
        // Por sencillez en esta primera fase de migración:
        const data = await res.json();
        let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        raw = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/,'').trim();
        const parsed = JSON.parse(raw);

        // Mapear datos al formulario
        if (parsed.numfact) setNumFactProv(parsed.numfact);
        if (parsed.fecha) setFecha(parsed.fecha);
        if (parsed.base) setBaseImponible(String(parsed.base));
        if (parsed.ivaPct) setTipoIva(parsed.ivaPct);
        
        // Buscar proveedor por nombre o NIF
        const prov = proveedores.find(p => p.nombre.toLowerCase().includes(parsed.proveedor?.toLowerCase()) || p.nif === parsed.nif);
        if (prov) setProveedorId(prov.id);

        setIsAiModalOpen(false);
        setIsModalOpen(true);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      alert("Error en el análisis IA: " + e.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const totalBase = parseFloat(baseImponible) || 0;
  const cuotaIva = serie === "A" ? totalBase * (tipoIva / 100) : 0;
  const totalFactura = totalBase + cuotaIva;

  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      alert("Error: No hay conexión con la base de datos.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("costes")
        .insert([{
          serie,
          num_interno: numInterno,
          num_factura_proveedor: numFactProv,
          fecha,
          proveedor_id: proveedorId || null,
          tipo_gasto: tipoGasto,
          proyecto_id: tipoGasto === "proyecto" ? proyectoId : null,
          base_imponible: totalBase,
          iva_pct: serie === "A" ? tipoIva : 0,
          iva_importe: cuotaIva,
          total: totalFactura
        }]);

      if (error) throw error;

      setIsModalOpen(false);
      // Limpiar
      setNumFactProv("");
      setBaseImponible("");
      setProveedorId("");
      fetchData();
    } catch (err: any) {
      alert("Error al guardar coste: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Costes</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de facturas recibidas y gastos de empresa.</p>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[var(--border)] text-gray-700 font-bold hover:shadow-md transition-all active:scale-[0.98]"
              >
                <Sparkles size={18} className="text-purple-500" />
                Importar PDF
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Plus size={18} />
                Nuevo Coste
              </button>
          </div>
        </header>

        {/* MODAL IA */}
        {isAiModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border)] text-center relative">
                <button onClick={() => setIsAiModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Sparkles className="text-purple-500" size={32} />
                </div>
                <h2 className="text-xl font-bold font-head mb-2">Análisis de Factura con IA</h2>
                <p className="text-sm text-gray-500 mb-6">Sube el PDF de tu factura y Gemini extraerá los datos automáticamente.</p>
                
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
                   {isExtracting ? (
                     <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-purple-500" size={24} />
                        <span className="text-xs font-bold text-gray-500 uppercase">Analizando factura...</span>
                     </div>
                   ) : (
                     <>
                       <Upload className="text-gray-300 mb-2" size={24} />
                       <span className="text-sm font-bold text-gray-700">Seleccionar PDF</span>
                       <input type="file" className="hidden" accept="application/pdf" onChange={handleImportPDF} />
                     </>
                   )}
                </label>
             </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-[var(--border)] animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold font-head flex items-center gap-2"><FileText className="text-[var(--accent)]" /> Registrar Coste</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Serie</label>
                    <select value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]">
                      <option value="A">Serie A (Con IVA)</option>
                      <option value="B">Serie B (Sin IVA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Nº Interno</label>
                    <input type="text" value={numInterno} onChange={(e) => setNumInterno(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" placeholder="Ej: 2024-C001" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Nº Factura Prov.</label>
                    <input type="text" value={numFactProv} onChange={(e) => setNumFactProv(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] font-bold text-blue-600" placeholder="Extraído de IA..." />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Fecha</label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Proveedor</label>
                  <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] font-bold">
                    <option value="">— Seleccionar —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Tipo de Gasto</label>
                    <select value={tipoGasto} onChange={(e) => setTipoGasto(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] font-bold">
                      <option value="general">Gasto General</option>
                      <option value="proyecto">Coste de Proyecto</option>
                    </select>
                  </div>
                  {tipoGasto === "proyecto" && (
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Proyecto</label>
                      <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]">
                        <option value="">— Seleccionar —</option>
                        {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Base Imponible (€)</label>
                  <input type="number" step="0.01" value={baseImponible} onChange={(e) => setBaseImponible(e.target.value)} className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-lg font-bold focus:outline-none focus:border-[var(--accent)] text-right text-purple-700" placeholder="0.00" />
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-[var(--border)] mt-4">
                   <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--muted)] font-bold">IVA ({serie === "A" ? tipoIva : 0}%):</span>
                      <span className="font-mono font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cuotaIva)}</span>
                   </div>
                   <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                      <span className="text-[var(--foreground)] uppercase text-xs tracking-wider">Total Factura:</span>
                      <span className="text-red-600">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalFactura)}</span>
                   </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-gray-100 rounded-xl transition-all border border-[var(--border)]"
                  >
                    Cancelar
                  </button>
                   <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1 py-2.5 text-sm font-bold bg-[var(--accent)] text-white rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    {saving ? "Guardando..." : "Guardar Coste"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[#fafafa]">
             <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por factura o proveedor..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto min-h-[300px] flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-3">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-sm font-medium">Cargando costes...</p>
              </div>
            ) : costes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center">
                  <Download size={32} className="opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">No hay facturas recibidas</p>
                  <p className="text-sm">Registra tu primer coste para controlar tus gastos.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Nº Interno / Proveedor</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Tipo / Proyecto</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Total</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {costes.map((c) => (
                    <tr key={c.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--muted)]">
                        {new Date(c.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-0.5">
                           <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.serie === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                             {c.serie}
                           </span>
                           <span className="font-bold text-[var(--foreground)]">{c.num_interno}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                           <Factory size={10} />
                           {c.proveedores?.nombre || 'Proveedor'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className={`text-xs font-bold mb-0.5 ${c.tipo_gasto === 'proyecto' ? 'text-[var(--accent)]' : 'text-gray-500'}`}>
                            {c.tipo_gasto === 'proyecto' ? 'Coste Proyecto' : 'Gasto General'}
                         </div>
                         {c.tipo_gasto === 'proyecto' && (
                           <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                              <FolderKanban size={10} />
                              {c.proyectos?.nombre || '—'}
                           </div>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold text-red-600">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(c.total || 0)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors text-[var(--muted)]">
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

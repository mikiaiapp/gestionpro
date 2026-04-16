"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Download, Plus, Search, MoreHorizontal, Loader2, Receipt, FolderKanban, FileText, Sparkles, X, Upload, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LineaCoste {
  unidades: number;
  descripcion: string;
  precio_unitario: number;
  iva_pct: number;
}

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Formulario
  const [serie, setSerie] = useState("A");
  const [numInterno, setNumInterno] = useState("");
  const [numFactProv, setNumFactProv] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [proveedorId, setProveedorId] = useState("");
  const [tipoGasto, setTipoGasto] = useState("general");
  const [proyectoId, setProyectoId] = useState("");
  const [retencionPct, setRetencionPct] = useState(0);
  const [lineas, setLineas] = useState<LineaCoste[]>([{ unidades: 1, descripcion: "", precio_unitario: 0, iva_pct: 21 }]);

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: csts } = await supabase
        .from("costes")
        .select("*, proveedores(nombre), proyectos(nombre), coste_lineas(*)")
        .order("fecha", { ascending: false });

      const { data: provs } = await supabase.from("proveedores").select("id, nombre").order("nombre");
      const { data: projs } = await supabase.from("proyectos").select("id, nombre").order("nombre");
      const { data: perfil } = await supabase.from("perfil_negocio").select("gemini_key").maybeSingle();

      setCostes(csts || []);
      setProveedores(provs || []);
      setProyectos(projs || []);
      if (perfil?.gemini_key) setGeminiKey(perfil.gemini_key);
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
        const prompt = `Analiza esta factura y responde ÚNICAMENTE con un objeto JSON válido. 
        JSON: { "nif": "CIF emisor", "proveedor": "Nombre emisor", "numfact": "Nº factura", "fecha": "YYYY-MM-DD", "base": 0.00, "ivaPct": 21 }`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${geminiKey}`, {
          method: 'POST',
          body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: 'application/pdf', data: base64 } }, { text: prompt }] }] })
        });

        const data = await res.json();
        let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        raw = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/,'').trim();
        const parsed = JSON.parse(raw);

        if (parsed.numfact) setNumFactProv(parsed.numfact);
        if (parsed.fecha) setFecha(parsed.fecha);
        if (parsed.base) {
           setLineas([{ unidades: 1, descripcion: "Importe extraído por IA", precio_unitario: parsed.base, iva_pct: parsed.ivaPct || 21 }]);
        }
        
        const prov = proveedores.find(p => p.nombre.toLowerCase().includes(parsed.proveedor?.toLowerCase()));
        if (prov) setProveedorId(prov.id);

        setIsAiModalOpen(false);
        setIsModalOpen(true);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      alert("Error IA: " + e.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const addLinea = () => setLineas([...lineas, { unidades: 1, descripcion: "", precio_unitario: 0, iva_pct: 21 }]);
  const removeLinea = (index: number) => setLineas(lineas.filter((_, i) => i !== index));
  const updateLinea = (index: number, field: keyof LineaCoste, value: any) => {
    const newLineas = [...lineas];
    newLineas[index] = { ...newLineas[index], [field]: value };
    setLineas(newLineas);
  };

  const baseImponible = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario), 0);
  const totalIva = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario * (serie === "A" ? l.iva_pct / 100 : 0)), 0);
  const retencionImporte = (baseImponible * (retencionPct || 0)) / 100;
  const totalFactura = baseImponible + totalIva - retencionImporte;

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingId(null);
    setSerie("A");
    setNumInterno("");
    setNumFactProv("");
    setFecha(new Date().toISOString().split('T')[0]);
    setProveedorId("");
    setTipoGasto("general");
    setProyectoId("");
    setRetencionPct(0);
    setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0, iva_pct: 21 }]);
    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setEditingId(c.id);
    setSerie(c.serie);
    setNumInterno(c.num_interno || "");
    setNumFactProv(c.num_factura_proveedor || "");
    setFecha(c.fecha);
    setProveedorId(c.proveedor_id || "");
    setTipoGasto(c.tipo_gasto);
    setProyectoId(c.proyecto_id || "");
    setRetencionPct(c.retencion_pct || 0);
    
    if (c.coste_lineas && c.coste_lineas.length > 0) {
      setLineas(c.coste_lineas.map((l: any) => ({
        unidades: l.unidades,
        descripcion: l.descripcion,
        precio_unitario: l.precio_unitario,
        iva_pct: l.iva_pct
      })));
    } else {
      setLineas([{ unidades: 1, descripcion: "Factura Directa", precio_unitario: c.base_imponible, iva_pct: 21 }]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    try {
      const payload = {
        serie, num_interno: numInterno, num_factura_proveedor: numFactProv, fecha, 
        proveedor_id: proveedorId || null, tipo_gasto: tipoGasto,
        proyecto_id: tipoGasto === "proyecto" ? proyectoId : null,
        base_imponible: baseImponible, iva_pct: 21, iva_importe: totalIva,
        retencion_pct: retencionPct, retencion_importe: retencionImporte, 
        total: totalFactura,
        user_id: (await supabase.auth.getUser()).data.user?.id
      };

      let currentId = editingId;
      if (editingId) {
        await supabase.from("costes").update(payload).eq("id", editingId);
        await supabase.from("coste_lineas").delete().eq("coste_id", editingId);
      } else {
        const { data } = await supabase.from("costes").insert([payload]).select().single();
        currentId = data.id;
      }

      const linesToInsert = lineas.map(l => ({
        coste_id: currentId,
        unidades: l.unidades,
        descripcion: l.descripcion,
        precio_unitario: l.precio_unitario,
        iva_pct: l.iva_pct
      }));
      await supabase.from("coste_lineas").insert(linesToInsert);

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoste = async (id: string, ref: string) => {
    if (!confirm(`¿Eliminar coste ${ref}?`)) return;
    await supabase.from("costes").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1">Costes</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de facturas recibidas y multi-IVA.</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[var(--border)] font-bold text-purple-600 hover:shadow-md transition-all active:scale-[0.98]"><Sparkles size={18}/> Importar PDF</button>
             <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"><Plus size={18}/> Nuevo Coste</button>
          </div>
        </header>

        {isAiModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center">
              {isExtracting ? <Loader2 className="animate-spin mx-auto text-purple-500 mb-4" size={40} /> : <Upload className="mx-auto text-gray-300 mb-4" size={40} />}
              <h2 className="text-xl font-bold mb-2">Importar con IA</h2>
              <p className="text-sm text-gray-500 mb-6">Sube tu factura y extraeremos los datos.</p>
              {!isExtracting && <input type="file" accept="application/pdf" onChange={handleImportPDF} className="text-xs" />}
              <button onClick={() => setIsAiModalOpen(false)} className="mt-8 text-gray-400 font-bold block mx-auto">Cerrar</button>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl border border-[var(--border)] overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-8 pb-4 border-b">
                   <h2 className="text-2xl font-bold font-head flex items-center gap-2"><Receipt className="text-purple-600" /> {editingId ? "Editar Factura Recibida" : "Registrar Coste"}</h2>
                   <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400"/></button>
                </div>
                
                <form onSubmit={handleSave} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Serie</label>
                        <select value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 font-bold">
                          <option value="A">Serie A (Soportado)</option>
                          <option value="B">Serie B (sin IVA)</option>
                        </select>
                      </div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nº Interno</label><input type="text" value={numInterno} onChange={(e) => setNumInterno(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200" placeholder="2024-C001" /></div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Factura Prov.</label><input type="text" value={numFactProv} onChange={(e) => setNumFactProv(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 font-bold text-blue-600" /></div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200" /></div>
                      <div className="md:col-span-2">
                         <SearchableSelect label="Proveedor" options={proveedores} value={proveedorId} onChange={(id) => setProveedorId(id)} placeholder="Buscar proveedor..." />
                      </div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gasto</label>
                        <select value={tipoGasto} onChange={(e) => setTipoGasto(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 font-bold">
                          <option value="general">Gasto General</option>
                          <option value="proyecto">Coste Proyecto</option>
                        </select>
                      </div>
                      {tipoGasto === "proyecto" && (
                        <div className="md:col-span-1">
                          <SearchableSelect label="Proyecto" options={proyectos} value={proyectoId} onChange={(id) => setProyectoId(id)} placeholder="Asignar proyecto..." />
                        </div>
                      )}
                   </div>

                   <div className="pt-4 overflow-x-auto">
                      <table className="w-full text-left min-w-[600px]">
                        <thead>
                          <tr className="border-b">
                            <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase">Ud.</th>
                            <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase">Concepto</th>
                            <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase text-right w-32">Precio Ud.</th>
                            <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase w-24 text-center">IVA %</th>
                            <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase text-right w-32">Total</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineas.map((linea, idx) => (
                            <tr key={idx} className="border-b border-gray-50">
                              <td className="py-3 pr-4"><input type="number" value={linea.unidades} onChange={(e) => updateLinea(idx, "unidades", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 font-bold text-center" /></td>
                              <td className="py-3 pr-4"><input type="text" value={linea.descripcion} onChange={(e) => updateLinea(idx, "descripcion", e.target.value)} className="w-full p-2 rounded-lg border border-gray-100 text-sm" placeholder="Partida o servicio..." /></td>
                              <td className="py-3 pr-4"><input type="number" value={linea.precio_unitario} onChange={(e) => updateLinea(idx, "precio_unitario", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 text-right font-mono" /></td>
                              <td className="py-3 pr-4">
                                <select value={linea.iva_pct} onChange={(e) => updateLinea(idx, "iva_pct", parseInt(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 text-xs font-bold text-center">
                                   <option value="21">21%</option>
                                   <option value="10">10%</option>
                                   <option value="4">4%</option>
                                   <option value="0">0%</option>
                                </select>
                              </td>
                              <td className="py-3 text-right font-bold text-gray-700 font-mono">{new Intl.NumberFormat('es-ES').format(linea.unidades * linea.precio_unitario)}</td>
                              <td className="py-3 text-center">{lineas.length > 1 && <button type="button" onClick={() => removeLinea(idx)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button type="button" onClick={addLinea} className="mt-4 flex items-center gap-2 text-sm font-bold text-purple-600 hover:underline"><Plus size={16}/> Añadir línea (Multi-IVA)</button>
                   </div>

                   <div className="flex flex-col md:flex-row justify-between items-start pt-8 border-t bg-gray-50/50 p-6 rounded-2xl gap-8">
                      <div className="w-full md:w-64">
                         <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Retención Soportada (%)</label>
                         <input type="number" value={retencionPct} onChange={(e) => setRetencionPct(parseFloat(e.target.value) || 0)} className="w-full p-2.5 rounded-lg border border-gray-200 font-bold" placeholder="0" />
                      </div>
                      <div className="w-full md:w-80 space-y-3">
                         <div className="flex justify-between text-sm text-gray-500"><span>Base Imponible Tot.:</span><span className="font-mono font-bold text-gray-700">{fmt(baseImponible)}</span></div>
                         <div className="flex justify-between text-sm text-gray-500"><span>Cuota IVA Tot.:</span><span className="font-mono font-bold text-gray-700">{fmt(totalIva)}</span></div>
                         {retencionPct > 0 && <div className="flex justify-between text-sm text-red-600 font-bold"><span>Retención (-{retencionPct}%):</span><span className="font-mono">-{fmt(retencionImporte)}</span></div>}
                         <div className="flex justify-between text-2xl font-bold pt-4 border-t border-gray-200 text-gray-900"><span>TOTAL:</span><span className="text-red-600">{fmt(totalFactura)}</span></div>
                      </div>
                   </div>

                   <div className="flex gap-4">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 font-bold text-gray-400 hover:bg-gray-100 rounded-xl transition-all">Cancelar</button>
                      <button type="submit" disabled={saving} className="flex-2 px-10 py-3 bg-[var(--accent)] text-white font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all flex items-center gap-2 active:scale-[0.98]">
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                        {saving ? "Guardando..." : "Registrar Factura"}
                      </button>
                   </div>
                </form>
             </div>
          </div>
        )}

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfaf7] border-b">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Factura / Prov.</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Fecha</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase">Tipo</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right">Total</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase text-right text-transparent">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {costes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                     <div className="text-[10px] font-bold text-blue-600 mb-0.5">{c.num_interno}</div>
                     <div className="font-bold">{c.proveedores?.nombre}</div>
                     <div className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{c.num_factura_proveedor}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(c.fecha).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.tipo_gasto === 'proyecto' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                        {c.tipo_gasto === 'proyecto' ? `P: ${c.proyectos?.nombre}` : 'General'}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-red-600">{fmt(c.total)}</td>
                  <td className="px-6 py-4 text-right relative">
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }} className="p-2 text-gray-400 hover:text-gray-600"><MoreHorizontal size={20}/></button>
                    {openMenuId === c.id && (
                      <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button onClick={() => openEditModal(c)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"><Save size={16}/> Editar</button>
                        <div className="h-px bg-gray-100 my-1 mx-2"></div>
                        <button onClick={() => handleDeleteCoste(c.id, c.num_interno)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16}/> Eliminar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

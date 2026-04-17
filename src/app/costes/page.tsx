"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Plus, MoreHorizontal, Loader2, Receipt, Upload, Save, Trash2, X, Sparkles, AlertCircle, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, cleanNIF } from "@/lib/format";
import { extractDataFromInvoice } from "@/lib/aiService";

import { getFullLocationByCP } from '@/lib/geoData';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

  // Nuevo Proveedor Detectado (IA)
  const [detectedProvider, setDetectedProvider] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: csts } = await supabase.from("costes").select("*, proveedores(nombre), proyectos(nombre), coste_lineas(*)").order("fecha", { ascending: false });
    const { data: provs } = await supabase.from("proveedores").select("id, nombre, nif").order("nombre");
    const { data: projs } = await supabase.from("proyectos").select("id, nombre").order("nombre");

    setCostes(csts || []);
    setProveedores(provs || []);
    setProyectos(projs || []);
    setLoading(false);
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

  const handleImportWithAI = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      // 1. Obtener la API Key de Ajustes
      const { data: perf } = await supabase.from('perfil_negocio').select('gemini_key').single();
      if (!perf?.gemini_key) {
        alert("Configura primero tu Gemini API Key en Ajustes.");
        setIsExtracting(false);
        return;
      }

      // 2. Convertir a Base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          
          // 3. Extraer con IA
          const result = await extractDataFromInvoice(base64, perf.gemini_key);
          
          if (!result) throw new Error("La IA no devolvió datos válidos.");

          
          // 3.5 Limpiar NIF detectado
          const cleanedNIF = cleanNIF(result.proveedor_nif);
          
          // 4. Buscar Proveedor por NIF limpio
          const provExistente = proveedores.find(p => cleanNIF(p.nif) === cleanedNIF);
          
          if (provExistente) {
            setProveedorId(provExistente.id);
          } else {
            setDetectedProvider({ 
              nombre: result.proveedor_nombre, 
              nif: cleanedNIF,
              direccion: result.proveedor_direccion || "",
              cp: result.proveedor_cp || ""
            });
          }

          // 5. Rellenar formulario
          setNumFactProv(result.num_factura || "");
          setFecha(result.fecha || new Date().toISOString().split('T')[0]);
          setRetencionPct(result.retencion_pct || 0);
          
          if (result.lineas && result.lineas.length > 0) {
            setLineas(result.lineas.map((l: any) => ({
              unidades: l.unidades || 1,
              descripcion: l.descripcion || "Concepto extraído por IA",
              precio_unitario: l.precio_unitario || 0,
              iva_pct: l.iva_pct || 21
            })));
          }

          setIsAiModalOpen(false);
          setIsModalOpen(true);
        } catch (innerErr: any) {
          alert("Error al procesar el contenido del PDF: " + innerErr.message);
        } finally {
          setIsExtracting(false);
        }
      };
      
      reader.onerror = () => {
        alert("Error al leer el archivo físico.");
        setIsExtracting(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      alert("Error de inicialización: " + err.message);
      setIsExtracting(false);
    }
  };

  const handleCreateDetectedProvider = async () => {
    if (!detectedProvider) return;
    try {
      // Intentamos sacar provincia por CP para que el alta sea completa
      let provincia = "";
      if (detectedProvider.cp && detectedProvider.cp.length === 5) {
        const geo = await getFullLocationByCP(detectedProvider.cp);
        if (geo) provincia = geo.provincia;
      }

      const { data, error } = await supabase.from('proveedores')
        .insert([{ 
          nombre: detectedProvider.nombre, 
          nif: cleanNIF(detectedProvider.nif),
          direccion: detectedProvider.direccion,
          codigo_postal: detectedProvider.cp,
          provincia: provincia
        }])
        .select().single();
      
      if (error) throw error;
      
      alert("✅ Proveedor creado: " + detectedProvider.nombre);
      const newProv = { id: data.id, nombre: data.nombre, nif: data.nif };
      setProveedores([...proveedores, newProv]);
      setProveedorId(data.id);
      setDetectedProvider(null);
    } catch (err) {
      alert("Error al crear proveedor auto.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numFactProv || !proveedorId) {
      alert("Proveedor y Nº de Factura son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        serie, num_interno: numInterno || `REC-${Date.now()}`, num_factura_proveedor: numFactProv, fecha, 
        proveedor_id: proveedorId, tipo_gasto: tipoGasto,
        proyecto_id: tipoGasto === "proyecto" ? proyectoId : null,
        base_imponible: baseImponible, iva_pct: 21, iva_importe: totalIva,
        retencion_pct: retencionPct, retencion_importe: retencionImporte, 
        total: totalFactura,
        user_id: user?.id
      };
      if (!user) throw new Error("Usuario no autenticado");

      let currentId = editingId;
      if (editingId) {
        const payload = {
          serie, num_interno: numInterno || `REC-${Date.now()}`, num_factura_proveedor: numFactProv, fecha, 
          proveedor_id: proveedorId, tipo_gasto: tipoGasto,
          proyecto_id: tipoGasto === "proyecto" ? proyectoId : null,
          base_imponible: baseImponible, iva_pct: 21, iva_importe: totalIva,
          retencion_pct: retencionPct, retencion_importe: retencionImporte, 
          total: totalFactura,
          user_id: user?.id
        };
        await supabase.from("costes").update(payload).eq("id", editingId);
        await supabase.from("coste_lineas").delete().eq("coste_id", editingId);
      } else {
        // ESTRATEGIA DETECTIVE: Inserción mínima para descubrir columnas reales en 'costes'
        const minimalPayload: any = {
          proveedor_id: proveedorId,
          fecha,
          total: totalFactura,
          user_id: user.id
        };

        // Si hay proyecto vinculado, lo intentamos con el nombre que solemos usar
        if (proyectoId && tipoGasto === "proyecto") {
          minimalPayload.proyecto_id = proyectoId;
        }

        // EN ALTA NUEVA: Guardamos solo lo mínimo
        const { data, error } = await supabase.from("costes").insert([minimalPayload]).select().single();
        
        if (error) {
          throw new Error("No se pudo iniciar el registro de coste. Error: " + error.message);
        }
        currentId = data.id;

        // ¡DETECTAR COLUMNAS REALES!
        const realKeys = Object.keys(data);
        
        // Mapeo inteligente
        const foundKey = (options: string[]) => options.find(o => realKeys.includes(o));
        
        const colFactura = foundKey(['numero_factura', 'num_factura', 'factura_prov', 'num_factura_proveedor', 'referencia']);
        const colBase = foundKey(['base_imponible', 'base', 'subtotal']);
        const colIvaImporte = foundKey(['iva_importe', 'cuota_iva', 'iva_total', 'iva']);
        const colRetImporte = foundKey(['retencion_importe', 'irpf_importe', 'retencion', 'irpf']);
        const colSerie = foundKey(['serie', 'serie_id', 'tipo_serie']);

        // Parche con los datos reales
        const patch: any = {};
        if (colFactura) patch[colFactura] = numFactProv;
        if (colBase) patch[colBase] = baseImponible;
        if (colIvaImporte) patch[colIvaImporte] = totalIva;
        if (colRetImporte) patch[colRetImporte] = retencionImporte;
        if (colSerie) patch[colSerie] = serie;
        
        // Ivas y Retenciones porcentuales si existen
        if (realKeys.includes('iva_pct')) patch.iva_pct = 21;
        if (realKeys.includes('retencion_pct')) patch.retencion_pct = retencionPct;

        if (Object.keys(patch).length > 0) {
          await supabase.from("costes").update(patch).eq("id", currentId);
        }
      }

      // 3. Guardar Líneas
      const lineasConId = lineas.map(l => ({
        coste_id: currentId,
        descripcion: l.descripcion,
        unidades: Number(l.unidades),
        precio_unitario: Number(l.precio_unitario),
        iva_pct: Number(l.iva_pct)
      }));

      const { error: lineError } = await supabase.from("coste_lineas").insert(lineasConId);
      if (lineError) throw lineError;

      setIsModalOpen(false);
      fetchData();
      alert("✅ Gasto registrado correctamente.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1">Facturas Recibidas</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de facturas recibidas y multi-IVA.</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 font-bold hover:shadow-md transition-all active:scale-95">
               <Sparkles size={18} /> Importar PDF con IA
             </button>
             <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-95">
               <Plus size={18}/> Nueva Factura Recibida
             </button>
          </div>
        </header>

        {isAiModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl p-10 w-full max-w-md text-center shadow-2xl animate-in zoom-in duration-300">
                {isExtracting ? (
                  <div className="space-y-6">
                    <Loader2 className="animate-spin mx-auto text-purple-600" size={60} />
                    <p className="font-bold text-gray-700">Gemini IA analizando tu factura...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
                       <Upload className="text-purple-600" size={32} />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black mb-2 tracking-tight">Importar Factura</h2>
                       <p className="text-sm text-gray-500">Sube el PDF y extraeremos el proveedor, fecha, bases de IVA y retenciones.</p>
                    </div>
                    <input type="file" accept="application/pdf" onChange={handleImportWithAI} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer" />
                    <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 font-bold hover:text-gray-600 transition-colors">Cerrar</button>
                  </div>
                )}
             </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
             <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl border border-[var(--border)] my-auto">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                   <h2 className="text-2xl font-bold font-head flex items-center gap-2 tracking-tight text-gray-800">
                     <Receipt className="text-purple-600" /> 
                     {editingId ? "Editar Gasto" : "Propuesta de Registro"}
                   </h2>
                   <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400"/></button>
                </div>

                {detectedProvider && (
                  <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200 flex items-center justify-between text-left animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                       <AlertCircle className="text-orange-600" size={24} />
                       <div>
                          <p className="text-sm font-bold text-orange-900">Nuevo proveedor detectado por IA</p>
                          <p className="text-xs text-orange-700">{detectedProvider.nombre} ({detectedProvider.nif})</p>
                       </div>
                    </div>
                    <button onClick={handleCreateDetectedProvider} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-bold text-xs hover:bg-orange-700 transition-all">
                       <UserPlus size={14} /> Dar de alta ahora
                    </button>
                  </div>
                )}
                
                <form onSubmit={handleSave} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Serie</label>
                        <select value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 font-bold">
                          <option value="A">Serie A (IVA Soportado)</option>
                          <option value="B">Serie B (sin IVA)</option>
                        </select>
                      </div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Factura Prov.</label><input type="text" value={numFactProv} onChange={(e) => setNumFactProv(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 font-bold text-blue-600" /></div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200" /></div>
                      <div className="md:col-span-2">
                         <SearchableSelect label="Proveedor" options={proveedores} value={proveedorId} onChange={(id) => setProveedorId(id)} placeholder="Buscar proveedor..." />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo de Gasto</label>
                        <select value={tipoGasto} onChange={(e) => setTipoGasto(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50">
                           <option value="general">Gasto General</option>
                           <option value="proyecto">Vincular a Proyecto</option>
                        </select>
                      </div>
                      {tipoGasto === "proyecto" && (
                        <div className="md:col-span-1">
                           <SearchableSelect label="Vincular Proyecto" options={proyectos} value={proyectoId} onChange={(id) => setProyectoId(id)} placeholder="Seleccionar..." />
                        </div>
                      )}
                   </div>

                   <div className="pt-4">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b text-gray-400">
                            <th className="pb-3 text-[10px] font-bold uppercase">Ud.</th>
                            <th className="pb-3 text-[10px] font-bold uppercase">Concepto</th>
                            <th className="pb-3 text-[10px] font-bold uppercase text-right w-32">Precio Ud.</th>
                            <th className="pb-3 text-[10px] font-bold uppercase w-24 text-center">IVA %</th>
                            <th className="pb-3 text-[10px] font-bold uppercase text-right w-32">Total</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineas.map((linea, idx) => (
                            <tr key={idx} className="border-b border-gray-50">
                              <td className="py-3 pr-4 text-center w-20"><input type="number" value={linea.unidades} onChange={(e) => updateLinea(idx, "unidades", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 font-bold text-center" /></td>
                              <td className="py-3 pr-4"><input type="text" value={linea.descripcion} onChange={(e) => updateLinea(idx, "descripcion", e.target.value)} className="w-full p-2 rounded-lg border border-gray-100 text-sm" /></td>
                              <td className="py-3 pr-4"><input type="number" value={linea.precio_unitario} onChange={(e) => updateLinea(idx, "precio_unitario", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 text-right font-mono" /></td>
                              <td className="py-3 pr-4">
                                <select value={linea.iva_pct} onChange={(e) => updateLinea(idx, "iva_pct", parseInt(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 text-xs font-bold text-center">
                                   <option value="21">21%</option>
                                   <option value="10">10%</option>
                                   <option value="4">4%</option>
                                   <option value="0">0%</option>
                                </select>
                              </td>
                              <td className="py-3 text-right font-bold text-gray-700 font-mono">{formatCurrency(linea.unidades * linea.precio_unitario)}</td>
                              <td className="py-3 text-center">{lineas.length > 1 && <button type="button" onClick={() => removeLinea(idx)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button type="button" onClick={addLinea} className="mt-4 flex items-center gap-2 text-sm font-bold text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-lg transition-all"><Plus size={16}/> Añadir línea (Multi-IVA)</button>
                   </div>

                   <div className="flex flex-col md:flex-row justify-between pt-8 border-t bg-gray-50/50 p-6 rounded-2xl gap-8 font-mono">
                      <div className="w-full md:w-64">
                         <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-sans">Retención IRPF (%)</label>
                         <input type="number" value={retencionPct} onChange={(e) => setRetencionPct(parseFloat(e.target.value) || 0)} className="w-full p-2.5 rounded-lg border border-gray-200 font-bold" />
                      </div>
                      <div className="w-full md:w-80 space-y-3">
                         <div className="flex justify-between text-sm text-gray-500"><span>Base Imponible Tot.:</span><span className="font-bold text-gray-700">{formatCurrency(baseImponible)}</span></div>
                         <div className="flex justify-between text-sm text-gray-500"><span>Cuota IVA Tot.:</span><span className="font-bold text-gray-700">{formatCurrency(totalIva)}</span></div>
                         {retencionPct > 0 && <div className="flex justify-between text-sm text-red-600 font-bold"><span>Retención (-{retencionPct}%):</span><span>{formatCurrency(retencionImporte)}</span></div>}
                         <div className="flex justify-between text-2xl font-bold pt-4 border-t border-gray-200 text-gray-900 font-sans"><span>TOTAL:</span><span className="text-red-600">{formatCurrency(totalFactura)}</span></div>
                      </div>
                   </div>

                   <div className="flex gap-4">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-100 rounded-2xl transition-all">Cancelar</button>
                      <button type="submit" disabled={saving} className="flex-2 px-12 py-4 bg-gray-800 text-white font-bold rounded-2xl shadow-xl hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                        {saving ? "Registrando..." : "Confirmar y Registrar"}
                      </button>
                   </div>
                </form>
             </div>
          </div>
        )}

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfaf7] border-b text-[11px] font-bold text-gray-400 uppercase">
                <th className="px-6 py-4">Factura / Prov.</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Gasto / Proyecto</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {costes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                     <div className="text-[10px] font-bold text-blue-600 mb-0.5">{c.num_interno}</div>
                     <div className="font-bold text-gray-800">{c.proveedores?.nombre}</div>
                     <div className="text-[10px] text-gray-400 font-mono uppercase">{c.num_factura_proveedor}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">{new Date(c.fecha).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.tipo_gasto === 'proyecto' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                        {c.tipo_gasto === 'proyecto' ? c.proyectos?.nombre : 'Gasto General'}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-red-600">{formatCurrency(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SearchableSelect } from "@/components/SearchableSelect";
import { FolderKanban, Plus, Search, MoreHorizontal, Loader2, Save, Trash2, FileText, Download, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generatePDF } from "@/lib/pdfGenerator";

interface LineaProyecto {
  unidades: number;
  descripcion: string;
  precio_unitario: number;
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Estados del Editor
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [serie, setSerie] = useState("P");
  const [numProyecto, setNumProyecto] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [retencionPct, setRetencionPct] = useState(0);
  const [lineas, setLineas] = useState<LineaProyecto[]>([{ unidades: 1, descripcion: "", precio_unitario: 0 }]);

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const getNextNumber = (targetSerie: string, allProjs: any[]) => {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `${currentYear}-`;
    const filtered = allProjs.filter(p => 
      p.serie === targetSerie && 
      p.num_proyecto && 
      p.num_proyecto.startsWith(yearPrefix)
    );

    if (filtered.length > 0) {
      const numbers = filtered.map(p => {
        const parts = p.num_proyecto.split("-");
        return parseInt(parts[1], 10) || 0;
      });
      const nextNum = Math.max(...numbers) + 1;
      return `${yearPrefix}${nextNum.toString().padStart(3, "0")}`;
    }
    return `${yearPrefix}001`;
  };

  useEffect(() => {
    if (isEditorOpen && !editingId) {
      const next = getNextNumber(serie, proyectos);
      setNumProyecto(next);
    }
  }, [serie, isEditorOpen, editingId, proyectos]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: projs } = await supabase.from("proyectos").select("*, clientes(nombre, nif, direccion, poblacion, cp, provincia), proyecto_lineas(*)").order("created_at", { ascending: false });
      const { data: clis } = await supabase.from("clientes").select("id, nombre").order("nombre");
      const { data: perf } = await supabase.from("perfil_negocio").select("*").single();

      setProyectos(projs || []);
      setClientes(clis || []);
      setPerfil(perf);
    } finally {
      setLoading(false);
    }
  };

  const addLinea = () => setLineas([...lineas, { unidades: 1, descripcion: "", precio_unitario: 0 }]);
  const removeLinea = (index: number) => setLineas(lineas.filter((_, i) => i !== index));
  const updateLinea = (index: number, field: keyof LineaProyecto, value: any) => {
    const newLineas = [...lineas];
    newLineas[index] = { ...newLineas[index], [field]: value };
    setLineas(newLineas);
  };

  const baseImponible = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario), 0);
  const cuotaIva = baseImponible * 0.21;
  const retencionImporte = (baseImponible * (retencionPct || 0)) / 100;
  const totalProyecto = baseImponible + cuotaIva - retencionImporte;

  const openEditProyecto = (p: any) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setSerie(p.serie || "P");
    setNumProyecto(p.num_proyecto || "");
    setFecha(p.fecha || new Date().toISOString().split('T')[0]);
    setClienteId(p.cliente_id || "");
    setRetencionPct(p.retencion_pct || 0);
    
    if (p.proyecto_lineas && p.proyecto_lineas.length > 0) {
      setLineas(p.proyecto_lineas.map((l: any) => ({
        unidades: l.unidades,
        descripcion: l.descripcion,
        precio_unitario: l.precio_unitario
      })));
    } else {
      setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0 }]);
    }
    setIsEditorOpen(true);
  };

  const handleSaveProyecto = async () => {
    if (!nombre || !clienteId || !numProyecto) {
      alert("Faltan datos obligatorios (Nombre, Cliente, Nº Proyecto)");
      return;
    }

    setSaving(true);
    try {
      const userRes = await supabase.auth.getUser();
      const payload = {
        nombre,
        cliente_id: clienteId,
        serie,
        num_proyecto: numProyecto,
        fecha,
        base_imponible: baseImponible,
        iva_pct: 21,
        iva_importe: cuotaIva,
        retencion_pct: retencionPct,
        retencion_importe: retencionImporte,
        total: totalProyecto,
        user_id: userRes.data.user?.id
      };

      let currentId = editingId;
      if (editingId) {
        await supabase.from("proyectos").update(payload).eq("id", editingId);
        await supabase.from("proyecto_lineas").delete().eq("proyecto_id", editingId);
      } else {
        const { data, error } = await supabase.from("proyectos").insert([payload]).select().single();
        if (error) throw error;
        currentId = data.id;
      }

      const lineasToInsert = lineas.map(l => ({
        proyecto_id: currentId,
        unidades: l.unidades,
        descripcion: l.descripcion,
        precio_unitario: l.precio_unitario
      }));

      await supabase.from("proyecto_lineas").insert(lineasToInsert);

      setIsEditorOpen(false);
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadBudget = async (p: any) => {
    if (!perfil) {
      alert("Configura primero tus datos de empresa en Ajustes.");
      return;
    }

    try {
      await generatePDF({
        tipo: 'PRESUPUESTO',
        numero: `${p.serie}-${p.num_proyecto}`,
        fecha: p.fecha,
        cliente: {
          nombre: p.clientes?.nombre || '',
          nif: p.clientes?.nif || '',
          direccion: p.clientes?.direccion || '',
          poblacion: p.clientes?.poblacion || '',
          cp: p.clientes?.cp || '',
          provincia: p.clientes?.provincia || '',
        },
        perfil: {
          nombre: perfil.nombre || '',
          nif: perfil.nif || '',
          direccion: perfil.direccion || '',
          poblacion: perfil.poblacion || '',
          cp: perfil.cp || '',
          provincia: perfil.provincia || '',
          cuenta_bancaria: perfil.cuenta_bancaria || '',
          logo_url: perfil.logo_url || '',
          condiciones_legales: perfil.condiciones_legales || ''
        },
        lineas: (p.proyecto_lineas || []).map((l: any) => ({
          unidades: l.unidades,
          descripcion: l.descripcion,
          precio_unitario: l.precio_unitario
        })),
        totales: {
          base: p.base_imponible,
          iva_pct: 21,
          iva_importe: p.iva_importe,
          retencion_pct: p.retencion_pct,
          retencion_importe: p.retencion_importe,
          total: p.total
        }
      });
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Error al generar el PDF profesional.");
    }
  };

  const filtered = proyectos.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        {!isEditorOpen ? (
          <>
            <header className="flex justify-between items-center mb-10">
              <div>
                <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Proyectos</h1>
                <p className="text-[var(--muted)] font-medium">Planificación y gestión de presupuestos.</p>
              </div>
              <button 
                onClick={() => { setEditingId(null); setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0 }]); setIsEditorOpen(true); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Plus size={18} /> Nuevo Proyecto
              </button>
            </header>

            <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
               <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[#fafafa]">
                 <div className="relative w-72">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                   <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" />
                 </div>
               </div>
               
               <table className="w-full border-collapse">
                 <thead>
                   <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                     <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Ref / Nombre</th>
                     <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Cliente</th>
                     <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Estado</th>
                     <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Total</th>
                     <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[var(--border)]">
                   {filtered.map(p => (
                     <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                       <td className="px-6 py-4">
                         <div className="text-[10px] font-bold text-orange-600 uppercase mb-0.5">{p.serie}-{p.num_proyecto}</div>
                         <div className="font-bold">{p.nombre}</div>
                       </td>
                       <td className="px-6 py-4 text-sm font-medium text-gray-600">{p.clientes?.nombre}</td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.estado === 'Cerrado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{p.estado}</span>
                       </td>
                       <td className="px-6 py-4 text-right font-mono font-bold text-gray-700">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.total || 0)}</td>
                       <td className="px-6 py-4 text-right relative">
                         <button 
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id); }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                          {openMenuId === p.id && (
                            <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border border-[var(--border)] z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                              <button onClick={() => downloadBudget(p)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"><Printer size={16}/> Imprimir PDF</button>
                              <button onClick={() => openEditProyecto(p)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"><Save size={16}/> Editar Proyecto</button>
                               <div className="h-px bg-gray-100 my-1 mx-2"></div>
                              <button 
                                onClick={() => {
                                  if (confirm("¿Eliminar proyecto?")) supabase.from("proyectos").delete().eq("id", p.id).then(() => fetchData());
                                }} 
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={16}/> Eliminar
                              </button>
                            </div>
                          )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </>
        ) : (
          <div className="max-w-5xl mx-auto pb-20 animate-in slide-in-from-bottom-4 duration-300 text-left">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold font-head flex items-center gap-2">
                <FolderKanban className="text-[var(--accent)]" /> Editor de Proyecto
              </h2>
              <div className="flex gap-3">
                <button onClick={() => setIsEditorOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                <button 
                  onClick={handleSaveProyecto} 
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl font-bold shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Guardar Proyecto
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-[var(--border)] p-8">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 pb-8 border-b border-dashed border-gray-200">
                 <div className="md:col-span-2">
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nombre del Proyecto</label>
                   <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white font-bold" placeholder="Ej: Reforma Local Centro" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nº Referencia</label>
                   <input type="text" value={numProyecto} onChange={(e) => setNumProyecto(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 font-mono focus:bg-white" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</label>
                   <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50" />
                 </div>
                 <div className="md:col-span-2">
                    <SearchableSelect 
                      label="Cliente"
                      options={clientes}
                      value={clienteId}
                      onChange={(id) => setClienteId(id)}
                      placeholder="Seleccionar cliente..."
                    />
                 </div>
               </div>

               <div className="mb-8 overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="w-20 pb-3 text-[10px] font-bold text-gray-400 uppercase">Ud.</th>
                      <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase">Descripción / Partida</th>
                      <th className="w-32 pb-3 text-[10px] font-bold text-gray-400 uppercase text-right">Precio Ud.</th>
                      <th className="w-32 pb-3 text-[10px] font-bold text-gray-400 uppercase text-right">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((linea, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-4"><input type="number" value={linea.unidades} onChange={(e) => updateLinea(idx, "unidades", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 font-bold text-center" /></td>
                        <td className="py-2 pr-4"><textarea rows={1} value={linea.descripcion} onChange={(e) => updateLinea(idx, "descripcion", e.target.value)} className="w-full p-2 rounded-lg border border-gray-100 text-sm" /></td>
                        <td className="py-2 pr-4"><input type="number" value={linea.precio_unitario} onChange={(e) => updateLinea(idx, "precio_unitario", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 text-right font-mono" /></td>
                        <td className="py-2 text-right font-bold text-gray-700 font-mono">{new Intl.NumberFormat('es-ES').format(linea.unidades * linea.precio_unitario)}</td>
                        <td className="py-2 text-center">{lineas.length > 1 && <button onClick={() => removeLinea(idx)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={addLinea} className="mt-4 flex items-center gap-2 text-sm font-bold text-orange-600 hover:underline"><Plus size={16}/> Añadir partida</button>
               </div>

               <div className="flex flex-col md:flex-row justify-between items-start pt-8 border-t border-gray-100 gap-8">
                  <div className="w-full md:w-64">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Retención (%)</label>
                    <input type="number" value={retencionPct} onChange={(e) => setRetencionPct(parseFloat(e.target.value) || 0)} className="w-full p-2 rounded-lg border border-gray-200 font-bold" />
                  </div>
                  <div className="w-full md:w-80 space-y-3">
                    <div className="flex justify-between text-sm"><span>Base Imponible:</span><span className="font-mono font-bold">{fmt(baseImponible)}</span></div>
                    <div className="flex justify-between text-sm"><span>IVA (21%):</span><span className="font-mono font-bold">{fmt(cuotaIva)}</span></div>
                    {retencionPct > 0 && <div className="flex justify-between text-sm text-red-600"><span>Retención ({retencionPct}%):</span><span className="font-mono font-bold">-{fmt(retencionImporte)}</span></div>}
                    <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-200 text-gray-800"><span>TOTAL:</span><span>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalProyecto)}</span></div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

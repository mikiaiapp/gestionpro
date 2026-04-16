"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SearchableSelect } from "@/components/SearchableSelect";
import { FolderKanban, Plus, Search, MoreHorizontal, Loader2, Save, Trash2, FileText, Download, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
      const { data: projs } = await supabase.from("proyectos").select("*, clientes(nombre), proyecto_lineas(*)").order("created_at", { ascending: false });
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

  const downloadBudget = (p: any) => {
    if (!perfil) {
      alert("Configura primero tus datos de empresa en Ajustes.");
      return;
    }

    const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
    const lineasHtml = (p.proyecto_lineas || []).map((l: any) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${l.unidades}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${l.descripcion}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">${fmt(l.precio_unitario)}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${fmt(l.total)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>PRESUPUESTO - ${p.nombre}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; margin-bottom: 60px; }
          .logo { max-height: 80px; }
          .doc-item { font-size: 32px; font-weight: bold; color: #f59e0b; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #999; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; font-size: 10px; text-transform: uppercase; color: #999; padding-bottom: 12px; border-bottom: 2px solid #333; }
          .totals { margin-top: 40px; width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
          .total-final { font-size: 20px; font-weight: bold; color: #f59e0b; margin-top: 12px; border-top: 2px solid #f59e0b; padding-top: 12px; }
          .legal-footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${perfil.logo_url ? `<img src="${perfil.logo_url}" class="logo">` : `<div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${perfil.nombre}</div>`}
          </div>
          <div style="text-align: right;">
            <div class="doc-item">PRESUPUESTO</div>
            <div style="font-weight: bold;">Ref: ${p.serie}-${p.num_proyecto}</div>
            <div style="color: #666;">Fecha: ${new Date(p.fecha).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="details">
          <div>
            <div class="section-title">De</div>
            <div style="font-weight: bold;">${perfil.nombre}</div>
            <div>${perfil.nif}</div>
            <div>${perfil.direccion || ''}</div>
          </div>
          <div>
            <div class="section-title">Para</div>
            <div style="font-weight: bold;">${p.clientes?.nombre}</div>
            <div>${p.clientes?.nif || ''}</div>
            <div>${p.clientes?.direccion || ''}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="10%">Cant.</th>
              <th width="60%">Descripción</th>
              <th width="15%" style="text-align: right;">Precio</th>
              <th width="15%" style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineasHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Base Imponible:</span>
            <span>${fmt(p.base_imponible)}</span>
          </div>
          <div class="total-row">
            <span>IVA (21%):</span>
            <span>${fmt(p.iva_importe)}</span>
          </div>
          ${p.retencion_pct > 0 ? `
            <div class="total-row" style="color: #666; font-style: italic;">
              <span>Retención (${p.retencion_pct}%):</span>
              <span>-${fmt(p.retencion_importe)}</span>
            </div>
          ` : ''}
          <div class="total-row total-final">
            <span>TOTAL PRESUPUESTO:</span>
            <span>${fmt(p.total)}</span>
          </div>
        </div>

        <div class="legal-footer">
          <div>Presupuesto válido por 30 días. Sujeto a aceptación por ambas partes.</div>
          <div style="margin-top: 8px;">${perfil.nombre} | ${perfil.nif}</div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
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

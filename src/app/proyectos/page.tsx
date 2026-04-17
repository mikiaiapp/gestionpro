"use client";

import { useEffect, useState } from "react";
import { FolderKanban, Plus, Search, MoreHorizontal, Loader2, Save, Trash2, Printer, ChevronUp, ChevronDown, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { DataTableHeader } from "@/components/DataTableHeader";
import { generatePDF } from "@/lib/pdfGenerator";
import { formatCurrency } from "@/lib/format";
import { SearchableSelect } from "@/components/SearchableSelect";

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
  const [columnKey, setColumnKey] = useState("num_proyecto"); // Se detectará en fetchData
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Sorting and Filtering State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });
  const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Estados del Editor
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [serie, setSerie] = useState("P");
  const [numReferencia, setNumReferencia] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [retencionPct, setRetencionPct] = useState(0);
  const [lineas, setLineas] = useState<LineaProyecto[]>([{ unidades: 1, descripcion: "", precio_unitario: 0 }]);

  useEffect(() => {
    fetchData();
  }, []);

  const getNextNumber = (targetSerie: string, allProjs: any[]) => {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `${currentYear}-`;
    const filtered = allProjs.filter(p => 
      p.serie === targetSerie && 
      p[columnKey] && 
      p[columnKey].startsWith(yearPrefix)
    );

    if (filtered.length > 0) {
      const numbers = filtered.map(p => {
        const parts = p[columnKey].split("-");
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
      setNumReferencia(next);
    }
  }, [serie, isEditorOpen, editingId, proyectos]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Simplificamos la consulta para que no falle si hay problemas con las líneas (como en el Resumen)
      const { data: projs, error: fetchError } = await supabase.from("proyectos").select("*, clientes(nombre)").order("created_at", { ascending: false });
      
      if (fetchError) {
        console.error("Error al cargar proyectos:", fetchError);
        alert("Error al cargar proyectos: " + fetchError.message);
      }

      const { data: clis } = await supabase.from("clientes").select("id, nombre").order("nombre");
      const { data: perf } = await supabase.from("perfil_negocio").select("*").maybeSingle();

      // Escaneo Activo de Columnas
      const possibleKeys = ['numero', 'num_proyecto', 'num_referencia', 'referencia'];
      for (const key of possibleKeys) {
        const { error: probeError } = await supabase.from('proyectos').select(key).limit(0);
        if (!probeError) {
          setColumnKey(key);
          break;
        }
      }

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

  const openEditProyecto = async (p: any) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setSerie(p.serie || "P");
    setNumReferencia(p[columnKey] || "");
    setFecha(p.fecha || new Date().toISOString().split('T')[0]);
    setClienteId(p.cliente_id || "");
    setRetencionPct(p.retencion_pct || 0);

    // Cargamos las líneas por separado al editar
    const { data: lineasData } = await supabase.from("proyecto_lineas").select("*").eq("proyecto_id", p.id);
    
    if (lineasData && lineasData.length > 0) {
      setLineas(lineasData.map((l: any) => ({
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
    if (!nombre || !clienteId || !numReferencia) {
      alert("Faltan datos obligatorios (Nombre, Cliente, Nº Referencia)");
      return;
    }

    setSaving(true);
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (!user) {
        throw new Error("No se ha encontrado una sesión de usuario activa. Por favor, vuelve a iniciar sesión.");
      }
      
      // Escaneo Activo de Columnas (Infalible incluso en tablas vacías)
      const possibleKeys = ['numero', 'num_proyecto', 'num_referencia', 'referencia'];
      let columnKey = 'num_proyecto'; // valor por defecto si todo falla

      for (const key of possibleKeys) {
        const { error: probeError } = await supabase.from('proyectos').select(key).limit(0);
        if (!probeError) {
          columnKey = key;
          break;
        }
      }

      // Mapeo inteligente del payload basado en el esquema real
      const payload: any = {
        nombre,
        user_id: user.id,
        serie: serie || 'P',
        fecha,
        cliente_id: clienteId,
        num_proyecto: numReferencia, // Usamos el nombre estándar de nuestro esquema
        base_imponible: baseImponible,
        iva_pct: 21,
        iva_importe: cuotaIva,
        retencion_pct: retencionPct,
        retencion_importe: retencionImporte,
        total: totalProyecto
      };

      let currentId = editingId;
      if (editingId) {
        const { error: updateErr } = await supabase.from("proyectos").update(payload).eq("id", editingId);
        if (updateErr) throw updateErr;
        await supabase.from("proyecto_lineas").delete().eq("proyecto_id", editingId);
      } else {
        const { data: projData, error: insErr } = await supabase.from("proyectos").insert([payload]).select().single();
        if (insErr) throw insErr;
        currentId = projData.id;
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
      alert("✅ Proyecto guardado correctamente");
    } catch (err: any) {
      console.error(err);
      
      // EXTRACCIÓN DE VERDAD: Si falla, pedimos el esquema real a PostgREST
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?select=proyectos`, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          }
        });
        const openApi = await response.json();
        const tableInfo = openApi.definitions?.proyectos;
        const realColumns = tableInfo ? Object.keys(tableInfo.properties).join(', ') : "No se pudo obtener el esquema";
        
        alert(`❌ ERROR DE BASE DE DATOS: ${err.message}\n\n🔍 COLUMNAS REALES SEGÚN SUPABASE:\n${realColumns}\n\nPor favor, dime qué nombres ves ahí.`);
      } catch (sniffErr) {
        alert("Error al guardar: " + err.message);
      }
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
      // Necesitamos cargar las líneas para el PDF ya que no están en el objeto de la lista
      const { data: lineasData, error: lineasErr } = await supabase
        .from("proyecto_lineas")
        .select("*")
        .eq("proyecto_id", p.id);

      if (lineasErr) throw lineasErr;

      // Calcular totales si no vienen (por precaución)
      const base = p.base_imponible || 0;
      const iva_pct = p.iva_pct || 21;
      const iva_importe = p.iva_importe || (base * (iva_pct / 100));
      const retencion_pct = p.retencion_pct || 0;
      const retencion_importe = p.retencion_importe || (base * (retencion_pct / 100));
      const total = p.total || (base + iva_importe - retencion_importe);

      await generatePDF({
        tipo: 'PRESUPUESTO',
        numero: `${p.serie || 'P'}-${p[columnKey] || p.num_proyecto || 'S/N'}`,
        fecha: p.fecha,
        cliente: {
          nombre: p.clientes?.nombre || 'Cliente Final',
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
          condiciones_legales: perfil.condiciones_legales || '',
          email: perfil.email || ''
        },
        lineas: (lineasData || []).map((l: any) => ({
          unidades: l.unidades,
          descripcion: l.descripcion,
          precio_unitario: l.precio_unitario
        })),
        totales: {
          base: base,
          iva_pct: iva_pct,
          iva_importe: iva_importe,
          retencion_pct: retencion_pct,
          retencion_importe: retencion_importe,
          total: total
        }
      });
    } catch (err: any) {
      console.error("Error al generar PDF:", err);
      alert("Error al generar el presupuesto: " + err.message);
    }
  };

  const handleSort = (field: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: field, direction });
  };

  const handleFilter = (field: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
  };

  const filtered = proyectos.filter(p => {
    // Global search
    const matchesGlobal = searchTerm === '' || 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.clientes?.nombre && p.clientes.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Column filters
    const matchesColumns = Object.keys(columnFilters).every(key => {
      if (!columnFilters[key]) return true;
      let val = '';
      if (key === 'cliente') val = p.clientes?.nombre || '';
      else if (key === 'ref') val = `${p.serie}-${p[columnKey]}` || '';
      else val = p[key] || '';
      return val.toString().toLowerCase().includes(columnFilters[key].toLowerCase());
    });

    return matchesGlobal && matchesColumns;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    let aVal, bVal;
    
    if (sortConfig.key === 'cliente') {
      aVal = a.clientes?.nombre || '';
      bVal = b.clientes?.nombre || '';
    } else if (sortConfig.key === 'ref') {
      aVal = `${a.serie}-${a[columnKey]}` || '';
      bVal = `${b.serie}-${b[columnKey]}` || '';
    } else {
      aVal = a[sortConfig.key] || '';
      bVal = b[sortConfig.key] || '';
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

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
                onClick={() => { setEditingId(null); setNombre(""); setClienteId(""); setNumReferencia(""); setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0 }]); setIsEditorOpen(true); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Plus size={18} /> Nuevo Proyecto
              </button>
            </header>

            <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-visible min-h-[400px] mb-20">
               <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[#fafafa] rounded-t-xl">
                 <div className="relative w-72">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                   <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" />
                 </div>
               </div>
               
               <table className="w-full border-collapse">
                 <thead>
                   <tr className="bg-[#fcfaf7] border-b border-[var(--border)] rounded-t-xl">
                     <DataTableHeader label="Ref / Nombre" field="nombre" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.nombre || ''} onFilter={handleFilter} />
                     <DataTableHeader label="Cliente" field="cliente" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.cliente || ''} onFilter={handleFilter} />
                     <DataTableHeader label="Total" field="total" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.total || ''} onFilter={handleFilter} />
                     <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[var(--border)]">
                   {filtered.map(p => (
                     <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                       <td className="px-6 py-4">
                         <div className="text-[10px] font-bold text-orange-600 uppercase mb-0.5">{p.serie}-{p[columnKey]}</div>
                         <div className="font-bold">{p.nombre}</div>
                       </td>
                       <td className="px-6 py-4 text-sm font-medium text-gray-600">{p.clientes?.nombre}</td>
                       <td className="px-6 py-4 text-right font-mono font-bold text-gray-700">{formatCurrency(p.total || 0)}</td>
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
                   <input type="text" value={numReferencia} onChange={(e) => setNumReferencia(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 font-mono focus:bg-white" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</label>
                   <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50" />
                 </div>
                 <div className="md:col-span-4">
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
                        <td className="py-2 text-right font-bold text-gray-700 font-mono">{formatCurrency(linea.unidades * linea.precio_unitario)}</td>
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
                    <div className="flex justify-between text-sm"><span>Base Imponible:</span><span className="font-mono font-bold">{formatCurrency(baseImponible)}</span></div>
                    <div className="flex justify-between text-sm"><span>IVA (21%):</span><span className="font-mono font-bold">{formatCurrency(cuotaIva)}</span></div>
                    {retencionPct > 0 && <div className="flex justify-between text-sm text-red-600"><span>Retención ({retencionPct}%):</span><span className="font-mono font-bold">-{formatCurrency(retencionImporte)}</span></div>}
                    <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-200 text-gray-800"><span>TOTAL:</span><span className="text-orange-600">{formatCurrency(totalProyecto)}</span></div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

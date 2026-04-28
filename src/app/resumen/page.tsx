"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Activity, Search, Loader2, TrendingUp, TrendingDown, Target, Building2, FileText, X, Receipt } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generatePDF } from "@/lib/pdfGenerator";
import { formatCurrency } from "@/lib/format";
import { exportProjectSummaryPDF } from "@/lib/reportingService";

type ResumenDetails = {
  ventas: any[];
  costes: any[];
  cobros: any[];
  pagos: any[];
};

export default function ResumenPage() {
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'todos' | 'abierto' | 'cerrado'>('abierto');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [details, setDetails] = useState<ResumenDetails>({ventas: [], costes: [], cobros: [], pagos: []});
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchResumen();
  }, []);

  const fetchResumen = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: projs } = await supabase.from("proyectos").select("*, clientes(nombre)").eq("user_id", user.id);
      const { data: vts } = await supabase.from("ventas").select("id, proyecto_id, total").eq("user_id", user.id);
      const { data: csts } = await supabase.from("costes").select("id, proyecto_id, total").eq("user_id", user.id);
      const { data: cbrs } = await supabase.from("cobros").select("venta_id, importe").eq("user_id", user.id);
      const { data: pgs } = await supabase.from("pagos").select("coste_id, importe").eq("user_id", user.id);
      const { data: perf } = await supabase.from("perfil_negocio").select("*").eq("user_id", user.id).maybeSingle();

      const consolidated = (projs || []).map(p => {
        const misVentas = (vts || []).filter(v => v.proyecto_id === p.id);
        const misCostes = (csts || []).filter(c => c.proyecto_id === p.id);
        
        const totalVentas = misVentas.reduce((acc, curr) => acc + (curr.total || 0), 0);
        const totalCostes = misCostes.reduce((acc, curr) => acc + (curr.total || 0), 0);
        
        const vtsIds = misVentas.map(v => v.id);
        const cstsIds = misCostes.map(c => c.id);

        const totalCobrado = (cbrs || []).filter(c => vtsIds.includes(c.venta_id)).reduce((acc, curr) => acc + (curr.importe || 0), 0);
        const totalPagado = (pgs || []).filter(p => cstsIds.includes(p.coste_id)).reduce((acc, curr) => acc + (curr.importe || 0), 0);

        const pendienteCobro = totalVentas - totalCobrado;
        const pendientePago = totalCostes - totalPagado;

        const margen = totalVentas - totalCostes;
        const margenPct = totalVentas > 0 ? (margen / totalVentas) * 100 : 0;
        
        const previstoVenta = p.venta_prevista || p.base_imponible || 0;
        const previstoCoste = p.coste_previsto || 0;
        const margenPrevisto = previstoVenta - previstoCoste;
        const desviacionMargen = margen - margenPrevisto;

        return {
          ...p,
          totalVentas,
          totalCostes,
          margen,
          margenPct: isNaN(margenPct) ? 0 : margenPct,
          previstoVenta,
          previstoCoste,
          margenPrevisto,
          desviacionMargen,
          pendienteCobro,
          pendientePago
        };
      });

      setProyectos(consolidated);
      setPerfil(perf);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (project: any) => {
    setLoadingDetails(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const [vts, csts, cbrs, pgs] = await Promise.all([
        supabase.from("ventas").select("*").eq("proyecto_id", project.id).eq("user_id", user.id),
        supabase.from("costes").select("*").eq("proyecto_id", project.id).eq("user_id", user.id),
        supabase.from("cobros").select("*").eq("user_id", user.id),
        supabase.from("pagos").select("*").eq("user_id", user.id)
      ]);

      setDetails({
        ventas: vts.data || [],
        costes: csts.data || [],
        cobros: cbrs.data || [],
        pagos: pgs.data || []
      });
      setSelectedProject(project);
    } catch (err) {
      console.error("Error fetching details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const exportPDF = async () => {
    if (!perfil) {
      alert("Configura tus datos en Ajustes primero.");
      return;
    }

    try {
      await generatePDF({
        tipo: 'INFORME',
        numero: `INF-${new Date().getFullYear()}-${(new Date().getMonth()+1).toString().padStart(2, '0')}`,
        fecha: new Date().toISOString(),
        cliente: {
          nombre: 'Control Interno de Rentabilidad',
          nif: '', direccion: '', poblacion: '', cp: '', provincia: ''
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
          condiciones_legales: 'Informe generado automáticamente por GestiónPro.'
        },
        lineas: filtered.map(p => ({
          unidades: 1,
          descripcion: `PROYECTO: ${p.nombre} (${p.clientes?.nombre || 'Particular'})`,
          precio_unitario: p.margen
        })),
        totales: {
          base: filtered.reduce((acc, p) => acc + p.totalVentas, 0),
          iva_pct: 0,
          iva_importe: 0,
          retencion_pct: 0,
          retencion_importe: 0,
          total: filtered.reduce((acc, p) => acc + p.margen, 0)
        }
      });
    } catch (error) {
      alert("Error al generar el PDF del informe.");
    }
  };

  const filtered = proyectos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.clientes?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || 
                         p.estado?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totals = {
    previstoVenta: filtered.reduce((acc, p) => acc + p.previstoVenta, 0),
    previstoCoste: filtered.reduce((acc, p) => acc + p.previstoCoste, 0),
    realVenta: filtered.reduce((acc, p) => acc + p.totalVentas, 0),
    realCoste: filtered.reduce((acc, p) => acc + p.totalCostes, 0)
  };

  const margenRealTotal = totals.realVenta - totals.realCoste;
  const margenPrevTotal = totals.previstoVenta - totals.previstoCoste;
  const globalMargenMedio = (proyectos.reduce((acc, p) => acc + (p.margenPct || 0), 0) / (proyectos.length || 1)).toFixed(1);

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Resumen de Presupuestos</h1>
            <p className="text-[var(--muted)] font-medium">Análisis de rentabilidad y márgenes de beneficio por obra.</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={exportPDF} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[var(--border)] text-gray-700 font-bold hover:shadow-md transition-all active:scale-95">
               <FileText size={18} className="text-red-500" /> Informe PDF
             </button>
             <div className="h-10 w-px bg-gray-200"></div>
             <Target className="text-[var(--accent)]" size={24} />
             <div className="text-right">
                <div className="text-[10px] font-bold text-[var(--muted)] uppercase">Global Margen Medio</div>
                <div className="text-xl font-bold text-[var(--foreground)]">
                   {globalMargenMedio}%
                </div>
             </div>
          </div>
        </header>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10 text-left">
            {/* Bloque Económico Venta */}
            <div className={`p-6 rounded-2xl border bg-white shadow-sm border-l-4 border-l-blue-500`}>
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Target size={14} className="text-blue-500" /> Venta (Presupuesto x Real)
              </div>
              <div className="space-y-3">
                 <div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Previsto</div>
                    <div className="text-xl font-black text-gray-700">{formatCurrency(totals.previstoVenta)}</div>
                 </div>
                 <div className="pt-2 border-t border-dashed">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Real</div>
                    <div className="text-xl font-black text-blue-600">{formatCurrency(totals.realVenta)}</div>
                 </div>
              </div>
            </div>

            {/* Bloque Económico Coste */}
            <div className={`p-6 rounded-2xl border bg-white shadow-sm border-l-4 border-l-red-500`}>
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <TrendingDown size={14} className="text-red-500" /> Costes (Presupuesto x Real)
              </div>
              <div className="space-y-3">
                 <div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Previsto</div>
                    <div className="text-xl font-black text-gray-700">{formatCurrency(totals.previstoCoste)}</div>
                 </div>
                 <div className="pt-2 border-t border-dashed">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Real</div>
                    <div className="text-xl font-black text-red-600">{formatCurrency(totals.realCoste)}</div>
                 </div>
              </div>
            </div>

            {/* Bloque Margen Previsto */}
            <div className={`p-6 rounded-2xl border bg-white shadow-sm border-l-4 border-l-gray-400`}>
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Activity size={14} className="text-gray-400" /> Rentabilidad Prevista
              </div>
              <div className="text-3xl font-black text-gray-400 mb-2">
                {formatCurrency(margenPrevTotal)}
              </div>
              <div className="text-xs font-bold text-gray-400">Objetivo según presupuestos</div>
            </div>

            {/* Bloque Margen Real */}
            <div className={`p-6 rounded-2xl border bg-[var(--foreground)] shadow-xl border-l-4 border-l-green-400`}>
              <div className="text-[10px] font-bold text-white/40 uppercase mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-green-400" /> Rentabilidad Real (Caja)
              </div>
              <div className="text-3xl font-black text-white mb-2">
                {formatCurrency(margenRealTotal)}
              </div>
              <div className={`text-[10px] p-1 px-2 rounded inline-block font-bold uppercase tracking-tighter ${
                margenRealTotal >= margenPrevTotal ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {margenRealTotal >= margenPrevTotal ? 'Superando Objetivo' : 'Por Debajo Objetivo'}
              </div>
            </div>
         </div>

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[#fafafa]">
             <div className="flex items-center gap-6">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                  <input type="text" placeholder="Filtrar proyectos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors" />
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setStatusFilter('abierto')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'abierto' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Abiertos</button>
                    <button onClick={() => setStatusFilter('cerrado')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'cerrado' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Cerrados</button>
                    <button onClick={() => setStatusFilter('todos')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'todos' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
                </div>
             </div>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-3"><Loader2 className="animate-spin" size={32} /><p className="text-sm font-medium">Calculando rentabilidades...</p></div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Presupuesto</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Venta (Real)</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right text-[var(--accent)]">Margen Bruto</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Margen %</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Coste (Real)</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Pend. Cobro</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Pend. Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((p) => (
                    <tr key={p.id} onClick={() => fetchProjectDetails(p)} className="hover:bg-[#fcfaf7] transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{p.nombre}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase">{p.clientes?.nombre || 'Particular'}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono leading-tight">
                         <div className="text-gray-400 text-[10px] mb-0.5">{formatCurrency(p.previstoVenta)}</div>
                         <div className="text-green-600 font-bold text-[13px]">{formatCurrency(p.totalVentas)}</div>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold text-[13px] ${p.margen >= 0 ? 'text-[var(--accent)]' : 'text-red-700'}`}>
                         <div>{formatCurrency(p.margen)}</div>
                         <div className={`text-[10px] mt-0.5 ${p.desviacionMargen >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {p.desviacionMargen >= 0 ? '+' : ''}{formatCurrency(p.desviacionMargen)} vs Plan
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${p.margenPct >= 15 ? 'bg-green-100 text-green-700' : p.margenPct > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{p.margenPct.toFixed(1)}%</span></td>
                      <td className="px-6 py-4 text-right font-mono leading-tight">
                         <div className="text-gray-400 text-[10px] mb-0.5">{formatCurrency(p.previstoCoste)}</div>
                         <div className="text-red-600 font-bold text-[13px]">{formatCurrency(p.totalCostes)}</div>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold text-[13px] ${p.pendienteCobro > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                         {formatCurrency(p.pendienteCobro)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold text-[13px] ${p.pendientePago > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                         {formatCurrency(p.pendientePago)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal de Detalle de Proyecto */}
        {selectedProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
             <div className="bg-[#fcfaf7] rounded-2xl shadow-2xl p-0 w-full max-w-6xl border border-white relative min-h-[80vh] flex flex-col">
                <header className="p-8 pb-6 bg-white border-b rounded-t-2xl flex justify-between items-start">
                   <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${selectedProject.estado === 'abierto' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          Proyecto {selectedProject.estado}
                        </span>
                        <h2 className="text-3xl font-black font-head tracking-tight">{selectedProject.nombre}</h2>
                      </div>
                      <p className="text-gray-400 font-bold">{selectedProject.clientes?.nombre || 'Consumidor Final'}</p>
                   </div>
                   <div className="flex gap-4">
                      <button 
                        onClick={() => exportProjectSummaryPDF({ ...selectedProject, ...details }, perfil)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--foreground)] text-white font-bold text-sm shadow-xl hover:-translate-y-0.5 transition-all"
                      >
                        <FileText size={18} /> Ficha Resumen (PDF)
                      </button>
                      <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-300 transition-colors">
                        <X size={24} />
                      </button>
                   </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 bg-[#fafafa]/50 relative">
                  {loadingDetails && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
                       <Loader2 className="animate-spin text-purple-600" size={40} />
                       <p className="font-bold text-gray-600">Cargando detalles del proyecto...</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                     {/* Resumen Económico */}
                     <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                           <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">Comparativa Presupuestaria</h3>
                           <div className="space-y-6">
                              <div>
                                 <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-2">
                                    <span>Venta Real vs Prevista</span>
                                    <span>{((selectedProject.totalVentas / (selectedProject.previstoVenta || 1)) * 100).toFixed(0)}%</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min((selectedProject.totalVentas / (selectedProject.previstoVenta || 1)) * 100, 100)}%` }}></div>
                                 </div>
                                 <div className="flex justify-between mt-2 font-mono font-bold text-xs uppercase">
                                    <span className="text-blue-600">{formatCurrency(selectedProject.totalVentas)}</span>
                                    <span className="text-gray-300">{formatCurrency(selectedProject.previstoVenta)}</span>
                                 </div>
                              </div>
                              <div>
                                 <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-2">
                                    <span>Coste Real vs Previsto</span>
                                    <span>{((selectedProject.totalCostes / (selectedProject.previstoCoste || 1)) * 100).toFixed(0)}%</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${Math.min((selectedProject.totalCostes / (selectedProject.previstoCoste || 1)) * 100, 100)}%` }}></div>
                                 </div>
                                 <div className="flex justify-between mt-2 font-mono font-bold text-xs uppercase">
                                    <span className="text-red-600">{formatCurrency(selectedProject.totalCostes)}</span>
                                    <span className="text-gray-300">{formatCurrency(selectedProject.previstoCoste)}</span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="bg-[var(--foreground)] p-6 rounded-2xl border text-white shadow-xl">
                            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Margen de Proyecto</h3>
                            <div className="text-4xl font-black mb-2">{formatCurrency(selectedProject.margen)}</div>
                            <div className="flex justify-between items-center text-xs text-white/60">
                               <span>Rentabilidad: {selectedProject.margenPct.toFixed(1)}%</span>
                               <span>Desv: {formatCurrency(selectedProject.desviacionMargen)}</span>
                            </div>
                        </div>
                     </div>

                     {/* Tablas de Detalle */}
                     <div className="lg:col-span-8 space-y-8">
                        {/* Ventas y Cobros */}
                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden text-left">
                           <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest border-l-4 border-blue-500 pl-3">Facturación y Cobros</h4>
                           </div>
                           <table className="w-full text-left text-xs">
                              <thead className="bg-[#fcfaf7]">
                                 <tr>
                                    <th className="px-4 py-3 font-bold text-gray-400 uppercase">Factura / PDF</th>
                                    <th className="px-4 py-3 font-bold text-gray-400 uppercase">Importe</th>
                                    <th className="px-4 py-3 font-bold text-gray-400 uppercase">Cobro Asociado</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y">
                                 {details.ventas.map(v => {
                                   const relevantCobros = details.cobros.filter(c => c.venta_id === v.id);
                                   const cobrado = relevantCobros.reduce((acc, c) => acc + c.importe, 0);
                                   return (
                                     <React.Fragment key={v.id}>
                                       <tr className="bg-white">
                                         <td className="px-4 py-3 font-bold flex items-center gap-2">
                                            {v.serie}-{v.num_factura}
                                            {v.pdf_url && <a href={v.pdf_url} target="_blank" className="p-1 text-red-500 hover:bg-red-50 rounded transition-all"><FileText size={14} /></a>}
                                         </td>
                                         <td className="px-4 py-3 font-mono font-bold text-blue-600">{formatCurrency(v.total)}</td>
                                         <td className="px-4 py-3">
                                            <div className={`px-2 py-0.5 rounded-full inline-block text-[9px] font-black uppercase ${cobrado >= v.total ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                               {cobrado >= v.total ? 'Cobrado Total' : `Pend: ${formatCurrency(v.total - cobrado)}`}
                                            </div>
                                         </td>
                                       </tr>
                                       {relevantCobros.length > 0 && (
                                         <tr className="bg-gray-50/30">
                                            <td colSpan={3} className="px-10 py-2 border-l-2 border-blue-200">
                                               <div className="space-y-1">
                                                  {relevantCobros.map((cb, idx) => (
                                                     <div key={cb.id} className="flex justify-between items-center text-[10px] text-gray-500">
                                                        <span>{idx + 1}. Cobro el {new Date(cb.fecha).toLocaleDateString()} via {cb.forma_pago}</span>
                                                        <span className="font-bold text-gray-700">{formatCurrency(cb.importe)}</span>
                                                     </div>
                                                  ))}
                                               </div>
                                            </td>
                                         </tr>
                                       )}
                                     </React.Fragment>
                                   );
                                 })}
                              </tbody>
                           </table>
                        </div>

                        {/* Costes y Pagos */}
                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden text-left">
                           <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest border-l-4 border-red-500 pl-3">Gastos y Pagos REALES</h4>
                           </div>
                           <table className="w-full text-left text-xs">
                              <thead className="bg-[#fcfaf7]">
                                 <tr>
                                    <th className="px-4 py-3 font-bold text-gray-400 uppercase w-16">Reg.</th>
                                    <th className="px-4 py-3 font-bold text-gray-400 uppercase">Prov / Doc / PDF</th>
                                    <th className="px-4 py-3 font-bold text-gray-400 uppercase">Importe</th>
                                    <th className="px-4 py-3 font-bold text-gray-400 uppercase">Pago Asociado</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y">
                                 {details.costes.map(c => {
                                   const relevantPagos = details.pagos.filter(p => p.coste_id === c.id);
                                   const pagado = relevantPagos.reduce((acc, p) => acc + p.importe, 0);
                                   return (
                                     <React.Fragment key={c.id}>
                                       <tr className="bg-white">
                                         <td className="px-4 py-3 font-bold text-blue-600">{c.num_interno || c.numero || "S/N"}</td>
                                         <td className="px-4 py-3">
                                            <div className="font-bold">{c.proveedores?.nombre || 'Gasto'}</div>
                                            <div className="text-[9px] text-gray-400 flex items-center gap-1 uppercase tracking-tighter">
                                               {c.num_factura_proveedor} 
                                               {c.pdf_url && <a href={c.pdf_url} target="_blank" className="text-red-500"><FileText size={10} /></a>}
                                            </div>
                                         </td>
                                         <td className="px-4 py-3 font-mono font-bold text-red-600">{formatCurrency(c.total)}</td>
                                         <td className="px-4 py-3">
                                            <div className={`px-2 py-0.5 rounded-full inline-block text-[9px] font-black uppercase ${pagado >= c.total ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                               {pagado >= c.total ? 'Liquidado' : `Pend: ${formatCurrency(c.total - pagado)}`}
                                            </div>
                                         </td>
                                       </tr>
                                       {relevantPagos.length > 0 && (
                                         <tr className="bg-gray-50/30">
                                            <td colSpan={4} className="px-10 py-2 border-l-2 border-red-200">
                                               <div className="space-y-1">
                                                  {relevantPagos.map((pg, idx) => (
                                                     <div key={pg.id} className="flex justify-between items-center text-[10px] text-gray-500">
                                                        <span>{idx + 1}. Pago el {new Date(pg.fecha).toLocaleDateString()} via {pg.forma_pago || 'Transferencia'}</span>
                                                        <span className="font-bold text-gray-700">{formatCurrency(pg.importe)}</span>
                                                     </div>
                                                  ))}
                                               </div>
                                            </td>
                                         </tr>
                                       )}
                                     </React.Fragment>
                                   );
                                 })}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

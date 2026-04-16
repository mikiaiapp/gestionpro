"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Activity, Search, Loader2, TrendingUp, TrendingDown, Target, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResumenPage() {
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchResumen();
  }, [supabase]);

  const fetchResumen = async () => {
    if (!supabase) return;
    setLoading(true);

    // Fail-safe: si en 2 segundos no ha terminado, liberamos la UI
    const timeout = setTimeout(() => setLoading(false), 2000);
    
    try {
      // Obtenemos Proyectos, Ventas y Costes para consolidar
      const { data: projs } = await supabase.from("proyectos").select("*, clientes(nombre)");
      const { data: vts } = await supabase.from("ventas").select("proyecto_id, total");
      const { data: csts } = await supabase.from("costes").select("proyecto_id, total");

      const consolidated = projs?.map(p => {
        const totalVentas = vts?.filter(v => v.proyecto_id === p.id).reduce((acc, curr) => acc + curr.total, 0) || 0;
        const totalCostes = csts?.filter(c => c.proyecto_id === p.id).reduce((acc, curr) => acc + curr.total, 0) || 0;
        const margen = totalVentas - totalCostes;
        const margenPct = totalVentas > 0 ? (margen / totalVentas) * 100 : 0;

        return {
          ...p,
          totalVentas,
          totalCostes,
          margen,
          margenPct
        };
      }) || [];

      setProyectos(consolidated);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const filtered = proyectos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clientes?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Resumen de Proyectos</h1>
            <p className="text-[var(--muted)] font-medium">Análisis de rentabilidad y márgenes de beneficio por obra.</p>
          </div>
          <div className="flex items-center gap-3">
             <Target className="text-[var(--accent)]" size={24} />
             <div className="text-right">
                <div className="text-[10px] font-bold text-[var(--muted)] uppercase">Global Margen Medio</div>
                <div className="text-xl font-bold text-[var(--foreground)]">
                   {new Intl.NumberFormat('es-ES', { style: 'percent' }).format(proyectos.reduce((acc, p) => acc + (p.margenPct || 0), 0) / (proyectos.length || 1) / 100)}
                </div>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
           {filtered.slice(0, 3).map(p => (
              <div key={p.id} className="bg-white p-6 rounded-2xl border border-[var(--border)] shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--background)] flex items-center justify-center text-[var(--accent)]">
                       <Building2 size={20} />
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.margen >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                       {p.margenPct.toFixed(1)}%
                    </span>
                 </div>
                 <h3 className="font-bold text-[var(--foreground)] truncate">{p.nombre}</h3>
                 <p className="text-xs text-[var(--muted)] mb-4">{p.clientes?.nombre || 'Particular'}</p>
                 <div className="flex justify-between items-end border-t border-[var(--border)] pt-4">
                    <div>
                       <div className="text-[10px] text-[var(--muted)] uppercase font-bold">Ganancia Neta</div>
                       <div className={`text-lg font-bold ${p.margen >= 0 ? 'text-[var(--green)]' : 'text-red-600'}`}>
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.margen)}
                       </div>
                    </div>
                    {p.margen >= 0 ? <TrendingUp className="text-[var(--green)]" /> : <TrendingDown className="text-red-600" />}
                 </div>
              </div>
           ))}
        </div>

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[#fafafa]">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
              <input 
                type="text" 
                placeholder="Filtrar proyectos..." 
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
                <p className="text-sm font-medium">Calculando rentabilidades...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center">
                  <Activity size={32} className="opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">No hay datos suficientes</p>
                  <p className="text-sm">Registra ventas y costes vinculados a proyectos.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Proyecto</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Total Ventas</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Total Costes</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Margen Bruto</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Margen %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{p.nombre}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase">{p.clientes?.nombre || 'Particular'}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-[var(--green)]">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.totalVentas)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-red-600">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.totalCostes)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono text-sm font-bold ${p.margen >= 0 ? 'text-[var(--accent)]' : 'text-red-700'}`}>
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.margen)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${p.margenPct >= 15 ? 'bg-green-100 text-green-700' : p.margenPct > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                            {p.margenPct.toFixed(1)}%
                         </span>
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

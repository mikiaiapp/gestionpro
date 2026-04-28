"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { 
  FileArchive, 
  Calendar, 
  Download, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Receipt,
  DownloadCloud
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateFiscalPack } from "@/lib/reportingService";
import { formatCurrency } from "@/lib/format";

export default function FiscalPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [perfil, setPerfil] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.floor((new Date().getMonth() + 3) / 3));
  
  const [stats, setStats] = useState({
    ventasCount: 0,
    ventasTotal: 0,
    ventasIva: 0,
    costesCount: 0,
    costesTotal: 0,
    costesIva: 0,
    ventasConPDF: 0,
    costesConPDF: 0
  });

  useEffect(() => {
    fetchData();
  }, [year, quarter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perf } = await supabase
        .from("perfil_negocio")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
        
      setPerfil(perf);

      // Calcular fechas del trimestre
      const startMonth = (quarter - 1) * 3;
      const startDate = new Date(year, startMonth, 1).toISOString();
      const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59).toISOString();

      const [ventasRes, costesRes] = await Promise.all([
        supabase.from("ventas").select("*").eq("user_id", user.id).gte("fecha", startDate).lte("fecha", endDate),
        supabase.from("costes").select("*").eq("user_id", user.id).gte("fecha", startDate).lte("fecha", endDate)
      ]);

      const vts = ventasRes.data || [];
      const csts = costesRes.data || [];

      setStats({
        ventasCount: vts.length,
        ventasTotal: vts.reduce((acc, v) => acc + (v.total || 0), 0),
        ventasIva: vts.reduce((acc, v) => acc + (v.iva_importe || 0), 0),
        costesCount: csts.length,
        costesTotal: csts.reduce((acc, c) => acc + (c.total || 0), 0),
        costesIva: csts.reduce((acc, c) => acc + (c.iva_importe || 0), 0),
        ventasConPDF: vts.filter(v => v.pdf_url).length,
        costesConPDF: csts.filter(c => c.pdf_url).length
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePack = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      if (!perfil || !perfil.nombre || !perfil.nif) {
        alert("⚠️ Faltan datos de tu empresa.\n\nPor favor, ve a la sección de 'Ajustes' y asegúrate de completar y guardar tu Nombre/Razón Social y NIF para poder generar el Pack Fiscal.");
        return;
      }

      const startMonth = (quarter - 1) * 3;
      const startDate = new Date(year, startMonth, 1).toISOString();
      const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59).toISOString();

      const [ventasRes, costesRes] = await Promise.all([
        supabase.from("ventas").select("*, clientes(nombre, nif)").eq("user_id", user.id).gte("fecha", startDate).lte("fecha", endDate),
        supabase.from("costes").select("*, proveedores(nombre, nif)").eq("user_id", user.id).gte("fecha", startDate).lte("fecha", endDate)
      ]);

      await generateFiscalPack(
        `${year}_T${quarter}`,
        ventasRes.data || [],
        costesRes.data || [],
        perfil,
        { startDate, endDate }
      );
    } catch (err: any) {
      alert("Error al generar el pack: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const ventasPdfPct = (stats.ventasConPDF / (stats.ventasCount || 1)) * 100;
  const costesPdfPct = (stats.costesConPDF / (stats.costesCount || 1)) * 100;

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10 text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <FileArchive size={24} />
            </div>
            <h1 className="text-3xl font-bold font-head tracking-tight text-[var(--foreground)]">Generador Pack Fiscal</h1>
          </div>
          <p className="text-[var(--muted)] font-medium">Exportación trimestral de Libros de IVA y facturas digitalizadas para tu gestoría.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          {/* Selector de Periodo */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[var(--border)] shadow-sm">
              <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                <Calendar size={18} className="text-[var(--accent)]" /> Periodo Fiscal
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Año</label>
                  <select 
                    value={year} 
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:border-[var(--accent)] font-bold text-gray-700"
                  >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Trimestre</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map(q => (
                      <button
                        key={q}
                        onClick={() => setQuarter(q)}
                        className={`p-3 rounded-xl border font-bold text-sm transition-all ${
                          quarter === q 
                            ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-md" 
                            : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                        }`}
                      >
                        Trimestre {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-dashed border-gray-100">
                <button 
                  onClick={handleGeneratePack}
                  disabled={generating || loading || stats.ventasCount + stats.costesCount === 0}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[var(--foreground)] text-white font-bold hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                >
                  {generating ? <Loader2 className="animate-spin" /> : <DownloadCloud />}
                  {generating ? "Procesando ZIP..." : "Descargar Pack ZIP"}
                </button>
                {stats.ventasCount + stats.costesCount === 0 && !loading && (
                  <p className="mt-3 text-center text-[10px] font-bold text-red-400 uppercase tracking-wider">No hay movimientos en este periodo</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <div className="flex gap-4">
                <AlertCircle className="text-blue-500 shrink-0" size={20} />
                <div className="text-sm">
                  <p className="font-bold text-blue-900 mb-1">Sobre el Pack Fiscal</p>
                  <p className="text-blue-700/80 leading-relaxed">
                    Este archivo ZIP contiene los Libros de IVA (Repercutido y Soportado) y todas las facturas en PDF que hayas subido o generado en el sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas y Vista Previa */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Ventas */}
              <div className="bg-white p-6 rounded-2xl border border-[var(--border)] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <TrendingUp size={80} />
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-50 rounded-lg text-green-600">
                    <Receipt size={20} />
                  </div>
                  <h3 className="font-bold text-gray-700">Facturas Emitidas</h3>
                </div>
                <div className="mb-4">
                  <div className="text-3xl font-black text-gray-800">{formatCurrency(stats.ventasTotal)}</div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-sm text-[var(--muted)] font-medium">{stats.ventasCount} documentos registrados</div>
                    <div className="text-sm font-bold text-green-600">IVA: {formatCurrency(stats.ventasIva)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-1000" 
                      style={{ width: `${ventasPdfPct}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-black text-gray-400 whitespace-nowrap uppercase">
                    {stats.ventasConPDF}/{stats.ventasCount} PDFs
                  </span>
                </div>
              </div>

              {/* Card Costes */}
              <div className="bg-white p-6 rounded-2xl border border-[var(--border)] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-180">
                   <TrendingUp size={80} />
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-50 rounded-lg text-red-600">
                    <Download size={20} />
                  </div>
                  <h3 className="font-bold text-gray-700">Facturas Recibidas</h3>
                </div>
                <div className="mb-4">
                  <div className="text-3xl font-black text-gray-800">{formatCurrency(stats.costesTotal)}</div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-sm text-[var(--muted)] font-medium">{stats.costesCount} gastos registrados</div>
                    <div className="text-sm font-bold text-red-600">IVA: {formatCurrency(stats.costesIva)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 transition-all duration-1000" 
                      style={{ width: `${costesPdfPct}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-black text-gray-400 whitespace-nowrap uppercase">
                    {stats.costesConPDF}/{stats.costesCount} PDFs
                  </span>
                </div>
              </div>
            </div>

            {/* Card Resultado Liquidación */}
            <div className="bg-[var(--foreground)] p-8 rounded-2xl shadow-xl relative overflow-hidden group border border-white/10">
               <div className="absolute top-0 right-0 p-6 opacity-10">
                  <TrendingUp size={120} className="text-white" />
               </div>
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-white/60 font-bold uppercase tracking-widest text-[10px] mb-2">Estimación Resultado Trimestral</h3>
                    <div className="text-4xl font-black text-white flex items-baseline gap-2">
                      {formatCurrency(stats.ventasIva - stats.costesIva)}
                      <span className="text-sm font-bold text-white/40 uppercase">Resultado IVA</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-left">
                        <div className="text-[10px] font-bold text-white/40 uppercase mb-1">IVA Repercutido</div>
                        <div className="text-white font-bold">{formatCurrency(stats.ventasIva)}</div>
                     </div>
                     <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-left">
                        <div className="text-[10px] font-bold text-white/40 uppercase mb-1">IVA Soportado</div>
                        <div className="text-white font-bold">{formatCurrency(stats.costesIva)}</div>
                     </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-tighter ${
                    (stats.ventasIva - stats.costesIva) > 0 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                  }`}>
                    {(stats.ventasIva - stats.costesIva) > 0 ? 'A Pagar (Mod. 303)' : 'A Compensar'}
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-xs text-gray-500 uppercase tracking-widest px-2">Estructura del Pack Fiscal</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <CheckCircle2 size={24} className="text-green-500" />
                  <div className="flex-1">
                    <div className="font-bold text-gray-700">Libros de Registro Oficiales</div>
                    <div className="text-xs text-gray-400">Archivos PDF con el formato reglamentario para AEAT.</div>
                  </div>
                  <ArrowRight size={16} className="text-gray-300" />
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <CheckCircle2 size={24} className="text-green-500" />
                  <div className="flex-1">
                    <div className="font-bold text-gray-700">Justificantes Digitalizados</div>
                    <div className="text-xs text-gray-400">Repositorio de facturas emitidas y recibidas en PDF.</div>
                  </div>
                  <ArrowRight size={16} className="text-gray-300" />
                </div>

                <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 flex gap-4">
                  <AlertCircle className="text-orange-500 shrink-0" size={20} />
                  <p className="text-xs text-orange-700 leading-relaxed font-medium">
                    Asegúrate de haber subido los PDFs de tus facturas de gastos para que el pack esté completo. Las facturas emitidas se incluyen automáticamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

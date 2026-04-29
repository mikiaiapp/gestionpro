"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { formatCurrency } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle, Users, Loader2,
  CheckCircle2, Clock, BarChart3, ArrowUpRight, ArrowDownRight, ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const COLORS = ["#3b82f6","#f97316","#10b981","#8b5cf6","#ec4899"];

function KPICard({ label, value, sub, trend, icon: Icon, color = "blue" }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-gray-400 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 text-sm">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function KPIPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState<any[]>([]);
  const [costes, setCostes] = useState<any[]>([]);
  const [cobros, setCobros] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [v, c, co, cl] = await Promise.all([
      supabase.from("ventas").select("*, clientes(nombre)").eq("user_id", user.id),
      supabase.from("costes").select("*").eq("user_id", user.id),
      supabase.from("cobros").select("*").eq("user_id", user.id),
      supabase.from("clientes").select("id, nombre").eq("user_id", user.id),
    ]);

    setVentas(v.data || []);
    setCostes(c.data || []);
    setCobros(co.data || []);
    setClientes(cl.data || []);
    setLoading(false);
  };

  // ── Datos por mes (últimos 12 meses) ──────────────────────────────
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = `${MONTHS_ES[m]} ${y !== now.getFullYear() ? y : ""}`.trim();

      const ingresos = ventas
        .filter(v => { const vd = new Date(v.fecha); return vd.getMonth() === m && vd.getFullYear() === y; })
        .reduce((a, v) => a + (v.total || 0), 0);

      const gastos = costes
        .filter(c => { const cd = new Date(c.fecha); return cd.getMonth() === m && cd.getFullYear() === y; })
        .reduce((a, c) => a + (c.total || 0), 0);

      return { label, ingresos, gastos, margen: ingresos - gastos };
    });
  }, [ventas, costes]);

  // ── KPIs globales ─────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalIngresos = ventas.reduce((a, v) => a + (v.total || 0), 0);
    const totalGastos = costes.reduce((a, c) => a + (c.total || 0), 0);
    const margenBruto = totalIngresos - totalGastos;
    const margenPct = totalIngresos > 0 ? (margenBruto / totalIngresos) * 100 : 0;

    const pendienteCobro = ventas
      .filter(v => v.estado_pago !== "Pagado")
      .reduce((a, v) => a + (v.pendiente || v.total || 0), 0);

    const totalCobrado = cobros.reduce((a, c) => a + (c.importe || 0), 0);
    const ratioCobro = totalIngresos > 0 ? (totalCobrado / totalIngresos) * 100 : 0;

    const prevMonth = monthlyData[10] || { ingresos: 0 };
    const currMonth = monthlyData[11] || { ingresos: 0 };
    const trendIngresos = prevMonth.ingresos > 0
      ? ((currMonth.ingresos - prevMonth.ingresos) / prevMonth.ingresos) * 100
      : 0;

    return { totalIngresos, totalGastos, margenBruto, margenPct, pendienteCobro, ratioCobro, trendIngresos };
  }, [ventas, costes, cobros, monthlyData]);

  // ── Top Clientes ──────────────────────────────────────────────────
  const topClientes = useMemo(() => {
    const map: Record<string, { nombre: string; total: number }> = {};
    ventas.forEach(v => {
      const id = v.cliente_id || "sin-cliente";
      const nombre = v.clientes?.nombre || "Sin Asignar";
      if (!map[id]) map[id] = { nombre, total: 0 };
      map[id].total += v.total || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [ventas]);

  // ── Facturas pendientes de cobro ──────────────────────────────────
  const pendientes = useMemo(() =>
    ventas
      .filter(v => v.estado_pago !== "Pagado")
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .slice(0, 8),
    [ventas]
  );

  if (loading) return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Calculando KPIs...</p>
      </div>
    </div>
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 space-y-6 animate-in fade-in duration-500 overflow-y-auto pb-24 lg:pb-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white border shadow-sm rounded-2xl gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-2xl md:text-3xl font-black font-head tracking-tight text-[var(--foreground)]">
                 Dashboard KPIs
               </h1>
               <div className="md:hidden relative">
                  <select 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    value="/kpi"
                    onChange={(e) => router.push(e.target.value)}
                  >
                    <option value="/resumen">Resumen</option>
                    <option value="/kpi">KPIs</option>
                  </select>
                  <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500">
                    <ChevronDown size={16} />
                  </div>
               </div>
            </div>
            <p className="text-[var(--muted)] font-medium text-sm">
              Análisis financiero de tu negocio en tiempo real
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
            <BarChart3 className="text-blue-600" size={24} />
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Ingresos Totales"
            value={formatCurrency(kpis.totalIngresos)}
            trend={kpis.trendIngresos}
            icon={TrendingUp}
            color="blue"
          />
          <KPICard
            label="Gastos Totales"
            value={formatCurrency(kpis.totalGastos)}
            icon={TrendingDown}
            color="orange"
          />
          <KPICard
            label="Margen Bruto"
            value={formatCurrency(kpis.margenBruto)}
            sub={`${kpis.margenPct.toFixed(1)}% sobre ingresos`}
            icon={Wallet}
            color={kpis.margenBruto >= 0 ? "green" : "red"}
          />
          <KPICard
            label="Pendiente Cobro"
            value={formatCurrency(kpis.pendienteCobro)}
            sub={`Ratio cobrado: ${kpis.ratioCobro.toFixed(0)}%`}
            icon={AlertCircle}
            color="red"
          />
        </div>

        {/* Gráfico principal */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-black text-gray-800 mb-6">Ingresos vs Gastos — Últimos 12 meses</h2>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 600 }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="gastos" name="Gastos" fill="#f97316" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Margen mensual */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-black text-gray-800 mb-6">Evolución del Margen</h2>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 600 }}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="margen"
                    name="Margen"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Clientes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
              <Users size={18} className="text-blue-500" />
              Top Clientes
            </h2>
            {topClientes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin datos de clientes todavía</p>
            ) : (
              <div className="space-y-3">
                {topClientes.map((c, i) => {
                  const maxTotal = topClientes[0].total;
                  const pct = maxTotal > 0 ? (c.total / maxTotal) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm font-bold text-gray-700 mb-1">
                          <span className="truncate max-w-[160px]">{c.nombre}</span>
                          <span>{formatCurrency(c.total)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[i] }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pendientes de Cobro */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-orange-500" />
              Facturas Pendientes de Cobro
            </h2>
            {pendientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <CheckCircle2 className="text-green-400" size={40} />
                <p className="text-green-600 font-bold text-sm">¡Todo cobrado!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendientes.map((v) => {
                  const dias = Math.floor((Date.now() - new Date(v.fecha).getTime()) / 86400000);
                  return (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{v.num_factura || v.id.substring(0,8)}</p>
                        <p className="text-xs text-gray-400">{v.clientes?.nombre || "Sin cliente"} · <span className={dias > 30 ? "text-red-500 font-bold" : ""}>{dias}d</span></p>
                      </div>
                      <span className="text-sm font-black text-orange-600">{formatCurrency(v.pendiente || v.total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

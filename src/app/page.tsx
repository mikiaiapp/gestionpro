import { Sidebar } from "@/components/Sidebar";
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex bg-[var(--background)]">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Buenos días</h1>
            <p className="text-[var(--muted)] font-medium">Aquí tienes el resumen de tu actividad hoy.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]">
              Nueva Venta
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card p-6 bg-white shadow-sm border-[var(--border)]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-[var(--background)]">
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                <span className={`flex items-center text-xs font-bold ${stat.trendingUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stat.change}
                  {stat.trendingUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </span>
              </div>
              <div>
                <p className="text-[var(--muted)] text-[11px] font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-2xl font-bold font-head text-[var(--foreground)]">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="bg-zinc-900/40 border border-white/5 rounded-2xl p-8 text-center">
          <p className="text-zinc-400">Próximamente: Gráficos dinámicos y estados de proyectos en tiempo real.</p>
        </section>
      </div>
    </div>
  );
}

const stats = [
  { label: "Facturación Mes", value: "12.450,00€", change: "+12%", trendingUp: true, icon: TrendingUp, color: "#5b7fa6" },
  { label: "Gastos Pendientes", value: "3.240,15€", change: "-5%", trendingUp: false, icon: Wallet, color: "#b85c20" },
  { label: "Proyectos Activos", value: "8", change: "+2", trendingUp: true, icon: ArrowUpRight, color: "#7c5caa" },
  { label: "Cobros Pendientes", value: "4.120,00€", change: "+8%", trendingUp: true, icon: TrendingUp, color: "#a06c00" },
];

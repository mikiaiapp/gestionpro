import { Sidebar } from "@/components/Sidebar";
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Buenos días</h1>
            <p className="text-zinc-500">Aquí tienes el resumen de tu actividad hoy.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition-colors">
              Nueva Venta
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-zinc-800">
                  <stat.icon size={20} className="text-zinc-300" />
                </div>
                <span className={`flex items-center text-xs font-semibold ${stat.trendingUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stat.change}
                  {stat.trendingUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </span>
              </div>
              <div>
                <p className="text-zinc-500 text-sm mb-1">{stat.label}</p>
                <p className="text-2xl font-bold font-mono">{stat.value}</p>
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
  { label: "Facturación Mes", value: "12.450,00€", change: "+12%", trendingUp: true, icon: TrendingUp },
  { label: "Gastos Pendientes", value: "3.240,15€", change: "-5%", trendingUp: false, icon: Wallet },
  { label: "Proyectos Activos", value: "8", change: "+2", trendingUp: true, icon: ArrowUpRight },
  { label: "Cobros Pendientes", value: "4.120,00€", change: "+8%", trendingUp: true, icon: TrendingUp },
];

import { LayoutDashboard, Users, FolderKanban, Receipt, CreditCard, Settings, LogOut } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: FolderKanban, label: "Proyectos" },
  { icon: Receipt, label: "Ventas" },
  { icon: CreditCard, label: "Costes" },
  { icon: Users, label: "Clientes" },
  { icon: Settings, label: "Ajustes" },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-white/10 bg-black/50 backdrop-blur-xl h-screen sticky top-0 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white">G</div>
        <span className="text-xl font-bold tracking-tight">GestiónPro</span>
      </div>
      
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              item.active 
                ? "bg-white/10 text-white" 
                : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-6">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-400 transition-colors">
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

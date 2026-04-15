import { 
  Users, 
  Factory, 
  FolderKanban, 
  Receipt, 
  Download, 
  Wallet, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut 
} from "lucide-react";

type MenuItem = {
  icon: any;
  label: string;
  active?: boolean;
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

const menuStructure: MenuSection[] = [
  {
    label: "MAESTROS",
    items: [
      { icon: Users, label: "Clientes" },
      { icon: Factory, label: "Proveedores" },
    ]
  },
  {
    label: "GENERAL",
    items: [
      { icon: FolderKanban, label: "Proyectos", active: true },
      { icon: Receipt, label: "Ventas" },
      { icon: Download, label: "Costes" },
    ]
  },
  {
    label: "GESTIÓN",
    items: [
      { icon: Wallet, label: "Cobros" },
      { icon: CreditCard, label: "Pagos" },
    ]
  },
  {
    label: "ANÁLISIS",
    items: [
      { icon: BarChart3, label: "Resumen Proyectos" },
    ]
  },
  {
    label: "SISTEMA",
    items: [
      { icon: Settings, label: "Ajustes" },
    ]
  }
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border)] h-screen sticky top-0 flex flex-col p-4 shadow-sm">
      <div className="flex flex-col gap-1 mb-8 px-2 py-4 border-b border-[var(--border)]">
        <span className="text-xl font-bold font-head tracking-tight text-[var(--foreground)]">GestiónPro</span>
        <span className="text-[10px] font-bold text-[var(--muted)] tracking-wider uppercase">Control de Proyectos</span>
      </div>
      
      <nav className="flex-1 space-y-6 overflow-y-auto">
        {menuStructure.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-extrabold text-[var(--muted)] px-3 mb-2 tracking-widest">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                    item.active 
                      ? "bg-[var(--accent)] text-white shadow-md font-semibold" 
                      : "text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <item.icon size={18} />
                  <span className="text-[13px] font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-[var(--border)] pt-4">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-[var(--muted)] hover:text-red-600 transition-colors text-[13px] font-semibold">
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

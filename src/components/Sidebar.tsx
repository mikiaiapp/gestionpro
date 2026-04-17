"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  LogOut,
  LayoutDashboard
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type MenuItem = {
  icon: any;
  label: string;
  href: string;
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

const menuStructure: MenuSection[] = [
  {
    label: "ANÁLISIS",
    items: [
      { icon: BarChart3, label: "Resumen Proyectos", href: "/resumen" },
    ]
  },
  {
    label: "MAESTROS",
    items: [
      { icon: Users, label: "Clientes", href: "/clientes" },
      { icon: Factory, label: "Proveedores", href: "/proveedores" },
    ]
  },
  {
    label: "GENERAL",
    items: [
      { icon: FolderKanban, label: "Proyectos", href: "/proyectos" },
      { icon: Receipt, label: "Ventas", href: "/ventas" },
      { icon: Download, label: "Costes", href: "/costes" },
    ]
  },
  {
    label: "GESTIÓN",
    items: [
      { icon: Wallet, label: "Cobros", href: "/cobros" },
      { icon: CreditCard, label: "Pagos", href: "/pagos" },
    ]
  },
  {
    label: "SISTEMA",
    items: [
      { icon: Users, label: "Usuarios", href: "/usuarios" },
      { icon: Settings, label: "Ajustes", href: "/ajustes" },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      console.log("Intentando cerrar sesión...");
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Error al salir:", error.message);
      
      // Limpiamos todo y redirigimos de forma absoluta
      localStorage.clear();
      window.location.href = "/login";
    } catch (e) {
      console.error("Fallo crítico en logout:", e);
      window.location.href = "/login";
    }
  };

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
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                      isActive 
                        ? "bg-[var(--accent)] text-white shadow-md font-semibold" 
                        : "text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-[var(--border)] pt-4">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-[var(--muted)] hover:text-red-600 transition-colors text-[13px] font-semibold mb-2"
        >
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
        <div className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest pb-2">
          GestiónPro v2.3.3 - Build OK
        </div>
      </div>
    </aside>
  );
}

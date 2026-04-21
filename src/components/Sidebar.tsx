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
  LayoutDashboard,
  FileArchive,
  Files,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
      { icon: BarChart3, label: "Resumen Presupuestos", href: "/resumen" },
      { icon: TrendingUp, label: "Dashboard KPIs", href: "/kpi" },
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
      { icon: FolderKanban, label: "Presupuestos", href: "/proyectos" },
      { icon: Receipt, label: "Facturas Emitidas", href: "/ventas" },
      { icon: Download, label: "Facturas Recibidas", href: "/costes" },
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
    label: "FISCALIDAD",
    items: [
      { icon: FileArchive, label: "Pack Fiscal (ZIP)", href: "/fiscal" },
      { icon: Files, label: "Gestión Documental", href: "/documentos" },
    ]
  },
  {
    label: "SISTEMA",
    items: [
      { icon: Settings, label: "Ajustes", href: "/ajustes" },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchLogo();
    window.addEventListener('perfil_updated', fetchLogo);
    return () => window.removeEventListener('perfil_updated', fetchLogo);
  }, []);

  const fetchLogo = async () => {
    try {
      const { data } = await supabase.from('perfil_negocio').select('logo_url').maybeSingle();
      if (data?.logo_url) setLogoUrl(data.logo_url);
    } catch (e) {
      console.error("Error fetching logo for sidebar", e);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = "/login";
    } catch (e) {
      window.location.href = "/login";
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-[60] w-14 h-14 bg-[var(--accent)] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
      >
        <LayoutDashboard size={24} />
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[55] w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border)] 
        transition-transform duration-300 lg:static lg:translate-x-0 h-screen flex flex-col p-4 shadow-sm
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col items-center gap-4 mb-10 px-2 py-6 border-b border-[var(--border)]">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="max-h-24 w-auto object-contain transition-all duration-300 hover:scale-105" />
          ) : (
            <div className="flex flex-col items-start w-full">
              <span className="text-xl font-black font-head tracking-tighter text-[var(--foreground)]">GestiónPro</span>
              <span className="text-[10px] font-extrabold text-[var(--muted)] tracking-[0.2em] uppercase">Control Maestro</span>
            </div>
          )}
        </div>
        
        <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
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
                      onClick={() => setIsOpen(false)}
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

        <div className="mt-auto pt-4 flex flex-col items-center">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-3 py-3 text-[var(--muted)] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-[13px] font-bold mb-4"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
          <div className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest pb-4">
            GestiónPro v1.7.0
          </div>
        </div>
      </aside>

      {/* ── PWA Mobile Bottom Nav ────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 flex items-center justify-around px-2 py-2 safe-area-inset-bottom shadow-2xl shadow-black/10">
        {[
          { icon: BarChart3, href: "/resumen", label: "Inicio" },
          { icon: FolderKanban, href: "/proyectos", label: "Presupuestos" },
          { icon: Receipt, href: "/ventas", label: "Facturas" },
          { icon: TrendingUp, href: "/kpi", label: "KPIs" },
          { icon: Settings, href: "/ajustes", label: "Ajustes" },
        ].map(({ icon: Icon, href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                active ? "text-[var(--accent)]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-[9px] font-bold uppercase tracking-wide ${active ? "text-[var(--accent)]" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

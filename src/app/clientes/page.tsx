"use client";

import { Sidebar } from "@/components/Sidebar";
import { Users, Plus, Search, MoreHorizontal } from "lucide-react";

export default function ClientesPage() {
  return (
    <div className="flex bg-[var(--background)]">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Clientes</h1>
            <p className="text-[var(--muted)] font-medium">Gestión y mantenimiento de tu base de datos de clientes.</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]">
            <Plus size={18} />
            Nuevo Cliente
          </button>
        </header>

        {/* Stats rápidos de clientes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass-card p-6 bg-white shadow-sm border-[var(--border)]">
            <p className="text-[var(--muted)] text-[11px] font-bold uppercase tracking-wider mb-1">Total Clientes</p>
            <p className="text-2xl font-bold font-head text-[var(--foreground)]">24</p>
          </div>
          <div className="glass-card p-6 bg-white shadow-sm border-[var(--border)]">
            <p className="text-[var(--muted)] text-[11px] font-bold uppercase tracking-wider mb-1">Proyectos Activos</p>
            <p className="text-2xl font-bold font-head text-[#7c5caa]">12</p>
          </div>
          <div className="glass-card p-6 bg-white shadow-sm border-[var(--border)]">
            <p className="text-[var(--muted)] text-[11px] font-bold uppercase tracking-wider mb-1">Deuda Pendiente</p>
            <p className="text-2xl font-bold font-head text-[#b85c20]">1.450,00€</p>
          </div>
        </div>

        {/* Tabla de Clientes */}
        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[#fafafa]">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">NIF/CIF</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {/* Mock data para visualización */}
                {[
                  { nombre: "Aceros S.A.", nif: "A12345678", email: "info@aceros.com", estado: "Activo" },
                  { nombre: "Construcciones Paz", nif: "B88776655", email: "paz@obra.es", estado: "Con Deuda" },
                  { nombre: "Tecnología Avanzada", nif: "A99887766", email: "ventas@tec.com", estado: "Activo" },
                ].map((cliente, i) => (
                  <tr key={i} className="hover:bg-[#fcfaf7] transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--foreground)]">{cliente.nombre}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--muted)] font-medium">{cliente.nif}</td>
                    <td className="px-6 py-4 text-sm text-[var(--muted)]">{cliente.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        cliente.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {cliente.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors text-[var(--muted)]">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

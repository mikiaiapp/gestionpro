"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FolderKanban, Plus, Search, MoreHorizontal, Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [estado] = useState("Abierto");
  const [presupuesto, setPresupuesto] = useState("");
  const [costePrevisto, setCostePrevisto] = useState("");

  useEffect(() => {
    fetchData();
    // Temporizador de seguridad: si tarda más de 2 segundos, forzar desbloqueo
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [supabase]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // Cargar Proyectos (con join a clientes)
      const { data: projs, error: errP } = await supabase
        .from("proyectos")
        .select("*, clientes(nombre)")
        .order("created_at", { ascending: false });

      // Cargar Clientes para el selector
      const { data: clis, error: errC } = await supabase
        .from("clientes")
        .select("id, nombre")
        .order("nombre");

      if (!errP) setProyectos(projs || []);
      if (!errC) setClientes(clis || []);
    } catch (e: any) {
      console.error("Error sincronizando proyectos:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) return;
    
    if (!supabase) {
      alert("Error: No hay conexión con la base de datos.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("proyectos")
        .insert([{
          nombre,
          cliente_id: clienteId || null,
          estado,
          presupuesto: parseFloat(presupuesto) || 0,
          coste_previsto: parseFloat(costePrevisto) || 0
        }]);

      if (error) throw error;

      setNombre("");
      setClienteId("");
      setPresupuesto("");
      setCostePrevisto("");
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert("Error al crear proyecto: " + err.message);
    } finally {
      setSaving(false);
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
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Proyectos</h1>
            <p className="text-[var(--muted)] font-medium">Control y seguimiento de trabajos activos.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            Nuevo Proyecto
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border)] animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold font-head mb-6">📁 Nuevo Proyecto</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Nombre del Proyecto *</label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                    placeholder="Ej: Reforma Integral Local"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Cliente Asociado</label>
                  <select 
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">— Seleccionar cliente —</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Presupuesto Venta (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={presupuesto} 
                      onChange={(e) => setPresupuesto(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] font-bold text-green-700"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Coste Previsto (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={costePrevisto} 
                      onChange={(e) => setCostePrevisto(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] font-bold text-red-700"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-gray-100 rounded-xl transition-all border border-[var(--border)]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1 py-2.5 text-sm font-bold bg-[var(--accent)] text-white rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    {saving ? "Creando..." : "Crear Proyecto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[#fafafa]">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o cliente..." 
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
                <p className="text-sm font-medium">Sincronizando proyectos...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center">
                  <FolderKanban size={32} className="opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">No hay proyectos activos</p>
                  <p className="text-sm">Empieza creando uno nuevo para gestionar sus ventas y costes.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Proyecto</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Presup. Venta</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Coste Prev.</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Margen Prev.</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">%</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{p.nombre}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">ID: {p.id.slice(0,8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-[var(--muted)] font-medium">
                          <User size={14} />
                          {p.clientes?.nombre || 'Particular'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          p.estado === 'Finalizado' ? 'bg-green-100 text-green-700' : 
                          p.estado === 'En Curso' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold text-green-700">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.presupuesto || 0)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold text-red-700">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.coste_previsto || 0)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono text-sm font-bold ${(p.presupuesto - (p.coste_previsto || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.presupuesto - (p.coste_previsto || 0))}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono text-[10px] font-bold ${(p.presupuesto - (p.coste_previsto || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {p.presupuesto > 0 
                          ? (((p.presupuesto - (p.coste_previsto || 0)) / p.presupuesto) * 100).toFixed(1) + '%' 
                          : '0%'}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

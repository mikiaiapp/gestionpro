"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FolderKanban, Plus, Search, MoreHorizontal, Loader2, User, Printer, Save, Trash2, FileText, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

      const { data: perf } = await supabase.from("perfil_negocio").select("*").single();

      if (!errP) setProyectos(projs || []);
      if (!errC) setClientes(clis || []);
      setPerfil(perf);
    } catch (e: any) {
      console.error("Error sincronizando proyectos:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadBudget = (p: any) => {
    if (!perfil) {
      alert("Configura tus datos de empresa en Ajustes primero.");
      return;
    }

    const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>PRESUPUESTO - ${p.nombre}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; margin-bottom: 60px; }
          .logo { max-height: 80px; }
          .doc-title { font-size: 32px; font-weight: bold; color: #f59e0b; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #999; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
          .total-box { margin-top: 40px; padding: 20px; background: #fffcf0; border: 2px solid #f59e0b; border-radius: 12px; font-size: 20px; font-weight: bold; text-align: right; }
          .footer { margin-top: 100px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${perfil.logo_url ? `<img src="${perfil.logo_url}" class="logo">` : `<div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${perfil.nombre}</div>`}
          </div>
          <div style="text-align: right;">
            <div class="doc-title">PRESUPUESTO</div>
            <div style="font-weight: bold;">Ref: PRJ-${p.id.slice(0,6).toUpperCase()}</div>
            <div style="color: #666;">Fecha: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="details">
          <div>
            <div class="section-title">De:</div>
            <div style="font-weight: bold;">${perfil.nombre}</div>
            <div>${perfil.nif}</div>
            <div>${perfil.direccion || ''}</div>
          </div>
          <div>
            <div class="section-title">Para:</div>
            <div style="font-weight: bold;">${p.clientes?.nombre || 'Particular'}</div>
          </div>
        </div>

        <div style="margin-bottom: 40px;">
          <div class="section-title">Concepto del Proyecto</div>
          <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">${p.nombre}</div>
          <p>Ejecución integral según especificaciones técnicas y requerimientos acordados. Este presupuesto tiene una validez de 30 días.</p>
        </div>

        <div class="total-box">
          <span style="color: #999; font-size: 14px; text-transform: uppercase; margin-right: 20px;">Total Presupuestado:</span>
          <span style="color: #f59e0b;">${fmt(p.venta_prevista)}</span>
        </div>

        <div class="footer">
          <div>Este documento no es una factura legal. El presupuesto incluye IVA según normativa vigente.</div>
          <div style="margin-top: 10px;">Propuesta técnica generada mediante GestiónPro v1.5</div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setNombre(""); setClienteId(""); setPresupuesto(""); setCostePrevisto("");
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setClienteId(p.cliente_id || "");
    setPresupuesto(p.venta_prevista?.toString() || "");
    setCostePrevisto(p.coste_previsto?.toString() || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) return;
    
    if (!supabase) {
      alert("Error: No hay conexión con la base de datos.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre,
        cliente_id: clienteId || null,
        estado,
        venta_prevista: parseFloat(presupuesto) || 0,
        coste_previsto: parseFloat(costePrevisto) || 0
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase.from("proyectos").update([payload]).eq("id", editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("proyectos").insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert("Error al guardar proyecto: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProyecto = async (id: string, nombreProj: string) => {
    if (!supabase) return;

    // Integridad: ¿Tiene ventas?
    const { count, error: countErr } = await supabase
      .from("ventas")
      .select("*", { count: 'exact', head: true })
      .eq("proyecto_id", id);

    if (countErr) {
      alert("Error al verificar integridad: " + countErr.message);
      return;
    }

    if (count && count > 0) {
      alert(`No se puede eliminar "${nombreProj}" porque ya tiene ${count} facturas de ventas emitidas. Debes eliminarlas primero.`);
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar el proyecto "${nombreProj}"?`)) return;

    const { error } = await supabase.from("proyectos").delete().eq("id", id);
    if (error) alert("Error al eliminar: " + error.message);
    else fetchData();
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
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            Nuevo Proyecto
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border)] animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
                {editingId ? <Save className="text-[var(--accent)]" size={20} /> : <Plus className="text-[var(--accent)]" size={20} />}
                {editingId ? "Editar Proyecto" : "Nuevo Proyecto"}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
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
                    {saving ? <Loader2 className="animate-spin" size={18} /> : (editingId ? <Save size={18} /> : <Plus size={18} />)}
                    {saving ? "Guardando..." : (editingId ? "Actualizar" : "Crear Proyecto")}
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
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right text-red-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{p.nombre}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">ID: {p.id.slice(0,8)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)] font-medium">
                        {p.clientes?.nombre || 'Particular'}
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
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.venta_prevista || 0)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold text-red-700">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.coste_previsto || 0)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => downloadBudget(p)}
                            className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                            title="Imprimir Presupuesto"
                          >
                            <Printer size={16} />
                          </button>
                          <button 
                            onClick={() => openEditModal(p)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Editar Proyecto"
                          >
                            <Save size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProyecto(p.id, p.nombre)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Eliminar Proyecto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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

"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CreditCard, Plus, Search, MoreHorizontal, Loader2, Download, Factory } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PagosPage() {
  const [pagos, setPagos] = useState<any[]>([]);
  const [costes, setCostes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario
  const [costeId, setCosteId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState("Transferencia");

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const fetchData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Fail-safe: si en 3 segundos no ha cargado, desbloqueamos la UI
    const timeout = setTimeout(() => setLoading(false), 3000);
    
    try {
      const { data: pgs } = await supabase
        .from("pagos")
        .select("*, costes(num_interno, serie, proveedores(nombre))")
        .order("fecha", { ascending: false });

      const { data: csts } = await supabase
        .from("costes")
        .select("id, num_interno, serie, total, proveedores(nombre)")
        .order("num_interno");

      setPagos(pgs || []);
      setCostes(csts || []);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setCosteId("");
    setFecha(new Date().toISOString().split('T')[0]);
    setImporte("");
    setFormaPago("Transferencia");
    setIsModalOpen(true);
  };

  const openEditModal = (pg: any) => {
    setEditingId(pg.id);
    setCosteId(pg.coste_id);
    setFecha(pg.fecha);
    setImporte(pg.importe?.toString() || "");
    setFormaPago(pg.forma_pago || "Transferencia");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costeId) return;
    
    if (!supabase) {
      alert("Error: No hay conexión con la base de datos.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        coste_id: costeId,
        fecha,
        importe: parseFloat(importe) || 0,
        forma_pago: formaPago
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase.from("pagos").update([payload]).eq("id", editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("pagos").insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert("Error al guardar pago: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePago = async (id: string) => {
    if (!supabase) return;
    if (!confirm("¿Estás seguro de que deseas eliminar este registro de pago?")) return;

    const { error } = await supabase.from("pagos").delete().eq("id", id);
    if (error) alert("Error al eliminar: " + error.message);
    else fetchData();
  };

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Pagos</h1>
            <p className="text-[var(--muted)] font-medium">Tesorería: Salida de fondos a proveedores y gastos.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            Registrar Pago
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border)] animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
                {editingId ? <Save className="text-orange-600" size={20} /> : <CreditCard className="text-orange-600" size={20} />}
                {editingId ? "Editar Pago" : "Registrar Pago"}
              </h2>
              <form onSubmit={handleSave} className="space-y-4 text-left">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Factura de Coste</label>
                  <select value={costeId} onChange={(e) => setCosteId(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]">
                    <option value="">— Seleccionar factura —</option>
                    {costes.map(c => (
                      <option key={c.id} value={c.id}>{c.serie}-{c.num_interno} ({c.proveedores?.nombre})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Fecha de Pago</label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Importe Pagado (€)</label>
                    <input type="number" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] font-bold" placeholder="0.00" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Forma de Pago</label>
                  <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]">
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Pagaré">Pagaré</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-[var(--background)] rounded-lg transition-colors border border-[var(--border)]">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-bold bg-orange-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin" size={18} /> : (editingId ? <Save size={18} /> : <Plus size={18} />)}
                    {saving ? "Guardando..." : (editingId ? "Actualizar" : "Confirmar Pago")}
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
                placeholder="Buscar pago..." 
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
                <p className="text-sm font-medium">Cargando tesorería...</p>
              </div>
            ) : pagos.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center">
                  <CreditCard size={32} className="opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">No hay pagos registrados</p>
                  <p className="text-sm">Registra las salidas de dinero para facturas de costes.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Coste Origen</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Forma de Pago</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Importe</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right text-red-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pagos.map((pg) => (
                    <tr key={pg.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--muted)]">
                        {new Date(pg.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-0.5">
                           <Download size={14} className="text-orange-600" />
                           <span className="font-bold text-[var(--foreground)]">{pg.costes?.serie}-{pg.costes?.num_interno}</span>
                        </div>
                        <div className="text-[10px] text-[var(--muted)] uppercase flex items-center gap-1 font-bold">
                           <Factory size={10} />
                           {pg.costes?.proveedores?.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-xs font-bold text-gray-500 uppercase px-2 py-1 bg-gray-100 rounded-lg">
                            {pg.forma_pago}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold text-red-600">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(pg.importe || 0)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal(pg)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Editar Pago"
                          >
                            <Save size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeletePago(pg.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Eliminar Pago"
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

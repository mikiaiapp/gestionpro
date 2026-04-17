"use client";

import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { HandCoins, Plus, Search, MoreHorizontal, Loader2, Receipt, Save, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DataTableHeader } from "@/components/DataTableHeader";

export default function CobrosPage() {
  const [cobros, setCobros] = useState<any[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Sorting and Filtering State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'fecha', direction: 'desc' });
  const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>({});

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario
  const [ventaId, setVentaId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState("Transferencia");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const fetchData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const { data: cbs } = await supabase
        .from("cobros")
        .select("*, ventas(num_factura, serie, clientes(nombre))")
        .order("fecha", { ascending: false });

      const { data: vts } = await supabase
        .from("ventas")
        .select("id, num_factura, serie, total, clientes(nombre)")
        .order("num_factura");

      setCobros(cbs || []);
      setVentas(vts || []);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setVentaId("");
    setFecha(new Date().toISOString().split('T')[0]);
    setImporte("");
    setFormaPago("Transferencia");
    setIsModalOpen(true);
  };

  const openEditModal = (cb: any) => {
    setEditingId(cb.id);
    setVentaId(cb.venta_id);
    setFecha(cb.fecha);
    setImporte(cb.importe?.toString() || "");
    setFormaPago(cb.forma_pago || "Transferencia");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventaId) return;
    
    if (!supabase) {
      alert("Error: No hay conexión con la base de datos.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        venta_id: ventaId,
        fecha,
        importe: parseFloat(importe) || 0,
        forma_pago: formaPago
      };

      if (editingId) {
        await supabase.from("cobros").update([payload]).eq("id", editingId);
      } else {
        await supabase.from("cobros").insert([payload]);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert("Error al guardar cobro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCobro = async (id: string) => {
    if (!supabase) return;
    if (!confirm("¿Estás seguro de que deseas eliminar este registro de cobro?")) return;

    await supabase.from("cobros").delete().eq("id", id);
    fetchData();
  };

  const handleSort = (field: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: field, direction });
  };

  const handleFilter = (field: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredCobros = useMemo(() => {
    return cobros.filter(cb => {
      // Global search
      const matchesGlobal = searchTerm === '' || 
        (cb.ventas?.num_factura || '').toString().includes(searchTerm) ||
        (cb.ventas?.clientes?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // Column filters
      const matchesColumns = Object.keys(columnFilters).every(key => {
        if (!columnFilters[key]) return true;
        
        let val = '';
        if (key === 'factura') {
          val = `${cb.ventas?.serie || ''}-${cb.ventas?.num_factura || ''} ${cb.ventas?.clientes?.nombre || ''}`;
        } else {
          val = cb[key] || '';
        }
        
        return val.toString().toLowerCase().includes(columnFilters[key].toLowerCase());
      });

      return matchesGlobal && matchesColumns;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      
      let aVal, bVal;
      if (sortConfig.key === 'factura') {
        aVal = a.ventas?.num_factura || '';
        bVal = b.ventas?.num_factura || '';
      } else {
        aVal = a[sortConfig.key] || '';
        bVal = b[sortConfig.key] || '';
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [cobros, searchTerm, sortConfig, columnFilters]);

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto text-left">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1">Cobros</h1>
            <p className="text-[var(--muted)] font-medium">Tesorería: Entrada de fondos de clientes.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} /> Registrar Cobro
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border)] animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
                {editingId ? <Save className="text-[var(--accent)]" size={20} /> : <HandCoins className="text-[var(--accent)]" size={20} />}
                {editingId ? "Editar Cobro" : "Registrar Cobro"}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Factura Emitida</label>
                  <select value={ventaId} onChange={(e) => setVentaId(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]">
                    <option value="">— Seleccionar factura —</option>
                    {ventas.map(v => (
                      <option key={v.id} value={v.id}>{v.serie}-{v.num_factura} ({v.clientes?.nombre})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Fecha de Cobro</label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Importe Cobrado (€)</label>
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
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-bold bg-[var(--accent)] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin" size={18} /> : (editingId ? <Save size={18} /> : <Plus size={18} />)}
                    {saving ? "Guardando..." : (editingId ? "Actualizar" : "Confirmar Cobro")}
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
                placeholder="Buscar cobro..." 
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
            ) : cobros.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center">
                  <HandCoins size={32} className="opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">No hay cobros registrados</p>
                  <p className="text-sm">Registra las entradas de dinero de tus facturas enviadas.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-[var(--border)]">
                    <DataTableHeader label="Fecha" field="fecha" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.fecha || ''} onFilter={handleFilter} />
                    <DataTableHeader label="Factura Origen" field="factura" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.factura || ''} onFilter={handleFilter} />
                    <DataTableHeader label="Importe" field="importe" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.importe || ''} onFilter={handleFilter} />
                    <th className="px-6 py-4 text-[12px] font-black text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredCobros.map((cb) => (
                    <tr key={cb.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--muted)]">
                        {new Date(cb.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{cb.ventas?.serie}-{cb.ventas?.num_factura}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase font-bold">{cb.ventas?.clientes?.nombre}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold text-green-700">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cb.importe || 0)}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === cb.id ? null : cb.id); }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                        >
                          <MoreHorizontal size={20} />
                        </button>

                        {openMenuId === cb.id && (
                          <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                            <button onClick={() => openEditModal(cb)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-blue-50 transition-colors"><Save size={16} /> Editar</button>
                            <div className="h-px bg-gray-100 my-1 mx-2"></div>
                            <button onClick={() => handleDeleteCobro(cb.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /> Eliminar</button>
                          </div>
                        )}
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

"use client";

import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { HandCoins, Plus, Search, MoreHorizontal, Loader2, Receipt, Save, Trash2, Import, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DataTableHeader } from "@/components/DataTableHeader";
import { Pagination } from "@/components/Pagination";

export default function PagosPage() {
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Sorting and Filtering State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'fecha', direction: 'desc' });
  const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario
  const [entidad, setEntidad] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [importe, setImporte] = useState("");
  const [categoria, setCategoria] = useState("Suministros");
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
      const { data } = await supabase.from("pagos").select("*").order("fecha", { ascending: false });
      setPagos(data || []);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setEntidad("");
    setFecha(new Date().toISOString().split('T')[0]);
    setImporte("");
    setCategoria("Suministros");
    setFormaPago("Transferencia");
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setEntidad(p.entidad);
    setFecha(p.fecha);
    setImporte(p.importe?.toString() || "");
    setCategoria(p.categoria || "Suministros");
    setFormaPago(p.forma_pago || "Transferencia");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidad || !importe) return;
    
    if (!supabase) {
      alert("Error: No hay conexión con la base de datos.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        entidad,
        fecha,
        importe: parseFloat(importe) || 0,
        categoria,
        forma_pago: formaPago
      };

      if (editingId) {
        await supabase.from("pagos").update([payload]).eq("id", editingId);
      } else {
        await supabase.from("pagos").insert([payload]);
      }

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

    await supabase.from("pagos").delete().eq("id", id);
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
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredPagos = useMemo(() => {
    return pagos.filter(p => {
      // Global search
      const matchesGlobal = searchTerm === '' || 
        p.entidad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.categoria && p.categoria.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Column filters
      const matchesColumns = Object.keys(columnFilters).every(key => {
        if (!columnFilters[key]) return true;
        const val = p[key] || '';
        return val.toString().toLowerCase().includes(columnFilters[key].toLowerCase());
      });

      return matchesGlobal && matchesColumns;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [pagos, searchTerm, sortConfig, columnFilters]);

  const paginatedPagos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPagos.slice(start, start + pageSize);
  }, [filteredPagos, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPagos.length / pageSize);

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto text-left">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Pagos</h1>
            <p className="text-[var(--muted)] font-medium">Tesorería: Salida de fondos a proveedores y gastos.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} /> Registrar Pago
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border)] animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
                {editingId ? <Save className="text-orange-600" size={20} /> : <Import className="text-orange-600" size={20} />}
                {editingId ? "Editar Pago" : "Registrar Pago"}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Entidad / Proveedor / Concepto *</label>
                  <input type="text" value={entidad} onChange={(e) => setEntidad(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-orange-500" placeholder="Ej: Endesa, Alquiler Nave..." required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Fecha de Pago</label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Importe Pagado (€) *</label>
                    <input type="number" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-orange-500 font-bold" placeholder="0.00" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Categoría</label>
                    <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-orange-500">
                      <option value="Suministros">Suministros</option>
                      <option value="Alquiler">Alquiler</option>
                      <option value="Nóminas">Nóminas</option>
                      <option value="Impuestos">Impuestos</option>
                      <option value="Proveedores">Proveedores</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Forma de Pago</label>
                    <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-orange-500">
                      <option value="Transferencia">Transferencia</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Domiciliación">Domiciliación</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-[var(--background)] rounded-lg transition-colors border border-[var(--border)]">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-bold bg-orange-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
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
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-orange-500 transition-colors"
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
                  <HandCoins size={32} className="opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">No hay pagos registrados</p>
                  <p className="text-sm">Registra las salidas de dinero a proveedores o gastos internos.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-[var(--border)]">
                    <DataTableHeader label="Fecha" field="fecha" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.fecha || ''} onFilter={handleFilter} />
                    <DataTableHeader label="Concepto" field="entidad" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.entidad || ''} onFilter={handleFilter} />
                    <DataTableHeader 
                      label="Categoría" 
                      field="categoria" 
                      sortConfig={sortConfig} 
                      onSort={handleSort} 
                      filterValue={columnFilters.categoria || ''} 
                      onFilter={handleFilter} 
                      filterOptions={[
                        { label: 'Suministros', value: 'Suministros' },
                        { label: 'Alquiler', value: 'Alquiler' },
                        { label: 'Nóminas', value: 'Nóminas' },
                        { label: 'Impuestos', value: 'Impuestos' },
                        { label: 'Proveedores', value: 'Proveedores' },
                        { label: 'Otros', value: 'Otros' }
                      ]}
                    />
                    <DataTableHeader label="Importe" field="importe" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.importe || ''} onFilter={handleFilter} />
                    <th className="px-6 py-4 text-[12px] font-black text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {paginatedPagos.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--muted)]">
                        {new Date(p.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{p.entidad}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase font-bold">{p.forma_pago}</div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-xs font-bold text-orange-600 uppercase px-2 py-1 bg-orange-50 rounded-lg">
                            {p.categoria}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold text-red-600">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.importe || 0)}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id); }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                        >
                          <MoreHorizontal size={20} />
                        </button>

                        {openMenuId === p.id && (
                          <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                            <button onClick={() => openEditModal(p)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-orange-50 transition-colors"><Save size={16} /> Editar</button>
                            <div className="h-px bg-gray-100 my-1 mx-2"></div>
                            <button onClick={() => handleDeletePago(p.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /> Eliminar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalResults={filteredPagos.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Receipt, Plus, Search, MoreHorizontal, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function VentasPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario
  const [serie, setSerie] = useState("A");
  const [numFactura, setNumFactura] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [clienteId, setClienteId] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [baseImponible, setBaseImponible] = useState("");
  const [tipoIva, setTipoIva] = useState(21);

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    
    const { data: vts } = await supabase
      .from("ventas")
      .select("*, clientes(nombre), proyectos(nombre)")
      .order("fecha", { ascending: false });

    const { data: clis } = await supabase.from("clientes").select("id, nombre").order("nombre");
    const { data: projs } = await supabase.from("proyectos").select("id, nombre").order("nombre");

    setVentas(vts || []);
    setClientes(clis || []);
    setProyectos(projs || []);
    setLoading(false);
  };

  const totalBase = parseFloat(baseImponible) || 0;
  const cuotaIva = serie === "A" ? totalBase * (tipoIva / 100) : 0;
  const totalFactura = totalBase + cuotaIva;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const { error } = await supabase
      .from("ventas")
      .insert([{
        serie,
        num_factura: numFactura,
        fecha,
        cliente_id: clienteId || null,
        proyecto_id: proyectoId || null,
        base_imponible: totalBase,
        iva_pct: serie === "A" ? tipoIva : 0,
        iva_importe: cuotaIva,
        total: totalFactura
      }]);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setIsModalOpen(false);
      fetchData();
    }
  };

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Ventas</h1>
            <p className="text-[var(--muted)] font-medium">Facturación emitida y control de ingresos.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            Nueva Factura
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-[var(--border)] animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold font-head mb-6">🧾 Registrar Venta</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Serie</label>
                    <select value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]">
                      <option value="A">Serie A (Con IVA)</option>
                      <option value="B">Serie B (Sin IVA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Nº Factura</label>
                    <input type="text" value={numFactura} onChange={(e) => setNumFactura(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" placeholder="Ej: 2024-001" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Fecha</label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Base Imponible (€)</label>
                    <input type="number" step="0.01" value={baseImponible} onChange={(e) => setBaseImponible(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] font-bold" placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Cliente</label>
                    <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]">
                      <option value="">— Seleccionar —</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Proyecto</label>
                    <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]">
                      <option value="">— Sin proyecto —</option>
                      {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--border)] mt-4">
                   <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--muted)]">Base Imponible:</span>
                      <span className="font-mono">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBase)}</span>
                   </div>
                   <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--muted)]">IVA ({serie === "A" ? tipoIva : 0}%):</span>
                      <span className="font-mono">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cuotaIva)}</span>
                   </div>
                   <div className="flex justify-between text-lg font-bold border-t border-[var(--border)] pt-2 mt-2">
                      <span className="text-[var(--foreground)]">TOTAL:</span>
                      <span className="text-[var(--accent)]">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalFactura)}</span>
                   </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-[var(--background)] rounded-lg transition-colors border border-[var(--border)]">Cancelar</button>
                  <button type="submit" className="flex-1 py-2.5 text-sm font-bold bg-[var(--accent)] text-white rounded-lg shadow-md hover:shadow-lg transition-all">Guardar Factura</button>
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
                placeholder="Buscar por factura o cliente..." 
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
                <p className="text-sm font-medium">Cargando facturas...</p>
              </div>
            ) : ventas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center">
                  <Receipt size={32} className="opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">No hay facturas emitidas</p>
                  <p className="text-sm">Registra tu primera venta para empezar el seguimiento.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Factura</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Cliente / Proyecto</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Total</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {ventas.map((v) => (
                    <tr key={v.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--muted)]">
                        {new Date(v.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${v.serie === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {v.serie}
                            </span>
                            <span className="font-bold text-[var(--foreground)]">{v.num_factura}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[var(--foreground)] text-sm">{v.clientes?.nombre || 'Particular'}</div>
                        <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                           <TrendingUp size={10} />
                           {v.proyectos?.nombre || 'Sin proyecto'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold text-[var(--green)]">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v.total || 0)}
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

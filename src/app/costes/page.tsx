"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Download, Plus, Search, MoreHorizontal, Loader2, Factory, FolderKanban } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CostesPage() {
  const [costes, setCostes] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario
  const [serie, setSerie] = useState("A");
  const [numInterno, setNumInterno] = useState("");
  const [numFactProv, setNumFactProv] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [proveedorId, setProveedorId] = useState("");
  const [tipoGasto, setTipoGasto] = useState("general");
  const [proyectoId, setProyectoId] = useState("");
  const [baseImponible, setBaseImponible] = useState("");
  const [tipoIva, setTipoIva] = useState(21);

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    
    const { data: csts } = await supabase
      .from("costes")
      .select("*, proveedores(nombre), proyectos(nombre)")
      .order("fecha", { ascending: false });

    const { data: provs } = await supabase.from("proveedores").select("id, nombre").order("nombre");
    const { data: projs } = await supabase.from("proyectos").select("id, nombre").order("nombre");

    setCostes(csts || []);
    setProveedores(provs || []);
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
      .from("costes")
      .insert([{
        serie,
        num_interno: numInterno,
        num_factura_proveedor: numFactProv,
        fecha,
        proveedor_id: proveedorId || null,
        tipo_gasto: tipoGasto,
        proyecto_id: tipoGasto === "proyecto" ? proyectoId : null,
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
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Costes</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de facturas recibidas y gastos de empresa.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            Nuevo Coste
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-[var(--border)] animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold font-head mb-6">📥 Registrar Coste</h2>
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
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Nº Interno</label>
                    <input type="text" value={numInterno} onChange={(e) => setNumInterno(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" placeholder="Ej: 2024-C001" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Nº Factura Prov.</label>
                    <input type="text" value={numFactProv} onChange={(e) => setNumFactProv(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" placeholder="Nº de su factura" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Fecha</label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Proveedor</label>
                  <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]">
                    <option value="">— Seleccionar —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Tipo de Gasto</label>
                    <select value={tipoGasto} onChange={(e) => setTipoGasto(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] font-bold">
                      <option value="general">Gasto General</option>
                      <option value="proyecto">Coste de Proyecto</option>
                    </select>
                  </div>
                  {tipoGasto === "proyecto" && (
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Proyecto</label>
                      <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]">
                        <option value="">— Seleccionar —</option>
                        {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Base Imponible (€)</label>
                  <input type="number" step="0.01" value={baseImponible} onChange={(e) => setBaseImponible(e.target.value)} className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-lg font-bold focus:outline-none focus:border-[var(--accent)] text-right" placeholder="0.00" />
                </div>

                <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--border)] mt-4">
                   <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--muted)]">Cuota IVA ({serie === "A" ? tipoIva : 0}%):</span>
                      <span className="font-mono">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cuotaIva)}</span>
                   </div>
                   <div className="flex justify-between text-lg font-bold border-t border-[var(--border)] pt-2 mt-2">
                      <span className="text-[var(--foreground)]">TOTAL COSTE:</span>
                      <span className="text-red-600">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalFactura)}</span>
                   </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-[var(--background)] rounded-lg transition-colors border border-[var(--border)]">Cancelar</button>
                  <button type="submit" className="flex-1 py-2.5 text-sm font-bold bg-[var(--accent)] text-white rounded-lg shadow-md hover:shadow-lg transition-all">Guardar Coste</button>
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
                placeholder="Buscar por factura o proveedor..." 
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
                <p className="text-sm font-medium">Cargando costes...</p>
              </div>
            ) : costes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center">
                  <Download size={32} className="opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">No hay facturas recibidas</p>
                  <p className="text-sm">Registra tu primer coste para controlar tus gastos.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Nº Interno / Proveedor</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Tipo / Proyecto</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Total</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {costes.map((c) => (
                    <tr key={c.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-[var(--muted)]">
                        {new Date(c.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-0.5">
                           <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.serie === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                             {c.serie}
                           </span>
                           <span className="font-bold text-[var(--foreground)]">{c.num_interno}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                           <Factory size={10} />
                           {c.proveedores?.nombre || 'Proveedor'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className={`text-xs font-bold mb-0.5 ${c.tipo_gasto === 'proyecto' ? 'text-[var(--accent)]' : 'text-gray-500'}`}>
                            {c.tipo_gasto === 'proyecto' ? 'Coste Proyecto' : 'Gasto General'}
                         </div>
                         {c.tipo_gasto === 'proyecto' && (
                           <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                              <FolderKanban size={10} />
                              {c.proyectos?.nombre || '—'}
                           </div>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold text-red-600">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(c.total || 0)}
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

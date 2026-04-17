"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Users, Plus, Search, MoreHorizontal, Loader2, Save, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFullLocationByCP } from "@/lib/geoData";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Estados Formulario
  const [nombre, setNombre] = useState("");
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cp, setCp] = useState("");
  const [poblacion, setPoblacion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClientes();
  }, []);

  // Lógica de Geolocalización Inteligente Mejorada
  useEffect(() => {
    if (cp.length === 5) {
      getFullLocationByCP(cp).then(resp => {
        if (resp) {
          setProvincia(resp.provincia);
          if (resp.poblacion) {
            setPoblacion(resp.poblacion);
          }
        }
      });
    }
  }, [cp]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("clientes").select("*").order("nombre");
      setClientes(data || []);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setNombre(""); setNif(""); setEmail(""); setDireccion(""); setCp(""); setPoblacion(""); setProvincia("");
    setIsModalOpen(true);
  };

  const openEditModal = (cliente: any) => {
    setEditingId(cliente.id);
    setNombre(cliente.nombre);
    setNif(cliente.nif || "");
    setEmail(cliente.email || "");
    setDireccion(cliente.direccion || "");
    setCp(cliente.codigo_postal || "");
    setPoblacion(cliente.poblacion || "");
    setProvincia(cliente.provincia || "");
    setIsModalOpen(true);
  };

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) return;
    setSaving(true);
    try {
      const payload = { 
        nombre, 
        nif, 
        email, 
        direccion, 
        codigo_postal: cp, 
        poblacion, 
        provincia 
      };
      
      if (editingId) {
        await supabase.from("clientes").update([payload]).eq("id", editingId);
      } else {
        await supabase.from("clientes").insert([payload]);
      }

      setIsModalOpen(false);
      fetchClientes();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCliente = async (id: string, nombreCli: string) => {
    if (!confirm("¿Eliminar cliente " + nombreCli + "?")) return;
    await supabase.from("clientes").delete().eq("id", id);
    fetchClientes();
  };

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10 bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-white shadow-sm">
          <div>
            <h1 className="text-4xl font-black font-head tracking-tight text-[var(--foreground)]">Clientes</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de cartera de clientes.</p>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]">
            <Plus size={18} /> Nuevo Cliente
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200 border border-[var(--border)] overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
                <Users className="text-blue-600" /> {editingId ? "Editar Cliente" : "Añadir Cliente"}
              </h2>
              <form onSubmit={handleSaveCliente} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Razón Social *</label>
                  <input type="text" placeholder="Nombre / Empresa" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-blue-500/10 outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">NIF/DNI</label>
                    <input type="text" placeholder="00000000X" value={nif} onChange={(e) => setNif(e.target.value.toUpperCase())} className="w-full p-3 rounded-xl border bg-gray-50 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email</label>
                    <input type="email" placeholder="email@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 rounded-xl border bg-gray-50 outline-none" />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-dashed">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12}/> Ubicación</h3>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Dirección Postal</label>
                    <input type="text" placeholder="Calle, número, piso..." value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full p-3 rounded-xl border bg-gray-50 outline-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">CP</label>
                      <input type="text" placeholder="28001" value={cp} maxLength={5} onChange={(e) => setCp(e.target.value)} className="w-full p-3 rounded-xl border bg-gray-50 outline-none font-mono" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Población</label>
                      <input type="text" placeholder="Municipio" value={poblacion} onChange={(e) => setPoblacion(e.target.value)} className="w-full p-3 rounded-xl border bg-gray-50 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Provincia</label>
                    <input type="text" placeholder="Provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} className="w-full p-3 rounded-xl border bg-gray-50 outline-none" />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 border rounded-xl hover:bg-gray-50 transition-all">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50">
                    {saving ? "Guardando..." : "Guardar Cliente"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden rounded-3xl">
          <div className="p-6 border-b border-[var(--border)] bg-gray-50/50">
             <div className="relative w-80">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all" />
             </div>
          </div>
          <div className="overflow-x-auto min-h-[400px]">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-gray-400 font-medium">Cargando cartera...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b">
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">NIF</th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">Ubicación</th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientes.filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/10 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="font-bold text-gray-800">{c.nombre}</div>
                        <div className="text-xs text-gray-400">{c.email || '—'}</div>
                      </td>
                      <td className="px-8 py-5 text-sm text-gray-500 font-mono">{c.nif || '—'}</td>
                      <td className="px-8 py-5">
                        <div className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                          <MapPin size={10} className="text-blue-400"/>
                          {c.poblacion}, {c.provincia}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }}
                          className="p-2.5 bg-gray-50 hover:bg-white border rounded-xl text-gray-400 hover:text-blue-600 transition-all shadow-sm"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                        {openMenuId === c.id && (
                          <div className="absolute right-8 top-12 w-48 bg-white rounded-2xl shadow-2xl border z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 ring-4 ring-black/5">
                            <button onClick={() => openEditModal(c)} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-blue-50 transition-colors"><Save size={16} /> Editar</button>
                            <div className="h-px bg-gray-100 my-1 mx-2"></div>
                            <button onClick={() => handleDeleteCliente(c.id, c.nombre)} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /> Eliminar</button>
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

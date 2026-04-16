"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Users, Plus, Search, MoreHorizontal, Loader2, ChevronDown, Save, Trash2, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PROVINCIAS_ESPANOLAS, getProvinciaPorCP } from "@/lib/geoData";

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
  const [todosLosMunicipios, setTodosLosMunicipios] = useState<any[]>([]);
  const [municipiosSugeridos, setMunicipiosSugeridos] = useState<string[]>([]);
  const [showProvList, setShowProvList] = useState(false);
  const [showMunList, setShowMunList] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [supabase]);

  useEffect(() => {
    const initGeo = async () => {
      setLoadingGeo(true);
      try {
        const response = await fetch("https://raw.githubusercontent.com/frontid/ComunidadesProvinciasPoblaciones/master/poblaciones.json");
        if (response.ok) {
          const data = await response.json();
          setTodosLosMunicipios(data);
        }
      } catch (e) {
        console.error("Geo error");
      } finally {
        setLoadingGeo(false);
      }
    };
    initGeo();
  }, []);

  useEffect(() => {
    if (cp.length === 5) {
      const resp = getProvinciaPorCP(cp);
      if (resp) {
        setProvincia(resp.nombre);
        const filtrados = todosLosMunicipios
          .filter(m => parseInt(m.parent_code, 10) === parseInt(resp.id, 10))
          .map(m => m.label);
        
        setMunicipiosSugeridos(filtrados);
        if (filtrados.length > 0 && !poblacion) {
          setPoblacion(filtrados[0]);
        }
      }
    }
  }, [cp, todosLosMunicipios]);

  useEffect(() => {
    if (!provincia || todosLosMunicipios.length === 0) return;
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const provNorm = normalize(provincia);
    const provData = PROVINCIAS_ESPANOLAS.find(p => normalize(p.nombre) === provNorm);
    if (provData) {
      const targetId = parseInt(provData.id, 10);
      const filtrados = todosLosMunicipios
        .filter(m => parseInt(m.parent_code, 10) === targetId)
        .map(m => m.label);
      setMunicipiosSugeridos(filtrados);
    }
  }, [provincia, todosLosMunicipios]);

  const fetchClientes = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase.from("clientes").select("*").order("nombre");
      setClientes(data || []);
    } finally {
      setLoading(false);
    }
  };

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    
    if (!supabase) {
      alert("Error: No hay conexión con la base de datos.");
      return;
    }

    setSaving(true);
    try {
      // Control de duplicidades por NIF
      if (nif) {
        let query = supabase.from("clientes").select("id, nombre").eq("nif", nif);
        if (editingId) query = query.neq("id", editingId);
        
        const { data: existing } = await query.maybeSingle();
        if (existing) {
          alert("Error: Ya existe el NIF " + nif + " (" + existing.nombre + ")");
          setSaving(false);
          return;
        }
      }

      const payload = { nombre, nif, email, direccion, codigo_postal: cp, poblacion, provincia };
      
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
    if (!supabase) return;

    const { count } = await supabase
      .from("proyectos")
      .select("*", { count: 'exact', head: true })
      .eq("cliente_id", id);

    if (count && count > 0) {
      alert("No se puede eliminar a " + nombreCli + " porque tiene proyectos asociados.");
      return;
    }

    if (!confirm("¿Eliminar cliente " + nombreCli + "?")) return;

    await supabase.from("clientes").delete().eq("id", id);
    fetchClientes();
  };

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto text-left">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1">Clientes</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de cartera de clientes.</p>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]">
            <Plus size={18} /> Nuevo Cliente
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200 border border-[var(--border)]">
              <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
                {editingId ? "Editar Cliente" : "Añadir Cliente"}
              </h2>
              <form onSubmit={handleSaveCliente} className="space-y-4">
                <input type="text" placeholder="Razón Social / Nombre *" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="NIF/DNI" value={nif} onChange={(e) => setNif(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none" />
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none" />
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="C.P." value={cp} maxLength={5} onChange={(e) => setCp(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] font-mono" />
                    <div className="relative">
                       <input type="text" placeholder="Provincia" value={provincia} onFocus={() => setShowProvList(true)} onBlur={() => setTimeout(() => setShowProvList(false), 200)} onChange={(e) => setProvincia(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)]" />
                       {showProvList && (
                         <div className="absolute z-[110] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border rounded-xl shadow-2xl py-2">
                           {PROVINCIAS_ESPANOLAS.filter(p => !provincia || p.nombre.toLowerCase().includes(provincia.toLowerCase())).map(p => (
                             <button key={p.id} type="button" onClick={() => { setProvincia(p.nombre); setShowProvList(false); }} className="w-full text-left px-4 py-2 hover:bg-[var(--accent)]/10 text-sm">{p.nombre}</button>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="relative">
                    <input type="text" placeholder="Municipio" value={poblacion} onFocus={() => setShowMunList(true)} onBlur={() => setTimeout(() => setShowMunList(false), 200)} onChange={(e) => setPoblacion(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none" />
                    {showMunList && municipiosSugeridos.length > 0 && (
                      <div className="absolute z-[110] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border rounded-xl shadow-2xl py-2">
                        {municipiosSugeridos.filter(m => !poblacion || m.toLowerCase().includes(poblacion.toLowerCase())).map((m, i) => (
                          <button key={i} type="button" onClick={() => { setPoblacion(m); setShowMunList(false); }} className="w-full text-left px-4 py-2 hover:bg-[var(--accent)]/10 text-sm">{m}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-[var(--muted)] border rounded-xl">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-bold bg-[var(--accent)] text-white rounded-xl shadow-md disabled:opacity-50">
                    {saving ? "Guardando..." : (editingId ? "Actualizar" : "Guardar")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] bg-[#fafafa]">
             <div className="relative w-72">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
               <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none" />
             </div>
          </div>
          <div className="overflow-x-auto min-h-[200px]">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">NIF</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {clientes.filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                    <tr key={c.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{c.nombre}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase">{c.poblacion} {c.provincia}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">{c.nif || '—'}</td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                        >
                          <MoreHorizontal size={20} />
                        </button>

                        {openMenuId === c.id && (
                          <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                            <button onClick={() => openEditModal(c)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-blue-50 transition-colors"><Save size={16} /> Editar</button>
                            <div className="h-px bg-gray-100 my-1 mx-2"></div>
                            <button onClick={() => handleDeleteCliente(c.id, c.nombre)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /> Eliminar</button>
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

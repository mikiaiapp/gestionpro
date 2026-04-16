"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Factory, Plus, Search, MoreHorizontal, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PROVINCIAS_ESPANOLAS, getProvinciaPorCP } from "@/lib/geoData";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario
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
    fetchProveedores();
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
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

  const fetchProveedores = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase.from("proveedores").select("*").order("nombre");
      setProveedores(data || []);
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

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setNif(p.nif || "");
    setEmail(p.email || "");
    setDireccion(p.direccion || "");
    setCp(p.codigo_postal || "");
    setPoblacion(p.poblacion || "");
    setProvincia(p.provincia || "");
    setIsModalOpen(true);
  };

  const handleSaveProveedor = async (e: React.FormEvent) => {
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
        let query = supabase.from("proveedores").select("id, nombre").eq("nif", nif);
        if (editingId) query = query.neq("id", editingId);
        
        const { data: existing } = await query.maybeSingle();
        if (existing) {
          alert(`Error: Ya existe un proveedor con el NIF ${nif} (${existing.nombre}).`);
          setSaving(false);
          return;
        }
      }

      const payload = { nombre, nif, email, direccion, codigo_postal: cp, poblacion, provincia };
      
      let error;
      if (editingId) {
        const { error: updateError } = await supabase.from("proveedores").update([payload]).eq("id", editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("proveedores").insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      setIsModalOpen(false);
      fetchProveedores();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProveedor = async (id: string, nombreProv: string) => {
    if (!supabase) return;

    // Integridad: ¿Tiene costes?
    const { count, error: countErr } = await supabase
      .from("costes")
      .select("*", { count: 'exact', head: true })
      .eq("proveedor_id", id);

    if (countErr) {
      alert("Error al verificar integridad: " + countErr.message);
      return;
    }

    if (count && count > 0) {
      alert(`No se puede eliminar a "${nombreProv}" porque tiene ${count} facturas de costes registradas. Elimina primero los costes.`);
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar al proveedor "${nombreProv}"?`)) return;

    const { error } = await supabase.from("proveedores").delete().eq("id", id);
    if (error) alert("Error al eliminar: " + error.message);
    else fetchProveedores();
  };

  const filteredProveedores = proveedores.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Proveedores</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de suministros.</p>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]">
            <Plus size={18} />
            Nuevo Proveedor
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200 border border-[var(--border)]">
              <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
                {editingId ? <Save className="text-[var(--accent)]" size={20} /> : <Plus className="text-[var(--accent)]" size={20} />}
                {editingId ? "Editar Proveedor" : "Añadir Proveedor"}
              </h2>
              <form onSubmit={handleSaveProveedor} className="space-y-4">
                <input type="text" placeholder="Nombre Comercial / Razón Social *" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:border-[var(--accent)]" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="NIF/DNI" value={nif} onChange={(e) => setNif(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:border-[var(--accent)]" />
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:border-[var(--accent)]" />
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:border-[var(--accent)]" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="C.P." value={cp} maxLength={5} onChange={(e) => setCp(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:border-[var(--accent)] font-mono" />
                    <div className="relative">
                       <input type="text" placeholder="Provincia" value={provincia} onFocus={() => setShowProvList(true)} onBlur={() => setTimeout(() => setShowProvList(false), 200)} onChange={(e) => setProvincia(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:border-[var(--accent)]" />
                       {showProvList && (
                         <div className="absolute z-[110] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-[var(--border)] rounded-xl shadow-2xl py-2">
                           {PROVINCIAS_ESPANOLAS.filter(p => !provincia || p.nombre.toLowerCase().includes(provincia.toLowerCase())).map(p => (
                             <button key={p.id} type="button" onClick={() => { setProvincia(p.nombre); setShowProvList(false); }} className="w-full text-left px-4 py-2 hover:bg-[var(--accent)]/10 text-sm">{p.nombre}</button>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="relative">
                    <input type="text" placeholder="Municipio" value={poblacion} onFocus={() => setShowMunList(true)} onBlur={() => setTimeout(() => setShowMunList(false), 200)} onChange={(e) => setPoblacion(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:border-[var(--accent)]" />
                    {showMunList && municipiosSugeridos.length > 0 && (
                      <div className="absolute z-[110] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-[var(--border)] rounded-xl shadow-2xl py-2">
                        {municipiosSugeridos.filter(m => !poblacion || m.toLowerCase().includes(poblacion.toLowerCase())).map((m, i) => (
                          <button key={i} type="button" onClick={() => { setPoblacion(m); setShowMunList(false); }} className="w-full text-left px-4 py-2 hover:bg-[var(--accent)]/10 text-sm">{m}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-gray-100 rounded-xl transition-all border border-[var(--border)]">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-bold bg-[var(--accent)] text-white rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin" size={18} /> : (editingId ? <Save size={18} /> : <Plus size={18} />)}
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
               <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]" />
             </div>
          </div>
          <div className="overflow-x-auto min-h-[200px]">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-sm font-medium">Sincronizando proveedores...</p>
              </div>
            ) : filteredProveedores.length === 0 ? (
              <div className="p-20 text-center text-[var(--muted)]">
                <p className="font-bold text-[var(--foreground)] mb-1">No hay proveedores registrados</p>
                <p className="text-sm">Empieza añadiendo tu primer proveedor.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Proveedor</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">NIF</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredProveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{p.nombre}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{p.poblacion} {p.provincia}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">{p.nif || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal(p)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Editar Proveedor"
                          >
                            <Save size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProveedor(p.id, p.nombre)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Eliminar Proveedor"
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

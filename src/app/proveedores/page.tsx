"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Factory, Plus, Search, MoreHorizontal, Loader2 } from "lucide-react";
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

  const handleAddProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) return;
    
    if (!supabase) {
      alert("Error: No hay conexión con la base de datos. Completa las variables de entorno en Vercel.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("proveedores").insert([{ nombre, nif, email, direccion, codigo_postal: cp, poblacion, provincia }]);
      if (error) alert("Error Supabase: " + error.message);
      else {
        setIsModalOpen(false);
        // Limpiar formulario
        setNombre(""); setNif(""); setEmail(""); setDireccion(""); setCp(""); setPoblacion(""); setProvincia("");
        fetchProveedores();
      }
    } catch (err: any) {
      alert("Error inesperado: " + err.message);
    } finally {
      setSaving(false);
    }
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
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]">
            <Plus size={18} />
            Nuevo Proveedor
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold mb-6">➕ Añadir Proveedor</h2>
              <form onSubmit={handleAddProveedor} className="space-y-4">
                <input type="text" placeholder="Nombre Comercial" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)]" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="NIF" value={nif} onChange={(e) => setNif(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)]" />
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)]" />
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)]" />
                  <div className="grid grid-cols-3 gap-3">
                    <input type="text" placeholder="C.P." value={cp} maxLength={5} onChange={(e) => setCp(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)] font-mono" />
                    <div className="relative col-span-2">
                       <input type="text" placeholder="Provincia" value={provincia} onFocus={() => setShowProvList(true)} onBlur={() => setTimeout(() => setShowProvList(false), 200)} onChange={(e) => setProvincia(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)]" />
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
                    <input type="text" placeholder="Municipio" value={poblacion} onFocus={() => setShowMunList(true)} onBlur={() => setTimeout(() => setShowMunList(false), 200)} onChange={(e) => setPoblacion(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)]" />
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
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    {saving ? "Guardando..." : "Guardar"}
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
               <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm" />
             </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
                <Loader2 className="animate-spin" size={32} />
                <p>Cargando proveedores...</p>
              </div>
            ) : filteredProveedores.length === 0 ? (
              <div className="p-20 text-center text-[var(--muted)]">No hay proveedores registrados</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase">Proveedor</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase">NIF</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredProveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4 font-bold">{p.nombre}</td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">{p.nif || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-gray-100 rounded-lg text-[var(--muted)]">
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

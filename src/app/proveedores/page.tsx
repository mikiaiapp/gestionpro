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

  // Estados para el formulario
  const [nombre, setNombre] = useState("");
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cp, setCp] = useState("");
  const [poblacion, setPoblacion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [todosLosMunicipios, setTodosLosMunicipios] = useState<any[]>([]);
  const [municipiosSugeridos, setMunicipiosSugeridos] = useState<string[]>([]);

  // Controladores de lista custom
  const [showProvList, setShowProvList] = useState(false);
  const [showMunList, setShowMunList] = useState(false);

  useEffect(() => {
    fetchProveedores();
  }, [supabase]);

  // Cargar todos los municipios al inicio para rapidez
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
        console.error("Error cargando base geo");
      } finally {
        setLoadingGeo(false);
      }
    };
    initGeo();
  }, []);

  // Inteligencia de Código Postal
  useEffect(() => {
    if (cp.length === 5) {
      const resp = getProvinciaPorCP(cp);
      if (resp) {
        setProvincia(resp.nombre);
        // Filtrar municipios de esa provincia inmediatamente (usando parent_code y label)
        const filtrados = todosLosMunicipios
          .filter(m => parseInt(m.parent_code, 10) === parseInt(resp.id, 10))
          .map(m => m.label);
        setMunicipiosSugeridos(filtrados);
      }
      buscarMunicipioPorCP(cp);
    }
  }, [cp, todosLosMunicipios]);

  // Cargar Municipios al cambiar Provincia manualmente
  useEffect(() => {
    if (!provincia || todosLosMunicipios.length === 0) {
      setMunicipiosSugeridos([]);
      return;
    }

    // Normalizar nombres para comparación robusta (quitar tildes, etc)
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const provNorm = normalize(provincia);

    // Buscar el ID de la provincia primero
    const provData = PROVINCIAS_ESPANOLAS.find(p => normalize(p.nombre) === provNorm);
    
    let filtrados: string[] = [];
    if (provData) {
      // Comparación flexible de ID (como número para evitar líos de ceros a la izquierda)
      const targetId = parseInt(provData.id, 10);
      filtrados = todosLosMunicipios
        .filter(m => parseInt(m.parent_code, 10) === targetId)
        .map(m => m.label);
    } 
    
    // Si no hay nada por ID, intentamos por nombre de provincia (fallback)
    if (filtrados.length === 0) {
      filtrados = todosLosMunicipios
        .filter(m => m.provincia && normalize(m.provincia) === provNorm)
        .map(m => m.label);
    }

    setMunicipiosSugeridos(filtrados);
  }, [provincia, todosLosMunicipios]);

  const buscarMunicipioPorCP = async (codigo: string) => {
    try {
      const response = await fetch(`https://api.zippopotam.us/es/${codigo}`);
      if (response.ok) {
        const data = await response.json();
        const place = data.places[0];
        setPoblacion(place['place name']);
      }
    } catch (error) {
       console.error("Error buscando municipio por CP");
    }
  };

  const fetchProveedores = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("proveedores")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error cargando proveedores:", error);
    } else {
      setProveedores(data || []);
    }
    setLoading(false);
  };

  const handleAddProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !supabase) return;

    const { error } = await supabase
      .from("proveedores")
      .insert([{ 
        nombre, 
        nif, 
        email, 
        direccion, 
        codigo_postal: cp, 
        poblacion, 
        provincia 
      }]);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setNombre("");
      setNif("");
      setEmail("");
      setDireccion("");
      setCp("");
      setPoblacion("");
      setProvincia("");
      setIsModalOpen(false);
      fetchProveedores();
    }
  };

  const filteredProveedores = proveedores.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.nif?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Proveedores</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de suministros y acreedores.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            Nuevo Proveedor
          </button>
        </header>

        {/* Modal de Nuevo Proveedor */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border)] animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold font-head mb-6">🏪 Añadir Proveedor</h2>
              <form onSubmit={handleAddProveedor} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Nombre Comercial *</label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                    placeholder="Ej: Suministros Industriales SL"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">NIF / CIF</label>
                    <input 
                      type="text" 
                      value={nif} 
                      onChange={(e) => setNif(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                      placeholder="B98765432"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Email Contacto</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                      placeholder="compras@..."
                    />
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-4 mt-2">
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1 text-[var(--accent)]">📍 Ubicación Inteligente</label>
                  <div className="space-y-3">
                    <div>
                      <input 
                        type="text" 
                        autoComplete="off"
                        value={direccion} 
                        onChange={(e) => setDireccion(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                        placeholder="Dirección fiscal"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                       <input 
                        type="text" 
                        autoComplete="off"
                        value={cp} 
                        maxLength={5}
                        onChange={(e) => setCp(e.target.value)}
                        className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] font-mono"
                        placeholder="C.P."
                      />
                      
                      <div className="relative">
                        <input 
                          type="text" 
                          autoComplete="off"
                          value={provincia} 
                          onFocus={() => setShowProvList(true)}
                          onBlur={() => setTimeout(() => setShowProvList(false), 200)}
                          onChange={(e) => {
                            setProvincia(e.target.value);
                            setShowProvList(true);
                          }}
                          className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                          placeholder="Provincia..."
                        />
                        {showProvList && (
                          <div className="absolute z-[110] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-[var(--border)] rounded-xl shadow-2xl py-2">
                             {PROVINCIAS_ESPANOLAS
                               .filter(p => !provincia || p.nombre.toLowerCase().includes(provincia.toLowerCase()))
                               .map(p => (
                                 <button
                                   key={p.id}
                                   type="button"
                                   onClick={() => {
                                     setProvincia(p.nombre);
                                     setShowProvList(false);
                                   }}
                                   className="w-full text-left px-4 py-2 hover:bg-[var(--accent)]/10 text-sm"
                                 >
                                   {p.nombre}
                                 </button>
                               ))
                             }
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <input 
                          type="text" 
                          autoComplete="off"
                          value={poblacion} 
                          onFocus={() => setShowMunList(true)}
                          onBlur={() => setTimeout(() => setShowMunList(false), 200)}
                          onChange={(e) => {
                            setPoblacion(e.target.value);
                            setShowMunList(true);
                          }}
                          className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                          placeholder={todosLosMunicipios.length === 0 ? "Cargando..." : "Municipio..."}
                        />
                         {showMunList && municipiosSugeridos.length > 0 && (
                          <div className="absolute z-[110] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-[var(--border)] rounded-xl shadow-2xl py-2">
                             {municipiosSugeridos
                               .filter(m => !poblacion || m.toLowerCase().includes(poblacion.toLowerCase()))
                               .map((m, idx) => (
                                 <button
                                   key={idx}
                                   type="button"
                                   onClick={() => {
                                     setPoblacion(m);
                                     setShowMunList(false);
                                   }}
                                   className="w-full text-left px-4 py-2 hover:bg-[var(--accent)]/10 text-sm"
                                 >
                                   {m}
                                 </button>
                               ))
                             }
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-[var(--muted)] hover:bg-gray-100 rounded-xl transition-all border border-[var(--border)]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 text-sm font-bold bg-[var(--accent)] text-white rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-1px] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Guardar Proveedor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Listado */}
        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[#fafafa]">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
              <input 
                type="text" 
                placeholder="Buscar proveedor..." 
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
                <p className="text-sm font-medium">Cargando proveedores...</p>
              </div>
            ) : filteredProveedores.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center">
                  <Factory size={32} className="opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">No hay proveedores registrados</p>
                  <p className="text-sm">Registra tu primer proveedor para gestionar sus costes.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Proveedor</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">NIF/CIF</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Ubicación</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredProveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{p.nombre}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{p.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)] font-medium">{p.nif || '—'}</td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">
                        {p.poblacion ? `${p.poblacion} (${p.provincia})` : '—'}
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

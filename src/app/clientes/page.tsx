"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Users, Plus, Search, MoreHorizontal, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PROVINCIAS_ESPANOLAS, getProvinciaPorCP } from "@/lib/geoData";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
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

  useEffect(() => {
    fetchClientes();
  }, [supabase]);

  // Inteligencia de Código Postal
  useEffect(() => {
    if (cp.length === 5) {
      const provinciaDetectada = getProvinciaPorCP(cp);
      if (provinciaDetectada) setProvincia(provinciaDetectada);
      buscarMunicipio(cp);
    }
  }, [cp]);

  const buscarMunicipio = async (codigo: string) => {
    try {
      const response = await fetch(`https://api.zippopotam.us/es/${codigo}`);
      if (response.ok) {
        const data = await response.json();
        const place = data.places[0];
        setPoblacion(place['place name']);
      }
    } catch (error) {
       console.error("Error buscando municipio");
    }
  };

  const fetchClientes = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error cargando clientes:", error);
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  const handleAddCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !supabase) return;

    const { error } = await supabase
      .from("clientes")
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
      fetchClientes();
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.nif?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Clientes</h1>
            <p className="text-[var(--muted)] font-medium">Base de datos centralizada en la nube.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} />
            Nuevo Cliente
          </button>
        </header>

        {/* Modal de Nuevo Cliente */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border)] animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold font-head mb-6">➕ Añadir Cliente</h2>
              <form onSubmit={handleAddCliente} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Razón Social *</label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                    placeholder="Ej: Aceros S.A."
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
                      placeholder="A12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1">Email</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                      placeholder="facturas@..."
                    />
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-4 mt-2">
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase mb-1 text-[var(--accent)]">📍 Ubicación Inteligente</label>
                  <div className="space-y-3">
                    <div>
                      <input 
                        type="text" 
                        value={direccion} 
                        onChange={(e) => setDireccion(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                        placeholder="Dirección completa"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                       <input 
                        type="text" 
                        value={cp} 
                        maxLength={5}
                        onChange={(e) => setCp(e.target.value)}
                        className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)] font-mono"
                        placeholder="C.P."
                      />
                      <input 
                        type="text" 
                        value={provincia} 
                        onChange={(e) => setProvincia(e.target.value)}
                        list="provincias-list"
                        className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                        placeholder="Provincia"
                      />
                      <datalist id="provincias-list">
                        {PROVINCIAS_ESPANOLAS.map(p => <option key={p} value={p} />)}
                      </datalist>
                      
                      <input 
                        type="text" 
                        value={poblacion} 
                        onChange={(e) => setPoblacion(e.target.value)}
                        className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                        placeholder="Municipio"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-[var(--background)] rounded-lg transition-colors border border-[var(--border)]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 text-sm font-bold bg-[var(--accent)] text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    Guardar
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
                placeholder="Buscar cliente..." 
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
                <p className="text-sm font-medium">Conectando con la base de datos...</p>
              </div>
            ) : filteredClientes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-[var(--muted)] gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--background)] flex items-center justify-center">
                  <Users size={32} className="opacity-20" />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">No hay clientes todavía</p>
                  <p className="text-sm">Añade tu primer cliente con el botón de arriba.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">NIF/CIF</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{cliente.nombre}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)] font-medium">{cliente.nif || '—'}</td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">{cliente.email || '—'}</td>
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

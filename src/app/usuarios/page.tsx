"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { UserPlus, Search, MoreHorizontal, Loader2, ShieldCheck, Mail, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsuarios();
  }, [supabase]);

  const fetchUsuarios = async () => {
    if (!supabase) return;
    setLoading(true);
    
    // NOTA: En Supabase, para listar usuarios de AUTH hace falta usar el Admin API (Edge Functions)
    // O tener una tabla 'perfiles' que se sincronice. 
    // Por ahora, simularemos la vista o consultaremos una tabla de perfiles si existe.
    const { data, error } = await supabase.from("perfiles").select("*").order("nombre");
    
    if (!error && data) {
      setUsuarios(data);
    } else {
      // Mock data para que la UI no esté vacía mientras se configura la tabla
      setUsuarios([
        { id: "1", nombre: "Administrador Principal", email: "admin@gestionpro.com", rol: "SuperAdmin", created_at: new Date().toISOString() }
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Usuarios</h1>
            <p className="text-[var(--muted)] font-medium">Gestiona los accesos y roles de tu equipo de trabajo.</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]">
            <UserPlus size={18} />
            Invitar Usuario
          </button>
        </header>

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[#fafafa]">
             <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o email..." 
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
                <p className="text-sm font-medium">Cargando equipo...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Miembro</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Rol</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acceso</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                             {u.nombre.charAt(0)}
                           </div>
                           <div>
                             <div className="font-bold text-[var(--foreground)]">{u.nombre}</div>
                             <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                               <Mail size={10} />
                               {u.email}
                             </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.rol === 'SuperAdmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                           {u.rol}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex flex-col items-end">
                            <div className="text-xs font-bold text-green-600 flex items-center gap-1">
                               <ShieldCheck size={12} /> ACTIVO
                            </div>
                            <div className="text-[10px] text-[var(--muted)] flex items-center gap-1 mt-0.5">
                               <Calendar size={10} /> Desde {new Date(u.created_at).toLocaleDateString()}
                            </div>
                         </div>
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

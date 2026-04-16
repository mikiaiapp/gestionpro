import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Trash2, 
  Save, 
  Loader2,
  MapPin,
  TrendingDown
} from 'lucide-react';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [nombre, setNombre] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cp, setCp] = useState('');
  const [poblacion, setPoblacion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('proveedores')
      .select('*')
      .order('nombre');
    setProveedores(data || []);
    setLoading(false);
  };

  const handleSaveProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      nombre,
      nif,
      email,
      direccion,
      cp,
      poblacion,
      provincia,
      user_id: user?.id
    };

    if (editingId) {
      await supabase.from('proveedores').update(payload).eq('id', editingId);
    } else {
      await supabase.from('proveedores').insert(payload);
    }

    setIsModalOpen(false);
    setEditingId(null);
    clearForm();
    await fetchProveedores();
    setSaving(false);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setNif(p.nif || '');
    setEmail(p.email || '');
    setDireccion(p.direccion || '');
    setCp(p.cp || '');
    setPoblacion(p.poblacion || '');
    setProvincia(p.provincia || '');
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const clearForm = () => {
    setNombre('');
    setNif('');
    setEmail('');
    setDireccion('');
    setCp('');
    setPoblacion('');
    setProvincia('');
  };

  const handleDeleteProveedor = async (id: string, name: string) => {
    if (window.confirm(`¿Seguro que quieres eliminar a ${name}?`)) {
      await supabase.from('proveedores').delete().eq('id', id);
      await fetchProveedores();
    }
  };

  const filteredProveedores = proveedores.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.nif && p.nif.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        <header className="flex items-center justify-between bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-white shadow-sm">
          <div>
            <h1 className="text-4xl font-black font-head tracking-tight text-[var(--foreground)]">Proveedores</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de suministros y subcontratas.</p>
          </div>
          <button 
            onClick={() => { clearForm(); setEditingId(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} /> Nuevo Proveedor
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200 border border-[var(--border)]">
              <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
                <TrendingDown className="text-red-500" /> {editingId ? "Editar Proveedor" : "Añadir Proveedor"}
              </h2>
              <form onSubmit={handleSaveProveedor} className="space-y-4">
                <input type="text" placeholder="Nombre / Empresa *" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="NIF/CIF" value={nif} onChange={(e) => setNif(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none" />
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none" />
                </div>
                <input type="text" placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)]" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-[var(--muted)] border rounded-xl">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-bold bg-[var(--accent)] text-white rounded-xl shadow-md disabled:opacity-50">
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
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Proveedor</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">NIF</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredProveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fcfaf7] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{p.nombre}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
                          {p.poblacion} {p.provincia}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)] font-mono">{p.nif || '—'}</td>
                      <td className="px-6 py-4 pr-6 text-right relative">
                        <div className="flex justify-end pr-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id); }}
                            className="p-2 -mr-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                        </div>

                        {openMenuId === p.id && (
                          <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <button onClick={() => openEditModal(p)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"><Save size={16} /> Editar</button>
                            <div className="h-px bg-gray-100 my-1 mx-2"></div>
                            <button onClick={() => handleDeleteProveedor(p.id, p.nombre)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /> Eliminar</button>
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
  );
}

"use client";

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
  TrendingDown,
  MapPin
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { getProvinciaPorCP } from '@/lib/geoData';

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

  // Lógica de Geolocalización
  useEffect(() => {
    if (cp.length === 5) {
      const resp = getProvinciaPorCP(cp);
      if (resp) {
        setProvincia(resp.nombre);
        if (resp.capital && !poblacion) {
          setPoblacion(resp.capital);
        }
      }
    }
  }, [cp]);

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
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 space-y-6 animate-in fade-in duration-500 overflow-y-auto">
        <header className="flex items-center justify-between bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-white shadow-sm">
          <div>
            <h1 className="text-4xl font-black font-head tracking-tight text-[var(--foreground)]">Proveedores</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de suministros y subcontratas.</p>
          </div>
          <button 
            onClick={() => { clearForm(); setEditingId(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={18} /> Nuevo Proveedor
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200 border border-[var(--border)] overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">
                <TrendingDown className="text-red-500" /> {editingId ? "Editar Proveedor" : "Añadir Proveedor"}
              </h2>
              <form onSubmit={handleSaveProveedor} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Razón Social *</label>
                  <input type="text" placeholder="Nombre / Empresa" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-orange-500/10 outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">NIF/CIF</label>
                    <input type="text" placeholder="A00000000" value={nif} onChange={(e) => setNif(e.target.value.toUpperCase())} className="w-full p-3 rounded-xl border bg-gray-50 outline-none" />
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
                  <button type="submit" disabled={saving} className="flex-1 py-3 text-sm font-bold bg-orange-600 text-white rounded-xl shadow-lg hover:bg-orange-700 transition-all disabled:opacity-50">
                    {saving ? "Guardando..." : "Guardar Proveedor"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden rounded-3xl">
          <div className="p-6 border-b border-[var(--border)] bg-gray-50/50 flex justify-between items-center">
             <div className="relative w-80">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input type="text" placeholder="Buscar por nombre o NIF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all" />
             </div>
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filteredProveedores.length} proveedores</div>
          </div>
          <div className="overflow-x-auto min-h-[400px]">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-orange-600" size={40} />
                <p className="text-gray-400 font-medium">Cargando proveedores...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b">
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">Proveedor</th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">NIF</th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">Ubicación</th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-orange-50/10 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="font-bold text-gray-800">{p.nombre}</div>
                        <div className="text-xs text-gray-400">{p.email || 'Sin email'}</div>
                      </td>
                      <td className="px-8 py-5 text-sm text-gray-500 font-mono">{p.nif || '—'}</td>
                      <td className="px-8 py-5">
                        {p.poblacion ? (
                          <div className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                            <MapPin size={10} className="text-orange-400"/>
                            {p.poblacion}, {p.provincia}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 italic">No definida</span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right relative">
                        <div className="flex justify-end pr-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id); }}
                            className="p-2.5 -mr-2 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition-all text-gray-400 hover:text-orange-600 shadow-sm"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                        </div>
                        {openMenuId === p.id && (
                          <div className="absolute right-8 top-12 w-48 bg-white rounded-2xl shadow-2xl border z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 ring-4 ring-black/5">
                            <button onClick={() => openEditModal(p)} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-orange-50 transition-colors"><Save size={16} /> Editar</button>
                            <div className="h-px bg-gray-50 my-1 mx-2"></div>
                            <button onClick={() => handleDeleteProveedor(p.id, p.nombre)} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /> Eliminar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredProveedores.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                        <Users className="mx-auto text-gray-200 mb-4" size={48} />
                        <p className="text-gray-400 font-medium">No se han encontrado proveedores.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

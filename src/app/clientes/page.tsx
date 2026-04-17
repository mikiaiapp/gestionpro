"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Save, 
  Loader2,
  MapPin,
  X,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { getFullLocationByCP } from '@/lib/geoData';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
    fetchClientes();
  }, []);

  // Lógica de Geolocalización Inteligente
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
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');
      
      if (error) throw error;
      setClientes(data || []);
    } catch (err) {
      console.error("Error al cargar clientes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) {
      alert("La Razón Social es obligatoria.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre,
        nif: nif.toUpperCase(),
        email,
        direccion,
        codigo_postal: cp,
        poblacion,
        provincia
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase.from('clientes').update(payload).eq('id', editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('clientes').insert(payload);
        error = insertError;
      }

      if (error) throw error;

      setIsModalOpen(false);
      setEditingId(null);
      clearForm();
      await fetchClientes();
      alert("✅ Cliente guardado con éxito.");
    } catch (err: any) {
      alert("❌ Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (c: any) => {
    setEditingId(c.id);
    setNombre(c.nombre);
    setNif(c.nif || '');
    setEmail(c.email || '');
    setDireccion(c.direccion || '');
    setCp(c.codigo_postal || '');
    setPoblacion(c.poblacion || '');
    setProvincia(c.provincia || '');
    setIsModalOpen(true);
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

  const handleDeleteCliente = async (id: string, name: string) => {
    if (window.confirm(`¿Seguro que quieres eliminar a ${name}?`)) {
      try {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) throw error;
        await fetchClientes();
      } catch (err: any) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nif && c.nif.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 space-y-6 animate-in fade-in duration-500 overflow-y-auto">
        <header className="flex items-center justify-between p-6 bg-white border shadow-sm rounded-2xl border-white/20">
          <div>
            <h1 className="text-4xl font-black font-head tracking-tight text-[var(--foreground)]">Clientes</h1>
            <p className="text-[var(--muted)] font-medium">Gestión integral de tu cartera de clientes.</p>
          </div>
          <button 
            onClick={() => { clearForm(); setEditingId(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
          >
            <Plus size={18} /> Nuevo Cliente
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-lg animate-in fade-in zoom-in duration-300 border overflow-y-auto max-h-[95vh]">
              <div className="flex justify-between items-center mb-8 border-b pb-4">
                 <h2 className="text-2xl font-black font-head flex items-center gap-3">
                   <UserCheck className="text-blue-600" size={28} /> 
                   {editingId ? "Editar Cliente" : "Añadir Cliente"}
                 </h2>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                   <X size={24} className="text-gray-400" />
                 </button>
              </div>

              <form onSubmit={handleSaveCliente} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Razón Social *</label>
                  <input type="text" placeholder="Nombre completo o empresa" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">NIF/CIF</label>
                    <input type="text" placeholder="52000000X" value={nif} onChange={(e) => setNif(e.target.value.toUpperCase())} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email</label>
                    <input type="email" placeholder="cliente@servicios.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none" />
                  </div>
                </div>

                <div className="space-y-5 pt-4 border-t border-dashed">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-2"><MapPin size={16} className="text-blue-400"/> Localización</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Dirección Fiscal</label>
                    <input type="text" placeholder="Calle, nº, bloque..." value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">CP</label>
                      <input type="text" placeholder="08001" value={cp} maxLength={5} onChange={(e) => setCp(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none font-mono font-bold" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Población</label>
                      <input type="text" placeholder="Ciudad" value={poblacion} onChange={(e) => setPoblacion(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Provincia</label>
                    <input type="text" placeholder="Autocompletado..." value={provincia} onChange={(e) => setProvincia(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none" />
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full py-5 bg-gray-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                  {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                  {saving ? "Procesando..." : "Guardar Cliente"}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white shadow-xl shadow-black/5 border border-gray-100 overflow-hidden rounded-[2rem]">
          <div className="p-8 border-b border-gray-100 bg-gray-50/30 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="relative w-full md:w-96 group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
               <input type="text" placeholder="Buscar por nombre o NIF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 rounded-3xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 transition-all font-medium" />
             </div>
             <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{filteredClientes.length} clientes en cartera</span>
             </div>
          </div>
          
          <div className="overflow-x-auto min-h-[500px]">
            {loading ? (
              <div className="p-32 flex flex-col items-center justify-center gap-6">
                <div className="relative">
                  <Loader2 className="animate-spin text-blue-600" size={60} />
                  <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-200" size={20} />
                </div>
                <p className="text-gray-400 font-bold text-lg animate-pulse uppercase tracking-tighter text-left">Sincronizando clientes...</p>
              </div>
            ) : filteredClientes.length === 0 ? (
               <div className="p-32 text-center space-y-4">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100">
                    <Users size={40} className="text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">No hay clientes todavía</h3>
                  <p className="text-gray-400 max-w-xs mx-auto">Comienza añadiendo un cliente para empezar a facturar tus proyectos.</p>
               </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b">
                    <th className="px-10 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Identidad Comercial</th>
                    <th className="px-10 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">NIF / Identificación</th>
                    <th className="px-10 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Ubicación Actual</th>
                    <th className="px-10 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredClientes.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/5 transition-all group">
                      <td className="px-10 py-6">
                        <div className="font-black text-gray-800 text-lg tracking-tight mb-1 group-hover:text-blue-600 transition-colors">{c.nombre}</div>
                        <div className="text-xs text-gray-400 font-medium flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                           {c.email || 'Sin correo asociado'}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-mono font-bold border border-gray-200 uppercase">
                           {c.nif || 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        {c.poblacion ? (
                          <div className="text-xs font-bold text-gray-600 flex items-center gap-2">
                            <MapPin size={14} className="text-blue-500 fill-blue-50"/>
                            {c.poblacion}, {c.provincia}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-300 flex items-center gap-2 italic">
                            <AlertTriangle size={14} /> Datos incompletos
                          </div>
                        )}
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(c)} className="p-3 hover:bg-blue-100 text-gray-400 hover:text-blue-600 rounded-xl transition-all border border-transparent hover:border-blue-200">
                             <Save size={18} />
                          </button>
                          <button onClick={() => handleDeleteCliente(c.id, c.nombre)} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-red-100">
                             <Trash2 size={18} />
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

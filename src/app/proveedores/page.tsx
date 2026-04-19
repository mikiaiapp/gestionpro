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
  MapPin,
  X,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Filter
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DataTableHeader } from '@/components/DataTableHeader';
import { getFullLocationByCP } from '@/lib/geoData';
import { cleanNIF } from '@/lib/format';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sorting and Filtering State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'nombre', direction: 'asc' });
  const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>({});

  // Form State
  const [nombre, setNombre] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cp, setCp] = useState('');
  const [poblacion, setPoblacion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nifError, setNifError] = useState<string | null>(null);

  useEffect(() => {
    fetchProveedores();
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

  // Control de Duplicidades por NIF para Proveedores
  useEffect(() => {
    const checkDuplicateNIF = async () => {
      const cleanedNif = cleanNIF(nif);
      if (cleanedNif.length < 5) {
        setNifError(null);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: list, error } = await supabase
          .from('proveedores')
          .select('id, nombre')
          .eq('nif', cleanedNif)
          .eq('user_id', user.id);

        if (list && list.length > 0) {
          const duplicate = list.find(p => p.id !== editingId);
          if (duplicate) {
            setNifError(`Ya existe un proveedor con este NIF: ${duplicate.nombre}`);
          } else {
            setNifError(null);
          }
        } else {
          setNifError(null);
        }
      } catch (err) {
        console.error("Error al validar NIF:", err);
      }
    };

    const timer = setTimeout(checkDuplicateNIF, 500);
    return () => clearTimeout(timer);
  }, [nif, editingId]);

  const fetchProveedores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre');
      
      if (error) throw error;
      setProveedores(data || []);
    } catch (err) {
      console.error("Error al cargar proveedores:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) {
      alert("La Razón Social es obligatoria.");
      return;
    }
    if (nifError) {
      alert("No se puede guardar: " + nifError);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No se ha detectado una sesión de usuario activa.");
      }

      const payload = {
        nombre,
        nif: cleanNIF(nif),
        email,
        direccion,
        codigo_postal: cp, // NOMBRE CORRECTO EN DB: codigo_postal
        poblacion,
        provincia,
        user_id: user.id
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase.from('proveedores').update(payload).eq('id', editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('proveedores').insert(payload);
        error = insertError;
      }

      if (error) {
        console.error("Supabase ErrorDetails:", error);
        throw new Error(error.message || "Error de base de datos al guardar.");
      }

      setIsModalOpen(false);
      setEditingId(null);
      clearForm();
      await fetchProveedores();
      alert("✅ Proveedor guardado con éxito.");
    } catch (err: any) {
      console.error("Error completo:", err);
      alert("❌ NO SE PUDO GUARDAR: " + (err.message || "Error desconocido"));
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setNif(p.nif || '');
    setEmail(p.email || '');
    setDireccion(p.direccion || '');
    setCp(p.codigo_postal || ''); // Mapeado desde codigo_postal
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
    setNifError(null);
  };

  const handleDeleteProveedor = async (id: string, name: string) => {
    try {
      // 1. Comprobar si tiene facturas recibidas
      const { data: costes } = await supabase
        .from('costes')
        .select('id')
        .eq('proveedor_id', id);
      
      if (costes && costes.length > 0) {
        alert(`No se puede eliminar el proveedor ${name} (Motivo: Tiene facturas recibidas asociadas)`);
        return;
      }

      if (window.confirm(`¿Seguro que quieres eliminar a ${name}?`)) {
        const { error } = await supabase.from('proveedores').delete().eq('id', id);
        if (error) throw error;
        await fetchProveedores();
        alert("✅ Proveedor eliminado correctamente");
      }
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const handleSort = (field: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: field, direction });
  };

  const handleFilter = (field: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredProveedores = proveedores.filter(p => {
    // Global search
    const matchesGlobal = searchTerm === '' || 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.nif && p.nif.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Column filters
    const matchesColumns = Object.keys(columnFilters).every(key => {
      if (!columnFilters[key]) return true;
      const val = p[key] || '';
      return val.toString().toLowerCase().includes(columnFilters[key].toLowerCase());
    });

    return matchesGlobal && matchesColumns;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    const aVal = a[sortConfig.key] || '';
    const bVal = b[sortConfig.key] || '';
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 space-y-6 animate-in fade-in duration-500 overflow-y-auto">
        <header className="flex items-center justify-between p-6 bg-white border shadow-sm rounded-2xl border-white/20">
          <div>
            <h1 className="text-4xl font-black font-head tracking-tight text-[var(--foreground)]">Proveedores</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de suministros y subcontratas.</p>
          </div>
          <button 
            onClick={() => { clearForm(); setEditingId(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all active:scale-[0.98] shadow-lg shadow-orange-600/20"
          >
            <Plus size={18} /> Nuevo Proveedor
          </button>
        </header>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-lg animate-in fade-in zoom-in duration-300 border overflow-y-auto max-h-[95vh]">
              <div className="flex justify-between items-center mb-8 border-b pb-4">
                 <h2 className="text-2xl font-black font-head flex items-center gap-3">
                   <TrendingDown className="text-orange-600" size={28} /> 
                   {editingId ? "Editar Proveedor" : "Añadir Proveedor"}
                 </h2>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                   <X size={24} className="text-gray-400" />
                 </button>
              </div>

              <form onSubmit={handleSaveProveedor} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Razón Social *</label>
                  <input type="text" placeholder="Nombre Comercial o Fiscal" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-bold" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">NIF/CIF</label>
                    <input 
                      type="text" 
                      placeholder="A00000000" 
                      value={nif} 
                      onChange={(e) => setNif(e.target.value.toUpperCase())} 
                      className={`w-full p-4 rounded-2xl border bg-gray-50 outline-none font-mono ${nifError ? 'border-red-500 ring-2 ring-red-500/10' : ''}`}
                    />
                    {nifError && (
                      <p className="text-[10px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 animate-pulse">
                        <AlertTriangle size={12} /> {nifError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email</label>
                    <input type="email" placeholder="email@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none" />
                  </div>
                </div>

                <div className="space-y-5 pt-4 border-t border-dashed">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-2"><MapPin size={16} className="text-orange-400"/> Localización</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Dirección Postal</label>
                    <input type="text" placeholder="Dirección completa" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">CP</label>
                      <input type="text" placeholder="28001" value={cp} maxLength={5} onChange={(e) => setCp(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none font-mono font-bold" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Población</label>
                      <input type="text" placeholder="Municipio" value={poblacion} onChange={(e) => setPoblacion(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Provincia</label>
                    <input type="text" placeholder="Autocompletado..." value={provincia} onChange={(e) => setProvincia(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none" />
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full py-5 bg-gray-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                  {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                  {saving ? "Procesando..." : "Guardar Proveedor"}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white shadow-xl shadow-black/5 border border-gray-100 overflow-hidden rounded-[2rem]">
          <div className="p-8 border-b border-gray-100 bg-gray-50/30 flex justify-end items-center gap-6">
             <div className="bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{filteredProveedores.length} registros totales</span>
             </div>
          </div>
          
          <div className="overflow-x-auto min-h-[500px]">
            {loading ? (
              <div className="p-32 flex flex-col items-center justify-center gap-6">
                <div className="relative">
                  <Loader2 className="animate-spin text-orange-600" size={60} />
                  <TrendingDown className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-200" size={20} />
                </div>
                <p className="text-gray-400 font-bold text-lg animate-pulse uppercase tracking-tighter">Sincronizando proveedores...</p>
              </div>
            ) : filteredProveedores.length === 0 ? (
               <div className="p-32 text-center space-y-4">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100">
                    <Users size={40} className="text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">No hay proveedores todavía</h3>
                  <p className="text-gray-400 max-w-xs mx-auto">Comienza añadiendo tu primer proveedor para gestionar tus facturas recibidas.</p>
               </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b">
                    <DataTableHeader label="Identidad Comercial" field="nombre" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.nombre || ''} onFilter={handleFilter} />
                    <DataTableHeader label="NIF / Identificación" field="nif" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.nif || ''} onFilter={handleFilter} />
                    <DataTableHeader label="Ubicación Actual" field="poblacion" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.poblacion || ''} onFilter={handleFilter} />
                    <th className="px-10 py-6 text-[12px] font-black text-gray-500 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-orange-50/5 transition-all group">
                      <td className="px-10 py-6">
                        <div className="font-black text-gray-800 text-lg tracking-tight mb-1 group-hover:text-orange-600 transition-colors">{p.nombre}</div>
                        <div className="text-xs text-gray-400 font-medium flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                           {p.email || 'Sin correo electrónico asignado'}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-mono font-bold border border-gray-200 uppercase">
                           {p.nif || 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-col gap-1">
                          {p.direccion && (
                            <div className="text-sm font-bold text-gray-800 flex items-start gap-2">
                              <MapPin size={14} className="mt-1 text-orange-500 shrink-0" />
                              <span>{p.direccion}</span>
                            </div>
                          )}
                          {p.poblacion ? (
                            <div className={`text-xs ${p.direccion ? 'pl-6 text-gray-500 font-medium' : 'font-bold text-gray-600 flex items-center gap-2'}`}>
                              {!p.direccion && <MapPin size={14} className="text-orange-500 fill-orange-50"/>}
                              {p.poblacion}{p.provincia ? `, ${p.provincia}` : ''}{p.codigo_postal ? ` (${p.codigo_postal})` : ''}
                            </div>
                          ) : !p.direccion && (
                            <div className="text-xs text-gray-300 flex items-center gap-2 italic">
                              <AlertTriangle size={14} /> Faltan datos geográficos
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(p)} className="p-3 hover:bg-orange-100 text-gray-400 hover:text-orange-600 rounded-xl transition-all border border-transparent hover:border-orange-200">
                             <Save size={18} />
                          </button>
                          <button onClick={() => handleDeleteProveedor(p.id, p.nombre)} className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-red-100">
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

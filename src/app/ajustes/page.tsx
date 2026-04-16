"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Save, 
  Percent,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { getProvinciaPorCP } from '@/lib/geoData';
import { validateNIF, validateIBAN, formatIBAN } from '@/lib/validations';

export default function AjustesPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [nombre, setNombre] = useState('Mi Empresa');
  const [nif, setNif] = useState('');
  const [cuentaBancaria, setCuentaBancaria] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cp, setCp] = useState('');
  const [poblacion, setPoblacion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [tiposIva, setTiposIva] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(user);
    fetchPerfil(user.id);
    fetchTipos();
  };

  useEffect(() => {
    if (cp.length === 5) {
      const info = getProvinciaPorCP(cp);
      if (info) setProvincia(info.nombre);
    }
  }, [cp]);

  const fetchPerfil = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('perfil_negocio')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (data) {
        setNombre(data.nombre || '');
        setNif(data.nif || '');
        setCuentaBancaria(data.cuenta_bancaria ? formatIBAN(data.cuenta_bancaria) : '');
        setDireccion(data.direccion || '');
        setCp(data.cp || '');
        setPoblacion(data.poblacion || '');
        setProvincia(data.provincia || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTipos = async () => {
    const { data: iva } = await supabase.from('tipos_iva').select('*').order('valor', { ascending: false });
    setTiposIva(iva || []);
  };

  const handleSavePerfil = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('perfil_negocio').upsert({
        user_id: user.id,
        nombre,
        nif,
        cuenta_bancaria: cuentaBancaria.replace(/\s/g, ''),
        direccion,
        cp,
        poblacion,
        provincia
      }, { onConflict: 'user_id' });

      if (error) alert("❌ Error: " + error.message);
      else alert("✅ Perfil Privado Guardado");
    } catch (e: any) {
      alert("❌ Error: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncOfficial = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const officialIva = [
        { nombre: 'IVA General', valor: 21 },
        { nombre: 'IVA Reducido', valor: 10 },
        { nombre: 'IVA Superreducido', valor: 4 },
        { nombre: 'Exento', valor: 0 }
      ];

      for (const item of officialIva) {
        await supabase.from('tipos_iva').upsert({ 
          user_id: user.id, 
          nombre: item.nombre, 
          valor: item.valor 
        }, { onConflict: 'user_id,valor' });
      }
      
      await fetchTipos();
      alert("✅ Fiscalidad sincronizada para tu usuario");
    } catch (e) {
      alert("❌ Error al sincronizar IVA");
    } finally {
      setSyncing(false);
    }
  };

  if (!user && !loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 p-4 font-sans text-center">
      <div className="bg-white p-10 rounded-3xl shadow-2xl border max-w-md w-full space-y-6">
        <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <Lock className="text-blue-600" size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-800">Caja fuerte cerrada</h2>
        <p className="text-gray-500 text-sm">Para ver tus datos privados, inicia sesión o crea tu cuenta gratuita.</p>
        <div className="flex flex-col gap-3">
          <a href="/login" className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all">Iniciar Sesión</a>
          <a href="/signup" className="text-sm font-bold text-blue-600 hover:underline">Registrarme</a>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 overflow-y-auto text-left">
        <header>
          <h1 className="text-3xl font-bold font-head tracking-tight text-[var(--foreground)]">Ajustes</h1>
          <p className="text-[var(--muted)] mt-1 tracking-tight">Gestión del perfil privado: <span className="font-bold text-blue-600">{user.email}</span></p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          {/* Columna Principal - Perfil */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3">
                <Building2 className="text-blue-600" size={24} /> Identidad Fiscal
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nombre Comercial</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">NIF / CIF</label>
                  <input type="text" value={nif} onChange={e => setNif(e.target.value.toUpperCase())} className="w-full px-4 py-3 rounded-xl border bg-gray-50 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">IBAN</label>
                  <input type="text" value={cuentaBancaria} onChange={e => setCuentaBancaria(formatIBAN(e.target.value))} className="w-full px-4 py-3 rounded-xl border bg-gray-50 font-mono text-sm" />
                </div>
              </div>
              <button 
                onClick={handleSavePerfil} 
                disabled={isSaving} 
                className="w-full mt-10 py-5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <RefreshCcw className="animate-spin" /> : <Save size={20} />}
                Guardar en mi Contabilidad Privada
              </button>
            </div>
          </div>

          {/* Columna Lateral - IVA */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold font-head flex items-center gap-2 text-green-600">
                  <Percent size={20} /> Tipos de IVA
                </h2>
                <button 
                  onClick={handleSyncOfficial} 
                  disabled={syncing}
                  title="Sincronizar con Hacienda"
                  className="p-2 hover:bg-green-50 rounded-xl text-green-600 transition-all"
                >
                  <RefreshCcw size={18} className={syncing ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="space-y-3">
                {tiposIva.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-400 mb-4 italic">No tienes impuestos configurados</p>
                    <button onClick={handleSyncOfficial} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-lg">Cargar Oficiales</button>
                  </div>
                ) : (
                  tiposIva.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-sm font-semibold text-gray-700">{t.nombre}</span>
                      <span className="font-black text-gray-900">{t.valor}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center pt-10 border-t border-gray-100 italic">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">GESTIÓNPRO V2.0.8 - ACCOUNTING READY</p>
        </div>
      </div>
    </div>
  );
}

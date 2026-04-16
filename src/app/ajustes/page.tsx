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
  Loader2
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { getProvinciaPorCP } from '@/lib/geoData';
import { validateNIF, validateIBAN, formatIBAN } from '@/lib/validations';

export default function AjustesPage() {
  const [loading, setLoading] = useState(true);
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
    if (!supabase) {
      alert("⚠️ Error: No se detecta conexión con Supabase. Revisa las variables de entorno.");
      setLoading(false);
      return;
    }
    fetchPerfil();
    fetchTipos();
  }, []);

  useEffect(() => {
    if (cp.length === 5) {
      const info = getProvinciaPorCP(cp);
      if (info) setProvincia(info.nombre);
    }
  }, [cp]);

  const fetchPerfil = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      
      const { data, error } = await supabase
        .from('perfil_negocio')
        .select('*')
        .eq('user_id', user.id)
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
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("❌ Error: No se detecta sesión de usuario.");
        setIsSaving(false);
        return;
      }

      console.log("Intentando guardar para usuario:", user.id);

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

      if (error) {
        console.error("Error de Supabase:", error);
        alert("❌ Error al guardar: " + error.message);
      } else {
        alert("✅ Perfil guardado correctamente");
      }
    } catch (e: any) {
      alert("❌ Error inesperado: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncOfficial = async () => {
    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("❌ Error: No hay sesión.");
        setSyncing(false);
        return;
      }

      const officialIva = [
        { nombre: 'IVA General', valor: 21 },
        { nombre: 'IVA Reducido', valor: 10 },
        { nombre: 'IVA Superreducido', valor: 4 },
        { nombre: 'Exento', valor: 0 }
      ];

      for (const item of officialIva) {
        const { error } = await supabase.from('tipos_iva').upsert({ 
          user_id: user.id, 
          nombre: item.nombre, 
          valor: item.valor 
        }, { onConflict: 'user_id,valor' });
        
        if (error) console.error("Error en item IVA:", error);
      }
      
      await fetchTipos();
      alert("✅ Tipos de IVA sincronizados");
    } catch (e) {
      alert("❌ Error en la sincronización fiscal");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return (
    <div className="flex bg-[var(--background)] min-h-screen items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 overflow-y-auto text-left">
        <header>
          <h1 className="text-3xl font-bold font-head tracking-tight text-[var(--foreground)]">Ajustes</h1>
          <p className="text-[var(--muted)] mt-1">Configuración de identidad fiscal y fiscalidad profesional.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          <div className="lg:col-span-2 bg-white rounded-2xl border p-8 shadow-sm">
            <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3">
              <Building2 className="text-blue-600" /> Datos del Emisor
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nombre Comercial</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" placeholder="Ej: Reformas Miguel SL" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">NIF / CIF</label>
                <div className="relative">
                  <input type="text" value={nif} onChange={e => setNif(e.target.value.toUpperCase())} className={`w-full px-4 py-3 rounded-xl border ${nif && !validateNIF(nif) ? 'border-red-300' : 'border-gray-200'} bg-gray-50 outline-none`} />
                  {nif && (validateNIF(nif) ? <CheckCircle2 size={16} className="absolute right-3 top-4 text-green-500" /> : <AlertCircle size={16} className="absolute right-3 top-4 text-red-500" />)}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">IBAN</label>
                <input type="text" value={cuentaBancaria} onChange={e => setCuentaBancaria(formatIBAN(e.target.value))} className="w-full px-4 py-3 rounded-xl border bg-gray-50 font-mono text-sm" placeholder="ES00 0000..." />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Dirección</label>
                <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-gray-50" />
              </div>

              <div className="grid grid-cols-3 gap-4 md:col-span-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">C.P.</label>
                  <input type="text" value={cp} maxLength={5} onChange={e => setCp(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-gray-50 font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Municipio</label>
                  <input type="text" value={poblacion} onChange={e => setPoblacion(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-gray-50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Provincia</label>
                  <input type="text" value={provincia} onChange={e => setProvincia(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-gray-50" />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSavePerfil} 
              disabled={isSaving} 
              className="w-full mt-8 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {isSaving ? <RefreshCcw className="animate-spin" /> : <Save size={20} />} Guardar Perfil
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold font-head flex items-center gap-2 text-green-600"><Percent size={18} /> IVA</h2>
                <button onClick={handleSyncOfficial} disabled={syncing} className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1 hover:text-blue-700 transition-colors">
                  <RefreshCcw size={12} className={syncing ? 'animate-spin' : ''} /> Sync
                </button>
              </div>
              <div className="space-y-2">
                {tiposIva.length === 0 ? (
                  <p className="text-[11px] text-gray-400 text-center py-4">Pulsa Sync para cargar tipos</p>
                ) : tiposIva.map(t => (
                  <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-sm font-medium">{t.nombre}</span>
                    <span className="font-bold">{t.valor}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center pt-10 border-t">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GestiónPro V2.0.4 - STABILIZER</p>
        </div>
      </div>
    </div>
  );
}

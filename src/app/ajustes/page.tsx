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
  Lock,
  Brain,
  ShieldCheck,
  CreditCard,
  MapPin
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { getProvinciaPorCP } from '@/lib/geoData';
import { validateNIF, validateIBAN, formatIBAN } from '@/lib/validations';

export default function AjustesPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Perfil State
  const [nombre, setNombre] = useState('Mi Empresa');
  const [nif, setNif] = useState('');
  const [cuentaBancaria, setCuentaBancaria] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cp, setCp] = useState('');
  const [poblacion, setPoblacion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [tieneRetencion, setTieneRetencion] = useState(false);
  const [irpfDefault, setIrpfDefault] = useState(15);
  
  const [isSaving, setIsSaving] = useState(false);
  const [tiposIva, setTiposIva] = useState<any[]>([]);
  const [tiposIrpf, setTiposIrpf] = useState<any[]>([]);
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
        setGeminiKey(data.gemini_key || '');
        setTieneRetencion(data.tiene_retencion || false);
        setIrpfDefault(Number(data.irpf_default) || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTipos = async () => {
    const { data: iva } = await supabase.from('tipos_iva').select('*').order('valor', { ascending: false });
    const { data: irpf } = await supabase.from('tipos_irpf').select('*').order('valor', { ascending: false });
    setTiposIva(iva || []);
    setTiposIrpf(irpf || []);
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
        provincia,
        gemini_key: geminiKey,
        tiene_retencion: tieneRetencion,
        irpf_default: irpfDefault
      }, { onConflict: 'user_id' });

      if (error) alert("❌ Error: " + error.message);
      else alert("✅ Ajustes actualizados");
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
      const officialIrpf = [
        { nombre: 'IRPF Profesional', valor: 15 },
        { nombre: 'IRPF Nuevos Auton.', valor: 7 },
        { nombre: 'IRPF Alquileres', valor: 19 }
      ];

      for (const item of officialIva) {
        await supabase.from('tipos_iva').upsert({ user_id: user.id, nombre: item.nombre, valor: item.valor }, { onConflict: 'user_id,valor' });
      }
      for (const item of officialIrpf) {
        await supabase.from('tipos_irpf').upsert({ user_id: user.id, nombre: item.nombre, valor: item.valor }, { onConflict: 'user_id,valor' });
      }
      
      await fetchTipos();
      alert("✅ Fiscalidad sincronizada (IVA e IRPF)");
    } catch (e) {
      alert("❌ Error al sincronizar fiscalidad");
    } finally {
      setSyncing(false);
    }
  };

  if (!user && !loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-4 font-sans text-center">
      <div className="bg-white p-12 rounded-3xl shadow-2xl border max-w-sm w-full space-y-6">
        <Lock className="text-blue-600 mx-auto" size={48} />
        <h2 className="text-2xl font-black text-gray-800">Caja de Seguridad</h2>
        <p className="text-gray-500 text-sm">Inicia sesión para acceder a tu configuración privada.</p>
        <div className="flex flex-col gap-3">
          <a href="/login" className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all">Entrar</a>
          <a href="/signup" className="text-sm font-bold text-gray-400 hover:text-blue-600">O crear nueva cuenta</a>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 overflow-y-auto text-left">
        <header>
          <h1 className="text-3xl font-black font-head tracking-tight text-[var(--foreground)]">Panel de Control</h1>
          <p className="text-[var(--muted)] font-medium flex items-center gap-2">
            <ShieldCheck size={16} className="text-green-500" /> Usuario activo: <span className="text-blue-600 underline">{user.email}</span>
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* SECCIÓN 1: IDENTIDAD Y FACTURACIÓN */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-gray-800">
                <Building2 className="text-blue-600" size={24} /> Identidad Empresarial
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Razón Social / Nombre Comercial</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50/50 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">CIF / NIF</label>
                  <input type="text" value={nif} onChange={e => setNif(e.target.value.toUpperCase())} className="w-full px-5 py-4 rounded-2xl border bg-gray-50/50 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">IBAN de Cobro</label>
                  <div className="relative">
                    <input type="text" value={cuentaBancaria} onChange={e => setCuentaBancaria(formatIBAN(e.target.value))} className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-gray-50/50 outline-none font-mono text-xs" />
                    <CreditCard size={18} className="absolute left-4 top-4.5 text-gray-300" />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Dirección de Facturación</label>
                  <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50/50 outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-4 md:col-span-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">C.P.</label>
                    <input type="text" value={cp} maxLength={5} onChange={e => setCp(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50/50 outline-none font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Ciudad</label>
                    <input type="text" value={poblacion} onChange={e => setPoblacion(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50/50 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Provincia</label>
                    <input type="text" value={provincia} onChange={e => setProvincia(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50/50 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: INTELIGENCIA ARTIFICIAL */}
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-purple-600">
                <Brain size={24} /> Motor GPT / Gemini
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">API Key (Gemini Ultra/Pro)</label>
                  <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50/50 outline-none focus:border-purple-200 transition-all font-mono" placeholder="AIzaSy..." />
                </div>
                <p className="text-[10px] text-gray-400 italic">Esta clave se usa para la extracción automática de datos de facturas en PDF.</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: CONFIGURACIÓN FISCAL */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold font-head flex items-center gap-2 text-green-600">
                  <Percent size={20} /> Fiscalidad
                </h2>
                <button onClick={handleSyncOfficial} disabled={syncing} className="p-2 hover:bg-blue-50 rounded-xl text-blue-600 transition-all group">
                  <RefreshCcw size={18} className={syncing ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'} />
                </button>
              </div>

              <div className="space-y-6">
                {/* IVA */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tipos de IVA</p>
                  <div className="space-y-2">
                    {tiposIva.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-xs font-semibold text-gray-600">{t.nombre}</span>
                        <span className="text-sm font-black text-gray-800">{t.valor}%</span>
                      </div>
                    ))}
                    {tiposIva.length === 0 && <button onClick={handleSyncOfficial} className="w-full py-3 text-xs font-bold text-blue-600 border border-dashed border-blue-200 rounded-xl hover:bg-blue-50">Sincronizar IVA</button>}
                  </div>
                </div>

                <div className="h-px bg-gray-100"></div>

                {/* Retención / IRPF */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Retención IRPF</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={tieneRetencion} onChange={e => setTieneRetencion(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {tieneRetencion && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                      {tiposIrpf.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                          <span className="text-xs font-semibold text-orange-700">{t.nombre}</span>
                          <span className="text-sm font-black text-orange-800">{t.valor}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={handleSavePerfil} 
              disabled={isSaving} 
              className="w-full py-5 bg-gray-900 text-white font-bold rounded-3xl shadow-2xl hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              Actualizar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

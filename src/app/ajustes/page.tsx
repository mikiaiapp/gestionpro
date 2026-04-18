"use client";

import { useState, useEffect, useRef } from 'react';
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
  ImageIcon,
  Wallet,
  ExternalLink,
  Upload,
  Trash2,
  ShieldCheck,
  CloudCheck
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { getFullLocationByCP } from '@/lib/geoData';
import { validateNIF, validateIBAN, formatIBAN } from '@/lib/validations';
import { encrypt } from '@/lib/encryption';

export default function AjustesPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [autoStatus, setAutoStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Perfil State
  const [nombre, setNombre] = useState('Mi Empresa');
  const [nif, setNif] = useState('');
  const [cuentaBancaria, setCuentaBancaria] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cp, setCp] = useState('');
  const [poblacion, setPoblacion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [email, setEmail] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [formaPago, setFormaPago] = useState('Transferencia Bancaria');
  const [tieneRetencion, setTieneRetencion] = useState(false);
  const [irpfDefault, setIrpfDefault] = useState(15);
  const [condicionesLegales, setCondicionesLegales] = useState('');
  const [lopdText, setLopdText] = useState('');
  
  // Verifactu State
  const [verifactuCert, setVerifactuCert] = useState('');
  const [verifactuCertPassword, setVerifactuCertPassword] = useState('');
  const [verifactuEnv, setVerifactuEnv] = useState<'pruebas' | 'produccion'>('pruebas');
  
  const [tiposIva, setTiposIva] = useState<any[]>([]);
  const [tiposIrpf, setTiposIrpf] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Seguridad 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [securityPin, setSecurityPin] = useState('');

  const initialLoadDone = useRef(false);

  useEffect(() => {
    checkUser();
  }, []);

  // Autosave Effect
  useEffect(() => {
    if (initialLoadDone.current && user) {
      const timer = setTimeout(() => {
        handleSaveAll();
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [
    nombre, nif, cuentaBancaria, direccion, cp, poblacion, provincia, 
    email, geminiKey, logoUrl, formaPago, tieneRetencion, irpfDefault, 
    condicionesLegales, lopdText, verifactuCert, verifactuCertPassword, verifactuEnv,
    twoFactorEnabled, securityPin
  ]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(user);
    await Promise.all([
      fetchPerfil(user.id),
      fetchTipos()
    ]);
    initialLoadDone.current = true;
    setLoading(false);
  };

  useEffect(() => {
    if (cp.length === 5) {
      getFullLocationByCP(cp).then(resp => {
        if (resp) {
          setProvincia(resp.provincia);
          if (resp.poblacion) setPoblacion(resp.poblacion);
        }
      });
    }
  }, [cp]);

  const fetchPerfil = async (userId: string) => {
    try {
      const { data } = await supabase.from('perfil_negocio').select('*').eq('user_id', userId).maybeSingle();
      if (data) {
        setNombre(data.nombre || '');
        setNif(data.nif || '');
        setCuentaBancaria(data.cuenta_bancaria ? formatIBAN(data.cuenta_bancaria) : '');
        setDireccion(data.direccion || '');
        setCp(data.cp || '');
        setPoblacion(data.poblacion || '');
        setProvincia(data.provincia || '');
        setEmail(data.email || '');
        setGeminiKey(data.gemini_key || '');
        setLogoUrl(data.logo_url || '');
        setFormaPago(data.forma_pago_default || 'Transferencia Bancaria');
        setTieneRetencion(data.tiene_retencion || false);
        setIrpfDefault(Number(data.irpf_default) || 0);
        setCondicionesLegales(data.condiciones_legales || '');
        setLopdText(data.lopd_text || '');
        setVerifactuCert(data.verifactu_certificado || '');
        setVerifactuCertPassword(data.verifactu_pass || '');
        setVerifactuEnv(data.verifactu_env || 'pruebas');
      }
      
      const { data: prof } = await supabase.from('perfiles').select('*').eq('id', userId).single();
      if (prof) {
        setTwoFactorEnabled(prof.two_factor_enabled || false);
        setSecurityPin(prof.two_factor_pin || '');
      }
    } catch (e) { console.error(e); }
  };

  const fetchTipos = async () => {
    const { data: iva } = await supabase.from('tipos_iva').select('*').order('valor', { ascending: false });
    const { data: irpf } = await supabase.from('tipos_irpf').select('*').order('valor', { ascending: false });
    setTiposIva(iva || []);
    setTiposIrpf(irpf || []);
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setAutoStatus('saving');
    try {
      const checkKeys = ['condiciones_legales', 'lopd_text', 'forma_pago_default', 'irpf_default', 'tiene_retencion', 'email', 'gemini_key', 'logo_url', 'verifactu_certificado', 'verifactu_pass', 'verifactu_env'];
      const existingKeys: string[] = [];
      for (const key of checkKeys) {
        const { error } = await supabase.from('perfil_negocio').select(key).limit(0);
        if (!error) existingKeys.push(key);
      }
      
      const payload: any = {
        user_id: user.id,
        nombre, nif, direccion, cp, poblacion, provincia,
        cuenta_bancaria: cuentaBancaria.replace(/\s/g, ''),
      };

      if (existingKeys.includes('email')) payload.email = email;
      if (existingKeys.includes('lopd_text')) payload.lopd_text = lopdText;
      if (existingKeys.includes('condiciones_legales')) payload.condiciones_legales = condicionesLegales;
      if (existingKeys.includes('forma_pago_default')) payload.forma_pago_default = formaPago;
      if (existingKeys.includes('tiene_retencion')) payload.tiene_retencion = tieneRetencion;
      if (existingKeys.includes('irpf_default')) payload.irpf_default = irpfDefault;
      if (existingKeys.includes('gemini_key')) payload.gemini_key = geminiKey;
      if (existingKeys.includes('logo_url')) payload.logo_url = logoUrl;
      if (existingKeys.includes('verifactu_certificado')) payload.verifactu_certificado = verifactuCert;
      if (existingKeys.includes('verifactu_pass')) payload.verifactu_pass = verifactuCertPassword.includes(':') ? verifactuCertPassword : encrypt(verifactuCertPassword);
      if (existingKeys.includes('verifactu_env')) payload.verifactu_env = verifactuEnv;

      await Promise.all([
        supabase.from('perfil_negocio').upsert(payload, { onConflict: 'user_id' }),
        supabase.from('perfiles').upsert({ id: user.id, two_factor_enabled: twoFactorEnabled, two_factor_pin: securityPin })
      ]);
      
      setAutoStatus('saved');
      setTimeout(() => setAutoStatus('idle'), 3000);
      window.dispatchEvent(new Event('perfil_updated'));
    } catch (e) {
      console.error(e);
      setAutoStatus('idle');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    setIsSaving(true);
    try {
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
      setLogoUrl(publicUrl);
    } catch (error: any) {
      alert('⚠️ ' + error.message);
    } finally { setIsSaving(false); }
  };

  const handleSyncOfficial = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await supabase.from('tipos_iva').delete().eq('user_id', user.id);
      await supabase.from('tipos_irpf').delete().eq('user_id', user.id);
      const officialIva = [{ nombre: 'IVA General', valor: 21 }, { nombre: 'IVA Reducido', valor: 10 }, { nombre: 'IVA Superreducido', valor: 4 }, { nombre: 'Exento', valor: 0 }];
      const officialIrpf = [{ nombre: 'IRPF Profesional', valor: 15 }, { nombre: 'IRPF Nuevos Auton.', valor: 7 }, { nombre: 'IRPF Alquileres', valor: 19 }];
      await supabase.from('tipos_iva').insert(officialIva.map(i => ({ ...i, user_id: user.id })));
      await supabase.from('tipos_irpf').insert(officialIrpf.map(i => ({ ...i, user_id: user.id })));
      fetchTipos();
    } catch (e) { console.error(e); } finally { setSyncing(false); }
  };

  const handleAddTipo = async (tabla: 'tipos_iva' | 'tipos_irpf') => {
    if (!user) return;
    const n = prompt("Nombre:");
    const v = prompt("Valor %:");
    if (n && v) {
      await supabase.from(tabla).insert({ user_id: user.id, nombre: n, valor: parseFloat(v) });
      fetchTipos();
    }
  };

  const handleDeleteTipo = async (tabla: 'tipos_iva' | 'tipos_irpf', id: string) => {
    if (confirm("¿Eliminar?")) {
      await supabase.from(tabla).delete().eq('id', id);
      fetchTipos();
    }
  };

  if (!user && !loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-4 font-sans">
      <div className="bg-white p-12 rounded-3xl shadow-2xl border max-w-sm w-full text-center space-y-6">
        <Lock className="text-blue-600 mx-auto" size={48} />
        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Acceso Privado</h2>
        <a href="/login" className="block w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg transition-all">Iniciar Sesión</a>
      </div>
    </div>
  );

  if (loading) return <div className="flex h-screen items-center justify-center font-sans text-gray-400 gap-2"><Loader2 className="animate-spin text-blue-500" size={32} /> Cargando configuración...</div>;

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 overflow-y-auto text-left font-sans">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black font-head tracking-tighter text-[var(--foreground)]">Ajustes</h1>
            <p className="text-[var(--muted)] font-medium">Autoguardado conectado en tiempo real.</p>
          </div>
          <div className={`px-5 py-2 rounded-full text-xs font-bold border flex items-center gap-2 transition-all duration-300 ${autoStatus === 'saving' ? 'bg-blue-50 text-blue-600 border-blue-100 scale-105' : autoStatus === 'saved' ? 'bg-green-50 text-green-700 border-green-100 scale-105' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
            {autoStatus === 'saving' ? <Loader2 className="animate-spin" size={14} /> : autoStatus === 'saved' ? <CloudCheck size={14} /> : <ShieldCheck size={14} />}
            {autoStatus === 'saving' ? 'Guardando cambios...' : autoStatus === 'saved' ? 'Cambios sincronizados' : `Sesión: ${user.email}`}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-32">
          <div className="xl:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-gray-800 border-b pb-4">
                <Building2 className="text-blue-600" /> Identidad de Empresa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Logo de Empresa</label>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="https://..." />
                      <ImageIcon size={18} className="absolute left-4 top-4 text-gray-300" />
                    </div>
                    <label className="flex items-center gap-2 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl cursor-pointer transition-all active:scale-95">
                      <Upload size={18} />
                      {isSaving ? 'Subiendo...' : 'Subir'}
                      <input type="file" onChange={handleFileUpload} disabled={isSaving} className="hidden" accept="image/*" />
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Razón Social</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email Público</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none" placeholder="empresa@ejemplo.com" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">NIF / CIF</label>
                  <input type="text" value={nif} onChange={e => setNif(e.target.value.toUpperCase())} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Forma de Pago Predefinida</label>
                  <div className="relative">
                    <input type="text" value={formaPago} onChange={e => setFormaPago(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-gray-50 outline-none" />
                    <Wallet size={18} className="absolute left-4 top-4 text-gray-300" />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">IBAN de Cobro</label>
                  <input type="text" value={cuentaBancaria} onChange={e => setCuentaBancaria(formatIBAN(e.target.value))} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 font-mono text-sm" />
                </div>

                <div className="grid grid-cols-3 gap-4 md:col-span-2">
                   <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Dirección Completa</label>
                      <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50" />
                   </div>
                   <input type="text" placeholder="C.P." value={cp} maxLength={5} onChange={e => setCp(e.target.value)} className="px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-mono" />
                   <input type="text" placeholder="Ciudad" value={poblacion} onChange={e => setPoblacion(e.target.value)} className="px-5 py-4 rounded-2xl border bg-gray-50 outline-none" />
                   <input type="text" placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} className="px-5 py-4 rounded-2xl border bg-gray-50 outline-none" />
                </div>

                <div className="md:col-span-2 space-y-2 pt-4 border-t border-dashed">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Condicionado Legal (Pie de PDF)</label>
                  <textarea value={condicionesLegales} onChange={e => setCondicionesLegales(e.target.value)} rows={4} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none text-xs text-gray-600 leading-relaxed" />
                </div>

                <div className="md:col-span-2 space-y-2 pt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Protección de Datos (LOPD)</label>
                  <textarea value={lopdText} onChange={e => setLopdText(e.target.value)} rows={3} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none text-xs text-gray-600 leading-relaxed" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border p-8 shadow-sm border-purple-100">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-purple-600"><Brain size={24} /> Inteligencia Artificial</h2>
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Gemini API Key</label>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-purple-600 hover:underline flex items-center gap-1">Conseguir Key <ExternalLink size={10} /></a>
                </div>
                <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-purple-50/20 outline-none font-mono text-xs" />
              </div>
            </div>
            
            <div className="bg-white rounded-3xl border p-8 shadow-sm border-orange-100">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-orange-600"><ShieldCheck size={24} /> Seguridad 2FA</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <div>
                    <h3 className="text-sm font-bold text-orange-800">Doble Factor</h3>
                    <p className="text-[10px] text-orange-600 font-medium tracking-tight">Solicitar PIN tras el inicio de sesión.</p>
                  </div>
                  <button onClick={() => setTwoFactorEnabled(!twoFactorEnabled)} className={`w-14 h-8 rounded-full p-1 transition-all ${twoFactorEnabled ? 'bg-orange-600' : 'bg-gray-200'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                {twoFactorEnabled && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">PIN (6 dígitos)</label>
                    <input type="text" maxLength={6} value={securityPin} onChange={e => setSecurityPin(e.target.value.replace(/\D/g, ''))} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-mono text-2xl tracking-[0.5em] text-center" />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border p-8 shadow-sm border-blue-100">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-blue-600"><ShieldCheck size={24} /> Factura Electrónica</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button onClick={() => setVerifactuEnv('pruebas')} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${verifactuEnv === 'pruebas' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>PRUEBAS</button>
                  <button onClick={() => setVerifactuEnv('produccion')} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${verifactuEnv === 'produccion' ? 'bg-red-600 text-white' : 'bg-gray-50 text-gray-400'}`}>PRODUCCIÓN</button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Clave Privada Certificado</label>
                  <input type="password" value={verifactuCertPassword} onChange={e => setVerifactuCertPassword(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-mono text-xs" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8 border-b pb-4">
                <h2 className="text-lg font-bold font-head flex items-center gap-2 text-green-600"><Percent size={20} /> Impuestos</h2>
                <button onClick={handleSyncOfficial} disabled={syncing} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"><RefreshCcw size={18} className={syncing ? 'animate-spin' : ''} /></button>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tipos de IVA</p>
                    <button onClick={() => handleAddTipo('tipos_iva')} className="text-[10px] font-bold text-blue-600">+ Añadir</button>
                  </div>
                  <div className="space-y-2">
                    {tiposIva.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                        <span className="text-xs font-bold text-gray-600">{t.nombre} ({t.valor}%)</span>
                        <button onClick={() => handleDeleteTipo('tipos_iva', t.id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-dashed">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tipos de IRPF</p>
                    <button onClick={() => handleAddTipo('tipos_irpf')} className="text-[10px] font-bold text-orange-600">+ Añadir</button>
                  </div>
                  <div className="space-y-2">
                    {tiposIrpf.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                        <span className="text-xs font-bold text-gray-600">{t.nombre} ({t.valor}%)</span>
                        <button onClick={() => handleDeleteTipo('tipos_irpf', t.id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-orange-50/20 p-4 rounded-2xl border border-orange-100 mt-4">
                  <p className="text-xs font-bold text-orange-800">Facturar con IRPF</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={tieneRetencion} onChange={e => setTieneRetencion(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-10 bg-gradient-to-br from-gray-900 to-black rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                 <ShieldCheck size={120} />
               </div>
               <h3 className="text-lg font-black tracking-tight mb-2">Sistema Protegido</h3>
               <p className="text-xs text-gray-400 leading-relaxed">Tus ajustes se sincronizan automáticamente con la nube mediante cifrado de punto a punto.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

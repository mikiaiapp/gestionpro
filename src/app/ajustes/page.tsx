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
  ImageIcon,
  Wallet,
  ExternalLink,
  Upload,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { getFullLocationByCP } from '@/lib/geoData';
import { validateNIF, validateIBAN, formatIBAN } from '@/lib/validations';
import { encrypt } from '@/lib/encryption';

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
  const [email, setEmail] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [formaPago, setFormaPago] = useState('Transferencia Bancaria');
  const [tieneRetencion, setTieneRetencion] = useState(false);
  const [irpfDefault, setIrpfDefault] = useState(15);
  const [condicionesLegales, setCondicionesLegales] = useState('');
  const [lopdText, setLopdText] = useState('');
  
  // Verifactu State
  const [verifactuCert, setVerifactuCert] = useState(''); // Base64
  const [verifactuCertPassword, setVerifactuCertPassword] = useState('');
  const [verifactuEnv, setVerifactuEnv] = useState<'pruebas' | 'produccion'>('pruebas');
  
  const [isSaving, setIsSaving] = useState(false);
  const [tiposIva, setTiposIva] = useState<any[]>([]);
  const [tiposIrpf, setTiposIrpf] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  
  // Seguridad 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [securityPin, setSecurityPin] = useState('');
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

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

  // Lógica de Geolocalización Inteligente Mejorada
  useEffect(() => {
    if (cp.length === 5) {
      getFullLocationByCP(cp).then(resp => {
        if (resp) {
          setProvincia(resp.provincia);
          // Si es un pueblo (especificado) o una capital, lo cargamos
          if (resp.poblacion) {
            setPoblacion(resp.poblacion);
          }
        }
      });
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }

    // Fetch Seguridad (Perfil de Usuario)
    try {
      const { data: prof } = await supabase.from('perfiles').select('*').eq('id', userId).single();
      if (prof) {
        setTwoFactorEnabled(prof.two_factor_enabled || false);
        setSecurityPin(prof.two_factor_pin || '');
      }
    } catch (e) { console.warn("No profile found for 2FA"); }
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
      // ESTRATEGIA DETECTIVE AVANZADA
      // Probamos qué columnas existen realmente
      const checkKeys = [
        'condiciones_legales', 'lopd_text', 'forma_pago_default', 'irpf_default', 'tiene_retencion',
        'email', 'mail', 'correo', 'gemini_key', 'logo_url', 
        'verifactu_certificado', 'verifactu_pass', 'verifactu_env'
      ];
      const existingKeys: string[] = [];
      
      try {
        for (const key of checkKeys) {
          const { error } = await supabase.from('perfil_negocio').select(key).limit(0);
          if (!error) existingKeys.push(key);
        }
      } catch (e) {
        console.warn("Error detecting columns, using defaults");
        existingKeys.push('email', 'lopd_text', 'condiciones_legales');
      }
      
      const payload: any = {
        user_id: user.id,
        nombre,
        nif,
        cuenta_bancaria: cuentaBancaria.replace(/\s/g, ''),
        direccion,
        cp,
        poblacion,
        provincia
      };

      // Prioridad alta a los nombres estándar
      if (existingKeys.includes('email')) payload.email = email;
      else if (existingKeys.includes('mail')) payload.mail = email;
      else if (existingKeys.includes('correo')) payload.correo = email;

      if (existingKeys.includes('lopd_text')) payload.lopd_text = lopdText;
      if (existingKeys.includes('condiciones_legales')) payload.condiciones_legales = condicionesLegales;
      if (existingKeys.includes('forma_pago_default')) payload.forma_pago_default = formaPago;
      if (existingKeys.includes('tiene_retencion')) payload.tiene_retencion = tieneRetencion;
      if (existingKeys.includes('irpf_default')) payload.irpf_default = irpfDefault;
      if (existingKeys.includes('gemini_key')) payload.gemini_key = geminiKey;
      if (existingKeys.includes('logo_url')) payload.logo_url = logoUrl;
      
      if (existingKeys.includes('verifactu_certificado')) payload.verifactu_certificado = verifactuCert;
      if (existingKeys.includes('verifactu_pass')) {
        // Solo encriptamos si es un valor nuevo (no encriptado previamente con prefijo IV)
        payload.verifactu_pass = verifactuCertPassword.includes(':') ? verifactuCertPassword : encrypt(verifactuCertPassword);
      }
      if (existingKeys.includes('verifactu_env')) payload.verifactu_env = verifactuEnv;

      const { error } = await supabase.from('perfil_negocio').upsert(payload, { onConflict: 'user_id' });

      if (error) alert("❌ Error: " + error.message);
      else {
        alert("✅ Ajustes Corporativos Guardados");
        window.dispatchEvent(new Event('perfil_updated'));
      }
    } catch (e: any) {
      alert("❌ Error: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (!user) return;
    if (twoFactorEnabled && securityPin.length < 4) {
      alert("⚠️ Si activas 2FA, el PIN debe tener al menos 4 dígitos.");
      return;
    }
    setIsSavingSecurity(true);
    try {
      const { error } = await supabase.from('perfiles').upsert({
        id: user.id,
        two_factor_enabled: twoFactorEnabled,
        two_factor_pin: securityPin
      });
      if (error) throw error;
      alert("✅ Preferencias de seguridad actualizadas.");
    } catch (e: any) {
      alert("❌ Error: " + e.message);
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    setIsSaving(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('logos') 
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error Supabase:', uploadError);
        throw new Error('No se pudo subir. Asegúrate de crear un bucket llamado "logos" en Supabase Storage y marcarlo como PUBLIC.');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      alert('✅ Logo subido correctamente. Pulsa "Guardar Configuración" al final para aplicar los cambios en toda la App.');
    } catch (error: any) {
      alert('⚠️ ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncOfficial = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await supabase.from('tipos_iva').delete().eq('user_id', user.id);
      await supabase.from('tipos_irpf').delete().eq('user_id', user.id);

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

      await supabase.from('tipos_iva').insert(officialIva.map(i => ({ ...i, user_id: user.id })));
      await supabase.from('tipos_irpf').insert(officialIrpf.map(i => ({ ...i, user_id: user.id })));
      
      await fetchTipos();
      alert("✅ Fiscalidad Sincronizada con la Ley");
    } catch (e) {
      console.error(e);
      alert("❌ Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddTipo = async (tabla: 'tipos_iva' | 'tipos_irpf') => {
    if (!user) return;
    const nombre = prompt("Nombre del tipo (ej: IVA Cultural):");
    const valor = prompt("Valor porcentual (ej: 21):");
    if (!nombre || !valor) return;

    const { error } = await supabase.from(tabla).insert({
      user_id: user.id,
      nombre,
      valor: parseFloat(valor)
    });

    if (error) alert("Error: " + error.message);
    else fetchTipos();
  };

  const handleDeleteTipo = async (tabla: 'tipos_iva' | 'tipos_irpf', id: string) => {
    if (!confirm("¿Eliminar este tipo de impuesto?")) return;
    const { error } = await supabase.from(tabla).delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    else fetchTipos();
  };

  if (!user && !loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-12 rounded-3xl shadow-2xl border max-w-sm w-full text-center space-y-6">
        <Lock className="text-blue-600 mx-auto" size={48} />
        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Acceso Privado</h2>
        <p className="text-gray-500 text-sm italic">Identifícate para gestionar tu contabilidad.</p>
        <a href="/login" className="block w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all">Iniciar Sesión</a>
      </div>
    </div>
  );

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 overflow-y-auto text-left">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black font-head tracking-tighter text-[var(--foreground)]">Ajustes</h1>
            <p className="text-[var(--muted)] font-medium">Personalización corporativa y fiscal.</p>
          </div>
          <div className="px-5 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100 flex items-center gap-2">
            <ShieldCheck size={14} /> Contabilidad de {user.email}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-32">
          {/* COLUMNA 1: IDENTIDAD + LOGO */}
          <div className="xl:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-gray-800 border-b pb-4">
                <Building2 className="text-blue-600" /> Identidad de Empresa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">URL del Logo (PNG/JPG)</label>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="https://..." />
                      <ImageIcon size={18} className="absolute left-4 top-4.5 text-gray-300" />
                    </div>
                    <label className="flex items-center gap-2 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl cursor-pointer transition-all active:scale-95">
                      <Upload size={18} />
                      {isSaving ? 'Subiendo...' : 'Subir Imagen'}
                      <input type="file" onChange={handleFileUpload} disabled={isSaving} className="hidden" accept="image/*" />
                    </label>
                  </div>
                  {logoUrl && (
                    <div className="mt-4 p-4 rounded-2xl border border-dashed border-gray-200 inline-block bg-white shadow-sm">
                      <img src={logoUrl} alt="Preview" className="h-16 object-contain opacity-90 mx-auto" />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Razón Social</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email de Empresa</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="empresa@ejemplo.com" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">NIF / CIF</label>
                  <input type="text" value={nif} onChange={e => setNif(e.target.value.toUpperCase())} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Forma de Pago por Defecto</label>
                  <div className="relative">
                    <input type="text" value={formaPago} onChange={e => setFormaPago(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-gray-50 outline-none" placeholder="Transferencia, Bizum..." />
                    <Wallet size={18} className="absolute left-4 top-4.5 text-gray-300" />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">IBAN para Facturas</label>
                  <input type="text" value={cuentaBancaria} onChange={e => setCuentaBancaria(formatIBAN(e.target.value))} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 font-mono text-sm" />
                </div>

                <div className="grid grid-cols-3 gap-4 md:col-span-2">
                   <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Dirección</label>
                      <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50" />
                   </div>
                   <input type="text" placeholder="C.P." value={cp} maxLength={5} onChange={e => setCp(e.target.value)} className="px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-mono" />
                   <input type="text" placeholder="Ciudad" value={poblacion} onChange={e => setPoblacion(e.target.value)} className="px-5 py-4 rounded-2xl border bg-gray-50 outline-none" />
                   <input type="text" placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} className="px-5 py-4 rounded-2xl border bg-gray-50 outline-none" />
                </div>

                <div className="md:col-span-2 space-y-2 pt-4 border-t border-dashed">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex justify-between items-center">
                    Condicionado General (Pie de Factura/Presupuesto)
                    <span className="text-[9px] text-blue-500 normal-case font-medium">Aparecerá en todos tus PDFs profesionales</span>
                  </label>
                  <textarea 
                    value={condicionesLegales} 
                    onChange={e => setCondicionesLegales(e.target.value)} 
                    rows={4}
                    className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10 text-xs text-gray-600 leading-relaxed"
                    placeholder="Escribe aquí las clausulas legales generales..."
                  />
                </div>


                <div className="md:col-span-2 space-y-2 pt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    Clausula LOPD / Privacidad Predefinida
                  </label>
                  <textarea 
                    value={lopdText} 
                    onChange={e => setLopdText(e.target.value)} 
                    rows={3}
                    className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500/10 text-xs text-gray-600 leading-relaxed"
                    placeholder="Texto de protección de datos..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border p-8 shadow-sm border-purple-100">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-purple-600">
                <Brain size={24} /> Inteligencia Artificial
              </h2>
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Gemini API Key</label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-purple-600 hover:underline flex items-center gap-1"
                  >
                    Conseguir Key <ExternalLink size={10} />
                  </a>
                </div>
                <input 
                  type="password" 
                  value={geminiKey} 
                  onChange={e => setGeminiKey(e.target.value)} 
                  className="w-full px-5 py-4 rounded-2xl border bg-purple-50/20 outline-none font-mono text-xs focus:ring-2 focus:ring-purple-500/10" 
                  placeholder="Introduce tu API Key..."
                />
              </div>
            </div>
            
            {/* SEGURIDAD Y 2FA */}
            <div className="bg-white rounded-3xl border p-8 shadow-sm border-orange-100">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-orange-600">
                <ShieldCheck size={24} /> Seguridad de Acceso
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <div>
                    <h3 className="text-sm font-bold text-orange-800">Doble Factor (2FA)</h3>
                    <p className="text-[10px] text-orange-600 font-medium">Requiere un PIN de seguridad tras el login.</p>
                  </div>
                  <button 
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${twoFactorEnabled ? 'bg-orange-600 shadow-inner' : 'bg-gray-200'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {twoFactorEnabled && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">PIN de Seguridad (6 dígitos)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        maxLength={6}
                        value={securityPin} 
                        onChange={e => setSecurityPin(e.target.value.replace(/\D/g, ''))} 
                        className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-mono text-2xl tracking-[0.5em] text-center focus:ring-2 focus:ring-orange-500/10" 
                        placeholder="000000"
                      />
                      <Lock className="absolute right-5 top-5 text-gray-300" size={20} />
                    </div>
                  </div>
                )}

                <button 
                   onClick={handleSaveSecurity}
                   disabled={isSavingSecurity}
                   className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingSecurity ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Guardar Preferencias de Seguridad
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border p-8 shadow-sm border-blue-100">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-blue-600">
                <ShieldCheck size={24} /> Certificado Digital & Verifactu
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <button 
                    onClick={() => setVerifactuEnv('pruebas')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${verifactuEnv === 'pruebas' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                  >
                    Entorno Pruebas
                  </button>
                  <button 
                    onClick={() => setVerifactuEnv('produccion')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${verifactuEnv === 'produccion' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                  >
                    PRODUCCIÓN
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Archivo de Certificado (.p12 / .pfx)</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept=".p12,.pfx"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            setVerifactuCert(base64);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden" 
                      id="cert-upload"
                    />
                    <label 
                      htmlFor="cert-upload"
                      className={`w-full flex items-center justify-center gap-3 px-5 py-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${verifactuCert ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/30'}`}
                    >
                      {verifactuCert ? (
                        <>
                          <CheckCircle2 className="text-green-500" size={24} />
                          <span className="text-xs font-bold text-green-700">Certificado Cargado Correctamente</span>
                        </>
                      ) : (
                        <>
                          <Upload className="text-gray-400" size={24} />
                          <span className="text-xs font-bold text-gray-500">Haz clic para subir tu certificado</span>
                        </>
                      )}
                    </label>
                    {verifactuCert && (
                      <button onClick={() => setVerifactuCert('')} className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Contraseña del Certificado</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={verifactuCertPassword} 
                      onChange={e => setVerifactuCertPassword(e.target.value)} 
                      className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-mono text-xs focus:ring-2 focus:ring-blue-500/10" 
                      placeholder="Introduce la contraseña del archivo..."
                    />
                    <Lock className="absolute right-5 top-4 text-gray-300" size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA 2: FISCALIDAD */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8 border-b pb-4">
                <h2 className="text-lg font-bold font-head flex items-center gap-2 text-green-600">
                  <Percent size={20} /> Impuestos
                </h2>
                <button onClick={handleSyncOfficial} disabled={syncing} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all">
                  <RefreshCcw size={18} className={syncing ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tipos de IVA</p>
                    <button onClick={() => handleAddTipo('tipos_iva')} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg">
                      + Añadir IVA
                    </button>
                  </div>
                  {tiposIva.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-600">{t.nombre}</span>
                        <span className="text-xs font-black text-blue-600">{t.valor}%</span>
                      </div>
                      <button onClick={() => handleDeleteTipo('tipos_iva', t.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-4 border-t border-dashed">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tipos de IRPF</p>
                    <button onClick={() => handleAddTipo('tipos_irpf')} className="text-[10px] font-bold text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg">
                      + Añadir IRPF
                    </button>
                  </div>
                  {tiposIrpf.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-600">{t.nombre}</span>
                        <span className="text-xs font-black text-orange-600">{t.valor}%</span>
                      </div>
                      <button onClick={() => handleDeleteTipo('tipos_irpf', t.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-orange-50/20 p-4 rounded-2xl border border-orange-100">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-orange-800 tracking-tight flex items-center gap-2">
                       Emitir con IRPF
                       {tieneRetencion ? <CheckCircle2 size={14} className="text-orange-500" /> : <AlertCircle size={14} className="text-gray-300" />}
                    </p>
                    <p className="text-[10px] text-orange-600 italic">¿Debo aplicar retención en mis facturas?</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={tieneRetencion} onChange={e => setTieneRetencion(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSavePerfil} 
              disabled={isSaving} 
              className="w-full py-6 bg-gray-900 text-white font-black rounded-3xl shadow-2xl hover:bg-black transition-all transform active:scale-[0.97] flex items-center justify-center gap-3"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

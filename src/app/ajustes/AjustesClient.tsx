"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Percent,
  RefreshCcw,
  CheckCircle2,
  Loader2,
  Lock,
  ImageIcon,
  Upload,
  Trash2,
  ShieldCheck,
  CloudCheck,
  Database,
  DownloadCloud,
  RotateCcw,
  Smartphone,
  Scale,
  FileText
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { getFullLocationByCP } from '@/lib/geoData';
import { formatIBAN } from '@/lib/validations';
import { encrypt } from '@/lib/encryption';
import { totp } from '@/lib/totp';

// Componente de 2FA cargado dinámicamente para seguridad total contra errores de hidratación
import dynamic from 'next/dynamic';
const TwoFactorSetup = dynamic(() => import('@/components/TwoFactorSetup'), { 
  ssr: false 
});

export default function AjustesClient() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [autoStatus, setAutoStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isMounted, setIsMounted] = useState(false);
  
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
  const [telefono, setTelefono] = useState('');
  const [imagenCorporativaUrl, setImagenCorporativaUrl] = useState('');
  const [textoAceptacion, setTextoAceptacion] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [verifactuCert, setVerifactuCert] = useState('');
  const [verifactuCertPassword, setVerifactuCertPassword] = useState('');
  const [verifactuEnv, setVerifactuEnv] = useState<'pruebas' | 'produccion'>('pruebas');
  
  const [tiposIva, setTiposIva] = useState<any[]>([]);
  const [tiposIrpf, setTiposIrpf] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Seguridad 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  
  // Backup / Restore
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [autoBackups, setAutoBackups] = useState<any[]>([]);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    setIsMounted(true);
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
    await Promise.all([
      fetchPerfil(user.id),
      fetchTipos(),
      fetchAutoBackups(user.id)
    ]);
    initialLoadDone.current = true;
    setLoading(false);
  };

  const lastSavedPayload = useRef("");

  useEffect(() => {
    if (initialLoadDone.current && user) {
      const timer = setTimeout(() => {
        handleSaveAll();
      }, 1500); // 1.5s debounce
      return () => clearTimeout(timer);
    }
  }, [
    nombre, nif, cuentaBancaria, direccion, cp, poblacion, provincia, 
    email, geminiKey, logoUrl, imagenCorporativaUrl, formaPago, tieneRetencion, irpfDefault,
    condicionesLegales, lopdText, telefono, textoAceptacion,
    verifactuCert, verifactuCertPassword, verifactuEnv
  ]);

  const fetchAutoBackups = async (userId: string) => {
    const { data } = await supabase.from('backups').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
    setAutoBackups(data || []);
  };

  useEffect(() => {
    if (cp.length === 5) {
      getFullLocationByCP(cp).then(resp => {
        if (resp) {
          if (resp.provincia && resp.provincia !== provincia) setProvincia(resp.provincia);
          if (resp.poblacion && resp.poblacion !== poblacion) setPoblacion(resp.poblacion);
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
        setTelefono(data.telefono || '');
        setImagenCorporativaUrl(data.imagen_corporativa_url || '');
        setTextoAceptacion(data.texto_aceptacion || '');
      }
      
      const { data: prof } = await supabase.from('perfiles').select('two_factor_enabled, two_factor_secret').eq('id', userId).single();
      if (prof) {
        setTwoFactorEnabled(prof.two_factor_enabled || false);
        setTotpSecret(prof.two_factor_secret || '');
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
      const payload: any = {
        user_id: user.id,
        nombre, nif, direccion, cp, poblacion, provincia,
        cuenta_bancaria: cuentaBancaria.replace(/\s/g, ''),
        email, gemini_key: geminiKey, logo_url: logoUrl, 
        imagen_corporativa_url: imagenCorporativaUrl,
        forma_pago_default: formaPago, tiene_retencion: tieneRetencion, irpf_default: irpfDefault,
        telefono,
        condiciones_legales: condicionesLegales,
        lopd_text: lopdText,
        texto_aceptacion: textoAceptacion,
        verifactu_certificado: verifactuCert,
        verifactu_pass: verifactuCertPassword,
        verifactu_env: verifactuEnv
      };

      const payloadString = JSON.stringify(payload);
      if (payloadString === lastSavedPayload.current) {
        setAutoStatus('idle');
        return;
      }

      setSaveError(null);
      const { error } = await supabase.from('perfil_negocio').upsert(payload, { onConflict: 'user_id' });
      
      if (error) {
        console.error("Save error:", error.message);
        setSaveError(error.message);
        setAutoStatus('idle');
        return;
      }

      lastSavedPayload.current = payloadString;
      setAutoStatus('saved');
      window.dispatchEvent(new Event('perfil_updated'));
      setTimeout(() => setAutoStatus('idle'), 2000);
    } catch (e: any) {
      console.error("Critical Save error:", e.message);
      setSaveError(e.message);
      setAutoStatus('idle');
    }
  };

  const handleSaveLegales = async () => {
    if (!user) return;
    setAutoStatus('saving');
    try {
      await supabase.from('perfil_negocio').update({
        condiciones_legales: condicionesLegales,
        lopd_text: lopdText
      }).eq('user_id', user.id);
      setAutoStatus('saved');
      setTimeout(() => setAutoStatus('idle'), 2000);
    } catch (e: any) {
      console.error(e);
      setAutoStatus('idle');
    }
  };

  const triggerUpload = (target: 'logo' | 'corp') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setAutoStatus('saving');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) {
        alert("Error al subir imagen");
        setAutoStatus('idle');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      if (target === 'logo') setLogoUrl(publicUrl);
      else setImagenCorporativaUrl(publicUrl);
      
      setAutoStatus('saved');
      setTimeout(() => setAutoStatus('idle'), 2000);
    };
    input.click();
  };

  const setup2FA = () => {
    const secret = totp.generateSecret();
    const otpauth = totp.generateUri(user.email, secret);
    setTotpSecret(secret);
    setQrUrl(otpauth);
    setIsSettingUp2FA(true);
  };

  const confirm2FA = async () => {
    if (totp.check(verifyToken, totpSecret)) {
      setTwoFactorEnabled(true);
      setIsSettingUp2FA(false);
      setVerifyToken('');
      
      // Guardado explícito de 2FA
      const { error } = await supabase.from('perfiles').upsert({ 
        id: user.id, 
        two_factor_enabled: true, 
        two_factor_secret: totpSecret 
      });

      if (error) {
        console.error("Error guardando 2FA:", error);
        alert("⚠️ El código es correcto, pero hubo un error al guardar en la base de datos. Verifica el SQL de migración.");
      } else {
        alert("✅ 2FA Activado perfectamente.");
      }
    } else {
      alert("❌ Código inválido.");
    }
  };

  const disable2FA = async () => {
    if (confirm("¿Desactivar doble factor?")) {
      setTwoFactorEnabled(false);
      setTotpSecret('');
      setTimeout(() => handleSaveAll(), 100);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const fileName = `${user.id}-${Math.random()}.${file.name.split('.').pop()}`;
    setIsSaving(true);
    try {
      await supabase.storage.from('logos').upload(fileName, file);
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
      await supabase.from('tipos_iva').insert([
        { user_id: user.id, nombre: 'IVA General', valor: 21 },
        { user_id: user.id, nombre: 'IVA Reducido', valor: 10 },
        { user_id: user.id, nombre: 'IVA Superreducido', valor: 4 },
        { user_id: user.id, nombre: 'Exento', valor: 0 }
      ]);
      await supabase.from('tipos_irpf').insert([
        { user_id: user.id, nombre: 'IRPF Profesional', valor: 15 },
        { user_id: user.id, nombre: 'IRPF Nuevos Auton.', valor: 7 },
        { user_id: user.id, nombre: 'IRPF Alquileres', valor: 19 }
      ]);
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

  const handleExportBackup = async () => {
    if (!confirm("Se generará un archivo. ¿Continuar?")) return;
    setIsBackupLoading(true);
    try {
      const tables = ['clientes', 'proveedores', 'proyectos', 'proyecto_lineas', 'ventas', 'venta_lineas', 'costes', 'coste_lineas', 'cobros', 'pagos', 'perfil_negocio', 'tipos_iva', 'tipos_irpf', 'perfiles', 'proyecto_documentos'];
      const backupData: any = { version: "1.0", timestamp: new Date().toISOString(), user: user.email, data: {} };
      for (const table of tables) {
        const { data } = await supabase.from(table).select('*');
        backupData.data[table] = data || [];
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GP_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (e: any) { alert("Error"); } finally { setIsBackupLoading(false); }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("¿Restaurar copia?")) return;
    setIsRestoreLoading(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const data = backup.data || backup;
      for (const table in data) {
        if (data[table]?.length > 0) await supabase.from(table).upsert(data[table]);
      }
      alert("✅ Restauración terminada.");
      window.location.reload();
    } catch (e: any) { alert("Error"); } finally { setIsRestoreLoading(false); }
  };

  if (loading) return null; // El shell se encarga del loading inicial

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-4 font-sans">
      <div className="bg-white p-12 rounded-3xl shadow-2xl border max-w-sm w-full text-center space-y-6">
        <Lock className="text-blue-600 mx-auto" size={48} />
        <h2 className="text-2xl font-black text-gray-800 tracking-tight text-balance">Acceso Restringido</h2>
        <a href="/login" className="block w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg transition-all font-sans">Identificarse</a>
      </div>
    </div>
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 overflow-y-auto text-left font-sans">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black font-head tracking-tighter text-[var(--foreground)]">Ajustes</h1>
            <p className="text-[var(--muted)] font-medium font-sans">Control corporativo y seguridad avanzada.</p>
          </div>
          <div className={`px-5 py-2 rounded-full text-xs font-bold border flex items-center gap-2 transition-all duration-300 font-sans ${autoStatus === 'saving' ? 'bg-blue-50 text-blue-600 border-blue-100' : autoStatus === 'saved' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
            {autoStatus === 'saving' ? <Loader2 className="animate-spin" size={14} /> : autoStatus === 'saved' ? <CheckCircle2 size={14} /> : <ShieldCheck size={14} />}
            {autoStatus === 'saving' ? 'Guardando...' : autoStatus === 'saved' ? 'Sincronizado' : `Sesión: ${user.email}`}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-32">
          <div className="xl:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-gray-800 border-b pb-4">
                <Building2 className="text-blue-600" /> Identidad de Empresa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Logo Corporativo</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                       <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="w-full pl-12 pr-5 py-4 rounded-2xl border bg-gray-50 outline-none font-sans text-xs text-gray-400 truncate" placeholder="https://..." />
                       <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    </div>
                    <button onClick={() => triggerUpload('logo')} className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm">
                      <Upload size={18} /> Subir
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Imagen Corporativa (PDF)</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                       <input type="text" value={imagenCorporativaUrl} onChange={e => setImagenCorporativaUrl(e.target.value)} className="w-full pl-12 pr-5 py-4 rounded-2xl border bg-gray-50 outline-none font-sans text-xs text-gray-400 truncate" placeholder="https://..." />
                       <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    </div>
                    <button onClick={() => triggerUpload('corp')} className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm">
                      <Upload size={18} /> Subir
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Razón Social</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-sans" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">NIF / CIF</label>
                  <input type="text" value={nif} onChange={e => setNif(e.target.value.toUpperCase())} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-sans" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">IBAN Principal</label>
                  <input type="text" value={cuentaBancaria} onChange={e => setCuentaBancaria(formatIBAN(e.target.value))} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 font-mono text-sm" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Teléfono de Contacto</label>
                  <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-sans" placeholder="+34 ..." />
                </div>

                <div className="grid grid-cols-3 gap-4 md:col-span-2">
                   <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Dirección Administrativa</label>
                      <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 font-sans" />
                   </div>
                   <input type="text" placeholder="C.P." value={cp} maxLength={5} onChange={e => setCp(e.target.value)} className="px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-mono" />
                   <input type="text" placeholder="Ciudad" value={poblacion} onChange={e => setPoblacion(e.target.value)} className="px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-sans" />
                   <input type="text" placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} className="px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-sans" />
                </div>
              </div>

              {saveError && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold font-sans animate-in slide-in-from-top-2">
                  ⚠️ Error al guardar: {saveError}.
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border p-8 shadow-sm border-purple-50">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-purple-600 border-b pb-4">
                <RefreshCcw size={24} /> Inteligencia Artificial
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Gemini API Key (Google Cloud)</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={geminiKey} 
                      onChange={e => setGeminiKey(e.target.value)} 
                      className="w-full pl-12 pr-12 py-4 rounded-2xl border bg-gray-50 outline-none font-mono text-sm focus:ring-4 focus:ring-purple-500/5 focus:bg-white transition-all transition-all" 
                      placeholder="Introduce tu clave AIzaSy..." 
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2 pl-1 leading-relaxed">
                    💡 Esta clave permite que GestiónPro analice tus PDFs de gastos automáticamente mediante Google Gemini. 
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="ml-1 text-purple-600 hover:underline font-bold">Consigue una gratis aquí</a>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-gray-800 border-b pb-4">
                <Scale className="text-orange-600" size={24} /> Cláusulas Legales
              </h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans flex items-center gap-2">
                    <FileText size={14} /> Condiciones Generales (Pie de Presupuestos)
                  </label>
                  <textarea 
                    value={condicionesLegales} 
                    onChange={e => setCondicionesLegales(e.target.value)} 
                    rows={4}
                    className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-sans text-sm resize-none focus:bg-white transition-colors"
                    placeholder="Escribe aquí las condiciones generales que aparecerán en tus presupuestos..."
                  />
                  <p className="text-[9px] text-gray-400 italic pl-1">💡 Consejo: Puedes usar EMAIL_PLACEHOLDER que se sustituirá por tu email corporativo automáticamente.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans flex items-center gap-2">
                    <ShieldCheck size={14} /> Texto LOPD (Protección de Datos)
                  </label>
                  <textarea 
                    value={lopdText} 
                    onChange={e => setLopdText(e.target.value)} 
                    rows={4}
                    className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-sans text-sm resize-none focus:bg-white transition-colors"
                    placeholder="Texto legal obligatorio para la protección de datos..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans flex items-center gap-2">
                    <CheckCircle2 size={14} /> Texto de Aceptación (Espacio para Firma)
                  </label>
                  <textarea 
                    value={textoAceptacion} 
                    onChange={e => setTextoAceptacion(e.target.value)} 
                    rows={3}
                    className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-sans text-sm resize-none focus:bg-white transition-colors"
                    placeholder="Ej: Acepto el presente presupuesto y las condiciones generales descritas..."
                  />
                </div>

                <div className="pt-4 border-t border-dashed flex justify-end">
                  <button 
                    onClick={handleSaveLegales}
                    className="px-6 py-3 bg-gray-900 text-white font-bold rounded-2xl shadow-lg text-sm"
                  >
                    Guardar Cláusulas
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border p-8 shadow-sm border-orange-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-orange-600 rotate-12">
                 <Smartphone size={160} />
              </div>
              <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3 text-orange-600 relative z-10">
                <ShieldCheck size={24} /> Verificación de Doble Factor
              </h2>
              
              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between p-6 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <div className="flex gap-4 items-center">
                    <div className={`p-3 rounded-xl ${twoFactorEnabled ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                       <Smartphone size={24} />
                    </div>
                    <div className="font-sans">
                      <h3 className="text-sm font-bold text-gray-800">Capa de Seguridad Estándar</h3>
                      <p className="text-[10px] text-gray-500 font-medium">Usa tu App de Authenticator favorita.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => twoFactorEnabled ? disable2FA() : setup2FA()}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all font-sans ${twoFactorEnabled ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' : 'bg-orange-600 text-white shadow-lg shadow-orange-100 hover:bg-orange-700'}`}
                  >
                    {twoFactorEnabled ? 'DESACTIVAR' : 'CONFIGURAR'}
                  </button>
                </div>

                {isSettingUp2FA && isMounted && (
                  <TwoFactorSetup 
                    qrUrl={qrUrl}
                    verifyToken={verifyToken}
                    setVerifyToken={setVerifyToken}
                    onConfirm={confirm2FA}
                    onCancel={() => setIsSettingUp2FA(false)}
                  />
                )}

                {twoFactorEnabled && !isSettingUp2FA && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-100 text-green-700 animate-in fade-in duration-500 font-sans">
                     <CheckCircle2 size={20} />
                     <span className="text-xs font-bold">Seguridad activa mediante código dinámico externo.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-3xl border p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8 border-b pb-4">
                <h2 className="text-lg font-bold font-head flex items-center gap-2 text-green-600"><Percent size={20} /> Fiscalidad</h2>
                <button onClick={handleSyncOfficial} disabled={syncing} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"><RefreshCcw size={18} className={syncing ? 'animate-spin' : ''} /></button>
              </div>
              <div className="space-y-6 text-left">
                 <div className="font-sans text-xs">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tabla de IVA</p>
                      <button onClick={() => handleAddTipo('tipos_iva')} className="text-[10px] font-bold text-blue-600">+ Añadir</button>
                    </div>
                    <div className="space-y-2">
                      {tiposIva.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                          <span className="font-bold text-gray-600">{t.nombre} ({t.valor}%)</span>
                          <button onClick={() => handleDeleteTipo('tipos_iva', t.id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-sans"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-dashed font-sans text-xs">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tabla de IRPF (General)</p>
                      <button onClick={() => handleAddTipo('tipos_irpf')} className="text-[10px] font-bold text-orange-600">+ Añadir</button>
                    </div>
                    <div className="space-y-2">
                        {tiposIrpf.map(t => (
                          <div key={t.id} className="flex justify-between items-center p-3 bg-orange-50/30 rounded-2xl border border-orange-100 group">
                            <span className="font-bold text-gray-600">{t.nombre} ({t.valor}%)</span>
                            <button onClick={() => handleDeleteTipo('tipos_irpf', t.id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-sans"><Trash2 size={14} /></button>
                          </div>
                        ))}
                    </div>
                 </div>

                 <div className="flex items-center justify-between bg-orange-50/20 p-4 rounded-2xl border border-orange-100 mt-4 font-sans">
                    <div className="font-sans">
                      <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest mb-1">Retención Activa</p>
                      <p className="text-[9px] text-orange-600 leading-tight">Activar IRPF por defecto en Facturas Emitidas (Ventas).</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={tieneRetencion} onChange={e => setTieneRetencion(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                 </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl border p-8 shadow-sm border-blue-100 font-sans">
              <h2 className="text-lg font-bold font-head mb-6 flex items-center gap-2 text-blue-600"><Database size={20} /> Salvaguarda</h2>
              <div className="space-y-4 text-xs font-sans">
                <button onClick={handleExportBackup} disabled={isBackupLoading} className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl border border-blue-100 transition-all group text-left">
                  <div>
                    <p className="font-bold text-blue-800">Snapshot Manual</p>
                    <p className="text-[9px] text-blue-600 italic">Descargar volcado .json</p>
                  </div>
                  <DownloadCloud size={20} className="text-blue-400 group-hover:scale-110 transition-all" />
                </button>
                <div className="relative">
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" id="restore-up" />
                  <label htmlFor="restore-up" className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 cursor-pointer group">
                    <div className="text-left">
                      <p className="font-bold text-gray-700">Restaurar Snapshot</p>
                      <p className="text-[9px] text-gray-400 italic">Importar desde archivo externo</p>
                    </div>
                    <RotateCcw size={20} className="text-gray-300 group-hover:rotate-180 transition-all duration-500" />
                  </label>
                </div>

                {autoBackups.length > 0 && (
                  <div className="pt-4 border-t border-dashed space-y-3 font-sans">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Autoguardado Cloud</p>
                    <div className="space-y-2">
                       {autoBackups.map(b => (
                         <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-[10px]">
                            <div className="flex flex-col">
                               <span className="font-bold text-gray-700">{b.nombre}</span>
                               <span className="text-[9px] text-gray-400 italic">{(b.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                            <div className="flex gap-1">
                               <a href={b.archivo_url} download className="p-1.5 hover:bg-white rounded-lg text-blue-600 transition-all font-sans"><DownloadCloud size={14} /></a>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-10 bg-gradient-to-br from-gray-900 to-black rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                 <ShieldCheck size={120} />
               </div>
               <h3 className="text-lg font-black tracking-tight mb-2 font-sans">Seguridad Bancaria</h3>
               <p className="text-xs text-gray-400 leading-relaxed font-sans">Encriptación total AES-256 para tus llaves maestras y backups.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

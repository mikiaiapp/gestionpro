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
  FileText,
  Table,
  LayoutGrid
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Sidebar } from '@/components/Sidebar';
import RichTextEditor from '@/components/RichTextEditor';
import { getFullLocationByCP } from '@/lib/geoData';
import { formatIBAN } from '@/lib/validations';
import { encrypt, decrypt } from '@/lib/encryption';
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
  const [web, setWeb] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [perfilId, setPerfilId] = useState<string | null>(null);

  // Contadores y Series
  const [contadorVentas, setContadorVentas] = useState(1);
  const [contadorCostes, setContadorCostes] = useState(1);
  const [contadorProyectos, setContadorProyectos] = useState(1);
  const [serieVentas, setSerieVentas] = useState('A');
  const [serieCostes, setSerieCostes] = useState('A');
  const [serieProyectos, setSerieProyectos] = useState('P');
  const [prefijoVentas, setPrefijoVentas] = useState('');
  const [prefijoCostes, setPrefijoCostes] = useState('');
  const [prefijoProyectos, setPrefijoProyectos] = useState('');
  
  const [verifactuCert, setVerifactuCert] = useState('');
  const [verifactuCertPassword, setVerifactuCertPassword] = useState('');
  const [verifactuEnv, setVerifactuEnv] = useState<'pruebas' | 'produccion'>('pruebas');
  
  // Email SMTP
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [useGmailPreset, setUseGmailPreset] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<'ok' | 'error' | null>(null);
  
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
  
  // Excel Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ total: number, success: number, errors: string[] } | null>(null);

  const initialLoadDone = useRef(false);
  const latestValuesRef = useRef<any>(null);

  // Mantener el ref actualizado sincronamente para que el guardado en unmount tenga siempre lo último
  latestValuesRef.current = {
    nombre, nif, direccion, cp, poblacion, provincia, cuentaBancaria, 
    email, geminiKey, logoUrl, imagenCorporativaUrl, formaPago, tieneRetencion, irpfDefault,
    condicionesLegales, lopdText, telefono, textoAceptacion, web,
    verifactuCert, verifactuCertPassword, verifactuEnv,
    smtpEmail, smtpPassword, smtpHost, smtpPort,
    contadorVentas, contadorCostes, contadorProyectos,
    serieVentas, serieCostes, serieProyectos,
    prefijoVentas, prefijoCostes, prefijoProyectos
  };

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
      fetchTipos(user.id),
      fetchAutoBackups(user.id)
    ]);
    initialLoadDone.current = true;
    setLoading(false);
  };

  const lastSavedPayload = useRef("");

  useEffect(() => {
    // Solo disparamos el auto-guardado si la carga inicial ha terminado del todo
    if (initialLoadDone.current && user && !loading) {
      const timer = setTimeout(() => {
        handleSaveAll();
      }, 1500); // 1.5s debounce
      return () => clearTimeout(timer);
    }
  }, [
    nombre, nif, cuentaBancaria, direccion, cp, poblacion, provincia, 
    email, geminiKey, logoUrl, imagenCorporativaUrl, formaPago, tieneRetencion, irpfDefault,
    condicionesLegales, lopdText, telefono, textoAceptacion, web,
    verifactuCert, verifactuCertPassword, verifactuEnv,
    contadorVentas, contadorCostes, contadorProyectos,
    serieVentas, serieCostes, serieProyectos,
    prefijoVentas, prefijoCostes, prefijoProyectos,
    smtpEmail, smtpPassword, smtpHost, smtpPort
  ]);


  // Guardado al desmontar (por si el usuario sale antes del timeout)
  useEffect(() => {
    return () => {
      // El navegador/React a veces corta las llamadas asíncronas en unmount,
      // pero en una SPA la navegación interna suele permitir completar el fetch.
      if (initialLoadDone.current) {
        handleSaveAll();
      }
    };
  }, []);

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
        setPerfilId(data.id);
        setNombre(data.nombre || '');
        setNif(data.nif || '');
        const rawIBAN = data.cuenta_bancaria || '';
        const decryptedIBAN = rawIBAN.includes(':') ? decrypt(rawIBAN) : rawIBAN;
        setCuentaBancaria(decryptedIBAN ? formatIBAN(decryptedIBAN) : '');
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
        const rawVfPass = data.verifactu_pass || '';
        const decVfPass = rawVfPass.includes(':') ? decrypt(rawVfPass) : rawVfPass;
        setVerifactuCertPassword(decVfPass);
        setVerifactuEnv(data.verifactu_env || 'pruebas');
        setTelefono(data.telefono || '');
        setImagenCorporativaUrl(data.imagen_corporativa_url || '');
        setTextoAceptacion(data.texto_aceptacion || '');
        setWeb(data.web || '');
        const rawSmtpPass = data.smtp_app_password || '';
        setSmtpEmail(data.smtp_email || '');
        setSmtpPassword(rawSmtpPass.includes(':') ? decrypt(rawSmtpPass) : rawSmtpPass);
        setSmtpHost(data.smtp_host || 'smtp.gmail.com');
        setSmtpPort(data.smtp_port || '587');
        setUseGmailPreset(data.smtp_host === 'smtp.gmail.com' || !data.smtp_host);

        // Contadores
        setContadorVentas(data.contador_ventas || 1);
        setContadorCostes(data.contador_costes || 1);
        setContadorProyectos(data.contador_proyectos || 1);
        setSerieVentas(data.serie_ventas || 'A');
        setSerieCostes(data.serie_costes || 'A');
        setSerieProyectos(data.serie_proyectos || 'P');
        setPrefijoVentas(data.prefijo_ventas || '');
        setPrefijoCostes(data.prefijo_costes || '');
        setPrefijoProyectos(data.prefijo_proyectos || '');

        // Inicializamos el comparador con los datos recién cargados para evitar que el primer render dispare un auto-save
        const rawIBAN_init = data.cuenta_bancaria || '';
        const decryptedIBAN_init = rawIBAN_init.includes(':') ? decrypt(rawIBAN_init) : rawIBAN_init;
        const rawVfPass_init = data.verifactu_pass || '';
        const decVfPass_init = rawVfPass_init.includes(':') ? decrypt(rawVfPass_init) : rawVfPass_init;
        const rawSmtpPass_init = data.smtp_app_password || '';
        const decSmtpPass_init = rawSmtpPass_init.includes(':') ? decrypt(rawSmtpPass_init) : rawSmtpPass_init;

        lastSavedPayload.current = JSON.stringify({
          nombre: data.nombre || '', nif: data.nif || '', direccion: data.direccion || '', cp: data.cp || '', poblacion: data.poblacion || '', provincia: data.provincia || '', 
          cuentaBancaria: decryptedIBAN_init ? formatIBAN(decryptedIBAN_init) : '', 
          email: data.email || '', geminiKey: data.gemini_key || '', logoUrl: data.logo_url || '', imagenCorporativaUrl: data.imagen_corporativa_url || '', 
          formaPago: data.forma_pago_default || 'Transferencia Bancaria', tieneRetencion: data.tiene_retencion || false, irpfDefault: Number(data.irpf_default) || 0,
          condicionesLegales: data.condiciones_legales || '', lopdText: data.lopd_text || '', telefono: data.telefono || '', textoAceptacion: data.texto_aceptacion || '', web: data.web || '',
          verifactuCert: data.verifactu_certificado || '', verifactuCertPassword: decVfPass_init, verifactuEnv: data.verifactu_env || 'pruebas',
          smtpEmail: data.smtp_email || '', smtpPassword: decSmtpPass_init, smtpHost: data.smtp_host || 'smtp.gmail.com', smtpPort: data.smtp_port || '587',
          contadorVentas: data.contador_ventas || 1, contadorCostes: data.contador_costes || 1, contadorProyectos: data.contador_proyectos || 1,
          serieVentas: data.serie_ventas || 'A', serieCostes: data.serie_costes || 'A', serieProyectos: data.serie_proyectos || 'P',
          prefijoVentas: data.prefijo_ventas || '', prefijoCostes: data.prefijo_costes || '', prefijoProyectos: data.prefijo_proyectos || ''
        });
      }
      
      const { data: prof } = await supabase.from('perfiles').select('two_factor_enabled, two_factor_secret').eq('id', userId).single();
      if (prof) {
        setTwoFactorEnabled(prof.two_factor_enabled || false);
        setTotpSecret(prof.two_factor_secret || '');
      }
    } catch (e) { console.error(e); }
  };

  const fetchTipos = async (userId: string) => {
    const { data: iva } = await supabase.from('tipos_iva').select('*').eq('user_id', userId).order('valor', { ascending: false });
    const { data: irpf } = await supabase.from('tipos_irpf').select('*').eq('user_id', userId).order('valor', { ascending: false });
    setTiposIva(iva || []);
    setTiposIrpf(irpf || []);
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setAutoStatus('saving');
    const vals = latestValuesRef.current || { 
      nombre, nif, direccion, cp, poblacion, provincia, cuentaBancaria, 
      email, geminiKey, logoUrl, imagenCorporativaUrl, formaPago, tieneRetencion, irpfDefault,
      condicionesLegales, lopdText, telefono, textoAceptacion, web,
      verifactuCert, verifactuCertPassword, verifactuEnv,
      smtpEmail, smtpPassword, smtpHost, smtpPort,
      contadorVentas, contadorCostes, contadorProyectos,
      serieVentas, serieCostes, serieProyectos,
      prefijoVentas, prefijoCostes, prefijoProyectos
    };

    try {
      const payload: any = {
        id: perfilId,
        user_id: user.id,
        nombre: vals.nombre, 
        nif: vals.nif, 
        direccion: vals.direccion, 
        cp: vals.cp, 
        poblacion: vals.poblacion, 
        provincia: vals.provincia,
        cuenta_bancaria: encrypt(vals.cuentaBancaria.replace(/\s/g, '')),
        email: vals.email, 
        gemini_key: vals.geminiKey, 
        logo_url: vals.logoUrl, 
        imagen_corporativa_url: vals.imagenCorporativaUrl,
        forma_pago_default: vals.formaPago, 
        tiene_retencion: vals.tieneRetencion, 
        irpf_default: vals.irpfDefault,
        telefono: vals.telefono,
        condiciones_legales: vals.condicionesLegales,
        lopd_text: vals.lopdText,
        texto_aceptacion: vals.textoAceptacion,
        web: vals.web,
        verifactu_certificado: vals.verifactuCert,
        verifactu_pass: encrypt(vals.verifactuCertPassword),
        verifactu_env: vals.verifactuEnv,
        smtp_email: vals.smtpEmail,
        smtp_app_password: vals.smtpPassword ? encrypt(vals.smtpPassword) : '',
        smtp_host: vals.smtpHost,
        smtp_port: vals.smtpPort,
        contador_ventas: vals.contadorVentas,
        contador_costes: vals.contadorCostes,
        contador_proyectos: vals.contadorProyectos,
        serie_ventas: vals.serieVentas,
        serie_costes: vals.serieCostes,
        serie_proyectos: vals.serieProyectos,
        prefijo_ventas: vals.prefijoVentas,
        prefijo_costes: vals.prefijoCostes,
        prefijo_proyectos: vals.prefijoProyectos
      };

      // Comparamos estados brutos para evitar bucles por el IV aleatorio del cifrado
      const stateToCompare = JSON.stringify(vals);

      if (stateToCompare === lastSavedPayload.current) {
        setAutoStatus('idle');
        return;
      }

      setSaveError(null);
      const { error } = await supabase.from('perfil_negocio').upsert(payload, { onConflict: 'user_id' });
      
      if (error) {
        console.error("Save error:", error.message);
        setSaveError(error.message);
        setAutoStatus('idle');
        alert("❌ Error al guardar datos en la base de datos: " + error.message);
        return;
      }

      lastSavedPayload.current = stateToCompare;
      setAutoStatus('saved');
      window.dispatchEvent(new Event('perfil_updated'));
      setTimeout(() => setAutoStatus('idle'), 2000);
    } catch (e: any) {
      console.error("Critical Save error:", e.message);
      setSaveError(e.message);
      setAutoStatus('idle');
      alert("❌ Fallo crítico al intentar guardar (posible error de cifrado): " + e.message);
    }
  };

  const handleSaveLegales = async () => {
    if (!user) return;
    setAutoStatus('saving');
    try {
      await supabase.from('perfil_negocio').update({
        condiciones_legales: condicionesLegales,
        lopd_text: lopdText,
        forma_pago_default: formaPago
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
      if (!file || !user) return;

      setAutoStatus('saving');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      // Aislamiento Físico: Usar carpeta del usuario
      const filePath = `${user.id}/logos/${fileName}`;

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
    const filePath = `${user.id}/logos/${fileName}`;
    setIsSaving(true);
    try {
      await supabase.storage.from('logos').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
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
      fetchTipos(user.id);
    } catch (e) { console.error(e); } finally { setSyncing(false); }
  };

  const handleAddTipo = async (tabla: 'tipos_iva' | 'tipos_irpf') => {
    if (!user) return;
    const n = prompt("Nombre:");
    const v = prompt("Valor %:");
    if (n && v) {
      await supabase.from(tabla).insert({ user_id: user.id, nombre: n, valor: parseFloat(v) });
      fetchTipos(user.id);
    }
  };

  const handleDeleteTipo = async (tabla: 'tipos_iva' | 'tipos_irpf', id: string) => {
    if (confirm("¿Eliminar?")) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from(tabla).delete().eq('id', id).eq('user_id', user.id);
      fetchTipos(user.id);
    }
  };

  const handleExportBackup = async () => {
    if (!confirm("Se generará un archivo ZIP integral (Datos + PDFs). ¿Continuar?")) return;
    setIsBackupLoading(true);
    try {
      const { createFullBackupZIP } = await import('@/lib/backup');
      const blob = await createFullBackupZIP(user);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GP_FULL_BACKUP_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
    } catch (e: any) { alert("Error al generar backup: " + e.message); } finally { setIsBackupLoading(false); }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("¿Restaurar copia integral (ZIP o JSON)? Esto reemplazará o añadirá datos a tu cuenta actual.")) return;
    setIsRestoreLoading(true);
    try {
      let text = "";
      let zip: any = null;
      if (file.name.endsWith('.zip')) {
        const JSZip = (await import('jszip')).default;
        zip = await JSZip.loadAsync(file);
        const dataFile = zip.file("data.json");
        if (!dataFile) throw new Error("No se encontró data.json dentro del ZIP");
        text = await dataFile.async("string");
      } else {
        text = await file.text();
      }

      const backup = JSON.parse(text);
      const data = backup.data || backup;
      const urlFields = ['pdf_url', 'archivo_url', 'url_archivo', 'logo_url', 'imagen_corporativa_url'];

      for (const table in data) {
        if (!Array.isArray(data[table])) continue;
        
        console.log(`♻️ Restaurando tabla: ${table}...`);
        for (const row of data[table]) {
          // 1. Asegurar pertenencia al usuario actual
          if ('user_id' in row) row.user_id = user.id;

          // 2. Re-siembra de archivos si es un ZIP
          if (zip) {
            for (const field of urlFields) {
              if (row[field] && typeof row[field] === 'string' && row[field].includes('supabase')) {
                const parts = row[field].split('/');
                const originalFilename = parts[parts.length - 1]?.split('?')[0];
                const zipFile = zip.file(`documentos/${originalFilename}`);
                
                if (zipFile) {
                  const blob = await zipFile.async("blob");
                  const cleanFilename = `${Date.now()}_${originalFilename}`;
                  const storagePath = `restored/${cleanFilename}`;
                  
                  const { error: upErr } = await supabase.storage.from('facturas').upload(storagePath, blob);
                  if (!upErr) {
                    const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(storagePath);
                    row[field] = publicUrl;
                  }
                }
              }
            }
          }

          // 3. Inserción
          await supabase.from(table).upsert(row);
        }
      }
      alert("✅ Restauración completada con éxito. Todos los documentos han sido re-sincronizados.");
      window.location.reload();
    } catch (e: any) { 
      alert("Error en restauración: " + e.message); 
    } finally { 
      setIsRestoreLoading(false); 
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: smtpEmail,
          subject: '✅ Prueba de Conexión — GestiónPro',
          body: 'Si recibes este email, la configuración SMTP está correcta.',
          smtpEmail,
          smtpPassword,
          smtpHost,
          smtpPort,
          senderName: nombre
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailTestResult('ok');
        // Forzamos un guardado inmediato si la prueba es exitosa
        handleSaveAll();
      } else {
        setEmailTestResult('error');
        setSaveError(data.error || 'Error al validar conexión');
      }
    } catch (err: any) {
      console.error(err);
      setEmailTestResult('error');
      setSaveError(err.message || 'Fallo crítico en la conexión');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');

    setIsImporting(true);
    setImportResults(null);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Agrupar filas por factura (NIF + Número) para soportar múltiples bases de IVA
      const groupedData: Record<string, any[]> = {};
      for (const row of jsonData) {
        if (!row.proveedor_nif || !row.num_factura) continue;
        const key = `${row.proveedor_nif.toString().trim()}_${row.num_factura.toString().trim()}`;
        if (!groupedData[key]) groupedData[key] = [];
        groupedData[key].push(row);
      }

      // 0. Probar columnas reales para evitar errores de esquema (Smart Mapping)
      const { data: probe } = await supabase.from('costes').select('*').limit(1);
      const cols = (probe && probe.length > 0) ? Object.keys(probe[0]) : [];
      const findKey = (options: string[]) => options.find(o => cols.includes(o));

      // 0.1 Obtener Perfil y Numeración Secuencial para el Libro de IVA
      const { data: perf } = await supabase.from('perfil_negocio').select('*').eq('user_id', user.id).maybeSingle();
      const prefix = perf?.prefijo_costes || "";
      const { data: existingNums } = await supabase.from('costes').select('num_interno, registro_interno, numero').eq('user_id', user.id);
      const usedNumbers = (existingNums || [])
        .map(c => {
          const val = c.num_interno || c.registro_interno || c.numero || "";
          if (prefix && !val.startsWith(prefix)) return NaN;
          return parseInt(prefix ? val.slice(prefix.length) : val, 10);
        })
        .filter(n => !isNaN(n));
      
      let nextSequential = perf?.contador_costes || 1;
      while (usedNumbers.includes(nextSequential)) {
        nextSequential++;
      }

      const entries = Object.entries(groupedData);
      for (let i = 0; i < entries.length; i++) {
        const [key, rows] = entries[i];
        const firstRow = rows[0];
        try {
          const rawNif = firstRow.proveedor_nif || firstRow.nif_proveedor || firstRow.nif || firstRow.nif_emisor || firstRow.CIF || firstRow.cif;
          const { fecha, num_factura, proveedor_nombre } = firstRow;
          
          if (!fecha || !num_factura || !proveedor_nombre || !rawNif) {
            errors.push(`Grupo ${key}: Faltan campos obligatorios (fecha, num_factura, nombre o NIF).`);
            continue;
          }

          // 1. Buscar o Crear Proveedor
          const cleanNif = rawNif.toString().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          let { data: prov } = await supabase.from('proveedores').select('id').eq('user_id', user.id).eq('nif', cleanNif).maybeSingle();

          if (!prov) {
            const { data: newProv, error: pErr } = await supabase.from('proveedores').insert({
              user_id: user.id,
              nombre: proveedor_nombre,
              nif: cleanNif,
              direccion: firstRow.proveedor_direccion || '',
              codigo_postal: firstRow.proveedor_cp || '',
              poblacion: firstRow.proveedor_poblacion || '',
              provincia: firstRow.proveedor_provincia || ''
            }).select('id').single();
            
            if (pErr) throw new Error(`Error creando proveedor: ${pErr.message}`);
            prov = newProv;
          }

          // 2. Comprobar duplicado o registro existente para actualizar
          const colNum = findKey(['num_factura_proveedor', 'numero_factura', 'num_factura', 'factura_prov', 'referencia']) || 'num_factura_proveedor';
          const { data: exist } = await supabase.from('costes')
            .select('id, num_interno, registro_interno, numero')
            .eq('user_id', user.id)
            .eq('proveedor_id', prov.id)
            .eq(colNum, num_factura.toString())
            .maybeSingle();

          // 3. Totales del Grupo
          let totalBI = 0;
          let totalIVA = 0;
          let totalRet = 0;
          for (const r of rows) {
            const bi = parseFloat(r.base_imponible) || 0;
            const ipct = parseFloat(r.iva_pct) || 0;
            const rpct = parseFloat(r.retencion_pct) || 0;
            totalBI += bi;
            totalIVA += bi * (ipct / 100);
            totalRet += bi * (rpct / 100);
          }

          // Fecha
          let finalFecha = fecha;
          if (typeof fecha === 'number') {
            finalFecha = new Date((fecha - (25567 + 1)) * 86400 * 1000).toISOString().split('T')[0];
          } else if (typeof fecha === 'string' && fecha.includes('/')) {
            const [d, m, a] = fecha.split('/');
            finalFecha = `${a}-${m}-${d}`;
          }

          const internalNum = `${prefix}${nextSequential}`;
          const payload: any = {
            user_id: user.id,
            fecha: finalFecha,
            total: totalBI + totalIVA - totalRet,
            estado_pago: firstRow.estado_pago || 'Pendiente',
            tipo_gasto: 'general'
          };

          const setIfFound = (options: string[], value: any, target: any = payload) => {
            const k = findKey(options);
            if (k) target[k] = value;
          };

          if (exist) {
            // Durante la re-importación total, actualizamos el número de registro y el proveedor/NIF para asegurar coherencia
            const updatePayload: any = {};
            setIfFound(['proveedor_id', 'id_proveedor'], prov.id, updatePayload);
            setIfFound(['num_interno', 'registro_interno', 'numero'], internalNum, updatePayload);
            
            const { error: uErr } = await supabase.from('costes').update(updatePayload).eq('id', exist.id);
            if (uErr) throw new Error(`Error actualizando: ${uErr.message}`);
            
            nextSequential++;
            successCount += rows.length;
            continue;
          }

          // 4. Inserción Nueva
          setIfFound(['num_interno', 'registro_interno', 'numero'], internalNum);
          setIfFound(['nif_proveedor', 'proveedor_nif', 'nif'], cleanNif); // Asegurar que el NIF se guarda directamente
          setIfFound(['serie_costes', 'serie'], perf?.serie_costes || 'A');
          setIfFound(['num_factura_proveedor', 'numero_factura', 'num_factura', 'factura_prov', 'referencia'], num_factura.toString());
          setIfFound(['proveedor_id', 'id_proveedor'], prov.id);
          setIfFound(['base_imponible', 'base', 'subtotal'], totalBI);
          setIfFound(['iva_importe', 'cuota_iva', 'iva_total', 'iva'], totalIVA);
          setIfFound(['retencion_pct', 'irpf_pct'], parseFloat(firstRow.retencion_pct) || 0);
          setIfFound(['retencion_importe', 'irpf_importe', 'retencion', 'irpf'], totalRet);

          const { data: newCoste, error: cErr } = await supabase.from('costes').insert(payload).select('id').single();

          if (cErr) throw new Error(cErr.message);
          
          nextSequential++; // Incrementar para la siguiente factura

          // 5. Líneas
          for (const r of rows) {
             await supabase.from('coste_lineas').insert({
                coste_id: newCoste.id,
                user_id: user.id,
                descripcion: r.concepto || 'Importación Excel',
                unidades: 1,
                precio_unitario: parseFloat(r.base_imponible) || 0,
                iva_pct: parseFloat(r.iva_pct) || 0
             });
          }
          successCount += rows.length;
        } catch (err: any) {
          errors.push(`Error en ${key}: ${err.message}`);
        }
      }

      // 6. Sincronizar el contador oficial en Ajustes
      await supabase.from('perfil_negocio').update({ contador_costes: nextSequential }).eq('user_id', user.id);


      setImportResults({ total: jsonData.length, success: successCount, errors });
    } catch (err: any) {
      alert("Error crítico en importación: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadExcelTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      {
        fecha: '2024-05-01',
        num_factura: 'INV-001',
        proveedor_nombre: 'Proveedor Ejemplo S.L.',
        proveedor_nif: 'B12345678',
        proveedor_direccion: 'Calle Falsa 123',
        proveedor_cp: '28001',
        proveedor_poblacion: 'Madrid',
        proveedor_provincia: 'Madrid',
        concepto: 'Compra de materiales oficina',
        base_imponible: 100.50,
        iva_pct: 21,
        retencion_pct: 0,
        estado_pago: 'Pagado'
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_Importacion_Gastos.xlsx");
  };

  const [activeTab, setActiveTab] = useState<'perfil' | 'ai' | 'legales' | 'seguridad' | 'fiscalidad' | 'backup' | 'email' | 'import'>('perfil');

  if (loading) return null;

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-4 font-sans">
      <div className="bg-white p-12 rounded-3xl shadow-2xl border max-w-sm w-full text-center space-y-6">
        <Lock className="text-blue-600 mx-auto" size={48} />
        <h2 className="text-2xl font-black text-gray-800 tracking-tight text-balance">Acceso Restringido</h2>
        <a href="/login" className="block w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg transition-all font-sans">Identificarse</a>
      </div>
    </div>
  );

  const navItems = [
    { id: 'perfil', label: 'Identidad', icon: Building2, color: 'text-blue-600' },
    { id: 'ai', label: 'IA & Bot', icon: RefreshCcw, color: 'text-purple-600' },
    { id: 'legales', label: 'Legal & LOPD', icon: Scale, color: 'text-orange-600' },
    { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck, color: 'text-green-600' },
    { id: 'email', label: 'Email', icon: FileText, color: 'text-blue-500' },
    { id: 'fiscalidad', label: 'Fiscalidad', icon: Percent, color: 'text-emerald-600' },
    { id: 'backup', label: 'Backup', icon: Database, color: 'text-indigo-600' },
    { id: 'import', label: 'Importar', icon: Table, color: 'text-pink-600' },
  ];

  const lastBackup = autoBackups[0];
  const lastBackupStr = lastBackup 
    ? new Date(lastBackup.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'No disponible';

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      
      {/* Selector de Apartados (Nueva Columna) */}
      <nav className="w-72 bg-white/50 backdrop-blur-xl border-r border-[var(--border)] p-6 space-y-2 hidden md:block">
        <div className="mb-10 pl-2">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Configuración</h2>
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-sans group ${
              activeTab === item.id 
                ? 'bg-white shadow-sm border border-gray-100 translate-x-1' 
                : 'hover:bg-gray-100/50 text-gray-500'
            }`}
          >
            <item.icon 
              size={20} 
              className={`${activeTab === item.id ? item.color : 'text-gray-300 group-hover:text-gray-400'} transition-colors`} 
            />
            <span className={`text-sm font-bold ${activeTab === item.id ? 'text-gray-900' : 'text-gray-500'}`}>
              {item.label}
            </span>
          </button>
        ))}

        <div className="mt-20 p-6 bg-[var(--accent)] rounded-3xl text-white shadow-xl relative overflow-hidden group">
          <ShieldCheck size={80} className="absolute -bottom-4 -right-4 opacity-10 group-hover:rotate-12 transition-transform" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Estado Sistema</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-green-300 animate-pulse" />
            <span className="text-xs font-bold">Sistema Protegido</span>
          </div>
          <div className="pt-3 border-t border-white/10">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Última Copia</p>
            <p className="text-[11px] font-mono text-white/90">{lastBackupStr}</p>
          </div>
        </div>
      </nav>

      <div className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 overflow-y-auto text-left font-sans">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black font-head tracking-tighter text-[var(--foreground)]">
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
            <p className="text-[var(--muted)] font-medium font-sans">
              Personaliza tu entorno de trabajo y seguridad.
            </p>
          </div>
          <div className={`px-5 py-2 rounded-full text-xs font-bold border flex items-center gap-2 transition-all duration-300 font-sans ${autoStatus === 'saving' ? 'bg-blue-50 text-blue-600 border-blue-100' : autoStatus === 'saved' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
            {autoStatus === 'saving' ? <Loader2 className="animate-spin" size={14} /> : autoStatus === 'saved' ? <CheckCircle2 size={14} /> : <ShieldCheck size={14} />}
            {autoStatus === 'saving' ? 'Guardando...' : autoStatus === 'saved' ? 'Sincronizado' : `Sesión: ${user.email}`}
          </div>
        </header>

        <main className="max-w-4xl pb-32">
          {activeTab === 'perfil' && (
            <div className="bg-white rounded-[2rem] border p-10 shadow-sm space-y-10 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-start justify-between border-b pb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black font-head text-gray-900">Perfil de Empresa</h2>
                    <p className="text-sm text-gray-400 font-sans">Estos datos aparecerán en todas tus facturas y presupuestos.</p>
                  </div>
                  <Building2 className="text-blue-100" size={48} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-sans">Logo Corporativo</label>
                  <div className="group relative h-40 w-full overflow-hidden rounded-3xl border-2 border-dashed border-gray-100 bg-gray-50/50 transition-all hover:border-blue-200">
                    {logoUrl ? (
                      <div className="relative h-full w-full p-4 flex items-center justify-center">
                        <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                        <button onClick={() => setLogoUrl('')} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur shadow-sm rounded-xl text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => triggerUpload('logo')} className="flex h-full w-full flex-col items-center justify-center gap-3">
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-500"><Upload size={24} /></div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subir Logo</p>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-sans">Imagen para PDF (Anexo)</label>
                  <div className="group relative h-40 w-full overflow-hidden rounded-3xl border-2 border-dashed border-gray-100 bg-gray-50/50 transition-all hover:border-orange-200">
                    {imagenCorporativaUrl ? (
                      <div className="relative h-full w-full p-4 flex items-center justify-center">
                        <img src={imagenCorporativaUrl} alt="Corp" className="max-h-full max-w-full object-contain" />
                        <button onClick={() => setImagenCorporativaUrl('')} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur shadow-sm rounded-xl text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => triggerUpload('corp')} className="flex h-full w-full flex-col items-center justify-center gap-3">
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-orange-500"><Upload size={24} /></div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subir Imagen</p>
                      </button>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Razón Social</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-6 py-5 rounded-[1.5rem] border bg-gray-50 outline-none font-sans text-lg font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">NIF / CIF</label>
                  <input type="text" value={nif} onChange={e => setNif(e.target.value.toUpperCase())} className="w-full px-6 py-5 rounded-[1.5rem] border bg-gray-50 outline-none font-sans focus:bg-white transition-all capitalize" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">IBAN Principal</label>
                  <input type="text" value={cuentaBancaria} onChange={e => setCuentaBancaria(formatIBAN(e.target.value))} className="w-full px-6 py-5 rounded-[1.5rem] border bg-gray-50 font-mono text-sm focus:bg-white transition-all" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Teléfono</label>
                  <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full px-6 py-5 rounded-[1.5rem] border bg-gray-50 outline-none font-sans focus:bg-white transition-all" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Email Corporativo</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-6 py-5 rounded-[1.5rem] border bg-gray-50 outline-none font-sans focus:bg-white transition-all" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Sitio Web</label>
                  <input type="text" value={web} onChange={e => setWeb(e.target.value)} placeholder="www.tuweb.com" className="w-full px-6 py-5 rounded-[1.5rem] border bg-gray-50 outline-none font-sans focus:bg-white transition-all" />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-dashed">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 font-sans">Dirección</label>
                    <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full px-6 py-5 rounded-[1.5rem] border bg-gray-50 font-sans focus:bg-white transition-all" />
                  </div>
                  <input type="text" placeholder="C.P." value={cp} maxLength={5} onChange={e => setCp(e.target.value)} className="px-6 py-5 rounded-[1.5rem] border bg-gray-50 outline-none font-mono focus:bg-white transition-all" />
                  <input type="text" placeholder="Ciudad" value={poblacion} onChange={e => setPoblacion(e.target.value)} className="px-6 py-5 rounded-[1.5rem] border bg-gray-50 outline-none font-sans focus:bg-white transition-all" />
                  <input type="text" placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} className="px-6 py-5 rounded-[1.5rem] border bg-gray-50 outline-none font-sans focus:bg-white transition-all" />
                </div>

                <div className="md:col-span-2 pt-8 border-t border-dashed">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><RotateCcw size={18} /></div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest pl-1 font-sans">Contadores de Documentos</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Fila Ventas */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow gap-6 group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 transition-transform group-hover:scale-110">
                           <FileText size={20} />
                        </div>
                        <div className="space-y-0.5">
                           <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Ventas</h4>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Facturación Emitida</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="space-y-1.5 flex-1 md:flex-none">
                           <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest pl-1">Prefijo</span>
                           <input 
                              type="text" 
                              value={prefijoVentas} 
                              onChange={e => setPrefijoVentas(e.target.value)} 
                              placeholder="F-" 
                              className="w-full md:w-24 px-4 py-3.5 rounded-2xl border bg-gray-50/50 font-black text-blue-600 text-center uppercase focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" 
                           />
                        </div>
                        <div className="space-y-1.5 flex-2 md:flex-none">
                           <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest pl-1">Siguiente Número</span>
                           <input 
                              type="number" 
                              value={contadorVentas} 
                              onChange={e => setContadorVentas(parseInt(e.target.value) || 1)} 
                              className="w-full md:w-32 px-5 py-3.5 rounded-2xl border bg-gray-50/50 font-mono font-bold text-gray-800 text-right focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" 
                           />
                        </div>
                      </div>
                    </div>

                    {/* Fila Compras */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow gap-6 group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 rounded-2xl text-red-600 transition-transform group-hover:scale-110">
                           <ShieldCheck size={20} />
                        </div>
                        <div className="space-y-0.5">
                           <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Compras</h4>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gastos y Recibidas</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="space-y-1.5 flex-1 md:flex-none">
                           <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest pl-1">Prefijo</span>
                           <input 
                              type="text" 
                              value={prefijoCostes} 
                              onChange={e => setPrefijoCostes(e.target.value)} 
                              placeholder="G-" 
                              className="w-full md:w-24 px-4 py-3.5 rounded-2xl border bg-gray-50/50 font-black text-red-600 text-center uppercase focus:bg-white focus:ring-4 focus:ring-red-500/5 transition-all outline-none" 
                           />
                        </div>
                        <div className="space-y-1.5 flex-2 md:flex-none">
                           <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest pl-1">Siguiente Número</span>
                           <input 
                              type="number" 
                              value={contadorCostes} 
                              onChange={e => setContadorCostes(parseInt(e.target.value) || 1)} 
                              className="w-full md:w-32 px-5 py-3.5 rounded-2xl border bg-gray-50/50 font-mono font-bold text-gray-800 text-right focus:bg-white focus:ring-4 focus:ring-red-500/5 transition-all outline-none" 
                           />
                        </div>
                      </div>
                    </div>

                    {/* Fila Presupuestos */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow gap-6 group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 transition-transform group-hover:scale-110">
                           <ImageIcon size={20} />
                        </div>
                        <div className="space-y-0.5">
                           <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Presupuestos</h4>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Propuestas y Proyectos</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="space-y-1.5 flex-1 md:flex-none">
                           <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest pl-1">Prefijo</span>
                           <input 
                              type="text" 
                              value={prefijoProyectos} 
                              onChange={e => setPrefijoProyectos(e.target.value)} 
                              placeholder="P-" 
                              className="w-full md:w-24 px-4 py-3.5 rounded-2xl border bg-gray-50/50 font-black text-orange-600 text-center uppercase focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all outline-none" 
                           />
                        </div>
                        <div className="space-y-1.5 flex-2 md:flex-none">
                           <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest pl-1">Siguiente Número</span>
                           <input 
                              type="number" 
                              value={contadorProyectos} 
                              onChange={e => setContadorProyectos(parseInt(e.target.value) || 1)} 
                              className="w-full md:w-32 px-5 py-3.5 rounded-2xl border bg-gray-50/50 font-mono font-bold text-gray-800 text-right focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all outline-none" 
                           />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 px-2 italic font-sans">
                    Define aquí el número por el que deseas que comiencen tus próximos documentos. Se incrementarán automáticamente después de cada emisión.
                  </p>
                </div>
               </div>

               {saveError && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-[1.5rem] text-red-600 text-xs font-bold font-sans flex items-center gap-3">
                  <Trash2 size={18} /> Error al sincronizar: {saveError}.
                </div>
               )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="bg-white rounded-[2rem] border p-10 shadow-sm space-y-10 animate-in slide-in-from-bottom-4 duration-500 border-purple-100">
               <div className="flex items-start justify-between border-b pb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black font-head text-purple-900">Inteligencia Artificial</h2>
                    <p className="text-sm text-gray-400 font-sans">Configura los motores de IA para automatizar tu gestión.</p>
                  </div>
                  <RefreshCcw className="text-purple-100" size={48} />
               </div>

               <div className="space-y-8">
                  <div className="p-8 bg-purple-50/50 rounded-[2rem] border border-purple-100 space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest pl-1">Gemini API Key (Google Cloud)</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          value={geminiKey} 
                          onChange={e => setGeminiKey(e.target.value)} 
                          className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] border bg-white outline-none font-mono text-sm focus:ring-4 focus:ring-purple-500/10 transition-all" 
                          placeholder="AIzaSy..." 
                        />
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-purple-300" size={20} />
                      </div>
                      <p className="text-[10px] text-purple-700/60 mt-4 pl-1 leading-relaxed font-sans italic">
                        Esta llave se utiliza para la extracción automática de datos desde facturas en PDF. La información se procesa localmente en tu sesión y no se utiliza para entrenar modelos.
                      </p>
                    </div>

                    <div className="pt-4 flex justify-end">
                       <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all">Obtener Clave Gratis</a>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'legales' && (
            <div className="bg-white rounded-[2rem] border p-10 shadow-sm space-y-10 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-start justify-between border-b pb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black font-head text-gray-900">Textos Legales</h2>
                    <p className="text-sm text-gray-400 font-sans">Condiciones, LOPD y cláusulas de aceptación.</p>
                  </div>
                  <Scale className="text-orange-100" size={48} />
               </div>

               <div className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-sans flex items-center gap-2"><FileText size={16} /> Condiciones Generales</label>
                    <RichTextEditor 
                      value={condicionesLegales} 
                      onChange={setCondicionesLegales}
                      placeholder="Estas condiciones aparecerán en el pie de los presupuestos..."
                    />
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-sans flex items-center gap-2"><ShieldCheck size={16} /> Cláusula LOPD</label>
                    <RichTextEditor 
                      value={lopdText} 
                      onChange={setLopdText}
                      placeholder="Texto legal para dar cumplimiento a la normativa de protección de datos..."
                    />
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 font-sans flex items-center gap-2"><DownloadCloud size={16} /> Forma de Pago Predeterminada</label>
                    <RichTextEditor 
                      value={formaPago} 
                      onChange={setFormaPago}
                      placeholder="Ej: Transferencia bancaria a la cuenta indicada arriba..."
                    />
                 </div>

                 <button onClick={handleSaveLegales} className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">Guardar Cláusulas</button>
               </div>
            </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="bg-white rounded-[2rem] border p-10 shadow-sm space-y-10 animate-in slide-in-from-bottom-4 duration-500 border-green-50">
               <div className="flex items-start justify-between border-b pb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black font-head text-green-900">Seguridad de la Cuenta</h2>
                    <p className="text-sm text-gray-400 font-sans">Protege tu acceso con verificación de doble factor.</p>
                  </div>
                  <ShieldCheck className="text-green-100" size={48} />
               </div>

               <div className="space-y-8">
                  <div className="flex items-center justify-between p-10 bg-green-50/50 rounded-[2.5rem] border border-green-100">
                    <div className="flex gap-6 items-center">
                      <div className={`p-5 rounded-2xl ${twoFactorEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                         <Smartphone size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-gray-900">Doble Factor (2FA)</h3>
                        <p className="text-sm font-medium text-gray-500">Capa adicional de seguridad mediante Google Authenticator.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => twoFactorEnabled ? disable2FA() : setup2FA()}
                      className={`px-10 py-4 rounded-2xl text-xs font-black tracking-widest transition-all ${twoFactorEnabled ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' : 'bg-green-600 text-white shadow-xl shadow-green-200 hover:bg-green-700'}`}
                    >
                      {twoFactorEnabled ? 'DESACTIVAR' : 'CONFIGURAR AHORA'}
                    </button>
                  </div>

                  {isSettingUp2FA && isMounted && (
                    <div className="animate-in zoom-in-95 duration-300">
                      <TwoFactorSetup 
                        qrUrl={qrUrl}
                        verifyToken={verifyToken}
                        setVerifyToken={setVerifyToken}
                        onConfirm={confirm2FA}
                        onCancel={() => setIsSettingUp2FA(false)}
                      />
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'fiscalidad' && (
            <div className="bg-white rounded-[2rem] border p-10 shadow-sm space-y-10 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-start justify-between border-b pb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black font-head text-gray-900">Gestión Fiscal</h2>
                    <p className="text-sm text-gray-400 font-sans">Tipos de impuestos y retenciones por defecto.</p>
                  </div>
                  <Percent className="text-emerald-100" size={48} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Tabla de IVA</h3>
                      <button onClick={() => handleAddTipo('tipos_iva')} className="text-xs font-bold text-blue-600 hover:underline">+ Nuevo Tipo</button>
                    </div>
                    <div className="space-y-2">
                      {tiposIva.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:shadow-md">
                          <span className="font-bold text-gray-700">{t.nombre} <span className="text-blue-500 ml-2">{t.valor}%</span></span>
                          <button onClick={() => handleDeleteTipo('tipos_iva', t.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Tabla de IRPF</h3>
                      <button onClick={() => handleAddTipo('tipos_irpf')} className="text-xs font-bold text-orange-600 hover:underline">+ Nuevo Tipo</button>
                    </div>
                    <div className="space-y-2">
                        {tiposIrpf.map(t => (
                          <div key={t.id} className="flex justify-between items-center p-5 bg-orange-50/20 rounded-2xl border border-orange-100 group transition-all hover:bg-white hover:shadow-md">
                            <span className="font-bold text-gray-700">{t.nombre} <span className="text-orange-500 ml-2">{t.valor}%</span></span>
                            <button onClick={() => handleDeleteTipo('tipos_irpf', t.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-black tracking-tight text-lg text-gray-900">Retención por Defecto</p>
                      <p className="text-xs text-gray-400 font-sans">Aplica el IRPF seleccionado automáticamente en todas las ventas.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={tieneRetencion} onChange={e => setTieneRetencion(e.target.checked)} className="sr-only peer" />
                      <div className="w-14 h-8 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="bg-white rounded-[2rem] border p-10 shadow-sm space-y-10 animate-in slide-in-from-bottom-4 duration-500 border-indigo-50">
               <div className="flex items-start justify-between border-b pb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black font-head text-indigo-900">Seguridad de Datos (Backup)</h2>
                    <p className="text-sm text-gray-400 font-sans">Copia de seguridad y restauración del sistema.</p>
                  </div>
                  <Database className="text-indigo-100" size={48} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <button onClick={handleExportBackup} disabled={isBackupLoading} className="flex flex-col items-center gap-6 p-10 bg-indigo-50 rounded-[2rem] border border-indigo-100 hover:bg-indigo-100 transition-all text-center group">
                     <div className="p-5 bg-white rounded-2xl shadow-sm text-indigo-600 group-hover:scale-110 transition-transform"><DownloadCloud size={32} /></div>
                     <div className="space-y-2">
                        <p className="font-black text-indigo-900 text-lg">Exportar Sistema</p>
                        <p className="text-xs text-indigo-600/70 font-sans">Genera un volcado completo de toda tu base de datos y PDFs en formato ZIP.</p>
                     </div>
                  </button>

                  <div className="relative group">
                    <input type="file" accept=".json,.zip" onChange={handleImportBackup} className="hidden" id="restore-up-v2" />
                    <label htmlFor="restore-up-v2" className="flex flex-col items-center gap-6 p-10 bg-gray-50 rounded-[2rem] border border-gray-100 hover:bg-gray-100 transition-all text-center cursor-pointer h-full">
                       <div className="p-5 bg-white rounded-2xl shadow-sm text-gray-400 group-hover:rotate-180 transition-all duration-700"><RotateCcw size={32} /></div>
                       <div className="space-y-2">
                          <p className="font-black text-gray-800 text-lg">Restaurar Copia</p>
                          <p className="text-xs text-gray-400 font-sans">Carga un punto de restauración previo (ZIP o JSON) para recuperar tu información.</p>
                       </div>
                    </label>
                  </div>
               </div>

               {autoBackups.length > 0 && (
                <div className="pt-10 border-t border-dashed space-y-6">
                   <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Historial de Backups Automáticos</h3>
                   <div className="flex flex-col gap-3">
                      {autoBackups.map((b, idx) => (
                        <div key={b.id} className="group flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                           <div className="flex gap-5 items-center">
                              <div className={`p-3 rounded-xl ${idx === 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'} group-hover:scale-110 transition-transform`}>
                                 <Database size={20} />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-gray-800 text-sm">{b.nombre}</span>
                                  {idx === 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black uppercase tracking-widest rounded-full">Más reciente</span>}
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">
                                  {new Date(b.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • {(b.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                           </div>
                           <a 
                             href={b.archivo_url} 
                             download 
                             className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 border border-gray-100 rounded-xl text-indigo-600 text-xs font-bold shadow-sm transition-all"
                           >
                             <DownloadCloud size={16} />
                             <span className="hidden md:inline">Descargar</span>
                           </a>
                        </div>
                      ))}
                   </div>
                </div>
               )}
            </div>
          )}
          {activeTab === 'email' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-white rounded-[2rem] border p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-2xl font-black font-head text-blue-900">Configuración de Email</h2>
                  <p className="text-sm text-gray-400 mt-1">Configura tu servidor de correo para enviar documentos.</p>
                </div>

                <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
                  <button 
                    onClick={() => { setUseGmailPreset(true); setSmtpHost('smtp.gmail.com'); setSmtpPort('587'); }}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${useGmailPreset ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                  >GMAIL</button>
                  <button 
                    onClick={() => setUseGmailPreset(false)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${!useGmailPreset ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                  >OTRO (SMTP)</button>
                </div>

                {useGmailPreset ? (
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 space-y-2">
                    <p className="text-xs font-black text-blue-800 uppercase tracking-wider flex items-center gap-2">
                       <ShieldCheck size={14} /> Requisito: Contraseña de Aplicación
                    </p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Google no permite usar tu contraseña normal. Debes crear una <strong>Contraseña de Aplicación</strong>:
                    </p>
                    <ol className="text-[11px] text-blue-700 list-decimal list-inside space-y-1 pl-1">
                      <li>Ve a <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="font-bold underline decoration-blue-300 hover:text-blue-900 transition-colors">Configuración de Contraseñas de Aplicación</a></li>
                      <li>Genera una para "Correo" y pégala abajo (16 caracteres)</li>
                    </ol>
                  </div>
                ) : (
                  <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                    <p className="text-xs text-orange-800 leading-relaxed font-medium">
                      Introduce los datos de tu proveedor SMTP (Outlook, Yahoo, Hostinger, etc.).
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!useGmailPreset && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Servidor SMTP</label>
                        <input
                          type="text"
                          placeholder="smtp.proveedor.com"
                          value={smtpHost}
                          onChange={e => setSmtpHost(e.target.value)}
                          className="w-full p-4 rounded-2xl border bg-gray-50 outline-none font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Puerto</label>
                        <input
                          type="text"
                          placeholder="587 o 465"
                          value={smtpPort}
                          onChange={e => setSmtpPort(e.target.value)}
                          className="w-full p-4 rounded-2xl border bg-gray-50 outline-none font-medium"
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Usuario / Email</label>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={smtpEmail}
                      onChange={e => setSmtpEmail(e.target.value)}
                      onBlur={() => handleSaveAll()}
                      className="w-full p-4 rounded-2xl border bg-gray-50 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Contraseña {useGmailPreset ? '(de Aplicación)' : ''}</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={smtpPassword}
                      onChange={e => setSmtpPassword(e.target.value)}
                      onBlur={() => handleSaveAll()}
                      className="w-full p-4 rounded-2xl border bg-gray-50 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleTestEmail}
                    disabled={testingEmail || !smtpEmail || !smtpPassword}
                    className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100 uppercase text-[11px] tracking-widest"
                  >
                    {testingEmail ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Probar & Validar
                  </button>
                  <div className="flex-1"></div>
                  {autoStatus === 'saving' && <div className="flex items-center gap-2 text-xs font-bold text-blue-600 animate-pulse"><Loader2 size={14} className="animate-spin" /> Guardando...</div>}
                  {autoStatus === 'saved' && <div className="flex items-center gap-2 text-xs font-bold text-green-600"><CheckCircle2 size={14} /> Guardado</div>}
                </div>

                {emailTestResult === 'ok' && (
                  <div className="p-4 bg-green-50 text-green-700 rounded-2xl text-sm font-bold flex items-center gap-2 border border-green-100 animate-in zoom-in-95">
                    <CheckCircle2 size={18} /> ¡Excelente! Conexión validada. Revisa tu bandeja de entrada.
                  </div>
                )}
                {emailTestResult === 'error' && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold border border-red-100 animate-in zoom-in-95 leading-relaxed">
                    ❌ Fallo en la conexión:<br/>
                    <span className="font-normal text-xs">{saveError || 'Asegúrate de que los datos son correctos.'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="bg-white rounded-[2rem] border p-10 shadow-sm space-y-10 animate-in slide-in-from-bottom-4 duration-500 border-pink-50">
               <div className="flex items-start justify-between border-b pb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black font-head text-pink-900 tracking-tighter">Importación de Gastos</h2>
                    <p className="text-sm text-gray-400 font-sans">Sube tus facturas recibidas masivamente desde Excel.</p>
                  </div>
                  <Table className="text-pink-100" size={48} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                      <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                        <Scale size={18} /> Instrucciones de Preparación
                      </h3>
                      <ul className="text-xs text-blue-800 space-y-2 list-disc list-inside font-medium">
                        <li>Columnas obligatorias: <b>fecha, num_factura, proveedor_nombre, proveedor_nif</b>.</li>
                        <li>El sistema detecta automáticamente si el proveedor existe por su NIF.</li>
                        <li><b>Alta Automática:</b> Si el proveedor es nuevo, se registrará con los datos del Excel.</li>
                        <li>Formatos aceptados: .xlsx, .xls</li>
                      </ul>
                      <button 
                        onClick={downloadExcelTemplate}
                        className="mt-6 flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                      >
                        <DownloadCloud size={14} /> Descargar Plantilla Oficial
                      </button>
                    </div>

                    <div className="p-10 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-center space-y-4 hover:border-pink-300 transition-colors group bg-gray-50/30">
                      {isImporting ? (
                        <div className="space-y-4 py-6">
                          <Loader2 className="animate-spin mx-auto text-pink-500" size={40} />
                          <p className="font-black text-gray-600 uppercase text-[10px] tracking-widest">Procesando Filas...</p>
                        </div>
                      ) : (
                        <label className="cursor-pointer block py-6">
                          <Upload className="mx-auto text-gray-200 group-hover:text-pink-400 transition-colors mb-4" size={48} />
                          <p className="text-lg font-black text-gray-800 tracking-tight">Cargar Archivo Excel</p>
                          <p className="text-xs text-gray-400 mt-1 font-medium">Arrastra o haz clic para seleccionar</p>
                          <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {importResults && (
                      <div className={`p-8 rounded-[2rem] border animate-in zoom-in-95 duration-500 ${importResults.errors.length > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                        <h3 className={`font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2 ${importResults.errors.length > 0 ? 'text-orange-900' : 'text-green-900'}`}>
                          <CheckCircle2 size={18} /> Resumen del Proceso
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Leídos</p>
                            <p className="text-3xl font-black text-gray-800 tracking-tighter">{importResults.total}</p>
                          </div>
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Éxito</p>
                            <p className="text-3xl font-black text-green-600 tracking-tighter">{importResults.success}</p>
                          </div>
                        </div>

                        {importResults.errors.length > 0 && (
                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-2 ml-1">Incidencias Detectadas:</p>
                            {importResults.errors.map((err, idx) => (
                              <div key={idx} className="p-4 bg-white rounded-2xl border border-orange-200 text-[10px] text-orange-800 font-bold leading-relaxed shadow-sm">
                                {err}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!importResults && (
                      <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-20 group-hover:opacity-40 transition-opacity">
                        <LayoutGrid size={80} className="text-gray-300 mb-4" />
                        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Resultados</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

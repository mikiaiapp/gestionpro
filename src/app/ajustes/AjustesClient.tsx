"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Building2, Percent, RefreshCcw, CheckCircle2, Loader2, Lock, ImageIcon, 
  Upload, Trash2, ShieldCheck, CloudCheck, Database, DownloadCloud, 
  RotateCcw, Smartphone, Scale, FileText, Table, LayoutGrid, AlertTriangle,
  Settings2, Save, Plus, X, Pencil, Globe, Mail, Phone, Palette, Briefcase, 
  ChevronRight, Download, BookOpen, UserPlus, Sparkles, Share2, Fingerprint,
  ChevronUp, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { SidebarItem } from "@/components/SidebarItem";
import { encrypt, decrypt } from "@/lib/encryption";
import { getFullLocationByCP } from "@/lib/geoData";
import { uploadLogo, uploadCorpImage } from "@/lib/storageService";
import { cleanNIF } from "@/lib/format";

export default function AjustesClient() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("negocio");

  // Perfil de Negocio
  const [nombre, setNombre] = useState("");
  const [nif, setNif] = useState("");
  const [cuentaBancaria, setCuentaBancaria] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cp, setCp] = useState("");
  const [poblacion, setPoblacion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [web, setWeb] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [imagenCorporativaUrl, setImagenCorporativaUrl] = useState("");
  
  // Facturación & Contadores
  const [serieVentas, setSerieVentas] = useState("A");
  const [prefijoVentas, setPrefijoVentas] = useState("");
  const [contadorVentas, setContadorVentas] = useState(1);
  const [serieCostes, setSerieCostes] = useState("A");
  const [prefijoCostes, setPrefijoCostes] = useState("");
  const [contadorCostes, setContadorCostes] = useState(1);
  const [prefijoProyectos, setPrefijoProyectos] = useState("");
  const [contadorProyectos, setContadorProyectos] = useState(1);
  
  // Configuración de IRPF
  const [tiposIRPF, setTiposIRPF] = useState<any[]>([]);
  const [tieneRetencion, setTieneRetencion] = useState(false);
  const [irpfDefault, setIrpfDefault] = useState(0);

  // Mantenimiento
  const [isResetting, setIsResetting] = useState(false);

  const initialLoadDone = useRef(false);

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
    prefijoVentas, prefijoCostes, prefijoProyectos,
    serieVentas, serieCostes, smtpEmail, smtpAppPassword
  ]);

  const fetchPerfil = async (userId: string) => {
    const { data, error } = await supabase
      .from("perfil_negocio")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setNombre(data.nombre || "");
      setNif(data.nif || "");
      setCuentaBancaria(data.cuenta_bancaria ? decrypt(data.cuenta_bancaria) : "");
      setDireccion(data.direccion || "");
      setCp(data.codigo_postal || "");
      setPoblacion(data.poblacion || "");
      setProvincia(data.provincia || "");
      setEmail(data.email || "");
      setTelefono(data.telefono || "");
      setWeb(data.web || "");
      setGeminiKey(data.gemini_key || "");
      setLogoUrl(data.logo_url || "");
      setImagenCorporativaUrl(data.imagen_corporativa_url || "");
      setSerieVentas(data.serie_ventas || "A");
      setPrefijoVentas(data.prefijo_ventas || "");
      setContadorVentas(data.contador_ventas || 1);
      setSerieCostes(data.serie_costes || "A");
      setPrefijoCostes(data.prefijo_costes || "");
      setContadorCostes(data.contador_costes || 1);
      setPrefijoProyectos(data.prefijo_proyectos || "");
      setContadorProyectos(data.contador_proyectos || 1);
      setTieneRetencion(data.tiene_retencion || false);
      setIrpfDefault(data.irpf_default || 0);
      setCondicionesLegales(data.condiciones_legales || "");
      setLopdText(data.lopd_text || "");
      setTextoAceptacion(data.texto_aceptacion || "");
      setFormaPago(data.forma_pago_default || "");
      setVerifactuEnv(data.verifactu_env || "test");
      setSmtpEmail(data.smtp_email || "");
      setSmtpAppPassword(data.smtp_app_password ? decrypt(data.smtp_app_password) : "");
    }
  };

  const fetchTipos = async (userId: string) => {
    const { data } = await supabase.from("tipos_irpf").select("*").eq("user_id", userId).order("valor");
    setTiposIRPF(data || []);
  };

  const fetchAutoBackups = async (userId: string) => {
    const { data } = await supabase.from("backups").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5);
    setBackups(data || []);
  };

  const handleSaveAll = async () => {
    if (!user) return;
    
    // Comparar con el último payload para evitar llamadas innecesarias
    const currentPayload = JSON.stringify({
      nombre, nif, cuentaBancaria, direccion, cp, poblacion, provincia, email, telefono, web,
      geminiKey, logoUrl, imagenCorporativaUrl, serieVentas, prefijoVentas, contadorVentas,
      serieCostes, prefijoCostes, contadorCostes, prefijoProyectos, contadorProyectos,
      tieneRetencion, irpfDefault, condicionesLegales, lopdText, textoAceptacion, formaPago,
      verifactuEnv, smtpEmail, smtpAppPassword
    });

    if (currentPayload === lastSavedPayload.current) return;
    
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        nombre,
        nif,
        cuenta_bancaria: encrypt(cuentaBancaria),
        direccion,
        codigo_postal: cp,
        poblacion,
        provincia,
        email,
        telefono,
        web,
        gemini_key: geminiKey,
        logo_url: logoUrl,
        imagen_corporativa_url: imagenCorporativaUrl,
        serie_ventas: serieVentas,
        prefijo_ventas: prefijoVentas,
        contador_ventas: contadorVentas,
        serie_costes: serieCostes,
        prefijo_costes: prefijoCostes,
        contador_costes: contadorCostes,
        prefijo_proyectos: prefijoProyectos,
        contador_proyectos: contadorProyectos,
        tiene_retencion: tieneRetencion,
        irpf_default: irpfDefault,
        condiciones_legales: condicionesLegales,
        lopd_text: lopdText,
        texto_aceptacion: textoAceptacion,
        forma_pago_default: formaPago,
        verifactu_env: verifactuEnv,
        smtp_email: smtpEmail,
        smtp_app_password: encrypt(smtpAppPassword)
      };

      const { error } = await supabase
        .from("perfil_negocio")
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      lastSavedPayload.current = currentPayload;
    } catch (err: any) {
      console.error("Error auto-saving:", err.message);
    } finally {
      setSaving(false);
    }
  };

  const addTipoIRPF = async () => {
    const valor = prompt("Nuevo tipo de IRPF (%):");
    if (!valor) return;
    const num = parseFloat(valor);
    if (isNaN(num)) return;
    
    const { data, error } = await supabase.from("tipos_irpf").insert([{ user_id: user.id, valor: num }]).select();
    if (data) setTiposIRPF([...tiposIRPF, data[0]]);
  };

  const removeTipoIRPF = async (id: string) => {
    await supabase.from("tipos_irpf").delete().eq("id", id);
    setTiposIRPF(tiposIRPF.filter(t => t.id !== id));
  };

  const handleCPChange = async (val: string) => {
    setCp(val);
    if (val.length === 5) {
      const data = await getFullLocationByCP(val);
      if (data) {
        setPoblacion(data.poblacion);
        setProvincia(data.provincia);
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const url = await uploadLogo(file);
      setLogoUrl(url);
    } catch (err: any) {
      alert("Error al subir logo: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCorpImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const url = await uploadCorpImage(file);
      setImagenCorporativaUrl(url);
    } catch (err: any) {
      alert("Error al subir imagen corporativa: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBackupNow = async () => {
    setSaving(true);
    try {
      // 1. Obtener todos los datos
      const [ventas, costes, clientes, proveedores, proyectos] = await Promise.all([
        supabase.from('ventas').select('*').eq('user_id', user.id),
        supabase.from('costes').select('*').eq('user_id', user.id),
        supabase.from('clientes').select('*').eq('user_id', user.id),
        supabase.from('proveedores').select('*').eq('user_id', user.id),
        supabase.from('proyectos').select('*').eq('user_id', user.id),
      ]);

      const fullData = {
        ventas: ventas.data,
        costes: costes.data,
        clientes: clientes.data,
        proveedores: proveedores.data,
        proyectos: proyectos.data,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase.from('backups').insert([
        { user_id: user.id, data: fullData, type: 'manual' }
      ]);
      
      if (error) throw error;
      fetchAutoBackups(user.id);
      alert("✅ Backup completado y guardado en la nube.");
    } catch (err: any) {
      alert("Error al realizar backup: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setSaving(true);
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          alert("El Excel parece estar vacío.");
          setSaving(false);
          return;
        }

        // DETECCIÓN DE COLUMNAS REALES (PRE-FLIGHT)
        const { data: colProbe } = await supabase.from("costes").select("*").limit(1);
        const availableCols = (colProbe && colProbe.length > 0) ? Object.keys(colProbe[0]) : [];
        const foundKey = (options: string[]) => options.find(o => availableCols.includes(o));

      // 0. Probar columnas reales para evitar errores de esquema (Smart Mapping)
      const { data: probe } = await supabase.from('costes').select('*').limit(1);
      const cols = (probe && probe.length > 0) ? Object.keys(probe[0]) : [];
      
      // Columnas que sabemos que existen por el esquema base (mínimo común denominador)
      const guaranteedCols = ['id', 'user_id', 'fecha', 'total', 'proveedor_id', 'num_interno'];
      const allKnownCols = [...new Set([...cols, ...guaranteedCols])];
      const findKey = (options: string[]) => options.find(o => allKnownCols.includes(o));

        const findVal = (row: any, options: string[]) => {
          const key = Object.keys(row).find(k => options.includes(k.toLowerCase().trim()));
          return key ? row[key] : null;
        };

        // AGRUPACIÓN POR FACTURA (NIF + Nº FACTURA)
        const groupedRows: { [key: string]: any } = {};
        
        rows.forEach(row => {
          const nifProvRaw = findVal(row, mapping.nif);
          const numFactRaw = findVal(row, mapping.numFactura);
          if (!nifProvRaw || !numFactRaw) return;

          const key = `${cleanNIF(nifProvRaw)}_${numFactRaw}`;
          if (!groupedRows[key]) {
            groupedRows[key] = {
              fecha: findVal(row, mapping.fecha),
              nif: cleanNIF(nifProvRaw),
              proveedor: findVal(row, mapping.proveedor),
              numFactura: numFactRaw,
              base: 0,
              iva: 0,
              total: 0,
              lineas: []
            };
          }
          
          const rowBase = parseFloat(findVal(row, mapping.base) || 0);
          const rowIva = parseFloat(findVal(row, mapping.iva) || 0);
          const rowTotal = parseFloat(findVal(row, mapping.total) || 0);

          groupedRows[key].base += rowBase;
          groupedRows[key].iva += rowIva;
          groupedRows[key].total += rowTotal;
          groupedRows[key].lineas.push({
            descripcion: `Concepto Excel: ${numFactRaw}`,
            unidades: 1,
            precio_unitario: rowBase,
            iva_pct: rowBase > 0 ? (rowIva / rowBase) * 100 : 21
          });
        });

        const finalFacturas = Object.values(groupedRows);
        let importedCount = 0;
        let nextSequential = contadorCostes;
        const prefix = prefijoCostes || "";

        for (const fact of finalFacturas) {
          // 1. Asegurar Proveedor
          let provId = null;
          const { data: provExistente } = await supabase.from('proveedores').select('id').eq('nif', fact.nif).eq('user_id', user.id).maybeSingle();
          
          if (provExistente) {
            provId = provExistente.id;
          } else {
            const { data: newProv } = await supabase.from('proveedores').insert([{
              nombre: fact.proveedor || 'Proveedor Importado',
              nif: fact.nif,
              user_id: user.id
            }]).select('id').single();
            provId = newProv?.id;
          }

          // 2. Insertar Factura (Coste)
          let finalFecha = new Date().toISOString().split('T')[0];
          if (fact.fecha) {
            const date = new Date(fact.fecha);
            const a = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            finalFecha = `${a}-${m}-${d}`;
          }

          const internalNum = `${prefix}${nextSequential.toString().padStart(4, '0')}`;
          const payload: any = {
            user_id: user.id,
            fecha: finalFecha,
            total: fact.total
          };

          const setIfFound = (options: string[], value: any) => {
            const key = foundKey(options);
            if (key) payload[key] = value;
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

          // 4.1 Fallback Crítico para bases de datos vacías (Solo campos esenciales garantizados)
          if (cols.length === 0) {
            payload.num_interno = internalNum;
            payload.proveedor_id = prov.id;
            // Intentar asignar el número de factura al campo más probable si no se detectó
            if (!payload.num_factura_proveedor && !payload.numero_factura) {
              payload.num_factura_proveedor = num_factura.toString();
            }
          }

          const { data: newCoste, error: cErr } = await supabase.from('costes').insert(payload).select('id').single();

          if (cErr) throw new Error(cErr.message);
          
          if (newCoste) {
            // 3. Insertar Líneas
            const lineasToInsert = fact.lineas.map((l: any) => ({
              coste_id: newCoste.id,
              user_id: user.id,
              descripcion: l.descripcion,
              unidades: l.unidades,
              precio_unitario: l.precio_unitario,
              iva_pct: l.iva_pct
            }));
            await supabase.from('coste_lineas').insert(lineasToInsert);
            importedCount++;
            nextSequential++;
          } else {
            console.error("Error importando factura:", cErr);
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

  const handleResetEmitidas = async () => {
    if (!user) return;
    
    const confirm1 = confirm("⚠️ ATENCIÓN: Vas a borrar TODAS las facturas EMITIDAS (Ventas), sus líneas y registros de COBROS. Esta acción es IRREVERSIBLE. ¿Estás seguro?");
    if (!confirm1) return;

    const confirmText = prompt("Para confirmar el borrado de VENTAS, escribe la palabra: BORRAR");
    if (confirmText !== "BORRAR") {
      alert("Operación cancelada. El texto de confirmación no coincide.");
      return;
    }

    setIsResetting(true);
    try {
      await supabase.from('venta_lineas').delete().eq('user_id', user.id);
      await supabase.from('cobros').delete().eq('user_id', user.id);
      await supabase.from('ventas').delete().eq('user_id', user.id);
      
      await supabase.from('perfil_negocio').update({
        contador_ventas: 1
      }).eq('user_id', user.id);

      alert("✅ Datos de VENTAS eliminados correctamente. El contador ha sido reseteado a 1.");
      window.location.reload();
    } catch (err: any) {
      alert("Error al resetear ventas: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetRecibidas = async () => {
    if (!user) return;
    
    const confirm1 = confirm("⚠️ ATENCIÓN: Vas a borrar TODAS las facturas RECIBIDAS (Costes), PROVEEDORES y registros de PAGOS. Esta acción es IRREVERSIBLE. ¿Estás seguro?");
    if (!confirm1) return;

    const confirmText = prompt("Para confirmar el borrado de COSTES y PROVEEDORES, escribe la palabra: BORRAR");
    if (confirmText !== "BORRAR") {
      alert("Operación cancelada. El texto de confirmación no coincide.");
      return;
    }

    setIsResetting(true);
    try {
      await supabase.from('coste_lineas').delete().eq('user_id', user.id);
      await supabase.from('pagos').delete().eq('user_id', user.id);
      await supabase.from('costes').delete().eq('user_id', user.id);
      await supabase.from('proveedores').delete().eq('user_id', user.id);

      await supabase.from('perfil_negocio').update({
        contador_costes: 1
      }).eq('user_id', user.id);

      alert("✅ Datos de COSTES y PROVEEDORES eliminados correctamente. El contador ha sido reseteado a 1.");
      window.location.reload();
    } catch (err: any) {
      alert("Error al resetear costes: " + err.message);
    } finally {
      setIsResetting(false);
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

  const [activeTab, setActiveTab] = useState<'perfil' | 'ai' | 'legales' | 'seguridad' | 'fiscalidad' | 'backup' | 'email' | 'import' | 'mantenimiento'>('perfil');

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
    { id: 'mantenimiento', label: 'Mantenimiento', icon: AlertTriangle, color: 'text-red-600' },
  ];

  const lastBackup = autoBackups[0];
  const lastBackupStr = lastBackup 
    ? new Date(lastBackup.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'No disponible';

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-black font-head tracking-tight mb-2 text-gray-900">Configuración</h1>
            <p className="text-[var(--muted)] font-medium">Personaliza tu perfil, facturación y seguridad.</p>
          </div>
          <div className="flex items-center gap-3">
             {saving && (
               <div className="flex items-center gap-2 text-[10px] font-black text-[var(--accent)] uppercase tracking-widest bg-[var(--accent-alpha)] px-4 py-2 rounded-full animate-pulse">
                 <RefreshCcw size={12} className="animate-spin" /> Auto-guardando...
               </div>
             )}
             <button onClick={handleSaveAll} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 text-white font-black hover:bg-black transition-all active:scale-[0.98] shadow-xl">
               <Save size={18} /> Guardar Cambios
             </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Menú Lateral de Ajustes */}
          <div className="lg:col-span-1 space-y-2">
            <button onClick={() => setActiveTab("negocio")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${activeTab === "negocio" ? "bg-white text-[var(--accent)] shadow-md border-l-4 border-[var(--accent)]" : "text-gray-400 hover:text-gray-600 hover:bg-white/50"}`}>
              <Building2 size={20} /> Empresa
            </button>
            <button onClick={() => setActiveTab("facturacion")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${activeTab === "facturacion" ? "bg-white text-[var(--accent)] shadow-md border-l-4 border-[var(--accent)]" : "text-gray-400 hover:text-gray-600 hover:bg-white/50"}`}>
              <FileText size={20} /> Facturación
            </button>
            <button onClick={() => setActiveTab("email")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${activeTab === "email" ? "bg-white text-[var(--accent)] shadow-md border-l-4 border-[var(--accent)]" : "text-gray-400 hover:text-gray-600 hover:bg-white/50"}`}>
              <Mail size={20} /> Email & SMTP
            </button>
            <button onClick={() => setActiveTab("integraciones")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${activeTab === "integraciones" ? "bg-white text-[var(--accent)] shadow-md border-l-4 border-[var(--accent)]" : "text-gray-400 hover:text-gray-600 hover:bg-white/50"}`}>
              <Share2 size={20} /> IA & Verifactu
            </button>
            <button onClick={() => setActiveTab("legal")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${activeTab === "legal" ? "bg-white text-[var(--accent)] shadow-md border-l-4 border-[var(--accent)]" : "text-gray-400 hover:text-gray-600 hover:bg-white/50"}`}>
              <BookOpen size={20} /> Textos Legales
            </button>
            <button onClick={() => setActiveTab("seguridad")} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${activeTab === "seguridad" ? "bg-white text-[var(--accent)] shadow-md border-l-4 border-[var(--accent)]" : "text-gray-400 hover:text-gray-600 hover:bg-white/50"}`}>
              <Shield size={20} /> Backup & Nube
            </button>
          </div>

          {/* Contenido Principal */}
          <div className="lg:col-span-3 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {activeTab === "negocio" && (
              <div className="space-y-6">
                <div className="glass-card p-10 space-y-8">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <Building2 size={24} />
                    </div>
                    <h2 className="text-xl font-black tracking-tight">Datos Fiscales</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Razón Social</label>
                      <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Nombre de tu empresa" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NIF / CIF</label>
                      <input type="text" value={nif} onChange={(e) => setNif(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-mono font-bold focus:bg-white transition-all uppercase" placeholder="B12345678" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email de Contacto</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:bg-white transition-all" placeholder="hola@empresa.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                      <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:bg-white transition-all" placeholder="+34 600 000 000" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">IBAN (Cifrado en Reposo)</label>
                      <div className="relative">
                        <CreditCard className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <input type="text" value={cuentaBancaria} onChange={(e) => setCuentaBancaria(e.target.value)} className="w-full pl-16 pr-6 py-4 rounded-2xl border bg-gray-50 outline-none font-mono font-bold focus:bg-white transition-all" placeholder="ES00 0000 0000 0000 0000 0000" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dirección Postal</label>
                      <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:bg-white transition-all" placeholder="Calle Ejemplo, 123" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Código Postal</label>
                      <input type="text" value={cp} maxLength={5} onChange={(e) => handleCPChange(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:bg-white transition-all" placeholder="28001" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Población</label>
                      <input type="text" value={poblacion} onChange={(e) => setPoblacion(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Provincia</label>
                      <input type="text" value={provincia} onChange={(e) => setProvincia(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sitio Web</label>
                      <input type="text" value={web} onChange={(e) => setWeb(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:bg-white transition-all" placeholder="www.tuempresa.com" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass-card p-10 space-y-6">
                    <div className="flex items-center gap-3">
                      <Palette className="text-purple-500" size={24} />
                      <h3 className="text-xl font-black tracking-tight">Identidad Visual</h3>
                    </div>
                    <div className="space-y-4">
                      <label className="block p-8 border-2 border-dashed border-gray-200 rounded-[2rem] hover:border-[var(--accent)] hover:bg-blue-50/30 transition-all cursor-pointer group text-center">
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        {logoUrl ? (
                          <div className="space-y-4">
                            <img src={logoUrl} alt="Logo" className="h-16 mx-auto object-contain drop-shadow-xl" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[var(--accent)]">Click para cambiar Logo</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="mx-auto text-gray-300 group-hover:text-[var(--accent)] group-hover:scale-110 transition-all" size={32} />
                            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Subir Logotipo</span>
                          </div>
                        )}
                      </label>
                      <p className="text-[10px] text-gray-400 italic text-center">Usado en facturas, presupuestos y albaranes.</p>
                    </div>
                  </div>

                  <div className="glass-card p-10 space-y-6">
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-orange-500" size={24} />
                      <h3 className="text-xl font-black tracking-tight">Imagen de Marca</h3>
                    </div>
                    <div className="space-y-4">
                      <label className="block p-8 border-2 border-dashed border-gray-200 rounded-[2rem] hover:border-orange-500 hover:bg-orange-50/30 transition-all cursor-pointer group text-center">
                        <input type="file" className="hidden" accept="image/*" onChange={handleCorpImageUpload} />
                        {imagenCorporativaUrl ? (
                          <div className="space-y-4">
                            <img src={imagenCorporativaUrl} alt="Corp" className="h-16 mx-auto object-contain rounded-lg shadow-xl" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-orange-500">Click para cambiar Imagen</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Plus className="mx-auto text-gray-300 group-hover:text-orange-500 group-hover:scale-110 transition-all" size={32} />
                            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Añadir Portada</span>
                          </div>
                        )}
                      </label>
                      <p className="text-[10px] text-gray-400 italic text-center">Imagen corporativa para la portada de presupuestos.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "facturacion" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="glass-card p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                      <FileText size={24} />
                    </div>
                    <h2 className="text-xl font-black tracking-tight">Series y Contadores</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gray-50 rounded-[2rem] p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Facturas Emitidas</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-[9px] font-black rounded uppercase">Ventas</span>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 ml-1">Siguiente Número</label>
                          <input type="number" value={contadorVentas} onChange={(e) => setContadorVentas(parseInt(e.target.value) || 1)} className="w-full px-5 py-3 rounded-xl border bg-white font-black text-xl text-[var(--accent)]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 ml-1">Serie</label>
                            <input type="text" value={serieVentas} onChange={(e) => setSerieVentas(e.target.value)} className="w-full px-5 py-3 rounded-xl border bg-white font-bold" placeholder="A" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 ml-1">Prefijo</label>
                            <input type="text" value={prefijoVentas} onChange={(e) => setPrefijoVentas(e.target.value)} className="w-full px-5 py-3 rounded-xl border bg-white font-bold" placeholder="F-2024-" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-[2rem] p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Facturas Recibidas</h3>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[9px] font-black rounded uppercase">Costes</span>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 ml-1">Siguiente Registro</label>
                          <input type="number" value={contadorCostes} onChange={(e) => setContadorCostes(parseInt(e.target.value) || 1)} className="w-full px-5 py-3 rounded-xl border bg-white font-black text-xl text-purple-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 ml-1">Serie</label>
                            <input type="text" value={serieCostes} onChange={(e) => setSerieCostes(e.target.value)} className="w-full px-5 py-3 rounded-xl border bg-white font-bold" placeholder="C" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 ml-1">Prefijo</label>
                            <input type="text" value={prefijoCostes} onChange={(e) => setPrefijoCostes(e.target.value)} className="w-full px-5 py-3 rounded-xl border bg-white font-bold" placeholder="G-2024-" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-[2rem] p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Presupuestos</h3>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[9px] font-black rounded uppercase">Proyectos</span>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 ml-1">Siguiente Número</label>
                          <input type="number" value={contadorProyectos} onChange={(e) => setContadorProyectos(parseInt(e.target.value) || 1)} className="w-full px-5 py-3 rounded-xl border bg-white font-black text-xl text-orange-600" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 ml-1">Prefijo</label>
                          <input type="text" value={prefijoProyectos} onChange={(e) => setPrefijoProyectos(e.target.value)} className="w-full px-5 py-3 rounded-xl border bg-white font-bold" placeholder="P-2024-" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass-card p-10 space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <Fingerprint size={20} />
                      </div>
                      <h3 className="text-xl font-black tracking-tight">Configuración IRPF</h3>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border">
                      <div className="space-y-1">
                        <span className="text-sm font-black text-gray-700">Emitir facturas con retención</span>
                        <p className="text-[10px] text-gray-400">Activa el campo de IRPF por defecto en nuevas facturas.</p>
                      </div>
                      <button onClick={() => setTieneRetencion(!tieneRetencion)} className={`w-14 h-7 rounded-full p-1 transition-all ${tieneRetencion ? "bg-orange-500" : "bg-gray-300"}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-all ${tieneRetencion ? "translate-x-7" : "translate-x-0"}`} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipos de IRPF disponibles</label>
                        <button onClick={addTipoIRPF} className="text-[10px] font-black text-[var(--accent)] hover:underline flex items-center gap-1"><Plus size={14} /> Añadir</button>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {tiposIRPF.map(t => (
                          <div key={t.id} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl shadow-sm">
                            <span className="font-bold text-sm">{t.valor}%</span>
                            <button onClick={() => removeTipoIRPF(t.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-10 space-y-8">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <Database size={20} />
                        </div>
                        <h3 className="text-xl font-black tracking-tight">Importación Masiva</h3>
                     </div>
                     <div className="space-y-6">
                        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100/50">
                           <h4 className="text-sm font-black text-blue-900 mb-2 flex items-center gap-2">
                             <Table size={16} /> Importar desde Excel
                           </h4>
                           <p className="text-[10px] text-blue-700/70 font-medium mb-4">Sube un Excel con tus facturas recibidas anteriores para completar el Libro IVA rápidamente.</p>
                           <label className="block w-full py-4 px-6 bg-white rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-500 text-center cursor-pointer group transition-all">
                              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                              <div className="flex items-center justify-center gap-3 text-blue-600 font-black uppercase text-[10px] tracking-widest group-hover:scale-105 transition-all">
                                <Upload size={18} /> Seleccionar Archivo Excel
                              </div>
                           </label>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           <AlertCircle className="text-gray-400 shrink-0" size={18} />
                           <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">El importador mapeará automáticamente columnas como "Fecha", "Proveedor", "NIF", "Base Imponible" y "Total".</p>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "integraciones" && (
              <div className="space-y-8">
                <div className="glass-card p-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Google Gemini IA</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Extracción inteligente de facturas</p>
                    </div>
                  </div>
                  
                  <div className="p-8 bg-purple-50 rounded-[2rem] border border-purple-100 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-purple-900/40 uppercase tracking-widest ml-1">API KEY DE GEMINI</label>
                      <div className="relative">
                        <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-purple-300" size={20} />
                        <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="w-full pl-16 pr-6 py-5 rounded-2xl border border-purple-200 outline-none font-mono font-bold focus:ring-4 focus:ring-purple-500/10 transition-all" placeholder="Alza_..." />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-purple-700/60">
                      <Shield className="shrink-0 mt-1" size={16} />
                      <p className="text-xs font-medium leading-relaxed">Tu API Key se usa exclusivamente para analizar los PDFs que subas. Nunca se comparte ni se usa para otros fines.</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Verifactu / AEAT</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cumplimiento normativa antifraude</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Entorno de Envío</label>
                      <div className="flex gap-4">
                        <button onClick={() => setVerifactuEnv("test")} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${verifactuEnv === "test" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>Entorno Pruebas</button>
                        <button onClick={() => setVerifactuEnv("production")} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${verifactuEnv === "production" ? "bg-gray-900 text-white shadow-lg" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>Producción</button>
                      </div>
                    </div>

                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
                       <ShieldCheck className="text-blue-500" size={32} />
                       <div>
                          <h4 className="text-sm font-black text-blue-900">Certificado Digital</h4>
                          <p className="text-[10px] text-blue-700/60 font-medium">Gestionado de forma segura mediante claves privadas locales.</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="glass-card p-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Configuración SMTP</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Para enviar facturas directamente por email</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Remitente (Gmail/Outlook)</label>
                      <input 
                        type="email" 
                        value={smtpEmail} 
                        onChange={(e) => setSmtpEmail(e.target.value)} 
                        className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all" 
                        placeholder="tu-email@gmail.com" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña de Aplicación (Cifrada)</label>
                      <input 
                        type="password" 
                        value={smtpAppPassword} 
                        onChange={(e) => setSmtpAppPassword(e.target.value)} 
                        className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-mono font-bold focus:bg-white transition-all" 
                        placeholder="•••• •••• •••• ••••" 
                      />
                    </div>
                    <div className="md:col-span-2 p-6 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-4">
                       <AlertTriangle className="text-orange-500 shrink-0 mt-1" size={20} />
                       <div className="space-y-2">
                          <h4 className="text-sm font-black text-orange-900">Nota sobre seguridad</h4>
                          <p className="text-xs text-orange-700/70 font-medium leading-relaxed">
                             Si usas Gmail, debes generar una <strong>"Contraseña de aplicación"</strong> en tu cuenta de Google. No uses tu contraseña normal de acceso.
                             Esta clave se almacena cifrada en nuestra base de datos con grado militar (AES-256).
                          </p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "legal" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="glass-card p-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Textos Legales</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RGPD y condiciones generales</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Forma de Pago (Pie de página)</label>
                      <textarea value={formaPago} onChange={(e) => setFormaPago(e.target.value)} rows={3} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-medium focus:bg-white transition-all" placeholder="Ej: Pago mediante transferencia bancaria a la cuenta ES00..." />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Condiciones Legales (En facturas)</label>
                      <textarea value={condicionesLegales} onChange={(e) => setCondicionesLegales(e.target.value)} rows={4} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-medium focus:bg-white transition-all" placeholder="Condiciones generales de venta..." />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cláusula Protección de Datos (LOPD)</label>
                      <textarea value={lopdText} onChange={(e) => setLopdText(e.target.value)} rows={4} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-medium focus:bg-white transition-all" placeholder="Sus datos serán tratados por..." />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Texto Aceptación Presupuesto</label>
                      <textarea value={textoAceptacion} onChange={(e) => setTextoAceptacion(e.target.value)} rows={3} className="w-full px-6 py-4 rounded-2xl border bg-gray-50 outline-none font-medium focus:bg-white transition-all" placeholder="Firma este documento para aceptar el presupuesto..." />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "seguridad" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="glass-card p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <Database size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight">Backups en la Nube</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Seguridad de tus datos</p>
                      </div>
                    </div>
                    <button onClick={handleBackupNow} disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20">
                      <Database size={18} /> Backup Manual Ahora
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Últimas copias de seguridad</h3>
                    <div className="divide-y border rounded-[2rem] overflow-hidden bg-gray-50/50">
                      {backups.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 font-medium italic">No hay backups realizados aún.</div>
                      ) : (
                        backups.map(b => (
                          <div key={b.id} className="p-6 flex items-center justify-between hover:bg-white transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-white rounded-xl shadow-sm text-blue-500 group-hover:scale-110 transition-all">
                                <Database size={16} />
                              </div>
                              <div>
                                <span className="block font-bold text-gray-800">{new Date(b.created_at).toLocaleString()}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{b.type === 'auto' ? 'Automática' : 'Manual'}</span>
                              </div>
                            </div>
                            <button className="p-3 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                              <Download size={20} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="glass-card p-10 bg-red-50/50 border-red-100 border-2 space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                        <Shield size={24} />
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
          {activeTab === 'mantenimiento' && (
            <div className="bg-white rounded-[2rem] border border-red-100 p-10 shadow-sm space-y-10 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-start justify-between border-b border-red-50 pb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black font-head text-red-900 tracking-tighter">Mantenimiento de Datos</h2>
                    <p className="text-sm text-gray-400 font-sans">Herramientas de limpieza y reset para fase de pruebas.</p>
                  </div>
                  <AlertTriangle className="text-red-100" size={48} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Bloque Emitidas */}
                  <div className="p-8 bg-blue-50 rounded-[2rem] border border-blue-100 space-y-6">
                    <div className="space-y-2">
                       <h3 className="font-black text-blue-900 flex items-center gap-2">
                         <FileText size={20} /> Borrado de Ventas (Emitidas)
                       </h3>
                       <p className="text-xs text-blue-800/70 font-medium leading-relaxed">
                         Elimina todas las facturas emitidas, sus líneas y registros de cobros.
                       </p>
                    </div>

                    <div className="bg-white/50 p-4 rounded-xl border border-blue-200">
                       <ul className="text-[10px] text-blue-900 space-y-1 list-disc list-inside font-bold">
                          <li>Elimina todas las VENTAS.</li>
                          <li>Elimina todos los COBROS vinculados.</li>
                          <li>Reset contador VENTAS a 1.</li>
                       </ul>
                    </div>

                    <button 
                      onClick={handleResetEmitidas}
                      disabled={isResetting}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isResetting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      Limpiar Emitidas
                    </button>
                  </div>

                  {/* Bloque Recibidas */}
                  <div className="p-8 bg-red-50 rounded-[2rem] border border-red-100 space-y-6">
                    <div className="space-y-2">
                       <h3 className="font-black text-red-900 flex items-center gap-2">
                         <ShieldCheck size={20} /> Borrado de Gastos (Recibidas)
                       </h3>
                       <p className="text-xs text-red-800/70 font-medium leading-relaxed">
                         Elimina facturas recibidas (costes), proveedores y registros de pagos.
                       </p>
                    </div>

                    <div className="bg-white/50 p-4 rounded-xl border border-red-200">
                       <ul className="text-[10px] text-red-900 space-y-1 list-disc list-inside font-bold">
                          <li>Elimina todos los PROVEEDORES.</li>
                          <li>Elimina todos los COSTES y PAGOS.</li>
                          <li>Reset contador COSTES a 1.</li>
                       </ul>
                    </div>

                    <button 
                      onClick={handleResetRecibidas}
                      disabled={isResetting}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isResetting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      Limpiar Recibidas
                    </button>
                  </div>
               </div>

               <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                     ⚠️ Acciones irreversibles. Úsalas solo durante la puesta a punto de tu base de datos.
                  </p>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

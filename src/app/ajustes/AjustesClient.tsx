"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/Sidebar';
import { Save, Loader2, Download, Upload, AlertCircle, CheckCircle2, FileJson, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AjustesClient() {
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  useEffect(() => {
    fetchPerfil();
  }, []);

  const fetchPerfil = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('perfil_negocio')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (data) setPerfil(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase
      .from('perfil_negocio')
      .upsert({
        ...perfil,
        user_id: userData.user.id,
        updated_at: new Date().toISOString()
      });

    if (error) alert("Error al guardar: " + error.message);
    else alert("Configuración guardada correctamente");
    
    setSaving(true);
    await fetchPerfil();
    setSaving(false);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error("No hay sesión activa");

      const reader = new FileReader();
      const data = await new Promise((resolve) => {
        reader.onload = (evt) => resolve(evt.target?.result);
        reader.readAsArrayBuffer(file);
      });

      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Agrupar filas por factura (NIF + Número) para soportar múltiples bases de IVA
      const groupedData: Record<string, any[]> = {};
      for (const row of jsonData) {
        const rawNif = row.proveedor_nif || row.nif_proveedor || row.nif || row.nif_emisor || row.CIF || row.cif;
        const numFactura = row.num_factura || row.num_factura_proveedor || row.numero_factura || row.factura_prov || row.referencia;
        
        if (!rawNif || !numFactura) continue;
        const key = `${rawNif.toString().trim()}_${numFactura.toString().trim()}`;
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

      let successCount = 0;
      const errors: string[] = [];

      const entries = Object.entries(groupedData);
      for (let i = 0; i < entries.length; i++) {
        const [key, rows] = entries[i];
        const firstRow = rows[0];
        try {
          const rawNif = firstRow.proveedor_nif || firstRow.nif_proveedor || firstRow.nif || firstRow.nif_emisor || firstRow.CIF || firstRow.cif;
          const num_factura = firstRow.num_factura || firstRow.num_factura_proveedor || firstRow.numero_factura || firstRow.factura_prov || firstRow.referencia;
          const proveedor_nombre = firstRow.proveedor_nombre || firstRow.nombre_proveedor || firstRow.razon_social || firstRow.proveedor;
          const fecha = firstRow.fecha || firstRow.fecha_factura || firstRow.fecha_emision;

          if (!fecha || !num_factura || !proveedor_nombre || !rawNif) {
            errors.push(`Grupo ${key}: Faltan campos obligatorios.`);
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
            const updatePayload: any = {};
            setIfFound(['proveedor_id', 'id_proveedor'], prov.id, updatePayload);
            setIfFound(['num_interno', 'registro_interno', 'numero'], internalNum, updatePayload);
            setIfFound(['nif_proveedor', 'proveedor_nif', 'nif'], cleanNif, updatePayload);
            
            const { error: uErr } = await supabase.from('costes').update(updatePayload).eq('id', exist.id);
            if (uErr) throw new Error(`Error actualizando: ${uErr.message}`);
            
            nextSequential++;
            successCount += rows.length;
            continue;
          }

          // 4. Inserción Nueva
          setIfFound(['num_interno', 'registro_interno', 'numero'], internalNum);
          setIfFound(['nif_proveedor', 'proveedor_nif', 'nif'], cleanNif);
          setIfFound(['serie_costes', 'serie'], perf?.serie_costes || 'A');
          setIfFound(['num_factura_proveedor', 'numero_factura', 'num_factura', 'factura_prov', 'referencia'], num_factura.toString());
          setIfFound(['proveedor_id', 'id_proveedor'], prov.id);
          setIfFound(['base_imponible', 'base', 'subtotal'], totalBI);
          setIfFound(['iva_importe', 'cuota_iva', 'iva_total', 'iva'], totalIVA);
          setIfFound(['retencion_pct', 'irpf_pct'], parseFloat(firstRow.retencion_pct) || 0);
          setIfFound(['retencion_importe', 'irpf_importe', 'retencion', 'irpf'], totalRet);

          const { data: newCoste, error: cErr } = await supabase.from('costes').insert(payload).select('id').single();

          if (cErr) throw new Error(cErr.message);
          
          nextSequential++; 

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
      setImporting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10 text-left">
          <h1 className="text-3xl font-black text-gray-800">Ajustes del Negocio</h1>
          <p className="text-gray-500 font-medium">Configura tu perfil fiscal, numeración y herramientas de importación.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 text-left">
          <div className="xl:col-span-2 space-y-8">
            <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-sm border p-8">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b">
                <CheckCircle2 className="text-green-500" />
                <h2 className="text-xl font-bold">Datos Fiscales y Empresa</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre Comercial / Razón Social</label>
                  <input type="text" value={perfil?.nombre || ''} onChange={e => setPerfil({...perfil, nombre: e.target.value})} className="w-full p-4 rounded-2xl border bg-gray-50 focus:bg-white outline-none transition-all font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">NIF / CIF</label>
                  <input type="text" value={perfil?.nif || ''} onChange={e => setPerfil({...perfil, nif: e.target.value})} className="w-full p-4 rounded-2xl border bg-gray-50 focus:bg-white outline-none transition-all font-bold" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Dirección Fiscal Completa</label>
                  <input type="text" value={perfil?.direccion || ''} onChange={e => setPerfil({...perfil, direccion: e.target.value})} className="w-full p-4 rounded-2xl border bg-gray-50 focus:bg-white outline-none transition-all" />
                </div>
              </div>

              <div className="mt-10 pt-10 border-t grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Contador Facturas (Siguiente)</label>
                    <input type="number" value={perfil?.contador_ventas || 1} onChange={e => setPerfil({...perfil, contador_ventas: parseInt(e.target.value)})} className="w-full p-4 rounded-2xl border bg-gray-50 font-mono font-bold" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Contador Costes (Siguiente)</label>
                    <input type="number" value={perfil?.contador_costes || 1} onChange={e => setPerfil({...perfil, contador_costes: parseInt(e.target.value)})} className="w-full p-4 rounded-2xl border bg-gray-50 font-mono font-bold" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Prefijo Registros</label>
                    <input type="text" value={perfil?.prefijo_costes || ''} onChange={e => setPerfil({...perfil, prefijo_costes: e.target.value})} className="w-full p-4 rounded-2xl border bg-gray-50 font-mono" placeholder="Ej: R-" />
                 </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button type="submit" disabled={saving} className="px-10 py-4 bg-gray-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all flex items-center gap-3">
                  {saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar Cambios
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl">
               <div className="flex items-center gap-3 mb-6">
                 <Upload className="text-orange-200" />
                 <h2 className="text-xl font-black">Importación Masiva</h2>
               </div>
               <p className="text-orange-100 text-sm mb-8 leading-relaxed">Sube tu archivo Excel para importar facturas de costes. El sistema agrupará bases de IVA y asignará números de registro automáticamente.</p>
               
               <label className="block w-full cursor-pointer group">
                 <div className="w-full py-6 px-4 bg-white/10 hover:bg-white/20 border-2 border-dashed border-white/30 rounded-2xl flex flex-col items-center justify-center transition-all">
                    <FileSpreadsheet className="mb-2 text-orange-200" size={32} />
                    <span className="text-sm font-bold">{importing ? 'Procesando...' : 'Seleccionar Excel'}</span>
                    <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" disabled={importing} />
                 </div>
               </label>

               {importResults && (
                 <div className="mt-6 p-4 bg-white/10 rounded-2xl text-xs space-y-2 border border-white/10 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between"><span>Filas totales:</span><span className="font-bold">{importResults.total}</span></div>
                    <div className="flex justify-between text-green-200"><span>Éxito:</span><span className="font-bold">{importResults.success}</span></div>
                    {importResults.errors.length > 0 && (
                      <div className="pt-2 border-t border-white/10 text-red-200">
                        <div className="font-bold mb-1">Errores ({importResults.errors.length}):</div>
                        <div className="max-h-20 overflow-y-auto italic">{importResults.errors[0]}...</div>
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Receipt, Plus, Search, MoreHorizontal, Loader2, Trash2, Save, FileText, Download, Printer, FolderKanban, ChevronUp, ChevronDown, Filter, HandCoins } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { DataTableHeader } from "@/components/DataTableHeader";
import { SearchableSelect } from "@/components/SearchableSelect";
import { generatePDF } from "@/lib/pdfGenerator";
import { formatCurrency } from "@/lib/format";
import { sendInvoiceToAeat } from "@/lib/aeatService";
import { encrypt } from "@/lib/encryption";
import { UploadCloud, ShieldCheck, OctagonAlert } from "lucide-react";
import { exportVATBookPDF, exportVATBookExcel } from "@/lib/reportingService";
import { uploadInvoiceFile } from "@/lib/storageService";

interface LineaFactura {
  unidades: number;
  descripcion: string;
  precio_unitario: number;
}

export default function VentasPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--background)]"><Loader2 className="animate-spin text-[var(--accent)]" size={40} /></div>}>
      <VentasContent />
    </Suspense>
  );
}

function VentasContent() {
  const searchParams = useSearchParams();
  const [ventas, setVentas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [formasCobro, setFormasCobro] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [invoicingMode, setInvoicingMode] = useState<"manual" | "avance" | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sorting and Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'fecha', direction: 'desc' });
  const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>({});

  // Estados temporales del Wizard
  const [selectedProjId, setSelectedProjId] = useState("");
  const [pct, setPct] = useState("10");
  const [selectedVenta, setSelectedVenta] = useState<any>(null);
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);
  const [cobroFecha, setCobroFecha] = useState(new Date().toISOString().split('T')[0]);
  const [cobroImporte, setCobroImporte] = useState("");
  const [cobroForma, setCobroForma] = useState("Transferencia");

  const [hasAutoInvoiced, setHasAutoInvoiced] = useState(false);

  useEffect(() => {
    const pId = searchParams.get("proyectoId");
    const mode = searchParams.get("mode");
    if (pId && mode === "avance" && !hasAutoInvoiced) {
      setSelectedProjId(pId);
      setIsWizardOpen(true);
      setHasAutoInvoiced(true);
    }
  }, [searchParams, hasAutoInvoiced]);

  const handleProjectToInvoice = async (projId: string, pctRequested: number = 100) => {
    const proj = proyectos.find(p => p.id === projId);
    if (!proj) return;

    setLoading(true);
    try {
      // 1. Calcular lo facturado anteriormente
      const { data: vtsAnteriores } = await supabase.from("ventas").select("base_imponible").eq("proyecto_id", projId);
      const totalFacturadoAnterior = (vtsAnteriores || []).reduce((acc, v) => acc + (v.base_imponible || 0), 0);
      const baseProy = proj.base_imponible || 0;
      const pctAnterior = baseProy > 0 ? (totalFacturadoAnterior / baseProy) * 100 : 0;

      if (pctAnterior + pctRequested > 100.01) { // Pequeño margen para redondeo
        alert(`Error: No puedes facturar un ${pctRequested}%. Ya se ha facturado un ${pctAnterior.toFixed(2)}% de este proyecto. El total no puede exceder el 100%.`);
        setLoading(false);
        return;
      }

      const { data: pLineas } = await supabase.from("proyecto_lineas").select("*").eq("proyecto_id", projId);
      
      setEditingId(null);
      setClienteId(proj.cliente_id);
      setProyectoId(proj.id);
      setRetencionPct(proj.retencion_pct || 0);
      setSerie("A");
      setFecha(new Date().toISOString().split('T')[0]);
      
      const factor = pctRequested / 100;
      const numProyStr = (proj as any).num_proyecto ? ` nº ${(proj as any).num_proyecto}` : "";
      const projNombreLimpio = (proj as any).originalNombre || proj.nombre;
      const descripcionManual = `${pctRequested}% de avance del proyecto con descripción "${projNombreLimpio}"`;
      
      setLineas([{ 
        unidades: 1, 
        descripcion: descripcionManual, 
        precio_unitario: (proj.base_imponible || 0) * factor 
      }]);
      
      setIsWizardOpen(false);
      setIsEditorOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCobro = async () => {
    if (!selectedVenta) return;
    
    const nuevoImporte = parseFloat(cobroImporte) || 0;
    const yaCobrado = selectedVenta.totalCobrado || 0;
    
    // Bloqueo si el importe supera el total de la factura
    if (yaCobrado + nuevoImporte > selectedVenta.total + 0.01) {
      alert(`⚠️ El importe total cobrado (${(yaCobrado + nuevoImporte).toFixed(2)}€) no puede superar el total de la factura (${selectedVenta.total.toFixed(2)}€). Pendiente: ${(selectedVenta.total - yaCobrado).toFixed(2)}€`);
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      const payload: any = {
        venta_id: selectedVenta.id,
        fecha: cobroFecha,
        importe: nuevoImporte,
        entidad: selectedVenta.clientes?.nombre || "Cliente",
        categoria: "Ventas",
        forma_pago: cobroForma,
        user_id: user?.id
      };

      const { error } = await supabase.from("cobros").insert([payload]);
      if (error) throw error;

      setIsCobroModalOpen(false);
      setCobroImporte("");
      await fetchData();
      alert("✅ Cobro registrado correctamente");
    } catch (err: any) {
      alert("Error al registrar cobro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Estados del Editor
  const [serie, setSerie] = useState("A");
  const [numFactura, setNumFactura] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [clienteId, setClienteId] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [formaCobroId, setFormaCobroId] = useState("");
  const [retencionPct, setRetencionPct] = useState(0);
  const [lineas, setLineas] = useState<LineaFactura[]>([{ unidades: 1, descripcion: "", precio_unitario: 0 }]);

  useEffect(() => {
    fetchData();
  }, []);

  const getNextNumber = (targetSerie: string, allVentas: any[]) => {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `${currentYear}-`;
    const filteredVentas = allVentas.filter(v => 
      v.serie === targetSerie && 
      v.num_factura && 
      v.num_factura.startsWith(yearPrefix)
    );

    if (filteredVentas.length > 0) {
      const numbers = filteredVentas.map(v => {
        const parts = v.num_factura.split("-");
        return parseInt(parts[1], 10) || 0;
      });
      const nextNum = Math.max(...numbers) + 1;
      return `${yearPrefix}${nextNum.toString().padStart(3, "0")}`;
    }
    return `${yearPrefix}001`;
  };

  useEffect(() => {
    if (isEditorOpen && !editingId) {
      const next = getNextNumber(serie, ventas);
      setNumFactura(next);
    }
  }, [serie, isEditorOpen, editingId, ventas]);

  const fetchData = async () => {
    setLoading(true);
    const { data: vts } = await supabase.from("ventas").select("*, clientes(*), proyectos(nombre), venta_lineas(*)").order("fecha", { ascending: false });
    const { data: cbrs } = await supabase.from("cobros").select("*");
    const { data: clis } = await supabase.from("clientes").select("*").order("nombre");
    const { data: projs } = await supabase.from("proyectos").select("id, nombre, estado, cliente_id, base_imponible, clientes(*)").order("nombre");
    const { data: fbc } = await supabase.from("formas_cobro").select("*").order("nombre");
    const { data: perf } = await supabase.from("perfil_negocio").select("*").maybeSingle();

    const preparedVentas = (vts || []).map(v => {
      const misCobros = (cbrs || []).filter((c: any) => c.venta_id === v.id);
      const totalCobrado = misCobros.reduce((acc: number, c: any) => acc + (c.importe || 0), 0);
      let estadoPago = 'Pendiente';
      const pendiente = Math.max(0, (v.total || 0) - totalCobrado);
      
      return { ...v, totalCobrado, estadoPago, pendiente };
    });

    // Calcular facturación acumulada por proyecto
    const facturacionPorProyecto = (vts || []).reduce((acc: any, v: any) => {
      if (!v.proyecto_id) return acc;
      acc[v.proyecto_id] = (acc[v.proyecto_id] || 0) + (v.base_imponible || 0);
      return acc;
    }, {});

    setVentas(preparedVentas);
    setClientes(clis || []);
    
    // Preparar proyectos con nombre de cliente para el selector
    // Filtrar solo abiertos/pendientes Y que no estén facturados al 100%
    const preparedProjs = (projs || [])
      .filter(p => {
        const pEstado = (p.estado || "").toLowerCase();
        const estadoOk = pEstado === 'abierto' || pEstado === 'pendiente' || !pEstado;
        if (!estadoOk) return false;
        
        const yaFacturado = facturacionPorProyecto[p.id] || 0;
        const totalProy = p.base_imponible || 0;
        // Si no tiene base imponible, no es facturable por avance
        if (totalProy <= 0) return false;

        return yaFacturado < (totalProy - 0.01);
      })
      .map(p => ({
        ...p,
        originalNombre: p.nombre,
        nombre: `[${p.clientes?.nombre || 'S/C'}] ${p.nombre}`
      }));
    setProyectos(preparedProjs);
    setFormasCobro(fbc || []);
    setPerfil(perf);
    setLoading(false);
  };

  const addLinea = () => setLineas([...lineas, { unidades: 1, descripcion: "", precio_unitario: 0 }]);
  const removeLinea = (index: number) => setLineas(lineas.filter((_, i) => i !== index));
  
  const updateLinea = (index: number, field: keyof LineaFactura, value: any) => {
    const newLineas = [...lineas];
    newLineas[index] = { ...newLineas[index], [field]: value };
    setLineas(newLineas);
  };

  const baseImponible = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario), 0);
  const cuotaIva = serie === "A" ? baseImponible * 0.21 : 0;
  const retencionImporte = (baseImponible * (retencionPct || 0)) / 100;
  const totalFactura = baseImponible + cuotaIva - retencionImporte;

  const openEditVenta = (v: any) => {
    setEditingId(v.id);
    setSerie(v.serie);
    setNumFactura(v.num_factura);
    setFecha(v.fecha);
    setClienteId(v.cliente_id);
    setProyectoId(v.proyecto_id || "");
    setFormaCobroId(v.forma_cobro_id || "");
    setRetencionPct(v.retencion_pct || 0);
    
    if (v.venta_lineas && v.venta_lineas.length > 0) {
      setLineas(v.venta_lineas.map((l: any) => ({
        unidades: l.unidades,
        descripcion: l.descripcion,
        precio_unitario: l.precio_unitario
      })));
    } else {
      setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0 }]);
    }
    setIsEditorOpen(true);
  };

  const handleSaveInvoice = async () => {
    if (!clienteId || !numFactura) {
      alert("Faltan datos obligatorios (Cliente, Nº Factura)");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error("No hay sesión activa");

      // 1. DETECTAR COLUMNAS REALES ANTES DE PROCEDER
      const { data: colProbe } = await supabase.from("ventas").select("*").limit(1);
      // Si no hay datos, usamos un set de columnas por defecto basado en el error reportado
      const availableCols = (colProbe && colProbe.length > 0) ? Object.keys(colProbe[0]) : [];
      const foundKey = (options: string[]) => options.find(o => availableCols.includes(o));

      // 2. CONSTRUIR PAYLOAD QUIRÚRGICO
      const payload: any = {
        serie,
        fecha,
        cliente_id: clienteId,
        user_id: user.id
      };
      
      const setIfFound = (options: string[], value: any) => {
        const key = foundKey(options);
        if (key) payload[key] = value;
      };

      setIfFound(['num_factura', 'numero', 'referencia'], numFactura);
      setIfFound(['base_imponible', 'base', 'importe'], baseImponible);
      setIfFound(['iva_importe', 'cuota_iva', 'iva'], cuotaIva);
      setIfFound(['retencion_importe', 'irpf_importe', 'retencion'], retencionImporte);
      setIfFound(['total', 'importe_total'], totalFactura);
      setIfFound(['proyecto_id', 'id_proyecto'], proyectoId || null);
      setIfFound(['iva_pct'], (serie === "A" ? 21 : 0));
      setIfFound(['retencion_pct', 'irpf_pct'], retencionPct);

      // Casos críticos de campos obligatorios si realKeys está vacío (primer insert)
      if (availableCols.length === 0) {
        payload.num_factura = numFactura;
        payload.base_imponible = baseImponible;
        payload.total = totalFactura;
        payload.iva_importe = cuotaIva;
        // NO incluimos retencion_importe si no estamos seguros (por eso fallaba)
      }

      let currentVentaId = editingId;

      if (editingId) {
        const { error: uErr } = await supabase.from("ventas").update(payload).eq("id", editingId);
        if (uErr) throw uErr;
      } else {
        const { data: venta, error: vError } = await supabase.from("ventas").insert([payload]).select().single();
        if (vError) throw vError;
        currentVentaId = venta.id;
      }

      const lineasToInsert = lineas.map(l => ({
        venta_id: currentVentaId,
        unidades: l.unidades,
        descripcion: l.descripcion,
        precio_unitario: l.precio_unitario
      }));

      await supabase.from("venta_lineas").insert(lineasToInsert);
      setIsEditorOpen(false);
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifactuSubmit = async (v: any) => {
    if (!perfil || !perfil.nif) {
      alert("Configura tu NIF en Ajustes para enviar a Verifactu.");
      return;
    }

    let currentPass = perfil.verifactu_pass;
    
    // Si no hay contraseña, la pedimos "la primera vez"
    if (!currentPass) {
      const p = prompt("Introduce la contraseña de tu certificado digital para este envío (se guardará cifrada para futuros envíos):");
      if (!p) return;
      
      const encrypted = encrypt(p);
      const { error } = await supabase.from('perfil_negocio').update({ verifactu_pass: encrypted }).eq('user_id', perfil.user_id);
      if (error) {
        alert("Error al guardar la contraseña cifrada: " + error.message);
        return;
      }
      currentPass = encrypted;
      // Actualizamos perfil local para no volver a pedirlo en esta sesión
      setPerfil({ ...perfil, verifactu_pass: encrypted });
    }

    if (!confirm(`¿Transmitir la factura ${v.serie}-${v.num_factura} a la AEAT (Verifactu)?`)) return;

    setSaving(true);
    try {
      // 1. Obtener última factura enviada para el encadenamiento
      const { data: lastVenta } = await supabase
        .from("ventas")
        .select("verifactu_hash")
        .not("verifactu_hash", "is", null)
        .order("fecha", { ascending: false })
        .limit(1)
        .maybeSingle();

      const record: any = {
        nifExpedidor: perfil.nif,
        numFactura: `${v.serie}-${v.num_factura}`,
        fechaExpedicion: v.fecha,
        tipoFactura: 'F1', // Factura ordinaria
        importeTotal: v.total,
        hashAnterior: lastVenta?.verifactu_hash || ''
      };

      const result = await sendInvoiceToAeat(record, perfil);

      if (result.success) {
        // 2. Actualizar registro en DB
        const { error } = await supabase.from("ventas").update({
          verifactu_status: 'enviado',
          verifactu_ref_aeat: result.refAeat,
          verifactu_fecha_envio: new Date().toISOString(),
          verifactu_hash: (record.hashAnterior || '') + 'MOCKED_HASH_CHAIN' // En prod esto lo devolvería el service
        }).eq("id", v.id);

        if (error) throw error;
        alert("✅ Factura transmitida y aceptada por la AEAT.");
        fetchData();
      } else {
        alert("❌ Error AEAT: " + result.errorMsg);
      }
    } catch (err: any) {
      alert("Error en el proceso Verifactu: " + err.message);
    } finally {
      setSaving(false);
      setOpenMenuId(null);
    }
  };

  const handleDeleteVenta = async (v: any) => {
    try {
      // 1. Comprobar si tiene cobros
      const { data: cobros } = await supabase
        .from("cobros")
        .select("id")
        .eq("venta_id", v.id);
      
      if (cobros && cobros.length > 0) {
        alert("No se puede eliminar la factura, tendrás que emitir una rectificativa (Motivo: Tiene cobros asociados)");
        return;
      }

      // 2. Comprobar si es la última emitida (basado en num_factura y serie)
      const { data: posteriores } = await supabase
        .from("ventas")
        .select("id")
        .eq("serie", v.serie)
        .gt("num_factura", v.num_factura)
        .limit(1);

      if (posteriores && posteriores.length > 0) {
        alert("No se puede eliminar la factura, tendrás que emitir una rectificativa (Motivo: No es la última factura emitida)");
        return;
      }

      // 3. Comprobar Verifactu
      if (v.verifactu_status === 'enviado') {
        alert("No se puede eliminar la factura, tendrás que emitir una rectificativa (Motivo: Ya enviada a Verifactu)");
        return;
      }

      if (!confirm(`¿Seguro que quieres eliminar la factura ${v.serie}-${v.num_factura}?`)) return;

      const { error } = await supabase.from("ventas").delete().eq("id", v.id);
      if (error) throw error;

      alert("✅ Factura eliminada correctamente");
      fetchData();
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setOpenMenuId(null);
    }
  };

  const downloadInvoice = async (venta: any) => {
    if (!perfil) {
      alert("Configura primero tus datos de empresa en Ajustes.");
      return;
    }

    try {
      // Mapear los datos de la factura al formato esperado por el generador
      const pdfData: any = {
        tipo: 'FACTURA',
        numero: `${venta.serie}-${venta.num_factura}`,
        fecha: venta.fecha,
        cliente: {
          nombre: venta.clientes?.nombre || 'Consumidor Final',
          nif: venta.clientes?.nif || '',
          direccion: venta.clientes?.direccion || '',
          poblacion: venta.clientes?.poblacion || '',
          cp: venta.clientes?.cp || '',
          provincia: venta.clientes?.provincia || ''
        },
        perfil: perfil,
        lineas: (venta.venta_lineas || []).map((l: any) => ({
          unidades: l.unidades,
          descripcion: l.descripcion,
          precio_unitario: l.precio_unitario
        })),
        totales: {
          base: venta.base_imponible,
          iva_pct: venta.iva_pct || 21,
          iva_importe: venta.iva_importe,
          retencion_pct: venta.retencion_pct || 0,
          retencion_importe: venta.retencion_importe || 0,
          total: venta.total
        }
      };

      const doc = await generatePDF(pdfData);
      const pdfBlob = doc.output('blob');

      // Subir a Storage si no tiene pdf_url o si queremos actualizarla
      const publicUrl = await uploadInvoiceFile(pdfBlob, 'ventas', {
        number: `${venta.serie}-${venta.num_factura}`,
        entity: venta.clientes?.nombre || 'cliente'
      });

      if (publicUrl && !venta.pdf_url) {
        await supabase.from("ventas").update({ pdf_url: publicUrl }).eq("id", venta.id);
        await fetchData();
      }
    } catch (err: any) {
      console.error("Error al generar/guardar PDF:", err);
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

  const filteredVentas = ventas.filter(v => {
    // Global search
    const matchesGlobal = searchTerm === '' || 
      v.num_factura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.clientes?.nombre && v.clientes.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Column filters
    const matchesColumns = Object.keys(columnFilters).every(key => {
      if (!columnFilters[key]) return true;
      let val = '';
      if (key === 'cliente') val = v.clientes?.nombre || '';
      else if (key === 'num_factura') val = `${v.serie}-${v.num_factura}` || '';
      else if (key === 'total') val = v.total.toString() || '';
      else if (key === 'estadoPago') val = v.estadoPago || '';
      else val = v[key] || '';
      return val.toString().toLowerCase().includes(columnFilters[key].toLowerCase());
    });

    return matchesGlobal && matchesColumns;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    let aVal, bVal;
    
    if (sortConfig.key === 'cliente') {
      aVal = a.clientes?.nombre || '';
      bVal = b.clientes?.nombre || '';
    } else if (sortConfig.key === 'num_factura') {
      aVal = `${a.serie}-${a.num_factura}` || '';
      bVal = `${b.serie}-${b.num_factura}` || '';
    } else if (sortConfig.key === 'total') {
      aVal = a.total || 0;
      bVal = b.total || 0;
    } else if (sortConfig.key === 'estadoPago') {
      aVal = a.estadoPago || '';
      bVal = b.estadoPago || '';
    } else {
      aVal = a[sortConfig.key] || '';
      bVal = b[sortConfig.key] || '';
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        {!isEditorOpen ? (
          <>
            <header className="flex justify-between items-center mb-10">
              <div>
                <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Facturas Emitidas</h1>
                <p className="text-[var(--muted)] font-medium">Gestión y emisión de facturas profesionales.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => exportVATBookPDF('ventas', filteredVentas, perfil)} 
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-700 border border-gray-200 font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                >
                  <Download size={18} /> Libro IVA (PDF)
                </button>
                <button 
                  onClick={() => exportVATBookExcel('ventas', filteredVentas)} 
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-green-700 border border-gray-200 font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                >
                  <Download size={18} /> Libro IVA (Excel)
                </button>
                <button onClick={() => setIsWizardOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]">
                  <Plus size={18} /> Crear Factura
                </button>
              </div>
            </header>

            <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-visible text-left min-h-[400px]">

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-[var(--border)]">
                      <DataTableHeader label="Factura" field="num_factura" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.num_factura || ''} onFilter={handleFilter} />
                      <DataTableHeader label="Fecha" field="fecha" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.fecha || ''} onFilter={handleFilter} />
                      <DataTableHeader label="Cliente" field="cliente" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.cliente || ''} onFilter={handleFilter} />
                      <DataTableHeader label="Total" field="total" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.total || ''} onFilter={handleFilter} />
                      <DataTableHeader label="Pendiente" field="pendiente" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.pendiente || ''} onFilter={handleFilter} />
                      <DataTableHeader label="Cobro" field="estadoPago" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.estadoPago || ''} onFilter={handleFilter} />
                      <th className="px-6 py-4 text-[12px] font-black text-gray-500 uppercase tracking-wider text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredVentas.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50 group transition-colors">
                        <td className="px-6 py-4 text-sm font-bold">{v.serie}-{v.num_factura}</td>
                        <td className="px-6 py-4 text-sm text-[var(--muted)]">{new Date(v.fecha).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm">{v.clientes?.nombre || 'Consumidor Final'}</td>
                        <td className="px-6 py-4 text-sm font-mono font-bold text-right">
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v.total || 0)}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono font-bold text-right text-red-600">
                          {v.pendiente > 0 ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v.pendiente) : '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            v.estadoPago === 'Cobrado' ? 'bg-green-50 text-green-600' : 
                            (v.estadoPago === 'Cobro Parcial' || v.estadoPago === 'Parcial') ? 'bg-orange-50 text-orange-600' : 
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {v.estadoPago || 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <div className="flex flex-col items-end gap-1">
                            {/* Status VeriFactu Integrado */}
                            {v.verifactu_status === 'enviado' ? (
                              <div className="flex items-center gap-1 text-green-600 mb-1" title="Factura enviada a AEAT">
                                <ShieldCheck size={14} />
                                <span className="text-[9px] font-black uppercase tracking-tighter">Enviado</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-300 mb-1" title="Pendiente de enviar a AEAT">
                                <UploadCloud size={14} />
                                <span className="text-[9px] font-black uppercase tracking-tighter">Pendiente</span>
                              </div>
                            )}

                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === v.id ? null : v.id); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                              <MoreHorizontal size={20} />
                            </button>
                          </div>

                          {openMenuId === v.id && (
                            <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border border-[var(--border)] z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                              <button onClick={() => downloadInvoice(v)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                <Printer size={16}/> Imprimir Factura
                              </button>

                              {v.pdf_url && (
                                <a href={v.pdf_url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors">
                                  <FileText size={16} className="text-purple-500" /> Ver Factura PDF
                                </a>
                              )}

                              {v.verifactu_status !== 'enviado' && (
                                <button onClick={() => handleVerifactuSubmit(v)} disabled={saving} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                                  <UploadCloud size={16}/> Transmitir AEAT
                                </button>
                              )}
                               {v.estadoPago !== 'Cobrado' && (
                                 <button onClick={() => {
                                    setSelectedVenta(v);
                                    const balance = Math.max(0, v.total - (v.totalCobrado || 0));
                                    setCobroImporte(balance.toFixed(2));
                                    setIsCobroModalOpen(true);
                                    setOpenMenuId(null);
                                  }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors">
                                    <HandCoins size={16} className="text-green-500"/> Registrar Cobro
                                  </button>
                                )}
                                <button onClick={() => openEditVenta(v)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                  <Save size={16}/> Editar Factura
                                </button>
                              <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                <button 
                                  onClick={() => handleDeleteVenta(v)} 
                                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={16}/> Eliminar
                                </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </>
        ) : (
          <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-300 pb-20 text-left">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold font-head flex items-center gap-2">
                <FileText className="text-[var(--accent)]" /> Editor de Factura
              </h2>
              <div className="flex gap-3">
                <button onClick={() => setIsEditorOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                <button onClick={handleSaveInvoice} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Guardar y Emitir
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-[var(--border)] p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 pb-8 border-b border-dashed border-gray-200">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Serie</label>
                  <select value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 font-bold">
                    <option value="A">Serie A (IVA)</option>
                    <option value="B">Serie B (sin IVA)</option>
                  </select>
                </div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nº Factura</label><input type="text" value={numFactura} onChange={(e) => setNumFactura(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 font-mono" /></div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50" /></div>
                <div className="hidden">
                  <select value={formaCobroId} onChange={(e) => setFormaCobroId(e.target.value)}>
                    {formasCobro.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <SearchableSelect 
                    label="Cliente"
                    options={clientes}
                    value={clienteId}
                    onChange={(id) => setClienteId(id)}
                    placeholder="Buscar cliente..."
                  />
                </div>
                <div className="md:col-span-2">
                  <SearchableSelect 
                    label="Vincular a Proyecto (Opcional)"
                    options={proyectos}
                    value={proyectoId}
                    onChange={(id) => setProyectoId(id)}
                    placeholder="Seleccionar proyecto..."
                  />
                </div>
              </div>

              <div className="mb-8 overflow-x-auto">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr className="text-left">
                      <th className="w-20 pb-3 text-[10px] font-bold text-gray-400 uppercase">Ud.</th>
                      <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase">Descripción / Concepto</th>
                      <th className="w-32 pb-3 text-[10px] font-bold text-gray-400 uppercase text-right">Precio Ud.</th>
                      <th className="w-32 pb-3 text-[10px] font-bold text-gray-400 uppercase text-right">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((linea, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-4"><input type="number" value={linea.unidades} onChange={(e) => updateLinea(idx, "unidades", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 font-bold text-center" /></td>
                        <td className="py-2 pr-4"><textarea rows={1} value={linea.descripcion} onChange={(e) => updateLinea(idx, "descripcion", e.target.value)} className="w-full p-2 rounded-lg border border-gray-100 text-sm resize-none" /></td>
                        <td className="py-2 pr-4"><input type="number" value={linea.precio_unitario} onChange={(e) => updateLinea(idx, "precio_unitario", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 text-right font-mono" /></td>
                        <td className="py-2 text-right font-bold text-gray-700 font-mono">{formatCurrency(linea.unidades * linea.precio_unitario)}</td>
                        <td className="py-2 text-center">{lineas.length > 1 && <button onClick={() => removeLinea(idx)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row justify-between pt-8 border-t border-gray-100 gap-8">
                <div className="w-full md:w-64">
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Retención IRPF (%)</label>
                   <input type="number" value={retencionPct} onChange={(e) => setRetencionPct(parseFloat(e.target.value) || 0)} className="w-full p-2 rounded-lg border border-gray-200 font-bold" />
                </div>
                <div className="w-full md:w-80 space-y-3">
                  <div className="flex justify-between text-sm"><span>Base Imponible:</span><span className="font-mono font-bold text-gray-700">{formatCurrency(baseImponible)}</span></div>
                  <div className="flex justify-between text-sm"><span>IVA ({serie === "A" ? '21%' : '0%'}):</span><span className="font-mono font-bold text-gray-700">{formatCurrency(cuotaIva)}</span></div>
                  {retencionPct > 0 && <div className="flex justify-between text-sm text-red-600"><span className="font-medium">Retención ({retencionPct}%):</span><span className="font-mono font-bold">-{formatCurrency(retencionImporte)}</span></div>}
                  <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-200"><span>TOTAL:</span><span className="text-[var(--accent)]">{formatCurrency(totalFactura)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Modal */}
        {isWizardOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold font-head">{selectedProjId ? 'Facturar Grado de Avance' : 'Nueva Factura'}</h3>
                  <button onClick={() => setIsWizardOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
               </div>
               
               <div className="grid gap-4">
                  {!selectedProjId && (
                    <>
                      <button 
                        onClick={() => { setEditingId(null); setClienteId(""); setProyectoId(""); setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0 }]); setIsWizardOpen(false); setIsEditorOpen(true); }}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-[var(--accent)] hover:bg-orange-50 transition-all text-left group"
                      >
                        <div className="p-3 rounded-lg bg-gray-100 group-hover:bg-orange-100 text-gray-500 group-hover:text-[var(--accent)]"><Plus size={24}/></div>
                        <div>
                          <div className="font-bold">Factura de Extras</div>
                          <div className="text-xs text-gray-500">Crear una factura de servicios adicionales.</div>
                        </div>
                      </button>

                      <div className="py-2 flex items-center gap-4"><div className="h-px bg-gray-200 flex-1"></div><span className="text-[10px] font-bold text-gray-400 uppercase">O facturar presupuesto</span><div className="h-px bg-gray-200 flex-1"></div></div>
                    </>
                  )}

                   <div className="space-y-4">
                     {!selectedProjId ? (
                       <SearchableSelect 
                         label="Seleccionar Presupuesto para Facturar"
                         options={proyectos}
                         value={selectedProjId}
                         onChange={(id) => setSelectedProjId(id)}
                         placeholder="Buscar por nombre de cliente o presupuesto..."
                       />
                     ) : (
                       <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 mb-2">
                         <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Presupuesto Seleccionado</div>
                         <div className="font-bold text-gray-700">{proyectos.find(p => p.id === selectedProjId)?.nombre || 'Cargando...'}</div>
                       </div>
                     )}
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
                      <label className="block text-[10px] font-bold text-orange-600 uppercase tracking-widest ml-1">Grado de Avance de Facturación (%)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="1" 
                          max="100" 
                          value={pct} 
                          onChange={(e) => setPct(e.target.value)} 
                          className="flex-1 accent-orange-600"
                        />
                        <div className="w-16">
                          <input 
                            type="number" 
                            min="1" 
                            max="100" 
                            value={pct} 
                            onChange={(e) => setPct(e.target.value)} 
                            className="w-full p-2 rounded-lg border border-orange-200 text-center font-bold text-orange-700 focus:outline-none"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-orange-500 font-medium italic">Se facturará un {pct}% del presupuesto total.</p>
                    </div>

                    <button 
                      disabled={!selectedProjId}
                      onClick={() => handleProjectToInvoice(selectedProjId, parseFloat(pct))}
                      className="w-full py-4 bg-[var(--accent)] text-white rounded-xl font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200 hover:shadow-orange-300 active:scale-[0.98]"
                    >
                      <Receipt size={18} /> Facturar {pct}% del Presupuesto
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Modal Cobro */}
        {isCobroModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
               <div className="flex justify-between items-center mb-6 text-left">
                  <h3 className="text-xl font-black tracking-tight">Registrar Cobro</h3>
                  <button onClick={() => setIsCobroModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
               </div>
               <div className="space-y-4 text-left">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cliente</label>
                    <div className="p-4 rounded-xl bg-gray-50 border font-bold text-gray-800">{selectedVenta?.clientes?.nombre}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fecha de Cobro</label>
                      <input type="date" value={cobroFecha} onChange={e => setCobroFecha(e.target.value)} className="w-full p-4 rounded-xl border bg-gray-50 focus:bg-white transition-all outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Importe (€)</label>
                      <input type="number" step="0.01" value={cobroImporte} onChange={e => setCobroImporte(e.target.value)} className="w-full p-4 rounded-xl border bg-gray-50 focus:bg-white font-mono font-bold text-[var(--accent)] outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Forma de Cobro</label>
                    <select value={cobroForma} onChange={e => setCobroForma(e.target.value)} className="w-full p-4 rounded-xl border bg-gray-50 focus:bg-white font-bold outline-none transition-all">
                       <option value="Transferencia">Transferencia</option>
                       <option value="Tarjeta">Tarjeta</option>
                       <option value="Efectivo">Efectivo</option>
                       <option value="Giro Bancario">Giro Bancario</option>
                    </select>
                  </div>
                  <div className="pt-4">
                     <button 
                       disabled={saving}
                       onClick={handleRegisterCobro}
                       className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                     >
                       {saving ? <Loader2 className="animate-spin" size={20} /> : <HandCoins size={20} />}
                       Confirmar Cobro
                     </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

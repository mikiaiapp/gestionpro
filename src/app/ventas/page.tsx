"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Receipt, Plus, Search, MoreHorizontal, Loader2, Trash2, Save, Pencil, FileText, Download, Printer, FolderKanban, ChevronUp, ChevronDown, Filter, HandCoins, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import RichTextEditor from "@/components/RichTextEditor";
import { DataTableHeader } from "@/components/DataTableHeader";
import { SearchableSelect } from "@/components/SearchableSelect";
import { generatePDF } from "@/lib/pdfGenerator";
import { formatCurrency } from "@/lib/format";
import { sendInvoiceToAeat } from "@/lib/aeatService";
import { encrypt } from "@/lib/encryption";
import { UploadCloud, ShieldCheck, AlertTriangle } from "lucide-react";
import { exportVATBookPDF, exportVATBookExcel } from "@/lib/reportingService";
import { uploadInvoiceFile, deleteInvoiceFile } from "@/lib/storageService";
import { Pagination } from "@/components/Pagination";

interface LineaFactura {
  unidades: number;
  descripcion: string;
  precio_unitario: number;
  iva_pct?: number; // Opcional para retrocompatibilidad
}

type SortConfig = { key: string; direction: 'asc' | 'desc' };
type ColumnFilters = { [key: string]: string };

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
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'fecha', direction: 'desc' });
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
      setFormaPago(proj.forma_pago || perfil?.forma_pago_default || "");
      
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
  const [formaPago, setFormaPago] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const getNextNumber = (allVentas: any[]) => {
    const finalPrefix = perfil?.prefijo_ventas || `${new Date().getFullYear()}-`;

    // Extraer todos los números existentes con este prefijo
    const numbers = allVentas
      .filter(v => v.num_factura && v.num_factura.startsWith(finalPrefix))
      .map(v => {
        const after = v.num_factura.slice(finalPrefix.length);
        return parseInt(after, 10);
      })
      .filter(n => !isNaN(n) && n > 0);

    let nextNum = (perfil?.contador_ventas || 1);
    while (numbers.includes(nextNum)) {
      nextNum++;
    }

    return `${finalPrefix}${nextNum.toString().padStart(4, '0')}`;
  };

  useEffect(() => {
    if (isEditorOpen && !editingId) {
      const defaultSerie = perfil?.serie_ventas || "A";
      setSerie(defaultSerie);
      const next = getNextNumber(ventas);
      setNumFactura(next);
      setFormaPago(perfil?.forma_pago_default || "");
    }
  }, [isEditorOpen, editingId, ventas, perfil]);

  const fetchData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: vts } = await supabase.from("ventas").select("*, clientes(*), proyectos(nombre), venta_lineas(*)").eq("user_id", user.id).order("fecha", { ascending: false });
    const { data: cbrs } = await supabase.from("cobros").select("*").eq("user_id", user.id);
    const { data: clis } = await supabase.from("clientes").select("*").eq("user_id", user.id).order("nombre");
    const { data: projs } = await supabase.from("proyectos").select("id, nombre, estado, cliente_id, base_imponible, clientes(*)").eq("user_id", user.id).order("nombre");
    const { data: fbc } = await supabase.from("formas_cobro").select("*").order("nombre"); // Esto suele ser global, pero si es por usuario, añadir eq
    const { data: perf } = await supabase.from("perfil_negocio").select("*").eq("user_id", user.id).maybeSingle();

    const preparedVentas = (vts || []).map(v => {
      const misCobros = (cbrs || []).filter((c: any) => c.venta_id === v.id);
      const totalCobrado = misCobros.reduce((acc: number, c: any) => acc + (c.importe || 0), 0);
      const pendiente = Math.max(0, (v.total || 0) - totalCobrado);
      let estadoPago = 'PENDIENTE';
      if (v.total > 0) {
        if (pendiente <= 0.01) estadoPago = 'COBRADA';
        else if (totalCobrado > 0) estadoPago = 'PARCIALMENTE COBRADA';
      }
      
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
    const preparedProjs = (projs || [])
      .filter(p => {
        const pEstado = (p.estado || "").toLowerCase();
        const estadoOk = pEstado === 'abierto' || pEstado === 'pendiente' || !pEstado;
        if (!estadoOk) return false;
        
        const yaFacturado = facturacionPorProyecto[p.id] || 0;
        const totalProy = p.base_imponible || 0;
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
  
  const updateLinea = (index: number, updates: Partial<LineaFactura>) => {
    const newLineas = [...lineas];
    newLineas[index] = { ...newLineas[index], ...updates };
    setLineas(newLineas);
  };

  const baseImponible = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario), 0);
  const cuotaIva = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario * (serie === "A" ? (l.iva_pct ?? 21) / 100 : 0)), 0);
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
    setFormaPago(v.forma_pago || perfil?.forma_pago_default || "");
    
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
      setIfFound(['retencion_pct', 'irpf_pct'], retencionPct);
      setIfFound(['iva_pct'], 21); // Para compatibilidad con columnas simples si existen
      setIfFound(['forma_pago'], formaPago);

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
        
        // Actualizar el contador oficial en el perfil tras el éxito del registro
        const nextCount = (perfil?.contador_ventas || 1) + 1;
        await supabase.from("perfil_negocio").update({ contador_ventas: nextCount }).eq("user_id", user.id);
        fetchData(); // Recargar datos localmente
      }

      const lineasToInsert = lineas.map(l => ({
        venta_id: currentVentaId,
        unidades: l.unidades,
        descripcion: l.descripcion,
        precio_unitario: l.precio_unitario,
        iva_pct: l.iva_pct ?? 21
      }));

      await supabase.from("venta_lineas").insert(lineasToInsert);

      // --- AUTO ARCHIVADO PDF ---
      try {
        const { data: vFull } = await supabase.from('ventas').select('*, clientes(*)').eq('id', currentVentaId).single();
        const pdfDoc = await generatePDF({
          tipo: 'FACTURA',
          numero: vFull.num_factura || `${vFull.serie}-${vFull.id.substring(0, 5)}`,
          fecha: vFull.fecha,
          cliente: {
            nombre: vFull.clientes?.nombre || 'Particular',
            nif: vFull.clientes?.nif || '',
            direccion: vFull.clientes?.direccion || '',
            poblacion: vFull.clientes?.poblacion || '',
            cp: vFull.clientes?.codigo_postal || '',
            provincia: vFull.clientes?.provincia || '',
            email: vFull.clientes?.email || '',
            telefono: vFull.clientes?.telefono || '',
          },
          perfil: perfil,
          forma_pago: vFull.forma_pago || '',
          lineas: lineas,
          totales: {
            base: baseImponible,
            iva_pct: serie === "A" ? 21 : 0,
            iva_importe: cuotaIva,
            retencion_pct: retencionPct,
            retencion_importe: retencionImporte,
            total: totalFactura
          }
        });

        const blob = pdfDoc.output('blob');
        
        // Descargar localmente para el usuario (si lo desea, aunque aquí es auto-archivado)
        // pdfDoc.save(`Factura_${vFull.num_factura}.pdf`); 

        const publicUrl = await uploadInvoiceFile(blob, 'ventas', { 
          number: vFull.num_factura, 
          entity: vFull.clientes?.nombre || 'Cliente' 
        });

        await supabase.from('ventas').update({ archivo_url: publicUrl } as any).eq('id', currentVentaId);
      } catch (pdfErr) {
        console.error("Error auto-archivando PDF:", pdfErr);
      }
      // --------------------------

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

    if (!confirm(`¿Transmitir la factura ${v.num_factura} a la AEAT (Verifactu)?`)) return;

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
        numFactura: v.num_factura,
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
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      // 1. Comprobar si tiene cobros (Filtrado por usuario)
      const { data: cobros } = await supabase
        .from("cobros")
        .select("id")
        .eq("venta_id", v.id)
        .eq("user_id", user.id);
      
      if (cobros && cobros.length > 0) {
        alert("No se puede eliminar la factura, tendrás que emitir una rectificativa (Motivo: Tiene cobros asociados)");
        return;
      }

      // 2. Comprobar si es la última emitida (Filtrado por usuario)
      const { data: posteriores } = await supabase
        .from("ventas")
        .select("id")
        .eq("serie", v.serie)
        .eq("user_id", user.id)
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

      if (!confirm(`¿Seguro que quieres eliminar la factura ${v.num_factura}?`)) return;

      const { error } = await supabase.from("ventas").delete().eq("id", v.id).eq("user_id", user.id);
      if (error) throw error;

      // Eliminar el PDF del Storage para no dejar archivos huérfanos en la gestión documental
      if (v.archivo_url) await deleteInvoiceFile(v.archivo_url);

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
        numero: venta.num_factura,
        fecha: venta.fecha,
        cliente: {
          nombre: venta.clientes?.nombre || 'Consumidor Final',
          nif: venta.clientes?.nif || '',
          direccion: venta.clientes?.direccion || '',
          poblacion: venta.clientes?.poblacion || '',
          cp: venta.clientes?.codigo_postal || '',
          provincia: venta.clientes?.provincia || '',
          email: venta.clientes?.email || '',
          telefono: venta.clientes?.telefono || ''
        },
        perfil: perfil,
        forma_pago: venta.forma_pago || '',
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
      
      // DISPARAR DESCARGA REAL
      doc.save(`Factura_${venta.num_factura}.pdf`);

      const pdfBlob = doc.output('blob');

      // Subir a Storage si no tiene pdf_url o si queremos actualizarla
      const publicUrl = await uploadInvoiceFile(pdfBlob, 'ventas', {
        number: venta.num_factura,
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

  const handleSendByEmail = async (venta: any) => {
    if (!perfil || !perfil.smtp_email || !perfil.smtp_app_password) {
      const missing = !perfil ? 'Perfil' : (!perfil.smtp_email ? 'Email' : 'Contraseña de Aplicación');
      alert(`⚠️ Configuración incompleta (${missing}). Revisa Ajustes > Email.`);
      return;
    }

    const recipientEmail = venta.clientes?.email;
    if (!recipientEmail) {
      alert("⚠️ El cliente no tiene un email configurado.");
      return;
    }

    if (!confirm(`¿Enviar esta factura por email a ${recipientEmail}?`)) return;

    setSaving(true);
    try {
      const pdfData: any = {
        tipo: 'FACTURA',
        numero: venta.num_factura,
        fecha: venta.fecha,
        cliente: {
          nombre: venta.clientes?.nombre || 'Consumidor Final',
          nif: venta.clientes?.nif || '',
          direccion: venta.clientes?.direccion || '',
          poblacion: venta.clientes?.poblacion || '',
          cp: venta.clientes?.codigo_postal || '',
          provincia: venta.clientes?.provincia || '',
          email: venta.clientes?.email || '',
          telefono: venta.clientes?.telefono || ''
        },
        perfil: perfil,
        forma_pago: venta.forma_pago || '',
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
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Factura ${venta.num_factura} — ${perfil.nombre}`,
          body: `Hola ${venta.clientes?.nombre || ''},\n\nAdjuntamos la factura ${venta.num_factura} correspondiente a nuestros servicios.\n\nSaludos cordiales,\n${perfil.nombre}`,
          pdfBase64,
          fileName: `Factura_${venta.num_factura}.pdf`,
          smtpEmail: perfil.smtp_email,
          smtpPassword: decrypt(perfil.smtp_app_password),
          senderName: perfil.nombre
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert("✅ Factura enviada correctamente.");
      } else {
        alert("❌ Error al enviar: " + result.error);
      }
    } catch (err: any) {
      console.error("Error sending email:", err);
      alert("❌ Error inesperado al enviar el email.");
    } finally {
      setSaving(false);
      setOpenMenuId(null);
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
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
      else if (key === 'num_factura') val = v.num_factura || '';
      else if (key === 'total') val = v.total.toString() || '';
      else if (key === 'estadoPago') val = v.estadoPago || '';
      else val = v[key] || '';
      return val.toString().toLowerCase().includes(columnFilters[key].toLowerCase());
    });

    return matchesGlobal && matchesColumns;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    if (sortConfig.key === 'num_factura') {
      const aVal = a.num_factura || '';
      const bVal = b.num_factura || '';
      return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' }) * (sortConfig.direction === 'asc' ? 1 : -1);
    }

    let aVal, bVal;
    
    if (sortConfig.key === 'cliente') {
      aVal = a.clientes?.nombre || '';
      bVal = b.clientes?.nombre || '';
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

  const totalCount = filteredVentas.length;
  const totalPages = Math.ceil(totalCount / (pageSize || 1));

  const paginatedVentas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVentas.slice(start, start + pageSize);
  }, [filteredVentas, currentPage, pageSize]);

  if (loading) {
    return (
      <div className="flex bg-[var(--background)] min-h-screen">
        <Sidebar />
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-[var(--muted)] gap-3">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm font-medium">Cargando facturación...</p>
        </div>
      </div>
    );
  }

  const content = (
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

            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--accent)] transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente o número de factura..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[var(--border)] bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-[var(--accent-alpha)] transition-all font-medium"
                />
              </div>
            </div>

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
                    {paginatedVentas.map((v) => (
                      <tr key={v.id} className="hover:bg-[#fcfaf7] transition-colors group">
                        <td className="px-6 py-4 text-sm font-bold">{v.num_factura}</td>
                        <td className="px-6 py-4 text-sm text-[var(--muted)]">{new Date(v.fecha).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm">{v.clientes?.nombre || 'Consumidor Final'}</td>
                        <td className="px-6 py-4 text-sm font-mono font-bold text-right">
                          <div className="font-black text-gray-800 text-lg tracking-tight mb-1 group-hover:text-orange-600 transition-colors">
                            {formatCurrency(v.total || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono font-bold text-right text-red-600">
                        <div className={`text-[10px] font-bold ${v.pendiente > 0 ? 'text-red-500 bg-red-50' : 'text-green-600 bg-green-50'} px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-current/10`}>
                          {v.pendiente > 0 ? formatCurrency(v.pendiente) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.estadoPago === 'COBRADA' ? 'bg-green-50 text-green-600' : 
                          v.estadoPago === 'PARCIALMENTE COBRADA' ? 'bg-orange-50 text-orange-600' : 
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {v.estadoPago}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === v.id ? null : v.id);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <MoreHorizontal size={20} />
                        </button>

                        {openMenuId === v.id && (
                          <div className="absolute right-6 top-12 w-52 bg-white rounded-xl shadow-xl border z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                            <button onClick={() => downloadInvoice(v)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                              <Download size={16} className="text-blue-500" /> Descargar PDF
                            </button>
                            <button onClick={() => handleSendByEmail(v)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                              <Mail size={16} className="text-purple-500" /> Enviar por Email
                            </button>
                            
                            <div className="h-px bg-gray-100 my-1 mx-2"></div>

                            <button onClick={() => openEditVenta(v)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                              <Pencil size={16} className="text-blue-500" /> Editar Factura
                            </button>
                            
                            {v.estadoPago !== 'COBRADA' && (
                              <button 
                                onClick={() => {
                                  setSelectedVenta(v);
                                  const balance = Math.max(0, v.total - (v.totalCobrado || 0));
                                  setCobroImporte(balance.toFixed(2));
                                  setIsCobroModalOpen(true);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors"
                              >
                                <HandCoins size={16} /> Registrar Cobro
                              </button>
                            )}
                            
                            <button onClick={() => handleVerifactuSubmit(v)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-gray-50 transition-colors">
                              <ShieldCheck size={16} className="text-blue-500" /> Enviar a Verifactu
                            </button>

                            <div className="h-px bg-gray-100 my-1 mx-2"></div>
                            
                            <button onClick={() => handleDeleteVenta(v)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={16} /> Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalResults={filteredVentas.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </>
        ) : (
          <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[2.5rem] border border-[var(--border)] shadow-xl overflow-hidden mb-10">
              <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                    <Receipt size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black font-head tracking-tight">{editingId ? 'Editar Factura' : 'Nueva Factura'}</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{numFactura || 'Auto-Generado'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsEditorOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all">Cancelar</button>
                  <button onClick={handleSaveInvoice} disabled={saving} className="px-8 py-2.5 rounded-xl bg-[var(--accent)] text-white font-black shadow-lg shadow-[var(--accent-alpha)] hover:scale-[1.02] transition-all flex items-center gap-2">
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {editingId ? 'Actualizar Factura' : 'Registrar y Emitir'}
                  </button>
                </div>
              </div>

              <div className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Serie</label>
                    <select value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:ring-4 focus:ring-[var(--accent-alpha)] transition-all">
                      <option value="A">Serie A (Factura Ordinaria)</option>
                      <option value="B">Serie B (sin IVA)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nº Factura</label>
                    <input type="text" value={numFactura} onChange={(e) => setNumFactura(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-black text-[var(--accent)] tracking-tight focus:bg-white transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha Emisión</label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-bold focus:bg-white transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Retención (%)</label>
                    <input type="number" value={retencionPct} onChange={(e) => setRetencionPct(parseFloat(e.target.value))} className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none font-bold text-orange-600 focus:bg-white transition-all text-right" />
                  </div>

                  <div className="md:col-span-2">
                    <SearchableSelect label="Cliente" options={clientes} value={clienteId} onChange={setClienteId} placeholder="Seleccionar cliente..." />
                  </div>
                  <div className="md:col-span-2">
                    <SearchableSelect label="Vincular Proyecto (Opcional)" options={proyectos} value={proyectoId} onChange={setProyectoId} placeholder="Vincular a un presupuesto..." />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Conceptos Facturados</h3>
                    <button onClick={addLinea} className="flex items-center gap-1 text-[10px] font-black text-[var(--accent)] uppercase hover:underline transition-all">
                      <Plus size={14} /> Añadir Línea
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {lineas.map((linea, idx) => (
                      <div key={idx} className="flex gap-4 items-start animate-in slide-in-from-right-4 duration-300">
                        <div className="w-16">
                          <input type="number" value={linea.unidades} onChange={(e) => updateLinea(idx, { unidades: parseFloat(e.target.value) })} className="w-full px-4 py-3 rounded-xl border bg-gray-50 text-center font-bold" />
                        </div>
                        <div className="flex-1">
                          <textarea rows={1} value={linea.descripcion} onChange={(e) => updateLinea(idx, { descripcion: e.target.value })} placeholder="Descripción del concepto..." className="w-full px-4 py-3 rounded-xl border bg-gray-50 text-sm min-h-[44px] resize-none" />
                        </div>
                        <div className="w-32">
                          <input type="number" value={linea.precio_unitario} onChange={(e) => updateLinea(idx, { precio_unitario: parseFloat(e.target.value) })} placeholder="Precio" className="w-full px-4 py-3 rounded-xl border bg-gray-50 text-right font-bold" />
                        </div>
                        <div className="w-32 bg-gray-50 px-4 py-3 rounded-xl border text-right font-mono font-bold text-gray-400 text-sm">
                          {formatCurrency(linea.unidades * linea.precio_unitario)}
                        </div>
                        <button onClick={() => removeLinea(idx)} className="p-3 text-red-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-10 border-t border-dashed">
                  <div className="w-1/2 space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Forma de Pago (Pie de Factura)</label>
                    <RichTextEditor value={formaPago} onChange={setFormaPago} placeholder="Ej: Transferencia bancaria a ES00 0000..." />
                  </div>

                  <div className="w-1/3 bg-gray-50 rounded-[2rem] p-8 space-y-4 shadow-inner">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-gray-400 uppercase">Base Imponible</span>
                      <span className="font-mono font-bold text-gray-900">{formatCurrency(baseImponible)}</span>
                    </div>
                    {serie === "A" && (
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-gray-400 uppercase">IVA (21%)</span>
                        <span className="font-mono font-bold text-gray-900">{formatCurrency(cuotaIva)}</span>
                      </div>
                    )}
                    {retencionPct > 0 && (
                      <div className="flex justify-between text-sm text-orange-600">
                        <span className="font-bold uppercase tracking-tight">Retención IRPF ({retencionPct}%)</span>
                        <span className="font-mono font-bold">-{formatCurrency(retencionImporte)}</span>
                      </div>
                    )}
                    <div className="h-px bg-gray-200 my-4"></div>
                    <div className="flex justify-between items-end">
                      <span className="font-black text-gray-800 uppercase tracking-tighter text-xl">Total Factura</span>
                      <span className="text-3xl font-black text-[var(--accent)] tracking-tighter font-mono">{formatCurrency(totalFactura)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Wizard para Factura de Avance */}
        {isWizardOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                    <Receipt size={24} />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">Emitir Factura</h3>
                </div>
                <button onClick={() => setIsWizardOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Plus className="rotate-45 text-gray-400" size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => { setInvoicingMode('manual'); setIsWizardOpen(false); setIsEditorOpen(true); }}
                     className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 border-gray-100 hover:border-[var(--accent)] hover:bg-blue-50/30 transition-all group"
                   >
                     <div className="p-4 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-white group-hover:text-[var(--accent)] group-hover:shadow-md transition-all">
                       <Plus size={32} />
                     </div>
                     <span className="font-black text-gray-800 uppercase text-[10px] tracking-widest">Manual</span>
                   </button>

                   <button 
                     onClick={() => setInvoicingMode('avance')}
                     className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 transition-all group ${invoicingMode === 'avance' ? 'border-[var(--accent)] bg-blue-50/30' : 'border-gray-100 hover:border-[var(--accent)] hover:bg-blue-50/30'}`}
                   >
                     <div className={`p-4 rounded-2xl transition-all ${invoicingMode === 'avance' ? 'bg-white text-[var(--accent)] shadow-md' : 'bg-gray-50 text-gray-400 group-hover:bg-white group-hover:text-[var(--accent)] group-hover:shadow-md'}`}>
                       <FolderKanban size={32} />
                     </div>
                     <span className="font-black text-gray-800 uppercase text-[10px] tracking-widest">De Avance</span>
                   </button>
                </div>

                {invoicingMode === 'avance' && (
                  <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <SearchableSelect 
                      label="Seleccionar Proyecto" 
                      options={proyectos} 
                      value={selectedProjId} 
                      onChange={setSelectedProjId} 
                      placeholder="Buscar presupuesto..." 
                    />
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">% de Facturación (Avance)</label>
                      <div className="flex gap-3">
                         {['25', '50', '75', '100'].map(v => (
                           <button 
                             key={v} 
                             onClick={() => setPct(v)}
                             className={`flex-1 py-3 rounded-xl font-black text-sm border transition-all ${pct === v ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                           >
                             {v}%
                           </button>
                         ))}
                         <div className="flex-1 relative">
                            <input type="number" value={pct} onChange={e => setPct(e.target.value)} className="w-full h-full px-4 rounded-xl border bg-gray-50 font-black text-sm text-right pr-8" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                         </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleProjectToInvoice(selectedProjId, parseFloat(pct) || 0)}
                      disabled={!selectedProjId || !pct}
                      className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all disabled:opacity-50"
                    >
                      Generar Borrador
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Registrar Cobro */}
        {isCobroModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-300 space-y-6 text-left">
               <div className="flex justify-between items-center mb-2">
                  <h3 className="text-2xl font-black tracking-tight">Registrar Cobro</h3>
                  <button onClick={() => setIsCobroModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
               </div>
               
               <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-1">
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Factura {selectedVenta?.num_factura}</p>
                 <p className="text-lg font-black text-blue-900">{selectedVenta?.clientes?.nombre}</p>
                 <p className="text-sm font-bold text-blue-700/60">Total: {formatCurrency(selectedVenta?.total)} • Pendiente: {formatCurrency(selectedVenta?.pendiente)}</p>
               </div>

               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Importe a Cobrar</label>
                    <div className="relative">
                      <input type="number" step="0.01" value={cobroImporte} onChange={e => setCobroImporte(e.target.value)} className="w-full p-4 rounded-xl border bg-gray-50 font-black text-xl text-gray-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all pr-12" />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-gray-300 text-xl">€</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha del Cobro</label>
                    <input type="date" value={cobroFecha} onChange={e => setCobroFecha(e.target.value)} className="w-full p-4 rounded-xl border bg-gray-50 font-bold outline-none focus:bg-white transition-all" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Medio de Cobro</label>
                    <select value={cobroForma} onChange={e => setCobroForma(e.target.value)} className="w-full p-4 rounded-xl border bg-gray-50 font-bold outline-none focus:bg-white transition-all">
                       <option value="Transferencia">Transferencia Bancaria</option>
                       <option value="Efectivo">Efectivo</option>
                       <option value="Tarjeta">Tarjeta de Crédito</option>
                       <option value="Bizum">Bizum</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleRegisterCobro} 
                    disabled={saving || !cobroImporte}
                    className="w-full py-5 bg-[var(--accent)] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--accent-alpha)] hover:bg-blue-700 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <HandCoins size={20} />}
                    Confirmar Cobro
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  return content;
}

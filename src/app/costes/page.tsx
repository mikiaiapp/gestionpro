"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, MoreHorizontal, Loader2, Receipt, Upload, Save, Trash2, X, Sparkles, AlertCircle, UserPlus, ChevronUp, ChevronDown, Filter, Search, HandCoins, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { DataTableHeader } from "@/components/DataTableHeader";
import { formatCurrency, cleanNIF } from "@/lib/format";
import { extractDataFromInvoice } from "@/lib/aiService";
import { SearchableSelect } from "@/components/SearchableSelect";
import { uploadInvoiceFile, deleteInvoiceFile } from "@/lib/storageService";
import { exportVATBookPDF, exportVATBookExcel } from "@/lib/reportingService";
import { getFullLocationByCP } from '@/lib/geoData';

interface LineaCoste {
  unidades: number;
  descripcion: string;
  precio_unitario: number;
  iva_pct: number;
}

export default function CostesPage() {
  const [costes, setCostes] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCoste, setSelectedCoste] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Formulario
  const [serie, setSerie] = useState("A");
  const [numInterno, setNumInterno] = useState("");
  const [numFactProv, setNumFactProv] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [proveedorId, setProveedorId] = useState("");
  const [tipoGasto, setTipoGasto] = useState("general");
  const [proyectoId, setProyectoId] = useState("");
  const [retencionPct, setRetencionPct] = useState(0);
  const [estadoPago, setEstadoPago] = useState("Pendiente");
  const [lineas, setLineas] = useState<LineaCoste[]>([{ unidades: 1, descripcion: "", precio_unitario: 0, iva_pct: 21 }]);

  // Nuevo Proveedor Detectado (IA)
  const [detectedProvider, setDetectedProvider] = useState<any>(null);
  const [isProviderReviewModalOpen, setIsProviderReviewModalOpen] = useState(false);

  // Estados Pago Modal
  const [pagoImporte, setPagoImporte] = useState("");
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().split('T')[0]);
  const [pagoForma, setPagoForma] = useState("Transferencia");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'fecha', direction: 'desc' });
  const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>({});

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchPerfil();
  }, []);

  const fetchPerfil = async () => {
    const { data } = await supabase.from("perfil_negocio").select("*").single();
    if (data) setPerfil(data);
  };

  // Numeración correlativa automática (Libro de IVA Soportado)
  useEffect(() => {
    if (!editingId && isModalOpen && costes.length >= 0) {
       const maxNum = costes.reduce((acc, c) => {
         const n = parseInt(c.num_interno);
         return isNaN(n) ? acc : Math.max(acc, n);
       }, 0);
       setNumInterno((maxNum + 1).toString());
    }
  }, [isModalOpen, editingId, costes]);

  const fetchData = async () => {
    setLoading(true);
    const { data: csts } = await supabase.from("costes").select("*, proveedores(nombre), proyectos(nombre), coste_lineas(*)").order("fecha", { ascending: false });
    const { data: pgts } = await supabase.from("pagos").select("*");
    const { data: provs } = await supabase.from("proveedores").select("id, nombre, nif").order("nombre");
    const { data: projs } = await supabase.from("proyectos").select("id, nombre, estado, cliente_id, clientes(nombre)").order("nombre");

    const preparedCostes = (csts || []).map(c => {
      const misPagos = (pgts || []).filter((p: any) => p.coste_id === c.id);
      const totalPagado = misPagos.reduce((acc: number, p: any) => acc + (p.importe || 0), 0);
      let estadoPagoRaw = 'Pendiente';
      if (c.total > 0) {
        if (totalPagado >= c.total) estadoPagoRaw = 'Pagado';
        else if (totalPagado > 0) estadoPagoRaw = 'Pago Parcial';
      }
      
      return { ...c, totalPagado, estadoPago: estadoPagoRaw };
    });

    setCostes(preparedCostes);
    setProveedores(provs || []);
    const preparedProjs = (projs || []).map(p => ({
      ...p,
      nombre: `[${p.clientes?.nombre || 'S/C'}] ${p.nombre}`
    }));
    setProyectos(preparedProjs);
    setLoading(false);
  };

  const addLinea = () => setLineas([...lineas, { unidades: 1, descripcion: "", precio_unitario: 0, iva_pct: 21 }]);
  const removeLinea = (index: number) => setLineas(lineas.filter((_, i) => i !== index));
  const updateLinea = (index: number, field: keyof LineaCoste, value: any) => {
    const newLineas = [...lineas];
    newLineas[index] = { ...newLineas[index], [field]: value };
    setLineas(newLineas);
  };

  const baseImponible = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario), 0);
  const totalIva = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario * (serie === "A" ? l.iva_pct / 100 : 0)), 0);
  const retencionImporte = (baseImponible * (retencionPct || 0)) / 100;
  const totalFactura = baseImponible + totalIva - retencionImporte;


  const openAddModal = () => {
    setEditingId(null);
    setSerie("A");
    setNumInterno("");
    setNumFactProv("");
    setFecha(new Date().toISOString().split('T')[0]);
    setProveedorId("");
    setTipoGasto("general");
    setProyectoId("");
    setRetencionPct(0);
    setEstadoPago("Pendiente");
    setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0, iva_pct: 21 }]);
    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setEditingId(c.id);
    setSerie(c.serie || "A");
    setNumInterno(c.num_interno || "");
    setNumFactProv(c.num_factura_proveedor || "");
    setFecha(c.fecha);
    setProveedorId(c.proveedor_id || "");
    setTipoGasto(c.tipo_gasto || "general");
    setProyectoId(c.proyecto_id || "");
    setRetencionPct(c.retencion_pct || 0);
    setEstadoPago(c.estado_pago || "Pendiente");
    setPdfUrl(c.pdf_url || "");
    setPdfFile(null);
    
    if (c.coste_lineas && c.coste_lineas.length > 0) {
      setLineas(c.coste_lineas.map((l: any) => ({
        unidades: l.unidades,
        descripcion: l.descripcion,
        precio_unitario: l.precio_unitario,
        iva_pct: l.iva_pct
      })));
    } else {
      setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0, iva_pct: 21 }]);
    }
    setIsModalOpen(true);
  };

  const handleRegisterPayment = async () => {
    if (!selectedCoste || !pagoImporte) return;
    
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      const nuevoImporte = parseFloat(pagoImporte) || 0;
      const yaPagado = selectedCoste.totalPagado || 0;
      
      // Bloqueo si el importe supera el total de la factura
      if (yaPagado + nuevoImporte > selectedCoste.total + 0.01) {
        alert(`⚠️ El importe total pagado (${(yaPagado + nuevoImporte).toFixed(2)}€) no puede superar el total de la factura (${selectedCoste.total.toFixed(2)}€). Pendiente: ${(selectedCoste.total - yaPagado).toFixed(2)}€`);
        setSaving(false);
        return;
      }
      
      const payload: any = {
        coste_id: selectedCoste.id,
        entidad: selectedCoste.proveedores?.nombre || "Proveedor",
        fecha: pagoFecha,
        importe: nuevoImporte,
        categoria: "Proveedores",
        forma_pago: pagoForma,
        user_id: user?.id
      };

      const { error } = await supabase.from("pagos").insert([payload]);
      if (error) throw error;

      setIsPayModalOpen(false);
      setPagoImporte("");
      fetchData();
      alert("✅ Pago registrado correctamente");
    } catch (err: any) {
      alert("Error al registrar pago: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImportWithAI = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      // 1. Obtener la API Key de Ajustes
      const { data: perf } = await supabase.from('perfil_negocio').select('gemini_key').single();
      if (!perf?.gemini_key) {
        alert("Configura primero tu Gemini API Key en Ajustes.");
        setIsExtracting(false);
        return;
      }

      // 2. Convertir a Base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          
          // 3. Extraer con IA
          const result = await extractDataFromInvoice(base64, perf.gemini_key);
          
          if (!result) throw new Error("La IA no devolvió datos válidos.");

          
          // 3.5 Limpiar NIF detectado
          const cleanedNIF = cleanNIF(result.proveedor_nif);
          
          // 4. Buscar Proveedor por NIF limpio
          const provExistente = proveedores.find(p => cleanNIF(p.nif) === cleanedNIF);
          
          if (provExistente) {
            setProveedorId(provExistente.id);
          } else {
            setDetectedProvider({ 
              nombre: result.proveedor_nombre, 
              nif: cleanedNIF,
              direccion: result.proveedor_direccion || "",
              cp: result.proveedor_cp || "",
              poblacion: "",
              provincia: ""
            });
            setIsProviderReviewModalOpen(true);
          }

          // 5. Rellenar formulario
          setNumFactProv(result.num_factura || "");
          setFecha(result.fecha || new Date().toISOString().split('T')[0]);
          setRetencionPct(result.retencion_pct || 0);
          
          if (result.lineas && result.lineas.length > 0) {
            setLineas(result.lineas.map((l: any) => ({
              unidades: l.unidades || 1,
              descripcion: l.descripcion || "Concepto extraído por IA",
              precio_unitario: l.precio_unitario || 0,
              iva_pct: l.iva_pct || 21
            })));
          }

          setIsAiModalOpen(false);
          setIsModalOpen(true);
        } catch (innerErr: any) {
          alert("Error al procesar el contenido del PDF: " + innerErr.message);
        } finally {
          setIsExtracting(false);
        }
      };
      
      reader.onerror = () => {
        alert("Error al leer el archivo físico.");
        setIsExtracting(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      alert("Error de inicialización: " + err.message);
      setIsExtracting(false);
    }
  };

  const handleCreateDetectedProvider = async () => {
    if (!detectedProvider) return;
    try {
      const { data, error } = await supabase.from('proveedores')
        .insert([{ 
          nombre: detectedProvider.nombre, 
          nif: cleanNIF(detectedProvider.nif),
          direccion: detectedProvider.direccion,
          codigo_postal: detectedProvider.cp,
          poblacion: detectedProvider.poblacion,
          provincia: detectedProvider.provincia,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select().single();
      
      if (error) throw error;
      
      alert("✅ Proveedor creado: " + data.nombre);
      const newProv = { id: data.id, nombre: data.nombre, nif: data.nif };
      setProveedores([...proveedores, newProv]);
      setProveedorId(data.id);
      setDetectedProvider(null);
      setIsProviderReviewModalOpen(false);
    } catch (err: any) {
      alert("Error al crear proveedor: " + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numFactProv || !proveedorId) {
      alert("Proveedor y Nº de Factura son obligatorios.");
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // DETECCIÓN DE COLUMNAS REALES (PRE-FLIGHT)
      const { data: colProbe } = await supabase.from("costes").select("*").limit(1);
      const availableCols = (colProbe && colProbe.length > 0) ? Object.keys(colProbe[0]) : [];
      const foundKey = (options: string[]) => options.find(o => availableCols.includes(o));

      const payload: any = {
        fecha,
        total: totalFactura,
        user_id: user.id,
        proveedor_id: proveedorId,
        tipo_gasto: tipoGasto
      };

      const setIfFound = (options: string[], value: any) => {
        const key = foundKey(options);
        if (key) payload[key] = value;
      };

      setIfFound(['num_interno', 'registro_interno'], numInterno);
      setIfFound(['num_factura_proveedor', 'numero_factura', 'num_factura', 'factura_prov', 'referencia'], numFactProv);
      setIfFound(['base_imponible', 'base', 'subtotal'], baseImponible);
      setIfFound(['iva_importe', 'cuota_iva', 'iva_total', 'iva'], totalIva);
      setIfFound(['retencion_importe', 'irpf_importe', 'retencion', 'irpf'], retencionImporte);
      setIfFound(['serie', 'serie_id'], serie);
      setIfFound(['estado_pago', 'pagado', 'status_pago'], estadoPago);
      setIfFound(['proyecto_id', 'id_proyecto'], tipoGasto === "proyecto" ? proyectoId : null);
      if (availableCols.includes('iva_pct')) payload.iva_pct = 21;
      if (availableCols.includes('retencion_pct')) payload.retencion_pct = retencionPct;

      // Subida de PDF
      let finalPdfUrl = pdfUrl;
      if (pdfFile) {
        const prov = proveedores.find(p => p.id === proveedorId);
        finalPdfUrl = await uploadInvoiceFile(pdfFile, 'costes', {
          number: numInterno,
          entity: prov?.nombre || 'proveedor'
        });
      }

      if (!finalPdfUrl) {
         alert("⚠️ Es obligatorio subir el PDF de la factura recibida.");
         setSaving(false);
         return;
      }
      payload.pdf_url = finalPdfUrl;

      let currentId = editingId;
      if (editingId) {
        const { error: uErr } = await supabase.from("costes").update(payload).eq("id", editingId);
        if (uErr) throw uErr;
        await supabase.from("coste_lineas").delete().eq("coste_id", editingId);
      } else {
        const { data: newCoste, error: iErr } = await supabase.from("costes").insert([payload]).select().single();
        if (iErr) throw iErr;
        currentId = newCoste.id;
      }

      const lineasConId = lineas.map(l => ({
        coste_id: currentId,
        descripcion: l.descripcion,
        unidades: Number(l.unidades),
        precio_unitario: Number(l.precio_unitario),
        iva_pct: Number(l.iva_pct)
      }));

      await supabase.from("coste_lineas").insert(lineasConId);
      setIsModalOpen(false);
      fetchData();
      alert("✅ Gasto registrado correctamente.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
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

  const filteredCostes = useMemo(() => {
    return (costes || []).filter(c => {
      const matchesGlobal = searchTerm === '' || 
        (c.proveedores?.nombre && c.proveedores.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.proyectos?.nombre && c.proyectos.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesColumns = Object.keys(columnFilters).every(key => {
        if (!columnFilters[key]) return true;
        let val = '';
        if (key === 'proveedor') val = c.proveedores?.nombre || '';
        else if (key === 'proyecto') val = c.proyectos?.nombre || '';
        else if (key === 'num_factura') val = c.num_factura_proveedor || '';
        else if (key === 'estado_pago') val = c.estado_pago || 'Pendiente';
        else val = c[key] || '';
        return val.toString().toLowerCase().includes(columnFilters[key].toLowerCase());
      });

      return matchesGlobal && matchesColumns;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      let aVal, bVal;
      
      if (sortConfig.key === 'proveedor') {
        aVal = a.proveedores?.nombre || '';
        bVal = b.proveedores?.nombre || '';
      } else if (sortConfig.key === 'proyecto') {
        aVal = a.proyectos?.nombre || '';
        bVal = b.proyectos?.nombre || '';
      } else if (sortConfig.key === 'estado_pago') {
        aVal = a.estado_pago || 'Pendiente';
        bVal = b.estado_pago || 'Pendiente';
      } else {
        aVal = a[sortConfig.key] || '';
        bVal = b[sortConfig.key] || '';
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [costes, searchTerm, sortConfig, columnFilters]);

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight mb-1">Facturas Recibidas</h1>
            <p className="text-[var(--muted)] font-medium">Gestión de facturas recibidas y multi-IVA.</p>
          </div>
          <div className="flex items-center gap-3">
              <button 
                onClick={() => exportVATBookPDF('costes', filteredCostes, perfil)} 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-700 border border-gray-200 font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
              >
                <Download size={18} /> Libro IVA (PDF)
              </button>
              <button 
                onClick={() => exportVATBookExcel('costes', filteredCostes)} 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-green-700 border border-gray-200 font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
              >
                <Download size={18} /> Libro IVA (Excel)
              </button>
              <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 font-bold hover:shadow-md transition-all active:scale-95">
                <Sparkles size={18} /> Importar PDF con IA
              </button>
             <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-95">
               <Plus size={18}/> Nueva Factura Recibida
             </button>
          </div>
        </header>

        {isAiModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl p-10 w-full max-w-md text-center shadow-2xl animate-in zoom-in duration-300">
                {isExtracting ? (
                   <div className="space-y-6">
                     <Loader2 className="animate-spin mx-auto text-purple-600" size={60} />
                     <p className="font-bold text-gray-700">Gemini IA analizando tu factura...</p>
                   </div>
                ) : (
                   <div className="space-y-6">
                     <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
                        <Upload className="text-purple-600" size={32} />
                     </div>
                     <div>
                        <h2 className="text-2xl font-black mb-2 tracking-tight">Importar Factura</h2>
                        <p className="text-sm text-gray-500">Sube el PDF y extraeremos el proveedor, fecha, bases de IVA y retenciones.</p>
                     </div>
                     <input type="file" accept="application/pdf" onChange={handleImportWithAI} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer" />
                     <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 font-bold hover:text-gray-600 transition-colors">Cerrar</button>
                   </div>
                )}
             </div>
          </div>
        )}
        {isProviderReviewModalOpen && detectedProvider && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-lg animate-in fade-in zoom-in duration-300 border overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Validar Nuevo Proveedor</h2>
                    <p className="text-xs text-gray-500 font-medium">Revisa los datos extraídos por la IA</p>
                  </div>
                </div>
                <button onClick={() => setIsProviderReviewModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Razón Social</label>
                  <input type="text" value={detectedProvider.nombre} onChange={(e) => setDetectedProvider({...detectedProvider, nombre: e.target.value})} className="w-full p-4 rounded-xl border bg-gray-50 font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NIF/CIF</label>
                    <input type="text" value={detectedProvider.nif} onChange={(e) => setDetectedProvider({...detectedProvider, nif: e.target.value})} className="w-full p-4 rounded-xl border bg-gray-50 font-mono focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Código Postal</label>
                    <input type="text" value={detectedProvider.cp} maxLength={5} onChange={(e) => {
                      const newCp = e.target.value;
                      setDetectedProvider({...detectedProvider, cp: newCp});
                      if (newCp.length === 5) {
                        getFullLocationByCP(newCp).then(geo => {
                          if (geo) setDetectedProvider(prev => ({...prev, poblacion: geo.poblacion, provincia: geo.provincia}));
                        });
                      }
                    }} className="w-full p-4 rounded-xl border bg-gray-50 font-mono font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dirección Postal</label>
                  <input type="text" value={detectedProvider.direccion} onChange={(e) => setDetectedProvider({...detectedProvider, direccion: e.target.value})} className="w-full p-4 rounded-xl border bg-gray-50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Población</label>
                    <input type="text" value={detectedProvider.poblacion} onChange={(e) => setDetectedProvider({...detectedProvider, poblacion: e.target.value})} className="w-full p-4 rounded-xl border bg-gray-50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Provincia</label>
                    <input type="text" value={detectedProvider.provincia} onChange={(e) => setDetectedProvider({...detectedProvider, provincia: e.target.value})} className="w-full p-4 rounded-xl border bg-gray-50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" />
                  </div>
                </div>

                <div className="pt-6">
                  <button onClick={handleCreateDetectedProvider} className="w-full py-4 bg-orange-600 text-white font-black rounded-2xl shadow-xl hover:bg-orange-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                    <UserPlus size={20} />
                    Confirmar Alta Proveedor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
             <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl border border-[var(--border)] my-auto">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                   <h2 className="text-2xl font-bold font-head flex items-center gap-2 tracking-tight text-gray-800">
                     <Receipt className="text-purple-600" /> 
                     {editingId ? "Editar Factura" : "Factura Registrada"}
                   </h2>
                   <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400"/></button>
                </div>

                {detectedProvider && (
                  <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200 flex items-center justify-between text-left animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                       <AlertCircle className="text-orange-600" size={24} />
                       <div>
                          <p className="text-sm font-bold text-orange-900">Nuevo proveedor detectado por IA</p>
                          <p className="text-xs text-orange-700">{detectedProvider.nombre} ({detectedProvider.nif})</p>
                       </div>
                    </div>
                    <button type="button" onClick={() => setIsProviderReviewModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-bold text-xs hover:bg-orange-700 transition-all">
                       <UserPlus size={14} /> Revisar y Validar
                    </button>
                  </div>
                )}
                
                <form onSubmit={handleSave} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Serie</label>
                        <select value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 font-bold">
                          <option value="A">Serie A (IVA Soportado)</option>
                          <option value="B">Serie B (sin IVA)</option>
                        </select>
                      </div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 whitespace-nowrap">Nº Registro (Asiento)</label><input type="text" value={numInterno} readOnly className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-100 font-bold text-gray-500" /></div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Factura Prov.</label><input type="text" value={numFactProv} onChange={(e) => setNumFactProv(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 font-bold text-blue-600" /></div>
                      <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200" /></div>
                      <div className="md:col-span-2">
                         <SearchableSelect label="Proveedor" options={proveedores} value={proveedorId} onChange={(id) => setProveedorId(id)} placeholder="Buscar proveedor..." />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo de Gasto</label>
                        <select value={tipoGasto} onChange={(e) => setTipoGasto(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50">
                           <option value="general">Gasto General</option>
                           <option value="proyecto">Vincular a Proyecto</option>
                        </select>
                      </div>
                      {tipoGasto === "proyecto" && (
                        <div className="md:col-span-1">
                           <SearchableSelect 
                             label="Vincular Proyecto" 
                             options={proyectos} 
                             value={proyectoId} 
                             onChange={(id) => setProyectoId(id)} 
                             placeholder="Seleccionar..." 
                           />
                        </div>
                      )}
                    </div>

                    <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-100/50 space-y-4">
                       <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                             <Upload size={14} className="text-purple-500" /> Adjuntar Factura Original (PDF obligatorio)
                          </label>
                          {pdfUrl && (
                             <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-purple-600 hover:underline flex items-center gap-1">
                                <FileText size={12} /> Ver PDF actual
                             </a>
                          )}
                       </div>
                       <div className="relative group">
                          <input 
                             type="file" 
                             accept=".pdf" 
                             onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                             className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer p-4 bg-white rounded-xl border-2 border-dashed border-purple-200 group-hover:border-purple-300 transition-all"
                          />
                          {pdfFile && (
                             <div className="mt-2 text-xs font-bold text-green-600 flex items-center gap-1 animate-in fade-in">
                                ✓ Archivo seleccionado: {pdfFile.name}
                             </div>
                          )}
                       </div>
                    </div>

                    <div className="pt-4">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b text-gray-400">
                            <th className="pb-3 text-[10px] font-bold uppercase">Ud.</th>
                            <th className="pb-3 text-[10px] font-bold uppercase">Concepto</th>
                            <th className="pb-3 text-[10px] font-bold uppercase text-right w-32">Precio Ud.</th>
                            <th className="pb-3 text-[10px] font-bold uppercase w-24 text-center">IVA %</th>
                            <th className="pb-3 text-[10px] font-bold uppercase text-right w-32">Total</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineas.map((linea, idx) => (
                            <tr key={idx} className="border-b border-gray-50">
                              <td className="py-3 pr-4 text-center w-20"><input type="number" value={linea.unidades} onChange={(e) => updateLinea(idx, "unidades", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 font-bold text-center" /></td>
                              <td className="py-3 pr-4"><input type="text" value={linea.descripcion} onChange={(e) => updateLinea(idx, "descripcion", e.target.value)} className="w-full p-2 rounded-lg border border-gray-100 text-sm" /></td>
                              <td className="py-3 pr-4"><input type="number" value={linea.precio_unitario} onChange={(e) => updateLinea(idx, "precio_unitario", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 text-right font-mono" /></td>
                              <td className="py-3 pr-4">
                                <select value={linea.iva_pct} onChange={(e) => updateLinea(idx, "iva_pct", parseInt(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 text-xs font-bold text-center">
                                   <option value="21">21%</option>
                                   <option value="10">10%</option>
                                   <option value="4">4%</option>
                                   <option value="0">0%</option>
                                </select>
                              </td>
                              <td className="py-3 text-right font-bold text-gray-700 font-mono">{formatCurrency(linea.unidades * linea.precio_unitario)}</td>
                              <td className="py-3 text-center">{lineas.length > 1 && <button type="button" onClick={() => removeLinea(idx)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button type="button" onClick={addLinea} className="mt-4 flex items-center gap-2 text-sm font-bold text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-lg transition-all"><Plus size={16}/> Añadir línea (Multi-IVA)</button>
                   </div>

                   <div className="flex flex-col md:flex-row justify-between pt-8 border-t bg-gray-50/50 p-6 rounded-2xl gap-8 font-mono">
                      <div className="w-full md:w-64">
                         <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 font-sans">Retención IRPF (%)</label>
                         <input type="number" value={retencionPct} onChange={(e) => setRetencionPct(parseFloat(e.target.value) || 0)} className="w-full p-2.5 rounded-lg border border-gray-200 font-bold" />
                      </div>
                      <div className="w-full md:w-80 space-y-3">
                         <div className="flex justify-between text-sm text-gray-500"><span>Base Imponible Tot.:</span><span className="font-bold text-gray-700">{formatCurrency(baseImponible)}</span></div>
                         <div className="flex justify-between text-sm text-gray-500"><span>Cuota IVA Tot.:</span><span className="font-bold text-gray-700">{formatCurrency(totalIva)}</span></div>
                         {retencionPct > 0 && <div className="flex justify-between text-sm text-red-600 font-bold"><span>Retención (-{retencionPct}%):</span><span>{formatCurrency(retencionImporte)}</span></div>}
                         <div className="flex justify-between text-2xl font-bold pt-4 border-t border-gray-200 text-gray-900 font-sans"><span>TOTAL:</span><span className="text-red-600">{formatCurrency(totalFactura)}</span></div>
                      </div>
                   </div>

                   <div className="flex gap-4">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-100 rounded-2xl transition-all">Cancelar</button>
                      <button type="submit" disabled={saving} className="flex-2 px-12 py-4 bg-gray-800 text-white font-bold rounded-2xl shadow-xl hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                        {saving ? "Registrando..." : "Confirmar y Registrar"}
                      </button>
                   </div>
                </form>
             </div>
          </div>
        )}

        <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-visible text-left min-h-[400px]">

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-[var(--border)]">
                <DataTableHeader label="Factura / Prov." field="proveedor" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.proveedor || ''} onFilter={handleFilter} />
                <DataTableHeader label="Fecha" field="fecha" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.fecha || ''} onFilter={handleFilter} />
                <DataTableHeader label="Gasto / Proyecto" field="proyecto" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.proyecto || ''} onFilter={handleFilter} />
                <DataTableHeader label="Total" field="total" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.total || ''} onFilter={handleFilter} />
                <DataTableHeader 
                  label="Estado Pago" 
                  field="estado_pago" 
                  sortConfig={sortConfig} 
                  onSort={handleSort} 
                  filterValue={columnFilters.estado_pago || ''} 
                  onFilter={handleFilter} 
                  filterOptions={[
                    { label: 'Todos', value: '' },
                    { label: 'Pagado', value: 'Pagado' },
                    { label: 'Pendiente', value: 'Pendiente' },
                    { label: 'Pago Parcial', value: 'Pago Parcial' }
                  ]}
                />
                <th className="px-6 py-4 text-[12px] font-black text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredCostes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                     <div className="text-[10px] font-bold text-blue-600 mb-0.5">{c.num_interno}</div>
                     <div className="font-bold text-gray-800">{c.proveedores?.nombre}</div>
                     <div className="text-[10px] text-gray-400 font-mono uppercase">{c.num_factura_proveedor}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">{new Date(c.fecha).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.tipo_gasto === 'proyecto' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                        {c.tipo_gasto === 'proyecto' ? c.proyectos?.nombre : 'Gasto General'}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-red-600">{formatCurrency(c.total)}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                         c.estadoPago === 'Pagado' ? 'bg-green-50 text-green-600' : 
                         c.estadoPago === 'Pago Parcial' ? 'bg-orange-50 text-orange-600' : 
                         'bg-gray-50 text-gray-500'
                       }`}>
                          {c.estadoPago || 'Pendiente'}
                       </span>
                    </td>
                   <td className="px-6 py-4 text-right relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {openMenuId === c.id && (
                      <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                        {c.pdf_url && (
                          <a href={c.pdf_url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors">
                            <FileText size={16} className="text-purple-500" /> Ver Factura PDF
                          </a>
                        )}

                        <div className="h-px bg-gray-100 my-1 mx-2"></div>

                        <button onClick={() => openEditModal(c)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                          <Receipt size={16} className="text-blue-500" /> Editar Factura
                        </button>
                        
                        {c.estado_pago !== 'Pagado' && (
                          <button 
                            onClick={() => { 
                              setSelectedCoste(c); 
                              const balance = Math.max(0, c.total - (c.totalPagado || 0));
                              setPagoImporte(balance.toFixed(2));
                              setIsPayModalOpen(true); 
                              setOpenMenuId(null);
                            }} 
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <HandCoins size={16} className="text-green-500" /> Registrar Pago
                          </button>
                        )}
                        
                        <div className="h-px bg-gray-100 my-1 mx-2"></div>
                        
                        <button 
                          onClick={() => { if(confirm("¿Eliminar este coste?")) supabase.from("costes").delete().eq("id", c.id).then(() => fetchData()); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
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

        {/* Modal Pago */}
        {isPayModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black tracking-tight">Registrar Pago</h3>
                  <button onClick={() => setIsPayModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
               </div>
               <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Proveedor</label>
                    <div className="p-4 rounded-xl bg-gray-50 border font-bold text-gray-800">{selectedCoste?.proveedores?.nombre}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fecha de Pago</label>
                      <input type="date" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)} className="w-full p-4 rounded-xl border bg-gray-50 focus:bg-white transition-all outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Importe (€)</label>
                      <input type="number" step="0.01" value={pagoImporte} onChange={e => setPagoImporte(e.target.value)} className="w-full p-4 rounded-xl border bg-gray-50 focus:bg-white font-mono font-bold text-[var(--accent)] outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Forma de Pago</label>
                    <select value={pagoForma} onChange={e => setPagoForma(e.target.value)} className="w-full p-4 rounded-xl border bg-gray-50 focus:bg-white font-bold outline-none transition-all">
                       <option value="Transferencia">Transferencia</option>
                       <option value="Tarjeta">Tarjeta</option>
                       <option value="Efectivo">Efectivo</option>
                       <option value="Giro Bancario">Giro Bancario</option>
                    </select>
                  </div>
                  <div className="pt-4">
                     <button 
                       disabled={saving}
                       onClick={handleRegisterPayment}
                       className="w-full py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                     >
                       {saving ? <Loader2 className="animate-spin" size={20} /> : <HandCoins size={20} />}
                       Confirmar Pago
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

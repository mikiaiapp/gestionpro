"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  Download, 
  Loader2, 
  Pencil, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Euro,
  Building2,
  Calendar,
  MoreHorizontal,
  Printer,
  Mail,
  UploadCloud,
  X,
  PlusCircle,
  Receipt,
  FileSpreadsheet,
  Zap,
  ShieldCheck,
  Save,
  ArrowUpDown
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { formatCurrency } from "@/lib/format";
import { exportVATBookPDF, exportVATBookExcel } from "@/lib/reportingService";
import SearchableSelect from "@/components/SearchableSelect";

interface Linea {
  descripcion: string;
  unidades: number;
  precio_unitario: number;
  iva_pct: number;
}

export default function CostesPage() {
  const [costes, setCostes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);

  // Estados para el editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [proveedorId, setProveedorId] = useState("");
  const [numFactProv, setNumFactProv] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ descripcion: "", unidades: 1, precio_unitario: 0, iva_pct: 21 }]);
  const [file, setFile] = useState<File | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState("");

  const [proveedores, setProveedores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ field: 'fecha', direction: 'desc' as 'asc' | 'desc' });
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  
  const [availableCols, setAvailableCols] = useState<string[]>([]);
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      await Promise.all([
        fetchData(),
        fetchProveedores(),
        fetchPerfil(),
        checkTableSchema()
      ]);
    }
    setLoading(false);
  };

  const checkTableSchema = async () => {
     const { data } = await supabase.from('costes').select('*').limit(1);
     if (data && data.length > 0) {
        setAvailableCols(Object.keys(data[0]));
     }
  };

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase
      .from("costes")
      .select(`
        *,
        proveedores (
          nombre,
          nif
        ),
        coste_lineas (*)
      `)
      .eq('user_id', user.id)
      .order("fecha", { ascending: false });

    if (!error && data) setCostes(data);
  };

  const fetchProveedores = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("proveedores").select("id, nombre, nif").eq('user_id', user.id);
    if (data) setProveedores(data.map(p => ({ id: p.id, nombre: `${p.nombre} (${p.nif})` })));
  };

  const fetchPerfil = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("perfil_negocio").select("*").eq('user_id', user.id).maybeSingle();
    if (data) setPerfil(data);
  };

  const addLinea = () => {
    setLineas([...lineas, { descripcion: "", unidades: 1, precio_unitario: 0, iva_pct: 21 }]);
  };

  const removeLinea = (idx: number) => {
    setLineas(lineas.filter((_, i) => i !== idx));
  };

  const updateLinea = (idx: number, updates: Partial<Linea>) => {
    const nl = [...lineas];
    nl[idx] = { ...nl[idx], ...updates };
    setLineas(nl);
  };

  const deleteInvoiceFile = async (path: string) => {
     await supabase.storage.from("facturas").remove([path]);
  };

  const handleSave = async () => {
    if (!proveedorId || !numFactProv) {
      alert("⚠️ Razón Social y Nº Factura son obligatorios.");
      return;
    }

    setSaving(false);
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const baseImponible = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario), 0);
      const cuotaIva = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario * (l.iva_pct / 100)), 0);
      const totalFactura = baseImponible + cuotaIva;

      let finalPdfUrl = existingPdfUrl;
      let uploadedPath = "";

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        uploadedPath = fileName;
        
        const { error: upErr } = await supabase.storage.from("facturas").upload(fileName, file);
        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("facturas").getPublicUrl(fileName);
        finalPdfUrl = publicUrl;
      }

      // Sincronización de Numeración Persistente
      const nextIdFromProfile = perfil?.contador_costes || 1;
      const prefijo = perfil?.prefijo_costes || "";
      const numInterno = `${prefijo}${nextIdFromProfile}`;

      const payload: any = {
        user_id: user.id,
        fecha,
        proveedor_id: proveedorId,
        num_factura_proveedor: numFactProv,
        base_imponible: baseImponible,
        iva_importe: cuotaIva,
        total: totalFactura,
        estado_pago: "Pendiente",
        num_interno: numInterno,
        tipo_gasto: 'general'
      };

      const setIfFound = (options: string[], value: any) => {
         const k = options.find(o => availableCols.includes(o));
         if (k) payload[k] = value;
      };

      setIfFound(['pdf_url', 'archivo_url', 'url_archivo'], finalPdfUrl);


      // Si no tenemos columnas detectadas (primer registro), forzamos mapeo estándar más seguro
      if (availableCols.length === 0) {
        payload.num_interno = numInterno;
        payload.num_factura_proveedor = numFactProv;
        payload.base_imponible = baseImponible;
        payload.total = totalFactura;
        payload.archivo_url = finalPdfUrl;
      }

      let currentId = editingId;
      if (editingId) {
        const { error: updErr } = await supabase.from('costes').update(payload).eq('id', editingId).eq('user_id', user.id);
        if (updErr) throw updErr;
        await supabase.from("coste_lineas").delete().eq("coste_id", editingId);
      } else {
        const { data: newCosteRows, error: iErr } = await supabase.from("costes").insert([payload]).select('id');
        
        if (iErr) {
          console.error("❌ Error CRÍTIC EN TABLA 'COSTES':", iErr);
          // Borrar archivo si falló la inserción (Requisito Integridad)
          if (uploadedPath) {
             await deleteInvoiceFile(uploadedPath);
          }
          throw new Error(`[TABLA COSTES] Fallo de Seguridad (RLS): ${iErr.message}`);
        }
        
        if (!newCosteRows || newCosteRows.length === 0) {
           throw new Error("[TABLA COSTES] Inserción completada pero ID no devuelto.");
        }
        
        currentId = newCosteRows[0].id;
        
        // Actualizar el contador oficial en el perfil tras el éxito del registro
        const nextCount = (perfil?.contador_costes || 1) + 1;
        await supabase.from("perfil_negocio").update({ contador_costes: nextCount }).eq("user_id", user.id);
        fetchPerfil(); // Recargar perfil localmente
      }

      const lineasConId = lineas.map(l => ({
        coste_id: currentId,
        descripcion: l.descripcion,
        unidades: Number(l.unidades),
        precio_unitario: Number(l.precio_unitario),
        iva_pct: Number(l.iva_pct),
        user_id: user.id 
      }));

      console.log("📦 Guardando líneas en tabla 'coste_lineas'...");
      const { error: lErr } = await supabase.from("coste_lineas").insert(lineasConId);
      if (lErr) {
        console.error("❌ Error CRÍTICO EN TABLA 'COSTE_LINEAS':", lErr);
        throw new Error(`[TABLA COSTE_LINEAS] Fallo de Seguridad (RLS): ${lErr.message}`);
      }
      setIsModalOpen(false);
      fetchData();
      alert("✅ Gasto registrado correctamente.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoste = async (c: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      // 1. Comprobar si tiene pagos (Filtrado por usuario)
      const { data: pagos } = await supabase
        .from("pagos")
        .select("id")
        .eq("coste_id", c.id)
        .eq("user_id", user.id);
      
      if (pagos && pagos.length > 0) {
        alert("No se puede eliminar la factura recibida (Motivo: Tiene pagos asociados)");
        return;
      }

      // 2. Comprobar si es la última (correlatividad registro interno filtrada por usuario)
      const { data: posteriores } = await supabase
        .from("costes")
        .select("id")
        .eq("user_id", user.id)
        .gt("created_at", c.created_at)
        .limit(1);

      if (posteriores && posteriores.length > 0) {
        alert("No se puede eliminar la factura recibida (Motivo: No es la última registrada en el sistema)");
        return;
      }

      if (!confirm("¿Seguro que quieres eliminar este gasto?")) return;

      await supabase.from("coste_lineas").delete().eq("coste_id", c.id);
      await supabase.from("costes").delete().eq("id", c.id);
      
      const parts = (c.pdf_url || "").split("/");
      const path = parts.slice(parts.indexOf("facturas") + 1).join("/");
      if (path) await deleteInvoiceFile(path);

      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setFecha(c.fecha);
    setProveedorId(c.proveedor_id);
    setNumFactProv(c.num_factura_proveedor || c.numero_factura || c.num_factura || "");
    setLineas(c.coste_lineas || []);
    setExistingPdfUrl(c.pdf_url || c.archivo_url || c.url_archivo || "");
    setFile(null);
    setIsModalOpen(true);
  };

  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleFilter = (field: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredCostes = costes.filter(c => {
    const searchString = `${c.proveedores?.nombre} ${c.num_factura_proveedor || c.numero_factura || c.num_factura || ''} ${c.total}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.estado_pago === statusFilter;
    
    const matchesColumns = Object.entries(columnFilters).every(([field, val]) => {
      if (!val) return true;
      let targetValue = "";
      if (field === 'proveedor') targetValue = c.proveedores?.nombre || "";
      else if (field === 'fecha') targetValue = new Date(c.fecha).toLocaleDateString();
      else if (field === 'factura') targetValue = c.num_factura_proveedor || c.numero_factura || c.num_factura || "";
      else targetValue = String(c[field] || "");
      return targetValue.toLowerCase().includes(val.toLowerCase());
    });

    return matchesSearch && matchesStatus && matchesColumns;
  }).sort((a, b) => {
    const { field, direction } = sortConfig;
    let valA = a[field];
    let valB = b[field];

    if (field === 'proveedor') {
      valA = a.proveedores?.nombre;
      valB = b.proveedores?.nombre;
    }
    
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-[var(--accent)]" size={48} />
    </div>
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black font-head tracking-tighter text-[var(--foreground)]">Facturas Recibidas</h1>
            <p className="text-[var(--muted)] font-medium">Control total de gastos, proveedores y libros de IVA.</p>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={() => { exportVATBookPDF('costes', costes, perfil); }} 
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
            >
              <FileSpreadsheet size={18} className="text-red-500" /> Libro IVA (PDF)
            </button>
            <button 
              onClick={() => { exportVATBookExcel('costes', costes); }} 
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
            >
              <Zap size={18} className="text-green-500" /> Libro IVA (Excel)
            </button>
            <button 
              onClick={() => {
                setEditingId(null); setFecha(new Date().toISOString().split("T")[0]); setProveedorId(""); setNumFactProv(""); 
                setLineas([{ descripcion: "", unidades: 1, precio_unitario: 0, iva_pct: 21 }]); setFile(null); setExistingPdfUrl("");
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white rounded-2xl font-black shadow-lg shadow-orange-100 hover:shadow-orange-200 hover:-translate-y-0.5 transition-all"
            >
              <PlusCircle size={20} /> Nuevo Gasto
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-1">
            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Gastos (Mes)</span><Calendar className="text-blue-200" size={16}/></div>
            <p className="text-2xl font-black font-head">{formatCurrency(costes.reduce((acc, c) => acc + c.total, 0))}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-1">
             <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">IVA Soportado</span><Percent className="text-red-200" size={16}/></div>
             <p className="text-2xl font-black font-head text-red-600">{formatCurrency(costes.reduce((acc, c) => acc + (c.iva_importe || 0), 0))}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-1">
             <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Facturas Pendientes</span><Clock className="text-orange-200" size={16}/></div>
             <p className="text-2xl font-black font-head text-orange-600">{costes.filter(c => c.estado_pago !== 'Pagado').length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-1">
             <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Siguiente Registro</span><ShieldCheck className="text-emerald-200" size={16}/></div>
             <p className="text-2xl font-black font-head text-emerald-600">{perfil?.prefijo_costes || ''}{perfil?.contador_costes || 1}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-gray-50/50 flex flex-col md:flex-row justify-between gap-4">
             <div className="relative flex-1">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
               <input 
                type="text" 
                placeholder="Buscar por proveedor, factura o importe..." 
                className="w-full pl-12 pr-6 py-3.5 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/5 transition-all font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
               />
             </div>
             <select 
               value={statusFilter}
               onChange={e => setStatusFilter(e.target.value)}
               className="px-6 py-3.5 bg-white border border-gray-200 rounded-2xl outline-none font-bold text-gray-600"
             >
               <option value="all">Todos los estados</option>
               <option value="Pagado">Pagado</option>
               <option value="Pendiente">Pendiente</option>
             </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/30 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-5 border-b cursor-pointer hover:text-[var(--accent)] transition-colors" onClick={() => handleSort('num_interno')}>
                    <div className="flex items-center gap-2">Reg. {sortConfig.field === 'num_interno' && <ArrowUpDown size={12} />}</div>
                    <input className="mt-2 w-full p-1 font-normal lowercase border-none bg-transparent outline-none" placeholder="filtrar..." value={columnFilters.num_interno || ''} onClick={e => e.stopPropagation()} onChange={e => handleFilter('num_interno', e.target.value)} />
                  </th>
                  <th className="px-8 py-5 border-b cursor-pointer hover:text-[var(--accent)] transition-colors" onClick={() => handleSort('fecha')}>
                    <div className="flex items-center gap-2">Fecha {sortConfig.field === 'fecha' && <ArrowUpDown size={12} />}</div>
                    <input className="mt-2 w-full p-1 font-normal lowercase border-none bg-transparent outline-none" placeholder="filtrar..." value={columnFilters.fecha || ''} onClick={e => e.stopPropagation()} onChange={e => handleFilter('fecha', e.target.value)} />
                  </th>
                  <th className="px-8 py-5 border-b cursor-pointer hover:text-[var(--accent)] transition-colors" onClick={() => handleSort('proveedor')}>
                    <div className="flex items-center gap-2">Proveedor {sortConfig.field === 'proveedor' && <ArrowUpDown size={12} />}</div>
                    <input className="mt-2 w-full p-1 font-normal lowercase border-none bg-transparent outline-none" placeholder="filtrar..." value={columnFilters.proveedor || ''} onClick={e => e.stopPropagation()} onChange={e => handleFilter('proveedor', e.target.value)} />
                  </th>
                  <th className="px-8 py-5 border-b">Factura</th>
                  <th className="px-8 py-5 border-b text-right cursor-pointer hover:text-[var(--accent)] transition-colors" onClick={() => handleSort('total')}>
                    <div className="flex items-center justify-end gap-2">Total {sortConfig.field === 'total' && <ArrowUpDown size={12} />}</div>
                  </th>
                  <th className="px-8 py-5 border-b text-center">Estado</th>
                  <th className="px-8 py-5 border-b text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCostes.map(c => (
                  <tr key={c.id} className="group hover:bg-orange-50/30 transition-all duration-300">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-gray-500">{c.num_interno || c.registro_interno || c.numero || '-'}</td>
                    <td className="px-8 py-5 font-bold text-gray-700">{new Date(c.fecha).toLocaleDateString()}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">{c.proveedores?.nombre?.charAt(0)}</div>
                        <div className="flex flex-col">
                          <span className="font-black text-gray-900 leading-tight">{c.proveedores?.nombre}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{c.proveedores?.nif}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-mono text-sm text-gray-500">{c.num_factura_proveedor || c.numero_factura || c.num_factura || '-'}</td>
                    <td className="px-8 py-5 text-right font-black text-gray-900">{formatCurrency(c.total)}</td>
                    <td className="px-8 py-5 text-center">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${c.estado_pago === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                         {c.estado_pago}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right relative">
                        <div className="flex items-center justify-end gap-2">
                           {c.pdf_url && (
                             <a href={c.pdf_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-400 hover:bg-blue-50 rounded-xl transition-all" title="Ver PDF">
                               <FileText size={18} />
                             </a>
                           )}
                           <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all">
                              <MoreHorizontal size={20} />
                           </button>
                        </div>
                        
                        {openMenuId === c.id && (
                          <div className="absolute right-8 top-14 w-48 bg-white rounded-2xl shadow-2xl border z-50 py-3 animate-in fade-in slide-in-from-top-2">
                             <button onClick={() => { openEdit(c); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-orange-50 hover:text-[var(--accent)] transition-all">
                               <Pencil size={16} /> Editar
                             </button>
                             <div className="h-px bg-gray-100 my-2 mx-4"></div>
                             <button onClick={() => { handleDeleteCoste(c); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-all">
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
        </div>

        {/* Modal Editor */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
               <div className="p-10 space-y-10">
                  <header className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black font-head tracking-tighter text-gray-900">{editingId ? 'Editar Factura Recibida' : 'Registrar Nuevo Gasto'}</h2>
                      <p className="text-gray-400 font-medium">Completa los datos fiscales del documento.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 transition-all"><X size={24}/></button>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Proveedor (Razón Social)</label>
                        <SearchableSelect 
                          options={proveedores}
                          value={proveedorId}
                          onChange={setProveedorId}
                          placeholder="Buscar o seleccionar proveedor..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Fecha Factura</label>
                           <div className="relative">
                             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                             <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border rounded-2xl outline-none font-bold" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nº Factura Recibida</label>
                           <div className="relative">
                             <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                             <input type="text" placeholder="Ej: 2024/045" value={numFactProv} onChange={e => setNumFactProv(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border rounded-2xl outline-none font-mono font-bold" />
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Documento PDF (Factura Digitalizada)</label>
                      <div className="group relative h-full min-h-[140px] border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50 flex flex-col items-center justify-center p-6 transition-all hover:border-[var(--accent)] hover:bg-white">
                        {file || existingPdfUrl ? (
                          <div className="text-center space-y-3">
                             <div className="p-4 bg-orange-100 text-[var(--accent)] rounded-2xl inline-block shadow-sm animate-bounce"><FileText size={32} /></div>
                             <p className="text-xs font-black text-gray-700 tracking-tight">{file?.name || 'Factura Guardada'}</p>
                             <button onClick={() => { setFile(null); setExistingPdfUrl(""); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Eliminar Archivo</button>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="text-gray-300 mb-2 group-hover:text-[var(--accent)] transition-colors" size={40} />
                            <p className="text-sm font-bold text-gray-500">Arrastra el PDF aquí</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">o haz clic para buscar</p>
                            <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Líneas de Factura (Desglose)</h3>
                       <button onClick={addLinea} className="flex items-center gap-2 text-xs font-black text-[var(--accent)] hover:underline"><Plus size={14} /> Añadir Línea</button>
                    </div>
                    
                    <div className="space-y-3">
                      {lineas.map((l, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-6 bg-gray-50/50 rounded-3xl border border-gray-100 group">
                           <div className="md:col-span-6 space-y-2">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Concepto</label>
                              <input type="text" value={l.descripcion} onChange={e => updateLinea(idx, { descripcion: e.target.value })} className="w-full p-3.5 bg-white border rounded-xl outline-none font-medium text-sm focus:ring-4 focus:ring-orange-500/5 transition-all" />
                           </div>
                           <div className="md:col-span-2 space-y-2">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Precio Un.</label>
                              <input type="number" step="any" value={l.precio_unitario} onChange={e => updateLinea(idx, { precio_unitario: parseFloat(e.target.value) || 0 })} className="w-full p-3.5 bg-white border rounded-xl outline-none font-mono font-bold text-right" />
                           </div>
                           <div className="md:col-span-1 space-y-2">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Uds.</label>
                              <input type="number" value={l.unidades} onChange={e => updateLinea(idx, { unidades: parseInt(e.target.value) || 1 })} className="w-full p-3.5 bg-white border rounded-xl outline-none font-bold text-center" />
                           </div>
                           <div className="md:col-span-2 space-y-2">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">IVA %</label>
                              <select value={l.iva_pct} onChange={e => updateLinea(idx, { iva_pct: parseInt(e.target.value) })} className="w-full p-3.5 bg-white border rounded-xl outline-none font-bold text-center appearance-none cursor-pointer">
                                 <option value="21">21%</option>
                                 <option value="10">10%</option>
                                 <option value="4">4%</option>
                                 <option value="0">0%</option>
                              </select>
                           </div>
                           <div className="md:col-span-1 flex justify-center pb-3">
                              {lineas.length > 1 && (
                                <button onClick={() => removeLinea(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                              )}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-dashed gap-8">
                     <div className="flex gap-10">
                        <div className="space-y-1">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Imponible</p>
                           <p className="text-2xl font-black text-gray-700">{formatCurrency(lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario), 0))}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cuota IVA</p>
                           <p className="text-2xl font-black text-red-500">{formatCurrency(lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario * (l.iva_pct / 100)), 0))}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">Total Factura</p>
                           <p className="text-4xl font-black text-gray-900 tracking-tighter">
                             {formatCurrency(lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario * (1 + l.iva_pct / 100)), 0))}
                           </p>
                        </div>
                     </div>
                     <button 
                       onClick={handleSave} 
                       disabled={saving}
                       className="w-full md:w-auto px-12 py-5 bg-[var(--accent)] text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-200 hover:shadow-orange-400 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                     >
                       {saving ? <Loader2 className="animate-spin" size={24}/> : <Save size={24}/>}
                       {editingId ? 'Actualizar Factura' : 'Registrar Gasto'}
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

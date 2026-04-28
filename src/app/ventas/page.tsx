"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  ArrowUpDown,
  HandCoins
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { formatCurrency } from '@/lib/format';
import { generateInvoicePDF } from '@/lib/pdfService';
import { exportVATBookPDF, exportVATBookExcel } from '@/lib/reportingService';
import SearchableSelect from '@/components/SearchableSelect';
import RichTextEditor from '@/components/RichTextEditor';

interface Linea {
  descripcion: string;
  unidades: number;
  precio_unitario: number;
  iva_pct: number;
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);

  // Estados para el editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [clienteId, setClienteId] = useState('');
  const [numFactura, setNumFactura] = useState('');
  const [serie, setSerie] = useState('A');
  const [lineas, setLineas] = useState<Linea[]>([{ descripcion: '', unidades: 1, precio_unitario: 0, iva_pct: 21 }]);
  const [retencionPct, setRetencionPct] = useState(0);
  const [formaPago, setFormaPago] = useState('');
  const [proyectoId, setProyectoId] = useState('');

  const [clientes, setClientes] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [formasCobro, setFormasCobro] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ field: 'fecha', direction: 'desc' as 'asc' | 'desc' });
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Wizard States
  const [selectedProjId, setSelectedProjId] = useState('');
  const [pct, setPct] = useState('100');

  // Cobro States
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<any>(null);
  const [cobroImporte, setCobroImporte] = useState('');
  const [cobroFecha, setCobroFecha] = useState(new Date().toISOString().split('T')[0]);
  const [cobroForma, setCobroForma] = useState('Transferencia');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      await Promise.all([
        fetchData(),
        fetchClientes(),
        fetchProyectos(),
        fetchFormasCobro(),
        fetchPerfil()
      ]);
    }
    setLoading(false);
  };

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        clientes (
          nombre,
          nif,
          email
        ),
        venta_lineas (*)
      `)
      .eq('user_id', user.id)
      .order('fecha', { ascending: false });

    if (!error && data) {
      // Calcular pendientes
      const processed = data.map(v => {
        const totalCobrado = v.total_cobrado || 0;
        const pendiente = v.total - totalCobrado;
        let estadoPago = 'PENDIENTE';
        if (pendiente <= 0) estadoPago = 'COBRADA';
        else if (totalCobrado > 0) estadoPago = 'PARCIALMENTE COBRADA';
        return { ...v, totalCobrado, pendiente, estadoPago };
      });
      setVentas(processed);
    }
  };

  const fetchClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('clientes').select('id, nombre, nif').eq('user_id', user.id);
    if (data) setClientes(data.map(c => ({ id: c.id, nombre: `${c.nombre} (${c.nif})` })));
  };

  const fetchProyectos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('proyectos')
      .select('id, nombre, clientes(nombre)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setProyectos(data.map(p => ({ id: p.id, nombre: `${p.nombre} - ${(p.clientes as any)?.nombre || 'Sin Cliente'}` })));
  };

  const fetchFormasCobro = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('metodos_pago').select('*').eq('user_id', user.id);
    if (data) setFormasCobro(data);
  };

  const fetchPerfil = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('perfil_negocio').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      setPerfil(data);
      if (data.tiene_retencion) setRetencionPct(data.irpf_default || 0);
      setFormaPago(data.forma_pago_default || '');
    }
  };

  const addLinea = () => {
    setLineas([...lineas, { descripcion: '', unidades: 1, precio_unitario: 0, iva_pct: 21 }]);
  };

  const removeLinea = (idx: number) => {
    setLineas(lineas.filter((_, i) => i !== idx));
  };

  const updateLinea = (idx: number, updates: Partial<Linea>) => {
    const nl = [...lineas];
    nl[idx] = { ...nl[idx], ...updates };
    setLineas(nl);
  };

  const baseImponible = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario), 0);
  const cuotaIva = baseImponible * (serie === 'A' ? 0.21 : 0);
  const retencionImporte = baseImponible * (retencionPct / 100);
  const totalFactura = baseImponible + cuotaIva - retencionImporte;

  const handleSaveInvoice = async () => {
    if (!clienteId || !numFactura) {
      alert('⚠️ Cliente y Nº Factura son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        fecha,
        cliente_id: clienteId,
        num_factura: numFactura,
        serie,
        proyecto_id: proyectoId || null,
        base_imponible: baseImponible,
        iva_pct: serie === 'A' ? 21 : 0,
        iva_importe: cuotaIva,
        retencion_pct: retencionPct,
        retencion_importe: retencionImporte,
        total: totalFactura,
        forma_pago: formaPago,
        num_interno: numFactura // Usamos el número de factura como registro para coherencia en ventas
      };

      let currentId = editingId;
      if (editingId) {
        const { error } = await supabase.from('ventas').update(payload).eq('id', editingId);
        if (error) throw error;
        await supabase.from('venta_lineas').delete().eq('venta_id', editingId);
      } else {
        const { data, error } = await supabase.from('ventas').insert([payload]).select('id').single();
        if (error) throw error;
        currentId = data.id;

        // Actualizar el contador oficial en el perfil tras el éxito del registro
        const nextCount = (perfil?.contador_ventas || 1) + 1;
        await supabase.from("perfil_negocio").update({ contador_ventas: nextCount }).eq("user_id", user.id);
        fetchPerfil(); // Recargar perfil localmente
      }

      const lineasConId = lineas.map(l => ({
        venta_id: currentId,
        user_id: user.id,
        descripcion: l.descripcion,
        unidades: Number(l.unidades),
        precio_unitario: Number(l.precio_unitario),
        iva_pct: Number(l.iva_pct)
      }));

      const { error: lErr } = await supabase.from('venta_lineas').insert(lineasConId);
      if (lErr) throw lErr;

      setIsEditorOpen(false);
      fetchData();
      alert('✅ Factura guardada correctamente.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVenta = async (v: any) => {
    if (!confirm('¿Seguro que quieres eliminar esta factura?')) return;
    try {
      await supabase.from('venta_lineas').delete().eq('venta_id', v.id);
      await supabase.from('ventas').delete().eq('id', v.id);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditVenta = (v: any) => {
    setEditingId(v.id);
    setFecha(v.fecha);
    setClienteId(v.cliente_id);
    setNumFactura(v.num_factura);
    setSerie(v.serie);
    setProyectoId(v.proyecto_id || '');
    setLineas(v.venta_lineas || []);
    setRetencionPct(v.retencion_pct || 0);
    setFormaPago(v.forma_pago || '');
    setIsEditorOpen(true);
  };

  const downloadInvoice = async (v: any) => {
    if (!perfil) return;
    const doc = await generateInvoicePDF(v, perfil);
    doc.save(`Factura_${v.num_factura}.pdf`);
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

  const filteredVentas = ventas.filter(v => {
    const searchString = `${v.num_factura} ${v.clientes?.nombre} ${v.total}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.estadoPago === statusFilter;
    
    const matchesColumns = Object.entries(columnFilters).every(([field, val]) => {
      if (!val) return true;
      let targetValue = "";
      if (field === 'cliente') targetValue = v.clientes?.nombre || "";
      else if (field === 'fecha') targetValue = new Date(v.fecha).toLocaleDateString();
      else targetValue = String(v[field] || "");
      return targetValue.toLowerCase().includes(val.toLowerCase());
    });

    return matchesSearch && matchesStatus && matchesColumns;
  }).sort((a, b) => {
    const { field, direction } = sortConfig;
    let valA = a[field];
    let valB = b[field];

    if (field === 'cliente') {
      valA = a.clientes?.nombre;
      valB = b.clientes?.nombre;
    }
    
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleProjectToInvoice = async (projId: string, percentage: number) => {
     try {
        setSaving(true);
        const { data: proj, error: pErr } = await supabase
          .from('proyectos')
          .select('*, presupuesto_lineas(*)')
          .eq('id', projId)
          .single();
        
        if (pErr) throw pErr;

        // Autogenerar Número
        const nextNum = (perfil?.contador_ventas || 1);
        const prefix = perfil?.prefijo_ventas || "";
        const finalNum = `${prefix}${nextNum}`;

        setEditingId(null);
        setFecha(new Date().toISOString().split('T')[0]);
        setClienteId(proj.cliente_id);
        setNumFactura(finalNum);
        setProyectoId(projId);
        
        // Mapear líneas con el porcentaje aplicado
        const newLines = proj.presupuesto_lineas.map((l: any) => ({
           descripcion: `${l.descripcion} (${percentage}% s/presupuesto)`,
           unidades: l.unidades,
           precio_unitario: l.precio_unitario * (percentage / 100),
           iva_pct: l.iva_pct
        }));
        
        setLineas(newLines);
        setIsWizardOpen(false);
        setIsEditorOpen(true);
     } catch (err: any) {
        alert(err.message);
     } finally {
        setSaving(false);
     }
  };

  const handleRegisterCobro = async () => {
     if (!selectedVenta || !cobroImporte) return;
     setSaving(true);
     try {
        const { error } = await supabase.from('pagos').insert({
           venta_id: selectedVenta.id,
           user_id: user.id,
           importe: parseFloat(cobroImporte),
           fecha: cobroFecha,
           metodo: cobroForma
        });
        if (error) throw error;
        
        setIsCobroModalOpen(false);
        fetchData();
        alert('✅ Cobro registrado correctamente.');
     } catch (err: any) {
        alert(err.message);
     } finally {
        setSaving(false);
     }
  };

  const handleVerifactuSubmit = async (v: any) => {
    alert("🚀 Transmisión VeriFactu (AEAT) en desarrollo. Se utilizará el certificado subido en Ajustes.");
  };

  const handleSendByEmail = async (v: any) => {
    alert(`📧 Enviando factura ${v.num_factura} a ${v.clientes?.email || 'email no disponible'}`);
  };

  const DataTableHeader = ({ label, field, sortConfig, onSort, filterValue, onFilter }: any) => (
    <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-left">
      <div className="flex items-center gap-2 cursor-pointer hover:text-[var(--accent)] transition-colors mb-2" onClick={() => onSort(field)}>
        {label} {sortConfig.field === field && (sortConfig.direction === 'asc' ? '↑' : '↓')}
      </div>
      <div className="relative">
        <input 
          type="text" 
          value={filterValue}
          onChange={(e) => onFilter(field, e.target.value)}
          placeholder="filtrar..." 
          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all lowercase"
        />
      </div>
    </th>
  );

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-[var(--accent)]" size={48} />
    </div>
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        {!isEditorOpen ? (
          <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div className="space-y-1">
                <h1 className="text-4xl font-black font-head tracking-tighter text-[var(--foreground)]">Ventas y Facturación</h1>
                <p className="text-[var(--muted)] font-medium">Gestiona tus ingresos y emite facturas profesionales.</p>
              </div>
              <div className="flex gap-3">
                 <button 
                  onClick={() => { exportVATBookPDF('ventas', ventas, perfil); }} 
                  className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
                >
                  <FileSpreadsheet size={18} className="text-blue-500" /> Libro IVA (PDF)
                </button>
                <button 
                  onClick={() => { exportVATBookExcel('ventas', ventas); }} 
                  className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
                >
                  <Zap size={18} className="text-orange-500" /> Libro IVA (Excel)
                </button>
                <button 
                  onClick={() => setIsWizardOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white rounded-2xl font-black shadow-lg shadow-orange-100 hover:shadow-orange-200 hover:-translate-y-0.5 transition-all"
                >
                  <PlusCircle size={20} /> Emitir Factura
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-1">
                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Facturación Total</span><Building2 className="text-blue-200" size={16}/></div>
                <p className="text-2xl font-black font-head">{formatCurrency(ventas.reduce((acc, v) => acc + v.total, 0))}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-1">
                 <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cobrado</span><CheckCircle2 className="text-green-200" size={16}/></div>
                 <p className="text-2xl font-black font-head text-green-600">{formatCurrency(ventas.reduce((acc, v) => acc + (v.totalCobrado || 0), 0))}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-1">
                 <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pendiente de Cobro</span><Clock className="text-red-200" size={16}/></div>
                 <p className="text-2xl font-black font-head text-red-600">{formatCurrency(ventas.reduce((acc, v) => acc + (v.pendiente || 0), 0))}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-1">
                 <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Último Nº</span><Receipt className="text-emerald-200" size={16}/></div>
                 <p className="text-2xl font-black font-head text-emerald-600">{perfil?.serie_ventas}{perfil?.contador_ventas - 1}</p>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
               <div className="p-6 border-b bg-gray-50/50 flex flex-col md:flex-row justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="Buscar por cliente, factura o importe..." 
                      className="w-full pl-12 pr-6 py-3.5 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/5 transition-all font-medium shadow-sm"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select 
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-6 py-3.5 bg-white border border-gray-200 rounded-2xl outline-none font-bold text-gray-600 shadow-sm"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="COBRADA">Cobrada</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="PARCIALMENTE COBRADA">Parcial</option>
                  </select>
               </div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <DataTableHeader label="Nº Factura" field="num_factura" sortConfig={sortConfig} onSort={handleSort} filterValue={columnFilters.num_factura || ''} onFilter={handleFilter} />
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
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            v.estadoPago === 'COBRADA' ? 'bg-green-100 text-green-700' : 
                            v.estadoPago === 'PARCIALMENTE COBRADA' ? 'bg-orange-100 text-orange-700' : 
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {v.estadoPago}
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

                              <button onClick={() => handleSendByEmail(v)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                                <Mail size={16}/> Enviar por Email
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
                                  <Pencil size={16}/> Editar Factura
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
                  <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
                    <tr className="text-left text-gray-400">
                      <th className="pb-3 text-[10px] font-bold uppercase">Descripción / Concepto</th>
                      <th className="w-32 pb-3 text-[10px] font-bold uppercase text-right">Importe</th>
                      <th className="w-24 pb-3 text-[10px] font-bold uppercase text-center">IVA %</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((linea, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-3 pr-4">
                          <RichTextEditor 
                            value={linea.descripcion} 
                            onChange={(val) => updateLinea(idx, { descripcion: val })} 
                            placeholder="Descripción de la partida..."
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <input 
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={linea.precio_unitario}
                            onChange={(e) => updateLinea(idx, { precio_unitario: parseFloat(e.target.value) || 0, unidades: 1 })}
                            onFocus={(e) => e.target.select()}
                            className="w-full p-2 rounded-lg border border-gray-100 text-right font-mono font-bold text-[var(--accent)] focus:ring-2 focus:ring-orange-100 outline-none"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <select 
                            value={linea.iva_pct ?? 21} 
                            onChange={(e) => updateLinea(idx, { iva_pct: parseInt(e.target.value) })} 
                            className="w-full p-2 rounded-lg border border-gray-100 text-xs font-bold text-center bg-gray-50"
                          >
                            <option value="21">21%</option>
                            <option value="10">10%</option>
                            <option value="4">4%</option>
                            <option value="0">0%</option>
                          </select>
                        </td>
                        <td className="py-3 text-center">
                          {lineas.length > 1 && (
                            <button type="button" onClick={() => removeLinea(idx)} className="text-red-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16}/>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={addLinea} className="mt-4 flex items-center gap-2 text-sm font-bold text-[var(--accent)] hover:underline">
                  <Plus size={16}/> Añadir partida
                </button>
              </div>

              <div className="flex flex-col md:flex-row justify-between pt-8 border-t border-gray-100 gap-8">
                <div className="w-full md:w-64">
                   {perfil?.tiene_retencion && (
                     <>
                       <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Retención IRPF (%)</label>
                       <input type="number" value={retencionPct} onChange={(e) => setRetencionPct(parseFloat(e.target.value) || 0)} className="w-full p-2 rounded-lg border border-gray-200 font-bold" />
                     </>
                   )}
                </div>
                <div className="w-full md:w-80 space-y-3">
                  <div className="flex justify-between text-sm"><span>Base Imponible:</span><span className="font-mono font-bold text-gray-700">{formatCurrency(baseImponible)}</span></div>
                  <div className="flex justify-between text-sm"><span>IVA ({serie === "A" ? '21%' : '0%'}):</span><span className="font-mono font-bold text-gray-700">{formatCurrency(cuotaIva)}</span></div>
                  {perfil?.tiene_retencion && retencionPct > 0 && <div className="flex justify-between text-sm text-red-600"><span className="font-medium">Retención ({retencionPct}%):</span><span className="font-mono font-bold">-{formatCurrency(retencionImporte)}</span></div>}
                </div>
              </div>

              {/* Forma de Pago Personalizada */}
              <div className="mt-8 pt-8 border-t border-dashed border-gray-200">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Forma de Pago</label>
                    <span className="text-[9px] text-gray-400 italic">(personalizada para esta factura)</span>
                  </div>
                  <RichTextEditor 
                    value={formaPago} 
                    onChange={setFormaPago} 
                    placeholder="Ej: Transferencia bancaria a la cuenta indicada en la cabecera..."
                  />
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
                        onClick={() => { setEditingId(null); setClienteId(""); setProyectoId(""); setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0, iva_pct: 21 }]); setIsWizardOpen(false); setIsEditorOpen(true); }}
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

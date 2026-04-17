"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Receipt, Plus, Search, MoreHorizontal, Loader2, Trash2, Save, FileText, Download, Printer, FolderKanban } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generatePDF } from "@/lib/pdfGenerator";
import { formatCurrency } from "@/lib/format";

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

  // Estados temporales del Wizard
  const [selectedProjId, setSelectedProjId] = useState("");
  const [pct, setPct] = useState("10");

  useEffect(() => {
    const pId = searchParams.get("proyectoId");
    const mode = searchParams.get("mode");
    if (pId && mode === "avance") {
      setSelectedProjId(pId);
      setInvoicingMode("avance");
      setEditingId(null);
      setIsWizardOpen(true);
    }
  }, [searchParams]);

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
    const { data: clis } = await supabase.from("clientes").select("*").order("nombre");
    const { data: projs } = await supabase.from("proyectos").select("id, nombre, descripcion, cliente_id, base_imponible").order("nombre");
    const { data: fbc } = await supabase.from("formas_cobro").select("*").order("nombre");
    const { data: perf } = await supabase.from("perfil_negocio").select("*").maybeSingle();

    setVentas(vts || []);
    setClientes(clis || []);
    setProyectos(projs || []);
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
      const payload = {
        serie,
        num_factura: numFactura,
        fecha,
        cliente_id: clienteId,
        proyecto_id: proyectoId || null,
        forma_cobro_id: formaCobroId || null,
        base_imponible: baseImponible,
        iva_pct: serie === "A" ? 21 : 0,
        iva_importe: cuotaIva,
        retencion_pct: retencionPct,
        retencion_importe: retencionImporte,
        total: totalFactura
      };

      let currentVentaId = editingId;

      if (editingId) {
        await supabase.from("ventas").update([payload]).eq("id", editingId);
        await supabase.from("venta_lineas").delete().eq("venta_id", editingId);
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

  const downloadInvoice = async (venta: any) => {
    if (!perfil) {
      alert("Configura primero tus datos de empresa en Ajustes.");
      return;
    }
    try {
      await generatePDF({
        tipo: 'FACTURA',
        numero: `${venta.serie}-${venta.num_factura}`,
        fecha: venta.fecha,
        cliente: {
          nombre: venta.clientes?.nombre || '',
          nif: venta.clientes?.nif || '',
          direccion: venta.clientes?.direccion || '',
          poblacion: venta.clientes?.poblacion || '',
          cp: venta.clientes?.cp || '',
          provincia: venta.clientes?.provincia || '',
        },
        perfil: {
          nombre: perfil.nombre || '',
          nif: perfil.nif || '',
          direccion: perfil.direccion || '',
          poblacion: perfil.poblacion || '',
          cp: perfil.cp || '',
          provincia: perfil.provincia || '',
          cuenta_bancaria: perfil.cuenta_bancaria || '',
          logo_url: perfil.logo_url || '',
          condiciones_legales: perfil.condiciones_legales || ''
        },
        lineas: (venta.venta_lineas || []).map((l: any) => ({
          unidades: l.unidades,
          descripcion: l.descripcion,
          precio_unitario: l.precio_unitario
        })),
        totales: {
          base: venta.base_imponible,
          iva_pct: venta.iva_pct,
          iva_importe: venta.iva_importe,
          retencion_pct: venta.retencion_pct,
          retencion_importe: venta.retencion_importe,
          total: venta.total
        }
      });
    } catch (err) {
      alert("Error al generar la factura PDF.");
    }
  };

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
                <button onClick={() => setIsWizardOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]">
                  <Plus size={18} /> Crear Factura
                </button>
              </div>
            </header>

            <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden text-left">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Factura</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Total</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {ventas.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50 group transition-colors">
                        <td className="px-6 py-4 text-sm font-bold">{v.serie}-{v.num_factura}</td>
                        <td className="px-6 py-4 text-sm text-[var(--muted)]">{new Date(v.fecha).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm">{v.clientes?.nombre}</td>
                        <td className="px-6 py-4 text-right font-bold text-[var(--accent)]">{formatCurrency(v.total)}</td>
                        <td className="px-6 py-4 text-right relative">
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === v.id ? null : v.id); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                            <MoreHorizontal size={20} />
                          </button>
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
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Forma de Pago</label>
                  <select value={formaCobroId} onChange={(e) => setFormaCobroId(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50">
                    <option value="">— Seleccionar —</option>
                    {formasCobro.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
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
      </div>
    </div>
  );
}

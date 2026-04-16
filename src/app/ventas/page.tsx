"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Receipt, Plus, Search, MoreHorizontal, Loader2, Trash2, Save, FileText, Download, Printer, FolderKanban } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LineaFactura {
  unidades: number;
  descripcion: string;
  precio_unitario: number;
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [formasCobro, setFormasCobro] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Estados del Editor
  const [serie, setSerie] = useState("A");
  const [numFactura, setNumFactura] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [clienteId, setClienteId] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [formaCobroId, setFormaCobroId] = useState("");
  const [lineas, setLineas] = useState<LineaFactura[]>([{ unidades: 1, descripcion: "", precio_unitario: 0 }]);

  useEffect(() => {
    fetchData();
  }, [supabase]);

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
    // Solo auto-calculamos el número si es una factura NUEVA y el editor está abierto
    if (isEditorOpen && !editingId) {
      const next = getNextNumber(serie, ventas);
      setNumFactura(next);
    }
  }, [serie, isEditorOpen, editingId, ventas]);

  const fetchData = async () => {
    if (!supabase) {
      console.error("Supabase connection missing!");
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: vts } = await supabase.from("ventas").select("*, clientes(*), proyectos(nombre), venta_lineas(*)").order("fecha", { ascending: false });
    const { data: clis } = await supabase.from("clientes").select("*").order("nombre");
    const { data: projs } = await supabase.from("proyectos").select("id, nombre, descripcion").order("nombre");
    const { data: fbc } = await supabase.from("formas_cobro").select("*").order("nombre");
    const { data: perf } = await supabase.from("perfil_negocio").select("*").single();

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

  // Al seleccionar proyecto, podemos traer su descripción
  const handleProyectoChange = (id: string) => {
    setProyectoId(id);
    const proj = proyectos.find(p => p.id === id);
    if (proj && lineas.length === 1 && lineas[0].descripcion === "") {
      updateLinea(0, "descripcion", proj.descripcion || proj.nombre);
    }
    // También autoseleccionar cliente si el proyecto lo tiene
    if (proj?.cliente_id) setClienteId(proj.cliente_id);
  };

  const baseImponible = lineas.reduce((acc, l) => acc + (l.unidades * l.precio_unitario), 0);
  const cuotaIva = serie === "A" ? baseImponible * 0.21 : 0;
  const totalFactura = baseImponible + cuotaIva;

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openEditVenta = (v: any) => {
    setEditingId(v.id);
    setSerie(v.serie);
    setNumFactura(v.num_factura);
    setFecha(v.fecha);
    setClienteId(v.cliente_id);
    setProyectoId(v.proyecto_id || "");
    setFormaCobroId(v.forma_cobro_id || "");
    
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

    if (!supabase) {
      alert("Error: No hay conexión con la base de datos.");
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
        total: totalFactura
      };

      let currentVentaId = editingId;

      if (editingId) {
        const { error: vError } = await supabase.from("ventas").update([payload]).eq("id", editingId);
        if (vError) throw vError;
        // Borramos líneas antiguas para re-insertar
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

      const { error: lError } = await supabase.from("venta_lineas").insert(lineasToInsert);
      if (lError) throw lError;

      setIsEditorOpen(false);
      setEditingId(null);
      setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0 }]);
      fetchData();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVenta = async (id: string, ref: string, serieVenta: string, numVenta: string) => {
    if (!supabase) return;

    // 1. Integridad Legal: ¿Es la última factura de la serie?
    // Buscamos si existe alguna factura con número mayor en la misma serie
    const { data: facturasMayores, error: seqErr } = await supabase
      .from("ventas")
      .select("num_factura")
      .eq("serie", serieVenta)
      .gt("num_factura", numVenta)
      .limit(1);

    if (seqErr) {
      alert("Error al verificar secuencia: " + seqErr.message);
      return;
    }

    if (facturasMayores && facturasMayores.length > 0) {
      alert(`No se puede eliminar la factura ${ref} porque no es la última de la serie. Para mantener la correlatividad legal, debes realizar una factura rectificativa.`);
      return;
    }

    // 2. Integridad de Cobros: ¿Tiene cobros?
    const { count, error: countErr } = await supabase
      .from("cobros")
      .select("*", { count: 'exact', head: true })
      .eq("venta_id", id);

    if (countErr) {
      alert("Error al verificar integridad: " + countErr.message);
      return;
    }

    if (count && count > 0) {
      alert(`No se puede eliminar la factura ${ref} porque ya tiene ${count} cobros registrados. Elimina primero los cobros.`);
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar la factura ${ref}? Esta acción es irreversible.`)) return;

    const { error } = await supabase.from("ventas").delete().eq("id", id);
    if (error) alert("Error al eliminar: " + error.message);
    else fetchData();
  };

  const downloadInvoice = (venta: any) => {
    if (!perfil) {
      alert("Configura primero tus datos de empresa en Ajustes.");
      return;
    }

    const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
    const lineasHtml = (venta.venta_lineas || []).map((l: any) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${l.unidades}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${l.descripcion}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">${fmt(l.precio_unitario)}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${fmt(l.total)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Factura ${venta.serie}-${venta.num_factura}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; margin-bottom: 60px; }
          .logo { max-height: 80px; }
          .invoice-item { font-size: 32px; font-weight: bold; color: #2563eb; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #999; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; font-size: 10px; text-transform: uppercase; color: #999; padding-bottom: 12px; border-bottom: 2px solid #333; }
          .totals { margin-top: 40px; width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
          .total-final { font-size: 20px; font-weight: bold; color: #2563eb; margin-top: 12px; border-top: 2px solid #2563eb; padding-top: 12px; }
          .legal-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; }
          .qr-placeholder { width: 100px; height: 100px; background: #f3f4f6; border: 1px solid #e5e7eb; display: flex; align-items: center; text-align: center; font-size: 8px; color: #999; }
          .footer-text { font-size: 9px; color: #666; max-width: 400px; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${perfil.logo_url ? `<img src="${perfil.logo_url}" class="logo">` : `<div style="font-size: 24px; font-weight: bold; color: #2563eb;">${perfil.nombre}</div>`}
          </div>
          <div style="text-align: right;">
            <div class="invoice-item">FACTURA</div>
            <div style="font-weight: bold;">${venta.serie}-${venta.num_factura}</div>
            <div style="color: #666;">Fecha: ${new Date(venta.fecha).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="details">
          <div>
            <div class="section-title">Emisor</div>
            <div style="font-weight: bold;">${perfil.nombre}</div>
            <div>${perfil.nif}</div>
            <div>${perfil.direccion || ''}</div>
          </div>
          <div>
            <div class="section-title">Cliente</div>
            <div style="font-weight: bold;">${venta.clientes?.nombre}</div>
            <div>${venta.clientes?.nif}</div>
            <div>${venta.clientes?.direccion || ''}</div>
            <div>${venta.clientes?.codigo_postal || ''} ${venta.clientes?.poblacion || ''}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="10%">Cant.</th>
              <th width="60%">Descripción</th>
              <th width="15%" style="text-align: right;">Precio</th>
              <th width="15%" style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineasHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Base Imponible:</span>
            <span>${fmt(venta.base_imponible)}</span>
          </div>
          <div class="total-row">
            <span>IVA (${venta.iva_pct}%):</span>
            <span>${fmt(venta.base_imponible * (venta.iva_pct / 100))}</span>
          </div>
          <div class="total-row total-final">
            <span>TOTAL:</span>
            <span>${fmt(venta.total)}</span>
          </div>
        </div>

        <div class="legal-footer">
          <div class="footer-text">
            <div style="font-weight: bold; margin-bottom: 4px;">Información de Pago</div>
            <div>Forma de Cobro: <strong>${formasCobro.find(f => f.id === venta.forma_cobro_id)?.nombre || 'Transferencia'}</strong></div>
            <div>Cuenta para el ingreso (IBAN): <strong>${perfil.cuenta_bancaria}</strong></div>
            <div style="margin-top: 15px;">Documento generado conforme a la Ley 18/2022 de creación y crecimiento de empresas (Ley Crea y Crece). Trazabilidad digital garantizada.</div>
          </div>
          <div style="text-align: right;">
            <div class="qr-placeholder">CÓDIGO QR<br>VERI*FACTU<br>PENDIENTE FIRMA</div>
            <div style="font-size: 8px; color: #999; margin-top: 4px;">ID: ${venta.id.slice(0,13)}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.print();
        // win.close(); // Opcional: cerrar tras imprimir
      }, 500);
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
                <h1 className="text-3xl font-bold font-head tracking-tight mb-1 text-[var(--foreground)]">Facturación</h1>
                <p className="text-[var(--muted)] font-medium">Gestión y emisión de facturas profesionales.</p>
              </div>
              <button 
                onClick={async () => {
                  setEditingId(null);
                  setLineas([{ unidades: 1, descripcion: "", precio_unitario: 0 }]);
                  // Propone un número base antes de consultar para que nunca salga vacío
                  const currentYear = new Date().getFullYear();
                  if (!numFactura) setNumFactura(`${currentYear}-001`);
                  
                  await fetchData();
                  setIsEditorOpen(true);
                }} 
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Plus size={18} /> Crear Factura
              </button>
            </header>

            <div className="glass-card bg-white shadow-sm border-[var(--border)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#fcfaf7] border-b border-[var(--border)]">
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Factura</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right">Total</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider text-right text-red-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {ventas.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50 group transition-colors">
                        <td className="px-6 py-4 text-sm font-bold">{v.serie}-{v.num_factura}</td>
                        <td className="px-6 py-4 text-sm text-[var(--muted)]">{new Date(v.fecha).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm">{v.clientes?.nombre}</td>
                        <td className="px-6 py-4 text-right font-bold text-[var(--accent)]">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v.total)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => downloadInvoice(v)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Descargar PDF / Imprimir"
                            >
                              <Printer size={16} />
                            </button>
                            <button 
                              onClick={() => openEditVenta(v)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar Factura"
                            >
                              <Save size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteVenta(v.id, `${v.serie}-${v.num_factura}`, v.serie, v.num_factura)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar Factura"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </>
        ) : (
          <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold font-head flex items-center gap-2">
                <FileText className="text-[var(--accent)]" /> Editor de Factura
              </h2>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditorOpen(false)} 
                  className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveInvoice} 
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {saving ? "Emitiendo..." : "Guardar y Emitir"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-[var(--border)] p-8">
              {/* CABECERA EDITOR */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 pb-8 border-b border-dashed border-gray-200">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Serie</label>
                  <select value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 font-bold focus:bg-white transition-colors">
                    <option value="A">Serie A (IVA)</option>
                    <option value="B">Serie B (sin IVA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nº Factura</label>
                  <input type="text" value={numFactura} onChange={(e) => setNumFactura(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 font-mono focus:bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Forma de Pago</label>
                  <select value={formaCobroId} onChange={(e) => setFormaCobroId(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white">
                    <option value="">— Seleccionar —</option>
                    {formasCobro.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Proyecto Asociado</label>
                  <select value={proyectoId} onChange={(e) => handleProyectoChange(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white">
                    <option value="">— Selección opcional —</option>
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                {proyectoId && !editingId && (
                  <div className="md:col-span-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div>
                      <div className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1">
                        <FolderKanban size={10} /> Herramienta de Avance (%)
                      </div>
                      <p className="text-xs text-blue-700">Factura un porcentaje del presupuesto total del proyecto.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input 
                          id="pct-input"
                          type="number" 
                          placeholder="%" 
                          className="w-20 p-2 pr-6 rounded-lg border border-blue-200 text-sm font-bold text-blue-700 focus:outline-none focus:border-blue-400 box-content"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">%</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const pct = parseFloat((document.getElementById('pct-input') as HTMLInputElement).value);
                          if (pct > 0) {
                            const proj = proyectos.find(p => p.id === proyectoId);
                            const totalVenta = proj?.venta_prevista || 0;
                            const importeAvance = (totalVenta * pct) / 100;
                            
                            // Si la primera línea está vacía, la usamos
                            if (lineas.length === 1 && lineas[0].descripcion === "") {
                              setLineas([{
                                unidades: 1,
                                descripcion: `${pct}% Avance proyecto nº ${proj?.nombre || proyectoId.slice(0,6)}`,
                                precio_unitario: importeAvance
                              }]);
                            } else {
                              setLineas([...lineas, {
                                unidades: 1,
                                descripcion: `${pct}% Avance proyecto nº ${proj?.nombre || proyectoId.slice(0,6)}`,
                                precio_unitario: importeAvance
                              }]);
                            }
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Aplicar Hito
                      </button>
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Cliente {proyectoId && <span className="text-[var(--accent)] normal-case font-medium ml-2">(Fijado por proyecto)</span>}
                  </label>
                  <select 
                    value={clienteId} 
                    onChange={(e) => setClienteId(e.target.value)} 
                    disabled={!!proyectoId}
                    className={`w-full p-2.5 rounded-lg border border-gray-200 focus:bg-white font-bold transition-all ${proyectoId ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'bg-gray-50'}`}
                  >
                    <option value="">— Obligatorio —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* CUERPO - LÍNEAS */}
              <div className="mb-8">
                <table className="w-full border-collapse">
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
                      <tr key={idx} className="group">
                        <td className="py-2 pr-4">
                          <input type="number" value={linea.unidades} onChange={(e) => updateLinea(idx, "unidades", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 hover:border-gray-200 focus:bg-blue-50 transition-colors text-center font-bold" />
                        </td>
                        <td className="py-2 pr-4">
                          <textarea rows={1} value={linea.descripcion} onChange={(e) => updateLinea(idx, "descripcion", e.target.value)} className="w-full p-2 rounded-lg border border-gray-100 hover:border-gray-200 focus:bg-blue-50 transition-colors text-sm resize-none overflow-hidden" placeholder="Describe el servicio o producto..." />
                        </td>
                        <td className="py-2 pr-4">
                          <input type="number" value={linea.precio_unitario} onChange={(e) => updateLinea(idx, "precio_unitario", parseFloat(e.target.value))} className="w-full p-2 rounded-lg border border-gray-100 hover:border-gray-200 focus:bg-blue-50 transition-colors text-right font-mono" />
                        </td>
                        <td className="py-2 text-right font-bold text-gray-700 font-mono">
                          {new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(linea.unidades * linea.precio_unitario)}
                        </td>
                        <td className="py-2 text-center">
                          {lineas.length > 1 && (
                            <button onClick={() => removeLinea(idx)} className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={addLinea} className="mt-4 flex items-center gap-2 text-sm font-bold text-[var(--accent)] hover:underline">
                  <Plus size={16} /> Añadir nueva línea
                </button>
              </div>

              {/* PIE - TOTALES */}
              <div className="flex justify-end pt-8 border-t border-gray-100">
                <div className="w-80 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Base Imponible:</span>
                    <span className="font-mono font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(baseImponible)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">IVA ({serie === "A" ? 21 : 0}%):</span>
                    <span className="font-mono font-bold border-b border-gray-200 pb-1">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cuotaIva)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-1 bg-gray-50 p-4 rounded-2xl">
                    <span className="text-gray-700">Total Factura:</span>
                    <span className="text-[var(--accent)]">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalFactura)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

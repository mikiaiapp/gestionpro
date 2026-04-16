"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Receipt, Plus, Search, MoreHorizontal, Loader2, Trash2, Save, FileText, Download, Printer } from "lucide-react";
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

  const fetchData = async () => {
    if (!supabase) return;
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

    // Lógica de contador automático (Año-XXX)
    const currentYear = new Date().getFullYear();
    const yearPrefix = `${currentYear}-`;
    const yearVentas = (vts || []).filter(v => v.num_factura && v.num_factura.startsWith(yearPrefix));

    if (yearVentas.length > 0) {
      const numbers = yearVentas.map(v => {
        const parts = v.num_factura.split("-");
        return parseInt(parts[1], 10) || 0;
      });
      const nextNum = Math.max(...numbers) + 1;
      setNumFactura(`${yearPrefix}${nextNum.toString().padStart(3, "0")}`);
    } else {
      setNumFactura(`${yearPrefix}001`);
    }

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

  const handleSaveInvoice = async () => {
    if (!clienteId || !numFactura) {
      alert("Faltan datos obligatorios (Cliente, Nº Factura)");
      return;
    }

    const { data: venta, error: vError } = await supabase.from("ventas").insert([{
      serie,
      num_factura: numFactura,
      fecha,
      cliente_id: clienteId,
      proyecto_id: proyectoId || null,
      forma_cobro_id: formaCobroId || null,
      base_imponible: baseImponible,
      iva_pct: serie === "A" ? 21 : 0,
      total: totalFactura
    }]).select().single();

    if (vError) {
      alert("Error al guardar cabecera: " + vError.message);
      return;
    }

    const lineasToInsert = lineas.map(l => ({
      venta_id: venta.id,
      unidades: l.unidades,
      descripcion: l.descripcion,
      precio_unitario: l.precio_unitario
    }));

    const { error: lError } = await supabase.from("venta_lineas").insert(lineasToInsert);

    if (lError) {
      alert("Error al guardar líneas: " + lError.message);
    } else {
      setIsEditorOpen(false);
      fetchData();
    }
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
          .footer { margin-top: 100px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #666; text-align: center; }
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

        <div class="footer">
          <div style="font-weight: bold; margin-bottom: 4px;">Información de Pago</div>
          <div>Forma de Cobro: <strong>${formasCobro.find(f => f.id === venta.forma_cobro_id)?.nombre || 'Transferencia'}</strong></div>
          <div>Cuenta para el ingreso (IBAN): <strong>${perfil.cuenta_bancaria}</strong></div>
          <div style="margin-top: 20px; color: #999;">Gracias por su confianza. Documento emitido mediante GestiónPro.</div>
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
              <button onClick={() => setIsEditorOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold hover:shadow-lg transition-all active:scale-[0.98]">
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
                      <th className="px-6 py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {ventas.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-bold">{v.serie}-{v.num_factura}</td>
                        <td className="px-6 py-4 text-sm text-[var(--muted)]">{new Date(v.fecha).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm">{v.clientes?.nombre}</td>
                        <td className="px-6 py-4 text-right font-bold text-[var(--accent)]">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v.total)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => downloadInvoice(v)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Descargar PDF"
                            >
                              <Download size={18} />
                            </button>
                            <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors">
                              <MoreHorizontal size={18} />
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
                  className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                >
                  <Save size={18} /> Guardar y Emitir
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

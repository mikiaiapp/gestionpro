"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Settings, Save, CreditCard, Building, Plus, Trash2, Loader2, Image as ImageIcon, Percent, CheckCircle, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AjustesPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Datos del Emisor
  const [nombre, setNombre] = useState("");
  const [nif, setNif] = useState("");
  const [cuentaBancaria, setCuentaBancaria] = useState("");
  const [direccion, setDireccion] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [tieneRetencion, setTieneRetencion] = useState(false);
  const [irpfDefault, setIrpfDefault] = useState(0);
  const [geminiStatus, setGeminiStatus] = useState({ msg: "", type: "muted" });
  
  // Formas de Cobro
  const [formasCobro, setFormasCobro] = useState<any[]>([]);
  const [nuevaForma, setNuevaForma] = useState("");

  // Tipos IVA
  const [tiposIva, setTiposIva] = useState<any[]>([]);
  const [nuevoIvaNombre, setNuevoIvaNombre] = useState("");
  const [nuevoIvaValor, setNuevoIvaValor] = useState(0);

  // Tipos IRPF
  const [tiposIrpf, setTiposIrpf] = useState<any[]>([]);
  const [nuevoIrpfNombre, setNuevoIrpfNombre] = useState("");
  const [nuevoIrpfValor, setNuevoIrpfValor] = useState(0);

  useEffect(() => {
    fetchAjustes();
  }, [supabase]);

  const fetchAjustes = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: perfil } = await supabase.from("perfil_negocio").select("*").eq("id", 1).maybeSingle();
      if (perfil) {
        setNombre(perfil.nombre || "");
        setNif(perfil.nif || "");
        setCuentaBancaria(perfil.cuenta_bancaria || "");
        setDireccion(perfil.direccion || "");
        setGeminiKey(perfil.gemini_key || "");
        setTieneRetencion(perfil.tiene_retencion || false);
        setIrpfDefault(perfil.irpf_default || 0);
      }
      const { data: fbc } = await supabase.from("formas_cobro").select("*").order("nombre");
      const { data: iva } = await supabase.from("tipos_iva").select("*").order("valor", { ascending: false });
      const { data: irpf } = await supabase.from("tipos_irpf").select("*").order("valor", { ascending: false });
      setFormasCobro(fbc || []);
      setTiposIva(iva || []);
      setTiposIrpf(irpf || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePerfil = async () => {
    setIsSaving(true);
    await supabase.from("perfil_negocio").upsert({
      id: 1,
      nombre,
      nif,
      cuenta_bancaria: cuentaBancaria,
      direccion,
      gemini_key: geminiKey,
      tiene_retencion: tieneRetencion,
      irpf_default: irpfDefault
    });
    alert("Configuración guardada");
    setIsSaving(false);
  };

  const handleAddForma = async () => {
    if (!nuevaForma) return;
    await supabase.from("formas_cobro").insert([{ nombre: nuevaForma }]);
    setNuevaForma("");
    fetchAjustes();
  };

  const handleAddIva = async () => {
    if (!nuevoIvaNombre) return;
    await supabase.from("tipos_iva").insert([{ nombre: nuevoIvaNombre, valor: nuevoIvaValor }]);
    setNuevoIvaNombre(""); setNuevoIvaValor(0);
    fetchAjustes();
  };

  const handleAddIrpf = async () => {
    if (!nuevoIrpfNombre) return;
    await supabase.from("tipos_irpf").insert([{ nombre: nuevoIrpfNombre, valor: nuevoIrpfValor }]);
    setNuevoIrpfNombre(""); setNuevoIrpfValor(0);
    fetchAjustes();
  };

  const handleDelete = async (table: string, id: string) => {
    await supabase.from(table).delete().eq("id", id);
    fetchAjustes();
  };

  const testGeminiKey = async () => {
    if (!geminiKey) return;
    setGeminiStatus({ msg: "Verificando...", type: "muted" });
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}&pageSize=1`);
      setGeminiStatus(res.ok ? { msg: "✓ OK", type: "green" } : { msg: "✕ API Key inválida", type: "red" });
    } catch {
      setGeminiStatus({ msg: "✕ Error", type: "red" });
    }
  };

  if (loading) return (
    <div className="flex bg-[var(--background)] min-h-screen">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" size={40} /></div>
    </div>
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold font-head tracking-tight mb-1">Ajustes</h1>
          <p className="text-[var(--muted)] font-medium">Configuración de empresa e identidad fiscal.</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm p-8 space-y-6">
            <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2"><Building className="text-[var(--accent)]" /> Datos del Emisor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Nombre Comercial</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 font-bold" />
              </div>
              <div><label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">NIF / CIF</label><input type="text" value={nif} onChange={e => setNif(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 uppercase" /></div>
              <div><label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">IBAN</label><input type="text" value={cuentaBancaria} onChange={e => setCuentaBancaria(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 font-mono text-sm" /></div>
            </div>
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <input type="checkbox" id="ret" checked={tieneRetencion} onChange={e => setTieneRetencion(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="ret" className="text-sm font-bold text-gray-700">Facturar con IRPF</label>
              </div>
              {tieneRetencion && (
                <div className="mt-2"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">% Retención por defecto</label><input type="number" value={irpfDefault} onChange={e => setIrpfDefault(parseFloat(e.target.value))} className="w-24 p-2 rounded-lg border border-blue-200" /></div>
              )}
            </div>
            <button onClick={handleSavePerfil} disabled={isSaving} className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--accent)] text-white font-bold rounded-xl">{isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Guardar</button>
          </div>
          <div className="space-y-8">
             <div className="bg-white rounded-2xl border p-8">
                <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2"><Percent className="text-green-600" /> IVA</h2>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="Nombre" value={nuevoIvaNombre} onChange={e => setNuevoIvaNombre(e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" />
                  <input type="number" value={nuevoIvaValor} onChange={e => setNuevoIvaValor(parseFloat(e.target.value))} className="w-16 p-2 border rounded-lg text-center" />
                  <button onClick={handleAddIva} className="p-2 bg-green-50 text-green-700 rounded-lg"><Plus size={20}/></button>
                </div>
                <div className="space-y-2">{tiposIva.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group">
                    <span className="text-sm font-bold">{v.nombre} ({v.valor}%)</span>
                    <button onClick={() => handleDelete('tipos_iva', v.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                  </div>
                ))}</div>
             </div>
             <div className="bg-white rounded-2xl border p-8">
                <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2"><Percent className="text-orange-600" /> IRPF</h2>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="Nombre" value={nuevoIrpfNombre} onChange={e => setNuevoIrpfNombre(e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" />
                  <input type="number" value={nuevoIrpfValor} onChange={e => setNuevoIrpfValor(parseFloat(e.target.value))} className="w-16 p-2 border rounded-lg text-center" />
                  <button onClick={handleAddIrpf} className="p-2 bg-orange-50 text-orange-700 rounded-lg"><Plus size={20}/></button>
                </div>
                <div className="space-y-2">{tiposIrpf.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group">
                    <span className="text-sm font-bold">{v.nombre} ({v.valor}%)</span>
                    <button onClick={() => handleDelete('tipos_irpf', v.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                  </div>
                ))}</div>
             </div>
          </div>
          <div className="bg-white rounded-2xl border p-8">
            <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2"><CreditCard className="text-blue-600" /> Pagos/Cobros</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" value={nuevaForma} onChange={e => setNuevaForma(e.target.value)} placeholder="Forma pago" className="flex-1 p-2 border rounded-lg text-sm" />
              <button onClick={handleAddForma} className="p-2 bg-blue-50 text-blue-700 rounded-lg"><Plus size={20} /></button>
            </div>
            <div className="space-y-2">{formasCobro.map(f => (
              <div key={f.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group">
                <span className="text-sm font-bold">{f.nombre}</span>
                <button onClick={() => handleDelete('formas_cobro', f.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
              </div>
            ))}</div>
          </div>
          <div className="bg-white rounded-2xl border p-8">
            <h2 className="text-xl font-bold font-head mb-6 flex items-center gap-2">✨ Gemini AI</h2>
            <div className="space-y-4">
                <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="API KEY" className="w-full p-3 border rounded-xl font-mono text-sm" />
                <button onClick={testGeminiKey} className="w-full py-2 bg-gray-100 rounded-xl font-bold">Probar</button>
                {geminiStatus.msg && <p className="text-[10px] font-bold uppercase">{geminiStatus.msg}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

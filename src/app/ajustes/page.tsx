import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Save, 
  Database, 
  Settings2, 
  MapPin, 
  CreditCard, 
  ShieldCheck,
  Percent,
  Plus,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getInfoPorCP, PROVINCIAS_ESPANOLAS } from '@/lib/geoData';
import { validateNIF, validateIBAN, formatIBAN } from '@/lib/validations';

export default function AjustesPage() {
  const [nombre, setNombre] = useState('Mi Empresa');
  const [nif, setNif] = useState('');
  const [cuentaBancaria, setCuentaBancaria] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cp, setCp] = useState('');
  const [poblacion, setPoblacion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [tieneRetencion, setTieneRetencion] = useState(false);
  const [irpfDefault, setIrpfDefault] = useState(15);
  const [isSaving, setIsSaving] = useState(false);
  const [tiposIva, setTiposIva] = useState<any[]>([]);
  const [tiposIrpf, setTiposIrpf] = useState<any[]>([]);
  const [newIvaNombre, setNewIvaNombre] = useState('');
  const [newIvaValor, setNewIvaValor] = useState(0);
  const [newIrpfNombre, setNewIrpfNombre] = useState('');
  const [newIrpfValor, setNewIrpfValor] = useState(0);
  const [syncing, setSyncing] = useState(false);
  
  const [showProvList, setShowProvList] = useState(false);
  const [showMunList, setShowMunList] = useState(false);
  const [municipiosSugeridos, setMunicipiosSugeridos] = useState<string[]>([]);

  useEffect(() => {
    fetchPerfil();
    fetchTipos();
  }, []);

  useEffect(() => {
    if (cp.length === 5) {
      const info = getInfoPorCP(cp);
      if (info) {
        setProvincia(info.provincia);
        if (info.municipio) {
          setPoblacion(info.municipio);
        }
        const muns = info.municipios || [];
        setMunicipiosSugeridos(muns);
      }
    }
  }, [cp]);

  const fetchPerfil = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('perfil_negocio')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (data) {
      setNombre(data.nombre || '');
      setNif(data.nif || '');
      setCuentaBancaria(data.cuenta_bancaria || '');
      setDireccion(data.direccion || '');
      setCp(data.cp || '');
      setPoblacion(data.poblacion || '');
      setProvincia(data.provincia || '');
      setGeminiKey(data.gemini_key || '');
      setTieneRetencion(data.tiene_retencion || false);
      setIrpfDefault(Number(data.irpf_default) || 0);
    }
  };

  const fetchTipos = async () => {
    const { data: iva } = await supabase.from('tipos_iva').select('*').order('valor', { ascending: false });
    const { data: irpf } = await supabase.from('tipos_irpf').select('*').order('valor', { ascending: false });
    setTiposIva(iva || []);
    setTiposIrpf(irpf || []);
  };

  const handleSavePerfil = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('perfil_negocio').upsert({
      user_id: user.id,
      nombre,
      nif,
      cuenta_bancaria: cuentaBancaria.replace(/\s/g, ''),
      direccion,
      cp,
      poblacion,
      provincia,
      gemini_key: geminiKey,
      tiene_retencion: tieneRetencion,
      irpf_default: irpfDefault
    });

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      alert("Configuración guardada correctamente");
    }
    setIsSaving(false);
  };

  const handleSyncOfficial = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/tax_presets.json');
      const presets = await response.json();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario autenticado");

      for (const item of presets.iva) {
        await supabase.from('tipos_iva').upsert({
          user_id: user.id,
          nombre: item.nombre,
          valor: item.valor
        }, { onConflict: 'user_id,valor' });
      }
      
      for (const item of presets.irpf) {
        await supabase.from('tipos_irpf').upsert({
          user_id: user.id,
          nombre: item.nombre,
          valor: item.valor
        }, { onConflict: 'user_id,valor' });
      }

      await fetchTipos();
      alert("Sincronización fiscal completada con éxito");
    } catch (err) {
      console.error(err);
      alert("Error al sincronizar");
    }
    setSyncing(false);
  };

  const addIva = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newIvaNombre) return;
    await supabase.from('tipos_iva').insert({ user_id: user.id, nombre: newIvaNombre, valor: newIvaValor });
    setNewIvaNombre('');
    setNewIvaValor(0);
    fetchTipos();
  };

  const deleteIva = async (id: string) => {
    await supabase.from('tipos_iva').delete().eq('id', id);
    fetchTipos();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-head tracking-tight text-[var(--foreground)]">Ajustes</h1>
          <p className="text-[var(--muted)] mt-1">Configuración de empresa e identidad fiscal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Perfil del Emisor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 bg-white border border-[var(--border)] shadow-sm">
            <h2 className="text-xl font-bold font-head mb-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Building2 size={22} />
              </div>
              Datos del Emisor
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[#fafafa] focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" 
                  placeholder="Ej: Reformas Miguel SL"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">NIF / CIF</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={nif} 
                    onChange={(e) => setNif(e.target.value.toUpperCase())}
                    className={`w-full px-4 py-3 rounded-xl border ${nif && !validateNIF(nif) ? 'border-red-300 ring-2 ring-red-50' : 'border-[var(--border)]'} bg-[#fafafa] outline-none transition-all`}
                    placeholder="B12345678"
                  />
                  {nif && (validateNIF(nif) ? 
                    <CheckCircle2 size={16} className="absolute right-3 top-4 text-green-500" /> : 
                    <AlertCircle size={16} className="absolute right-3 top-4 text-red-500" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">IBAN</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={cuentaBancaria} 
                    onChange={(e) => setCuentaBancaria(formatIBAN(e.target.value))}
                    className={`w-full px-4 py-3 rounded-xl border ${cuentaBancaria && !validateIBAN(cuentaBancaria) ? 'border-red-300 ring-2 ring-red-50' : 'border-[var(--border)]'} bg-[#fafafa] outline-none transition-all font-mono text-sm`}
                    placeholder="ES00 0000 0000..."
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Dirección Física</label>
                <input 
                  type="text" 
                  value={direccion} 
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[#fafafa] outline-none" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">C.P.</label>
                <input 
                  type="text" 
                  value={cp} 
                  maxLength={5}
                  onChange={(e) => setCp(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[#fafafa] outline-none font-mono" 
                />
              </div>

              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Provincia</label>
                <input 
                  type="text" 
                  value={provincia} 
                  onFocus={() => setShowProvList(true)}
                  onBlur={() => setTimeout(() => setShowProvList(false), 200)}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[#fafafa] outline-none" 
                />
                {showProvList && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border rounded-xl shadow-2xl py-2">
                    {PROVINCIAS_ESPANOLAS.filter(p => !provincia || p.nombre.toLowerCase().includes(provincia.toLowerCase())).map(p => (
                      <button key={p.id} onClick={() => setProvincia(p.nombre)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm">{p.nombre}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest pl-1">Municipio</label>
                <input 
                  type="text" 
                  value={poblacion} 
                  onFocus={() => setShowMunList(true)}
                  onBlur={() => setTimeout(() => setShowMunList(false), 200)}
                  onChange={(e) => setPoblacion(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[#fafafa] outline-none" 
                />
                {showMunList && municipiosSugeridos.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border rounded-xl shadow-2xl py-2">
                    {municipiosSugeridos.filter(m => !poblacion || m.toLowerCase().includes(poblacion.toLowerCase())).map((m, i) => (
                      <button key={i} onClick={() => setPoblacion(m)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm">{m}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input 
                  type="checkbox" 
                  checked={tieneRetencion} 
                  onChange={(e) => setTieneRetencion(e.target.checked)}
                  className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500" 
                />
                <div>
                  <span className="font-bold text-blue-900 block">Facturar con IRPF</span>
                  <span className="text-xs text-blue-700">Activa el cálculo de retenciones en tus facturas de venta.</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSavePerfil}
              disabled={isSaving}
              className="w-full mt-8 py-4 bg-[var(--accent)] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />}
              Guardar Perfil
            </button>
          </div>
        </div>

        {/* Impuestos */}
        <div className="space-y-6">
          {/* IVA */}
          <div className="glass-card p-6 bg-white border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold font-head flex items-center gap-2 text-green-600">
                <Percent size={18} /> % IVA
              </h2>
              <button 
                onClick={handleSyncOfficial} 
                disabled={syncing}
                className="text-[10px] font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1 uppercase tracking-tighter transition-all"
              >
                <RefreshCcw size={12} className={syncing ? 'animate-spin' : ''} />
                Sincronizar oficial
              </button>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {tiposIva.map(tipo => (
                <div key={tipo.id} className="flex items-center justify-between p-3 rounded-xl bg-[#fafafa] border border-[var(--border)]">
                  <span className="text-sm font-medium">{tipo.nombre}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{tipo.valor}%</span>
                    <button onClick={() => deleteIva(tipo.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input 
                type="text" 
                placeholder="Nombre" 
                value={newIvaNombre} 
                onChange={(e) => setNewIvaNombre(e.target.value)}
                className="flex-1 p-2 bg-[#fafafa] border border-[var(--border)] rounded-lg text-xs outline-none" 
              />
              <input 
                type="number" 
                value={newIvaValor} 
                onChange={(e) => setNewIvaValor(Number(e.target.value))}
                className="w-16 p-2 bg-[#fafafa] border border-[var(--border)] rounded-lg text-xs outline-none font-bold" 
              />
              <button onClick={addIva} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* IRPF */}
          <div className="glass-card p-6 bg-white border border-[var(--border)] shadow-sm">
            <h2 className="font-bold font-head mb-6 flex items-center gap-2 text-orange-600">
              <Percent size={18} /> % IRPF
            </h2>
            <div className="space-y-3">
              {tiposIrpf.map(tipo => (
                <div key={tipo.id} className="flex items-center justify-between p-3 rounded-xl bg-[#fafafa] border border-[var(--border)]">
                  <span className="text-sm font-medium">{tipo.nombre}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{tipo.valor}%</span>
                    <button className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input type="text" placeholder="Nombre" className="flex-1 p-2 bg-[#fafafa] border border-[var(--border)] rounded-lg text-xs outline-none" />
              <input type="number" defaultValue="0" className="w-16 p-2 bg-[#fafafa] border border-[var(--border)] rounded-lg text-xs outline-none font-bold" />
              <button className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-8 border-t border-[var(--border)]">
        <p className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-[0.2em]">GestiónPro V2.0 - Última Versión</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { 
  Files, 
  Search, 
  FileText, 
  Download, 
  ExternalLink,
  ChevronRight,
  FolderOpen,
  ArrowLeft,
  Loader2,
  Filter,
  LayoutGrid,
  FolderKanban,
  Receipt,
  Upload,
  Image as ImageIcon,
  Trash2,
  Eye,
  Plus
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SearchableSelect } from "@/components/SearchableSelect";

export default function DocumentosPage() {
  const [viewMode, setViewMode] = useState<'explorador' | 'proyecto'>('explorador');
  const [currentPath, setCurrentPath] = useState<string>("");
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Vista Proyecto
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectDocs, setProjectDocs] = useState<{
    presupuesto?: any,
    emitidas: any[],
    recibidas: any[],
    otros: any[]
  }>({ emitidas: [], recibidas: [], otros: [] });

  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchProyectos();
  }, []);

  useEffect(() => {
    if (viewMode === 'explorador') {
      fetchFiles();
    } else if (selectedProjectId) {
      fetchProjectDocs();
    }
  }, [currentPath, viewMode, selectedProjectId]);

  const fetchProyectos = async () => {
    const { data } = await supabase.from('proyectos').select('id, nombre, clientes(nombre)');
    setProyectos(data || []);
  };

  const fetchFiles = async () => {
    setLoading(true);
    setFiles([]);
    try {
      const { data, error } = await supabase.storage
        .from('facturas')
        .list(currentPath || undefined, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) throw error;
      
      const realFiles = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');
      setFiles(realFiles);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDocs = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      // 1. Facturas Emitidas
      const { data: vts } = await supabase.from('ventas').select('*').eq('proyecto_id', selectedProjectId).not('archivo_url', 'is', null);
      
      // 2. Facturas Recibidas (Costes)
      const { data: csts } = await supabase.from('costes').select('*, proveedores(nombre)').eq('proyecto_id', selectedProjectId).not('archivo_url', 'is', null);
      
      // 3. Otros Archivos (Documentación Adicional)
      const { data: otros } = await supabase.from('proyecto_documentos').select('*').eq('proyecto_id', selectedProjectId);

      setProjectDocs({
        emitidas: vts || [],
        recibidas: csts || [],
        otros: otros || []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadOther = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `${selectedProjectId}_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const path = `otros/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('facturas')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path);

      const { error: dbError } = await supabase.from('proyecto_documentos').insert([{
        proyecto_id: selectedProjectId,
        nombre: file.name,
        archivo_url: publicUrl,
        size: file.size,
        user_id: user?.id,
        tipo: file.type.includes('image') ? 'foto' : file.type.includes('pdf') ? 'pdf' : 'otros'
      }]);

      if (dbError) throw dbError;
      
      alert("✅ Archivo subido y asociado correctamente.");
      fetchProjectDocs();
    } catch (err: any) {
      alert("Error al subir archivo: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteOtherDoc = async (doc: any) => {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      const path = doc.archivo_url.split('/facturas/')[1];
      if (path) await supabase.storage.from('facturas').remove([path]);
      await supabase.from('proyecto_documentos').delete().eq('id', doc.id);
      fetchProjectDocs();
    } catch (err) {
      console.error(err);
    }
  };

  const getPublicUrl = (fileName: string) => {
    const { data: { publicUrl } } = supabase.storage
      .from('facturas')
      .getPublicUrl(`${currentPath}/${fileName}`);
    return publicUrl;
  };

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-bold font-head tracking-tight text-[var(--foreground)] mb-1">Gestión Documental</h1>
            <p className="text-[var(--muted)] font-medium">Control total de la documentación de tu negocio.</p>
          </div>
          
          <div className="bg-white p-1 rounded-2xl border flex gap-1 shadow-sm">
             <button 
               onClick={() => setViewMode('explorador')}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'explorador' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
             >
               <LayoutGrid size={14} /> EXPLORADOR
             </button>
             <button 
               onClick={() => setViewMode('proyecto')}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'proyecto' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
             >
               <FolderKanban size={14} /> VISTA POR PRESUPUESTO
             </button>
          </div>
        </header>

        {viewMode === 'explorador' ? (
          <div className="bg-white rounded-3xl border shadow-sm min-h-[60vh] flex flex-col overflow-hidden animate-in fade-in duration-500">
             <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   {currentPath && (
                     <button onClick={() => {
                       const parts = currentPath.split('/');
                       parts.pop();
                       setCurrentPath(parts.join('/'));
                     }} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-[var(--foreground)] transition-all bg-white/50">
                        <ArrowLeft size={20} />
                     </button>
                   )}
                   <div className="flex items-center gap-2 text-[var(--muted)]">
                      <span className="hover:text-blue-600 cursor-pointer font-bold uppercase text-[10px] tracking-widest" onClick={() => setCurrentPath("")}>RAÍZ</span>
                      {currentPath && currentPath.split('/').map((p, i) => (
                        <span key={i} className="flex items-center gap-2">
                          <ChevronRight size={12} />
                          <span className="font-bold uppercase text-[10px] tracking-widest text-gray-800">{p}</span>
                        </span>
                      ))}
                   </div>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all font-medium"
                    />
                </div>
             </div>

             <div className="flex-1 p-6">
                {loading ? (
                   <div className="flex flex-col items-center justify-center p-32 gap-4">
                      <Loader2 className="animate-spin text-blue-600" size={48} />
                      <p className="text-sm font-bold text-gray-400">Escaneando almacenamiento...</p>
                   </div>
                ) : files.length === 0 ? (
                   <div className="flex flex-col items-center justify-center p-32 text-center">
                      <Files size={64} className="text-gray-100 mb-4" />
                      <p className="text-gray-400 font-bold">Sin archivos en esta ubicación.</p>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).map(file => {
                         const isFolder = !file.id;
                         return (
                            <div 
                              key={file.name} 
                              onClick={() => isFolder && setCurrentPath(currentPath ? `${currentPath}/${file.name}` : file.name)}
                              className={`p-4 rounded-2xl border transition-all group flex flex-col justify-between min-h-[140px] relative overflow-hidden bg-white ${isFolder ? 'cursor-pointer border-blue-100 hover:border-blue-400 hover:bg-blue-50/50' : 'hover:border-purple-200 hover:bg-purple-50/20'}`}
                            >
                               <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                                  {isFolder ? <FolderOpen size={100} /> : <FileText size={100} />}
                               </div>
                               <div>
                                  <div className={`mb-2 ${isFolder ? 'text-blue-500' : 'text-purple-400'}`}>
                                     {isFolder ? <FolderOpen size={24} /> : <FileText size={24} />}
                                  </div>
                                  <div className="font-bold text-[13px] text-gray-700 break-words leading-tight">
                                     {file.name}
                                  </div>
                               </div>
                               <div className="flex justify-between items-end mt-4 relative z-10">
                                  <span className="text-[9px] font-black text-gray-300 uppercase">
                                     {isFolder ? 'Carpeta' : `${(file.metadata?.size / 1024 / 1024).toFixed(2)} MB`}
                                  </span>
                                  {!isFolder && (
                                    <div className="flex gap-2">
                                       <a href={getPublicUrl(file.name)} target="_blank" className="p-2 bg-white rounded-lg border hover:shadow-md transition-all text-purple-500"><ExternalLink size={14} /></a>
                                       <a href={getPublicUrl(file.name)} download={file.name} className="p-2 bg-white rounded-lg border hover:shadow-md transition-all text-green-500"><Download size={14} /></a>
                                    </div>
                                  )}
                               </div>
                            </div>
                         );
                      })}
                   </div>
                )}
             </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="max-w-xl">
                <SearchableSelect 
                  label="Selecciona un Presupuesto para ver su Expediente Digital"
                  options={proyectos}
                  value={selectedProjectId}
                  onChange={(id) => setSelectedProjectId(id)}
                  placeholder="Escribe el nombre del presupuesto..."
                />
             </div>

             {selectedProjectId ? (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Bloque 1: Facturas Emitidas */}
                  <div className="space-y-4">
                     <h3 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest pl-2">
                        <Receipt size={16} /> Facturas Emitidas
                     </h3>
                     <div className="bg-white rounded-3xl border shadow-sm divide-y">
                        {projectDocs.emitidas.length === 0 ? (
                          <p className="p-8 text-center text-xs text-gray-400 font-bold">No hay facturas emitidas asociadas.</p>
                        ) : projectDocs.emitidas.map(v => (
                          <div key={v.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                             <div>
                                <div className="text-xs font-bold text-gray-700">Factura {v.serie}-{v.num_factura}</div>
                                <div className="text-[10px] text-gray-400">{new Date(v.fecha).toLocaleDateString()}</div>
                             </div>
                             <div className="flex gap-2">
                                <a href={v.archivo_url} target="_blank" className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-all"><Eye size={16} /></a>
                                <a href={v.archivo_url} download className="p-2 hover:bg-green-100 rounded-lg text-green-600 transition-all"><Download size={16} /></a>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* Bloque 2: Facturas Recibidas */}
                  <div className="space-y-4">
                     <h3 className="flex items-center gap-2 text-xs font-black text-purple-600 uppercase tracking-widest pl-2">
                        <Download size={16} /> Facturas Recibidas / Gastos
                     </h3>
                     <div className="bg-white rounded-3xl border shadow-sm divide-y">
                        {projectDocs.recibidas.length === 0 ? (
                          <p className="p-8 text-center text-xs text-gray-400 font-bold">No hay gastos asociados registrados.</p>
                        ) : projectDocs.recibidas.map(c => (
                          <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                             <div className="flex-1 pr-4">
                                <div className="text-xs font-bold text-gray-700 truncate">{c.proveedores?.nombre}</div>
                                <div className="text-[10px] text-gray-400">Fact. {c.num_factura_proveedor}</div>
                             </div>
                             <div className="flex gap-2">
                                <a href={c.archivo_url} target="_blank" className="p-2 hover:bg-purple-100 rounded-lg text-purple-600 transition-all"><Eye size={16} /></a>
                                <a href={c.archivo_url} download className="p-2 hover:bg-green-100 rounded-lg text-green-600 transition-all"><Download size={16} /></a>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* Bloque 3: Documentación Adicional */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-center px-2">
                        <h3 className="flex items-center gap-2 text-xs font-black text-orange-600 uppercase tracking-widest leading-none">
                           <ImageIcon size={16} /> Otros Documentos
                        </h3>
                        <label className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-orange-100 transition-all">
                           <Upload size={12} /> {isUploading ? 'SUBIENDO...' : 'IMPORTAR'}
                           <input type="file" onChange={handleUploadOther} disabled={isUploading} className="hidden" />
                        </label>
                     </div>
                     <div className="bg-white rounded-3xl border shadow-sm divide-y border-orange-100">
                        {projectDocs.otros.length === 0 ? (
                          <div className="p-8 text-center space-y-2">
                             <Files size={32} className="mx-auto text-orange-100" />
                             <p className="text-xs text-gray-400 font-bold">Planos, fotos, reportajes...</p>
                          </div>
                        ) : projectDocs.otros.map(doc => (
                          <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-orange-50/30 transition-colors">
                             <div className="flex-1 pr-4 overflow-hidden">
                                <div className="text-xs font-bold text-gray-700 truncate">{doc.nombre}</div>
                                <div className="text-[9px] text-gray-400 uppercase font-black">{doc.tipo} • {(doc.size / 1024 / 1024).toFixed(2)} MB</div>
                             </div>
                             <div className="flex gap-1">
                                <a href={doc.archivo_url} target="_blank" className="p-2 hover:bg-white rounded-lg text-orange-600 transition-all"><ExternalLink size={16} /></a>
                                <button onClick={() => deleteOtherDoc(doc)} className="p-2 hover:bg-white rounded-lg text-red-400 hover:text-red-600 transition-all"><Trash2 size={16} /></button>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
             ) : (
               <div className="bg-white rounded-3xl border-2 border-dashed p-32 text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <FolderKanban size={40} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-700">Expediente Digital del Presupuesto</h2>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto">Selecciona un presupuesto para ver unificado todo su rastro: contrato, facturas enviadas, gastos y materiales asociados.</p>
                  </div>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}

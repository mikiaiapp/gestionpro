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
  Plus,
  X,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SearchableSelect } from "@/components/SearchableSelect";
import { generatePDF } from "@/lib/pdfGenerator";

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
  const [perfil, setPerfil] = useState<any>(null);

  // Modal Subida Otros
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    const { data: perf } = await supabase.from('perfil_negocio').select('*').maybeSingle();
    setProyectos(data || []);
    setPerfil(perf);
  };

   const fetchFiles = async () => {
    setLoading(true);
    setFiles([]);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userRoot = user.id;
      const bucketPath = currentPath ? `${userRoot}/${currentPath}` : userRoot;

      // 1. Storage Files (Standard Explorer) - FILTRADO POR USER ROOT
      const { data: storageData, error } = await supabase.storage
        .from('facturas')
        .list(bucketPath || undefined, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) throw error;
      
      const stFiles = (storageData || [])
          .filter(f => f.name !== '.emptyFolderPlaceholder' && f.name !== 'backups');

      let results: any[] = [];

      if (!currentPath) { 
         const { data: dPerf } = await supabase.from('perfil_negocio').select('nombre_comercial').eq('user_id', user.id).maybeSingle();
         const businessName = dPerf?.nombre_comercial || "Mi Negocio";

         const virtualFolders = ['recibidas', 'emitidas', 'otros'].map(name => ({
            name,
            isFolder: true,
            context: businessName,
            type: 'Carpeta Virtual',
            origin: 'Virtual'
         }));

         // Los archivos físicos de la raíz (si los hay)
         const physicalFiles = stFiles.map(f => ({
            ...f,
            isFolder: !f.id ? true : false,
            url: f.id ? getPublicUrl(f.name, user.id) : null,
            origin: 'Storage'
         }));

         // Mezclamos asegurando que las carpetas "recibidas/emitidas" manuales no se dupliquen si existen físicas
         results = [...virtualFolders];
         physicalFiles.forEach(pf => {
            if (!results.find(r => r.name === pf.name)) {
               results.push(pf);
            }
         });

      } else if (currentPath === "recibidas") {
         const { data: dCosts } = await supabase.from('costes').select('id, num_interno, numero, num_factura_proveedor, archivo_url, proveedores(nombre)').not('archivo_url', 'is', null).eq('user_id', user.id);
         
         const database = (dCosts || []).map(c => {
            const regNum = c.registro_interno || c.num_interno || c.numero || "S/N";
            return { 
               id: c.id, 
               name: `REC - ${regNum} - ${(c as any).proveedores?.nombre}.pdf`, 
               url: c.archivo_url, 
               type: 'Factura Recibida',
               isFolder: false,
               context: (c as any).proveedores?.nombre 
            };
         });
         
         results = [...database];

      } else if (currentPath === "emitidas") {
         const { data: dProjs } = await supabase.from('proyectos').select('id, nombre, archivo_url').not('archivo_url', 'is', null).eq('user_id', user.id);
         const { data: dVents } = await supabase.from('ventas').select('id, serie, num_factura, archivo_url, clientes(nombre)').not('archivo_url', 'is', null).eq('user_id', user.id);

         const database = [
            ...(dProjs || []).map(p => ({ 
              id: p.id, 
              name: `PRE - ${p.nombre}.pdf`, 
              url: p.archivo_url, 
              type: 'Presupuesto',
              isFolder: false,
              context: p.nombre 
            })),
            ...(dVents || []).map(v => ({ 
              id: v.id, 
              name: `EMI - ${v.serie}-${v.num_factura} - ${(v as any).clientes?.nombre}.pdf`, 
              url: v.archivo_url, 
              type: 'Factura Emitida',
              isFolder: false,
              context: (v as any).clientes?.nombre 
            }))
         ];
         
         results = [...database];

      } else if (currentPath === "otros") {
         const physical = stFiles.map(f => ({
            ...f,
            isFolder: !f.id ? true : false,
            url: f.id ? getPublicUrl(f.name, user.id) : null,
            type: 'Archivo',
            origin: 'Storage'
         }));

         const { data: dOtros } = await supabase.from('proyecto_documentos').select('id, nombre, archivo_url, proyecto_id, proyectos(nombre)').not('archivo_url', 'is', null).eq('user_id', user.id);
         const database = (dOtros || []).map(o => ({ 
            id: o.id, 
            name: o.nombre, 
            url: o.archivo_url, 
            type: 'Adjunto Proyecto',
            isFolder: false,
            context: (o as any).proyectos?.nombre 
         }));

         results = [...physical, ...database];

      } else {
         results = stFiles.map(f => ({
            ...f,
            isFolder: !f.id ? true : false,
            url: f.id ? getPublicUrl(f.name) : null,
            origin: 'Storage'
         }));
      }

      // Limpieza final de placeholders y ordenación
      setFiles(results.filter(f => f.name !== '.emptyFolderPlaceholder').sort((a, b) => {
         if (a.isFolder && !b.isFolder) return -1;
         if (!a.isFolder && b.isFolder) return 1;
         return a.name.localeCompare(b.name);
      }));

    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  
  const cleanupOrphans = async () => {
    if (!confirm('¿Deseas escanear y eliminar archivos PDF huérfanos que no están vinculados a ningún registro?')) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const folders = ['emitidas', 'recibidas', 'presupuestos'];
      let deletedCount = 0;

      const [v, c, p, o] = await Promise.all([
        supabase.from('ventas').select('archivo_url').not('archivo_url', 'is', null),
        supabase.from('costes').select('archivo_url').not('archivo_url', 'is', null),
        supabase.from('proyectos').select('archivo_url').not('archivo_url', 'is', null),
        supabase.from('proyecto_documentos').select('archivo_url').not('archivo_url', 'is', null)
      ]);

      const allUrls = [
        ...(v.data || []).map(r => r.archivo_url),
        ...(c.data || []).map(r => r.archivo_url),
        ...(p.data || []).map(r => r.archivo_url),
        ...(o.data || []).map(r => r.archivo_url)
      ];

      for (const folder of folders) {
        const { data: stFiles } = await supabase.storage.from('facturas').list(`${user.id}/${folder}`);
        if (stFiles) {
          const orphans = stFiles.filter(f => {
            if (f.name === '.emptyFolderPlaceholder') return false;
            const fullPath = `${user.id}/${folder}/${f.name}`;
            const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(fullPath);
            return !allUrls.includes(publicUrl);
          });

          if (orphans.length > 0) {
            const pathsToDelete = orphans.map(f => `${user.id}/${folder}/${f.name}`);
            const { error: delErr } = await supabase.storage.from('facturas').remove(pathsToDelete);
            if (!delErr) deletedCount += orphans.length;
          }
        }
      }

      alert(`✅ Limpieza finalizada. Se han eliminado ${deletedCount} archivos huérfanos.`);
      fetchFiles();
    } catch (err: any) {
      alert('Error durante la limpieza: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

const fetchProjectDocs = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const { data: proj } = await supabase.from('proyectos').select('*, clientes(*)').eq('id', selectedProjectId).single();
      const { data: lineas } = await supabase.from('proyecto_lineas').select('*').eq('proyecto_id', selectedProjectId);
      const { data: vts } = await supabase.from('ventas').select('*').eq('proyecto_id', selectedProjectId).not('archivo_url', 'is', null);
      const { data: csts } = await supabase.from('costes').select('*, proveedores(nombre)').eq('proyecto_id', selectedProjectId).not('archivo_url', 'is', null);
      const { data: otros } = await supabase.from('proyecto_documentos').select('*').eq('proyecto_id', selectedProjectId).order('created_at', { ascending: false });

      setProjectDocs({
        presupuesto: proj ? { ...proj, lineas: lineas || [] } : undefined,
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

  const handleDownloadBudget = async () => {
    if (!projectDocs.presupuesto || !perfil) {
      alert("No hay datos suficientes para generar el presupuesto.");
      return;
    }

    try {
      const p = projectDocs.presupuesto;
      const refFinal = p.num_proyecto || p.numero || p.num_referencia || p.referencia || "S/N";
      
      await generatePDF({
        tipo: 'PRESUPUESTO',
        numero: `${p.serie || 'P'}-${refFinal}`,
        fecha: p.fecha,
        cliente: {
          nombre: p.clientes?.nombre || 'Cliente Final',
          nif: p.clientes?.nif || '',
          direccion: p.clientes?.direccion || '',
          poblacion: p.clientes?.poblacion || '',
          cp: p.clientes?.cp || '',
          provincia: p.clientes?.provincia || '',
        },
        perfil: perfil,
        condiciones_particulares: p.condiciones_particulares || '',
        lineas: p.lineas.map((l: any) => ({
          unidades: l.unidades,
          descripcion: l.descripcion,
          precio_unitario: l.precio_unitario
        })),
        totales: {
          base: p.base_imponible || 0,
          iva_pct: 21,
          iva_importe: p.iva_importe || 0,
          retencion_pct: p.retencion_pct || 0,
          retencion_importe: p.retencion_importe || 0,
          total: p.total || 0
        }
      });
    } catch (err: any) {
      alert("Error al generar PDF: " + err.message);
    }
  };

  const handleUploadOther = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedProjectId) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedProjectId}_${Date.now()}.${fileExt}`;
      const path = `otros/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('facturas')
        .upload(path, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path);

      const { error: dbError } = await supabase.from('proyecto_documentos').insert([{
        proyecto_id: selectedProjectId,
        nombre: newDocTitle || selectedFile.name,
        archivo_url: publicUrl,
        size: selectedFile.size,
        user_id: user?.id,
        tipo: selectedFile.type.includes('image') ? 'foto' : selectedFile.type.includes('pdf') ? 'pdf' : 'otros'
      }]);

      if (dbError) throw dbError;
      
      setIsUploadModalOpen(false);
      setNewDocTitle("");
      setSelectedFile(null);
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

  const getPublicUrl = (fileName: string, userId: string) => {
    const { data: { publicUrl } } = supabase.storage
      .from('facturas')
      .getPublicUrl(`${userId}/${currentPath}/${fileName}`);
    return publicUrl;
  };

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold font-head tracking-tight text-[var(--foreground)] mb-1">Gestión Documental</h1>
              <button 
                onClick={cleanupOrphans}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50 border border-red-100 transition-all flex items-center gap-2"
                title="Eliminar archivos sin registro vinculado"
              >
                <Trash2 size={12} /> LIMPIAR HISTORIAL HUÉRFANO
              </button>
            </div>
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
                   <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      {/* Encabezado Estilo Windows */}
                      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                         <div className="col-span-6 flex items-center">Nombre de Archivo</div>
                         <div className="col-span-3 flex items-center">Origen / Contexto</div>
                         <div className="col-span-2 flex items-center">Categoría</div>
                         <div className="col-span-1 text-right flex items-center justify-end">Acciones</div>
                      </div>

                      <div className="divide-y divide-gray-50">
                         {files.filter((f: any) => f.name.toLowerCase().includes(searchTerm.toLowerCase())).map((file: any, index: number) => {
                            const isFolder = file.isFolder;
                            return (
                               <div 
                                 key={file.id || file.name || index} 
                                 onClick={() => {
                                   if (isFolder) {
                                     setCurrentPath(currentPath ? `${currentPath}/${file.name}` : file.name);
                                   } else {
                                     window.open(file.url || file.archivo_url || file.pdf_url, '_blank');
                                   }
                                 }}
                                 className="group grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-2.5 hover:bg-blue-50/30 transition-all cursor-pointer items-center"
                               >
                                  {/* Nombre */}
                                  <div className="col-span-12 md:col-span-6 flex items-center gap-3 min-w-0">
                                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isFolder ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-400'}`}>
                                        {isFolder ? <FolderOpen size={18} /> : <FileText size={18} />}
                                     </div>
                                     <div className="min-w-0">
                                        <p className="font-bold text-slate-700 truncate text-[13px] group-hover:text-blue-600 transition-colors">
                                           {file.name}
                                        </p>
                                        <p className="md:hidden text-[10px] text-slate-400 truncate">
                                           {file.context || 'Documento'} • {file.type || 'Archivo'}
                                        </p>
                                     </div>
                                  </div>

                                  {/* Contexto */}
                                  <div className="hidden md:block col-span-3 text-[11px] font-bold text-gray-400 uppercase tracking-tight truncate">
                                     {file.context || '-'}
                                  </div>

                                  {/* Categoría */}
                                  <div className="hidden md:block col-span-2">
                                     {file.type && (
                                        <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[8px] font-black uppercase tracking-widest">
                                           {file.type}
                                        </span>
                                     )}
                                  </div>
                                  
                                  {/* Acciones */}
                                  <div className="col-span-12 md:col-span-1 flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                     {!isFolder && (
                                        <>
                                           <a 
                                              href={file.url || file.archivo_url} 
                                              target="_blank" 
                                              onClick={(e) => e.stopPropagation()}
                                              className="p-1.5 hover:bg-purple-50 rounded-md text-purple-400"
                                           >
                                              <ExternalLink size={14} />
                                           </a>
                                           <a 
                                              href={file.url || file.archivo_url} 
                                              download={file.name} 
                                              onClick={(e) => e.stopPropagation()}
                                              className="p-1.5 hover:bg-green-50 rounded-md text-green-500"
                                           >
                                              <Download size={14} />
                                           </a>
                                        </>
                                     )}
                                     {isFolder && (
                                        <div className="p-1.5 text-gray-300">
                                           <ChevronRight size={14} />
                                        </div>
                                     )}
                                  </div>
                               </div>
                            );
                         })}
                      </div>
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
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Bloque 0: Presupuesto Original */}
                  <div className="space-y-4">
                     <h3 className="flex items-center gap-2 text-xs font-black text-orange-600 uppercase tracking-widest pl-2">
                        <FolderKanban size={16} /> Presupuesto Original
                     </h3>
                     <div className="bg-white rounded-3xl border border-orange-200 shadow-sm p-5 h-fit hover:border-orange-400 transition-all group overflow-hidden relative">
                        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                           <FileText size={120} />
                        </div>
                        {projectDocs.presupuesto ? (
                          <div className="space-y-4 relative z-10">
                            <div>
                               <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Documento Principal</div>
                               <div className="text-sm font-bold text-gray-800 truncate" title={projectDocs.presupuesto.nombre}>
                                  {projectDocs.presupuesto.nombre}
                               </div>
                               <div className="text-xs font-medium text-gray-400">
                                  Ref: {projectDocs.presupuesto.serie}-{projectDocs.presupuesto.num_proyecto || projectDocs.presupuesto.numero}
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <button 
                                 onClick={handleDownloadBudget}
                                 className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
                               >
                                  <Download size={14} /> DESCARGAR PDF
                               </button>
                            </div>
                          </div>
                        ) : (
                          <p className="p-4 text-center text-xs text-gray-400 font-bold">Cargando datos...</p>
                        )}
                     </div>
                  </div>

                  {/* Bloque 1: Facturas Emitidas */}
                  <div className="space-y-4">
                     <h3 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest pl-2">
                        <Receipt size={16} /> Facturas Emitidas
                     </h3>
                     <div className="bg-white rounded-3xl border shadow-sm divide-y h-fit">
                        {projectDocs.emitidas.length === 0 ? (
                           <p className="p-8 text-center text-xs text-gray-400 font-bold">No hay facturas emitidas asociadas.</p>
                        ) : projectDocs.emitidas.map(v => (
                           <div key={v.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                              <div className="flex-1 pr-2 truncate">
                                 <div className="text-xs font-bold text-gray-700 truncate">Factura {v.serie}-{v.num_factura}</div>
                                 <div className="text-[10px] text-gray-400">{new Date(v.fecha).toLocaleDateString()}</div>
                              </div>
                              <div className="flex gap-1">
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
                     <div className="bg-white rounded-3xl border shadow-sm divide-y h-fit">
                        {projectDocs.recibidas.length === 0 ? (
                           <p className="p-8 text-center text-xs text-gray-400 font-bold">No hay gastos asociados registrados.</p>
                        ) : projectDocs.recibidas.map(c => (
                           <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                              <div className="flex-1 pr-2 overflow-hidden">
                                 <div className="text-xs font-bold text-gray-700 truncate">{c.proveedores?.nombre}</div>
                                 <div className="text-[10px] text-gray-400 truncate">Fact. {c.num_factura_proveedor}</div>
                              </div>
                              <div className="flex gap-1">
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
                        <button 
                           onClick={() => setIsUploadModalOpen(true)}
                           className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-all"
                        >
                           <Plus size={12} /> AÑADIR
                        </button>
                     </div>
                     <div className="bg-white rounded-3xl border shadow-sm divide-y border-orange-100 h-fit">
                        {projectDocs.otros.length === 0 ? (
                           <div className="p-8 text-center space-y-2">
                              <Files size={32} className="mx-auto text-orange-100" />
                              <p className="text-xs text-gray-400 font-bold text-balance">Planos, fotos iniciales, reportajes finales...</p>
                           </div>
                        ) : projectDocs.otros.map(doc => (
                           <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-orange-50/30 transition-colors">
                              <div className="flex-1 pr-2 overflow-hidden">
                                 <div className="text-xs font-bold text-gray-700 truncate" title={doc.nombre}>{doc.nombre}</div>
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
                    <h2 className="text-xl font-bold text-gray-700">Explorador de Proyectos</h2>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto text-balance">Busca un presupuesto para acceder a toda su documentación fiscal y técnica de forma centralizada.</p>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Modal para Subir Documento con Título */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold font-head">Importar Documentación</h3>
                  <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
               </div>

               <form onSubmit={handleUploadOther} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Título del Documento</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Planos Planta 1, Fotos Estado Inicial..."
                      value={newDocTitle}
                      onChange={e => setNewDocTitle(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border bg-gray-50 outline-none focus:ring-2 focus:ring-orange-500/10 font-bold text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Seleccionar Archivo</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        required
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden" 
                        id="doc-upload" 
                      />
                      <label 
                        htmlFor="doc-upload"
                        className={`w-full flex items-center justify-center gap-3 px-5 py-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${selectedFile ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/30'}`}
                      >
                        {selectedFile ? (
                          <div className="text-center">
                            <CheckCircle2 className="text-green-500 mx-auto mb-2" size={32} />
                            <span className="text-xs font-bold text-green-700 block truncate max-w-[200px]">{selectedFile.name}</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="text-gray-400 mx-auto mb-2" size={32} />
                            <span className="text-xs font-bold text-gray-500">Haz clic para buscar el archivo</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isUploading || !selectedFile}
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : <CloudUpload size={20} />}
                    {isUploading ? 'Subiendo Documento...' : 'Completar Importación'}
                  </button>
               </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CloudUpload({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

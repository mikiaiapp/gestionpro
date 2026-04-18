"use client";

import { useEffect, useState } from "react";
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
  Filter
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DocumentosPage() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const folders = [
    { id: "emitidas", name: "Facturas Emitidas", icon: FolderOpen, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "recibidas", name: "Facturas Recibidas", icon: FolderOpen, color: "text-red-500", bg: "bg-red-50" }
  ];

  useEffect(() => {
    if (currentPath) {
      fetchFiles();
    } else {
      setLoading(false);
    }
  }, [currentPath]);

  const fetchFiles = async () => {
    setLoading(true);
    setFiles([]);
    try {
      console.log("Fetching files for path:", currentPath);
      const { data, error } = await supabase.storage
        .from('facturas')
        .list(currentPath || undefined, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        console.error("Storage Error:", error);
        alert("Error al acceder al almacenamiento: " + error.message);
        throw error;
      }
      
      // Filtrar el marcador de posición de carpeta vacía de Supabase
      const realFiles = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');
      console.log("Found files:", realFiles.length);
      setFiles(realFiles);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = (fileName: string) => {
    const { data: { publicUrl } } = supabase.storage
      .from('facturas')
      .getPublicUrl(`${currentPath}/${fileName}`);
    return publicUrl;
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex bg-[var(--background)] min-h-screen text-left">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <div className="flex items-center gap-2 text-[var(--muted)] mb-1">
               <span className="hover:text-[var(--accent)] cursor-pointer font-bold uppercase text-[10px] tracking-widest" onClick={() => setCurrentPath("")}>Explorador</span>
               {currentPath && (
                 <>
                   <ChevronRight size={12} />
                   <span className="font-bold uppercase text-[10px] tracking-widest text-[var(--foreground)]">{currentPath}</span>
                 </>
               )}
            </div>
            <h1 className="text-3xl font-bold font-head tracking-tight text-[var(--foreground)]">Gestión Documental</h1>
            <p className="text-[var(--muted)] font-medium">Acceso centralizado a todos tus documentos oficiales y justificantes.</p>
          </div>
        </header>

        {!currentPath ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {folders.map(folder => (
                 <div 
                   key={folder.id} 
                   onClick={() => setCurrentPath(folder.id)}
                   className="group bg-white p-8 rounded-3xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                 >
                    <div className={`w-14 h-14 rounded-2xl ${folder.bg} ${folder.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                       <folder.icon size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--foreground)] mb-2 capitalize">{folder.name}</h3>
                    <p className="text-sm text-gray-400 font-medium">Explorar documentos almacenados en la carpeta de {folder.id}.</p>
                    <div className="mt-8 flex items-center gap-2 text-[var(--accent)] font-bold text-sm">
                       Acceder Carpeta <ChevronRight size={16} />
                    </div>
                 </div>
              ))}
           </div>
        ) : (
           <div className="bg-white rounded-3xl border shadow-sm min-h-[60vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentPath("")} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-[var(--foreground)] transition-all bg-white/50">
                       <ArrowLeft size={20} />
                    </button>
                    <div className="relative w-80">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                       <input 
                         type="text" 
                         placeholder="Buscar por nombre de archivo..." 
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] transition-all font-medium"
                       />
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={fetchFiles} className="p-2 hover:bg-white rounded-xl text-gray-400 transition-all">
                       <Loader2 className={loading ? "animate-spin" : ""} size={20} />
                    </button>
                 </div>
              </div>

              <div className="flex-1">
                 {loading ? (
                    <div className="flex flex-col items-center justify-center p-32 gap-4">
                       <Loader2 className="animate-spin text-[var(--accent)]" size={48} />
                       <p className="text-sm font-bold text-gray-400">Escaneando archivos...</p>
                    </div>
                 ) : filteredFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-32 text-center">
                       <Files size={64} className="text-gray-100 mb-4" />
                       <p className="text-gray-400 font-bold">No se encontraron archivos en esta ubicación.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
                       {filteredFiles.map(file => (
                          <div key={file.name} className="p-4 rounded-2xl border hover:border-[var(--accent)] hover:bg-[var(--background)] transition-all group flex flex-col justify-between min-h-[140px] relative overflow-hidden bg-white">
                             <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                                <FileText size={100} />
                             </div>
                             <div className="relative z-10 font-bold text-[13px] text-gray-700 break-words leading-tight pr-4">
                                {file.name}
                             </div>
                             <div className="relative z-10 flex justify-between items-end mt-4">
                                <span className="text-[9px] font-black text-gray-300 uppercase">
                                   {file.metadata ? (file.metadata.size / 1024 / 1024).toFixed(2) : '0.00'} MB
                                </span>
                                <div className="flex gap-2">
                                   <a 
                                     href={getPublicUrl(file.name)} 
                                     target="_blank" 
                                     className="p-2 bg-white rounded-lg border hover:shadow-md transition-all text-purple-500 hover:scale-110"
                                     title="Ver PDF"
                                   >
                                      <ExternalLink size={16} />
                                   </a>
                                   <a 
                                     href={getPublicUrl(file.name)} 
                                     download={file.name}
                                     className="p-2 bg-white rounded-lg border hover:shadow-md transition-all text-green-500 hover:scale-110"
                                     title="Descargar"
                                   >
                                      <Download size={16} />
                                   </a>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

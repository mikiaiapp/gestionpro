"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const AjustesClient = dynamic(() => import('./AjustesClient'), { 
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 flex-col gap-4 font-sans">
      <Loader2 className="animate-spin text-blue-600" size={48} />
      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Cargando Ajustes...</p>
    </div>
  )
});

export default function AjustesPage() {
  return <AjustesClient />;
}

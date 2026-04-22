"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        const isPublicPath = pathname === "/login" || pathname === "/signup" || pathname === "/";
        
        if (!session && !isPublicPath) {
          setAuthorized(false);
          router.replace("/login");
        } else if (session && isPublicPath && pathname !== "/") {
          setAuthorized(true);
          router.replace("/resumen");
        } else {
          setAuthorized(true);
        }
      } catch (error) {
        console.error("Auth Error:", error);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Escuchar cambios de estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAuthorized(false);
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  const isPublicPath = pathname === "/login" || pathname === "/signup" || pathname === "/";

  // Si está cargando o no está autorizado, no mostramos nada para evitar saltos
  // (El router.replace se encargará de llevarnos al login)
  if (loading && !isPublicPath) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white flex-col gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Iniciando Seguridad...</p>
      </div>
    );
  }

  if (!authorized && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}

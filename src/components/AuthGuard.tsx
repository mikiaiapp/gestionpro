"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  async function checkAuth() {
    try {
      setLoading(true);
      
      // Intentamos obtener la sesión de forma segura
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("AuthGuard: Error al obtener sesión:", sessionError);
        // Si hay error, por seguridad asumimos que no hay sesión
        const isPublicPath = pathname === "/login" || pathname === "/signup" || pathname === "/";
        if (!isPublicPath) {
          router.replace("/login");
        }
        return;
      }

      const isPublicPath = pathname === "/login" || pathname === "/signup" || pathname === "/";

      if (!session && !isPublicPath) {
        setAuthorized(false);
        router.replace("/login");
      } else if (session && isPublicPath && pathname !== "/") {
        setAuthorized(true);
        router.replace("/resumen");
      } else {
        setAuthorized(true);
        if (session) {
          try {
            const { runAutoBackup } = await import("@/lib/backup");
            runAutoBackup();
          } catch (e) {
            console.error("Backup error:", e);
          }
        }
      }
    } catch (error) {
      console.error("AuthGuard: Error crítico:", error);
      // Fallback de seguridad
      router.replace("/login");
    } finally {
      // Pequeño delay para evitar parpadeos si la redirección es inminente
      setTimeout(() => setLoading(false), 500);
    }
  }

  const isPublicPath = pathname === "/login" || pathname === "/signup" || pathname === "/";

  // Mientras carga o si no está autorizado en ruta protegida, mostrar loader
  if (loading || (!authorized && !isPublicPath)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white flex-col gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-gray-800 uppercase tracking-[0.2em] mb-1">Verificando Seguridad</p>
          <p className="text-xs text-gray-400 font-medium">GestiónPro está protegiendo tus datos...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

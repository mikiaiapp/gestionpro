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
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    const isPublicPath = pathname === "/login" || pathname === "/signup" || pathname === "/";

    if (!session && !isPublicPath) {
      setAuthorized(false);
      router.push("/login");
    } else if (session && isPublicPath && pathname !== "/") {
      setAuthorized(true);
      router.push("/resumen");
    } else {
      setAuthorized(true);
    }
    setLoading(false);
  }

  if (loading && pathname !== "/login" && pathname !== "/signup") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 flex-col gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Verificando Seguridad...</p>
      </div>
    );
  }

  // Si es una ruta pública o está autorizado, renderizar
  const isPublicPath = pathname === "/login" || pathname === "/signup" || pathname === "/";
  if (authorized || isPublicPath) {
    return <>{children}</>;
  }

  return null;
}

"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas o usuario no encontrado.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold font-head tracking-tight text-[var(--foreground)] mb-2">GestiónPro</h1>
          <p className="text-[var(--muted)] font-medium">Acceso seguro a tu gestión</p>
        </div>

        <div className="glass-card p-8 bg-white shadow-xl border-[var(--border)]">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Email Profesional</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 pl-11 pr-4 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Contraseña</label>
                <button type="button" className="text-xs text-[var(--accent)] hover:underline">Recuperar clave</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-3 pl-11 pr-4 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Validando acceso..." : "Entrar en GestiónPro"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--muted)] uppercase tracking-widest font-bold">
               Cifrado de grado bancario activo
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

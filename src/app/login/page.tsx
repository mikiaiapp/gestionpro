"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, LogIn, Loader2, LayoutDashboard } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [show2FA, setShow2FA] = useState(false);
  const [pin, setPin] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage("❌ Error: " + error.message);
      setLoading(false);
    } else if (data.user) {
      // Verificar si tiene 2FA activado
      const { data: profile } = await supabase.from('perfiles').select('two_factor_enabled, two_factor_pin').eq('id', data.user.id).single();
      
      if (profile?.two_factor_enabled) {
        setTempUser({ id: data.user.id, pin: profile.two_factor_pin });
        setShow2FA(true);
        setLoading(false);
      } else {
        window.location.href = '/resumen';
      }
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === tempUser.pin) {
      window.location.href = '/resumen';
    } else {
      setMessage("❌ PIN de seguridad incorrecto.");
    }
  };

  if (show2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 font-sans">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-2xl border text-center">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-orange-600" size={36} />
          </div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Verificación 2FA</h2>
          <p className="text-gray-500 mt-2">Introduce tu código de seguridad de 6 dígitos.</p>
          
          <form onSubmit={handleVerify2FA} className="space-y-6 mt-8">
            <input 
              type="text" 
              maxLength={6}
              required 
              value={pin} 
              onChange={e => setPin(e.target.value)}
              className="w-full text-center text-4xl tracking-[1em] py-4 rounded-2xl border bg-gray-50 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-mono"
              placeholder="000000"
              autoFocus
            />
            
            <button 
              type="submit" 
              className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
            >
              Verificar y Entrar
            </button>
            
            <button 
              type="button"
              onClick={() => { setShow2FA(false); supabase.auth.signOut(); }}
              className="text-sm text-gray-400 font-bold hover:text-gray-600"
            >
              Cancelar Acceso
            </button>
          </form>

          {message && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium">
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 font-sans">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-2xl border">
        <div className="text-center">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard className="text-blue-600" size={36} />
          </div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Bienvenido</h2>
          <p className="text-gray-500 mt-2">Accede a tu panel de GestiónPro.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-gray-400" size={18} />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-gray-50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-gray-400" size={18} />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-gray-50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
            Entrar
          </button>
        </form>

        {message && (
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium">
            {message}
          </div>
        )}

        <p className="text-center text-sm text-gray-500">
          ¿No tienes cuenta? <a href="/signup" className="font-bold text-blue-600 hover:underline">Regístrate ahora</a>
        </p>
      </div>
    </div>
  );
}

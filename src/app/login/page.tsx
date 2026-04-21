"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, LogIn, Loader2, LayoutDashboard, Smartphone, User, CheckCircle2 } from 'lucide-react';
import { authenticator } from 'otplib';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const [show2FA, setShow2FA] = useState(false);
  const [token, setToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setSuccess(false);

    if (isRegister) {
      // PROCESO DE REGISTRO
      if (!nombre.trim()) {
        setMessage("❌ El nombre es obligatorio.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nombre }
        }
      });

      if (error) {
        setMessage("❌ Error al registrar: " + error.message);
      } else if (data.user) {
        // Intentar crear el perfil manualmente por si el trigger no existe
        const { error: pError } = await supabase.from('perfiles').insert({
          id: data.user.id,
          nombre: nombre,
          email: email,
          rol: 'Usuario'
        });

        setSuccess(true);
        setMessage("✅ ¡Cuenta creada! Por favor, verifica tu email para activar el acceso.");
        // Opcional: setIsRegister(false);
      }
      setLoading(false);
    } else {
      // PROCESO DE LOGIN
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setMessage("❌ Error: " + error.message);
        setLoading(false);
      } else if (data.user) {
        // Verificar si tiene 2FA activado
        const { data: profile } = await supabase.from('perfiles').select('two_factor_enabled, two_factor_secret').eq('id', data.user.id).single();
        
        if (profile?.two_factor_enabled && profile?.two_factor_secret) {
          setTempUser({ id: data.user.id, secret: profile.two_factor_secret });
          setShow2FA(true);
          setLoading(false);
        } else {
          window.location.href = '/resumen';
        }
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    if (!email) {
      setMessage("❌ Por favor, introduce tu email.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?mode=reset`,
    });

    if (error) {
      setMessage("❌ Error: " + error.message);
    } else {
      setSuccess(true);
      setMessage("✅ Email de recuperación enviado. Revisa tu bandeja de entrada.");
    }
    setLoading(false);
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isValid = authenticator.check(token, tempUser.secret);
      if (isValid) {
        window.location.href = '/resumen';
      } else {
        setMessage("❌ Código de verificación incorrecto o expirado.");
      }
    } catch (err) {
      setMessage("❌ Error al verificar el código.");
    }
  };

  if (show2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 font-sans">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[40px] shadow-2xl border text-center">
          <div className="bg-orange-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 relative overflow-hidden">
             <div className="absolute inset-0 bg-orange-100 opacity-20 animate-pulse"></div>
            <Smartphone className="text-orange-600 relative z-10" size={48} />
          </div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Verificación en dos pasos</h2>
          <p className="text-gray-500 mt-2 text-balance leading-relaxed">Abre tu app de Authenticator e introduce el código de 6 dígitos.</p>
          
          <form onSubmit={handleVerify2FA} className="space-y-6 mt-8">
            <input 
              type="text" 
              maxLength={6}
              required 
              value={token} 
              onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-4xl tracking-[0.5em] py-5 rounded-3xl border bg-gray-50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-mono font-black"
              placeholder="000 000"
              autoFocus
            />
            
            <button 
              type="submit" 
              className="w-full py-5 bg-orange-600 text-white font-black rounded-3xl shadow-xl shadow-orange-200 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 transform active:scale-95"
            >
              Comprobar y Acceder
            </button>
            
            <button 
              type="button"
              onClick={() => { setShow2FA(false); supabase.auth.signOut(); }}
              className="text-xs text-gray-400 font-bold hover:text-gray-600 transition-colors"
            >
              ← Volver al Login
            </button>
          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-2xl text-xs font-bold leading-relaxed ${success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 font-sans relative overflow-hidden">
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-100 rounded-full blur-[120px] opacity-40"></div>
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-100 rounded-full blur-[120px] opacity-40"></div>

      <div className="w-full max-w-md space-y-8 bg-white p-12 rounded-[48px] shadow-2xl border relative z-10">
        <div className="text-center">
          <div className="bg-blue-50 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-6 transform rotate-6 hover:rotate-0 transition-transform duration-500">
            <LayoutDashboard className="text-blue-600" size={40} />
          </div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tighter">GestionPro</h2>
          <p className="text-gray-400 mt-2 font-medium">{isRegister ? 'Crea tu nueva cuenta' : 'Panel de Control Inteligente'}</p>
        </div>

        {success ? (
          <div className="text-center space-y-6 py-4">
             <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="text-green-500" size={40} />
             </div>
             <p className="text-gray-600 font-medium leading-relaxed">{message}</p>
             <button 
               onClick={() => { setIsRegister(false); setSuccess(false); setMessage(''); }}
               className="text-blue-600 font-bold hover:underline"
             >
               Ir a Iniciar Sesión
             </button>
          </div>
        ) : !isForgot ? (
          <form onSubmit={handleAuth} className="space-y-6">
            {isRegister && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Nombre Completo</label>
                <div className="relative group">
                  <User className="absolute left-5 top-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    type="text" 
                    required 
                    value={nombre} 
                    onChange={e => setNombre(e.target.value)}
                    className="w-full pl-14 pr-4 py-5 rounded-3xl border bg-gray-50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                    placeholder="Juan Pérez"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Email Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-14 pr-4 py-5 rounded-3xl border bg-gray-50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                  placeholder="ejemplo@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Clave de Seguridad</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-14 pr-4 py-5 rounded-3xl border bg-gray-50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-gray-900 text-white font-black rounded-3xl shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : (isRegister ? <CheckCircle2 size={20} /> : <LogIn size={20} />)}
              {isRegister ? 'Crear mi Cuenta' : 'Entrar al Sistema'}
            </button>

            <div className="flex justify-between items-center pt-2">
              <button 
                type="button"
                onClick={() => { setIsForgot(true); setIsRegister(false); setMessage(''); }}
                className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors"
              >
                ¿Has olvidado tu contraseña?
              </button>
              <button 
                type="button"
                onClick={() => { setIsRegister(!isRegister); setIsForgot(false); setMessage(''); }}
                className="text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors"
              >
                {isRegister ? '¿Ya tienes cuenta? Login' : '¿No tienes cuenta? Registro'}
              </button>
            </div>
          </form>
        ) : !success && (
          <form onSubmit={handleForgotPassword} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h3 className="text-xl font-bold text-gray-800 text-center">Recuperar Acceso</h3>
            <p className="text-xs text-gray-400 text-center text-balance">Te enviaremos un enlace seguro para restablecer tu clave.</p>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Email de tu cuenta</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-14 pr-4 py-5 rounded-3xl border bg-gray-50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                  placeholder="ejemplo@empresa.com"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Mail size={20} />}
              Enviar Email de Recuperación
            </button>

            <div className="text-center">
              <button 
                type="button"
                onClick={() => { setIsForgot(false); setMessage(''); }}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Volver al Inicio
              </button>
            </div>
          </form>
        )}

        {message && !success && (
          <div className="p-4 bg-red-50 text-red-700 rounded-3xl text-xs font-bold text-center leading-relaxed">
            {message}
          </div>
        )}

        <div className="pt-6 text-center border-t border-dashed">
           <p className="text-xs text-gray-400">
             ¿Necesitas ayuda? <a href="#" className="font-bold text-blue-600 hover:underline">Soporte Técnico</a>
           </p>
        </div>
      </div>
    </div>
  );
}



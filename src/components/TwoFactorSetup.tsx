"use client";

import { useState, useEffect } from "react";
import { QrCode, KeyRound } from "lucide-react";
import dynamic from "next/dynamic";

// Usamos QRCodeSVG en lugar de Canvas para máxima compatibilidad y estabilidad
const QRCodeSVG = dynamic(() => import("qrcode.react").then(m => m.QRCodeSVG), { 
  ssr: false,
  loading: () => <div className="w-[180px] h-[180px] bg-gray-50 animate-pulse rounded-2xl flex items-center justify-center text-[10px] text-gray-400">Generando QR...</div>
});

interface Props {
  qrUrl: string;
  verifyToken: string;
  setVerifyToken: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TwoFactorSetup({ qrUrl, verifyToken, setVerifyToken, onConfirm, onCancel }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-500 space-y-6 text-center relative z-20">
      <div className="space-y-2">
        <h4 className="text-lg font-black text-gray-800 flex items-center justify-center gap-2 font-head">
          <QrCode size={20} className="text-orange-500" /> Paso 1: Escanea el QR
        </h4>
        <p className="text-xs text-gray-400 font-sans">Abre Google Authenticator y escanea este código.</p>
      </div>

      <div className="flex justify-center p-6 bg-white rounded-[32px] border shadow-inner">
        {qrUrl && <QRCodeSVG value={qrUrl} size={180} level="H" includeMargin={true} />}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-gray-700 flex items-center justify-center gap-2 font-head">
            <KeyRound size={18} className="text-orange-500" /> Paso 2: Código de verificación
          </h4>
          <p className="text-[10px] text-gray-400 font-sans">Escribe los 6 dígitos que aparecen en tu app.</p>
        </div>
        
        <div className="relative max-w-[220px] mx-auto">
          <input
            type="text"
            inputMode="numeric"
            value={verifyToken}
            onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full px-5 py-5 rounded-2xl border-2 border-gray-100 bg-gray-50 text-center text-3xl font-mono tracking-[0.4em] focus:border-orange-500 focus:ring-0 outline-none transition-all placeholder:text-gray-200"
            placeholder="000000"
            autoFocus
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all font-sans text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all font-sans text-sm transform active:scale-95"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

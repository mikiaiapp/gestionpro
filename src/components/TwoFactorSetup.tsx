"use client";

import { useState, useEffect } from "react";
import { QrCode, KeyRound, Loader2 } from "lucide-react";
import { authenticator } from "otplib";
import dynamic from "next/dynamic";

const QRCodeCanvas = dynamic(() => import("qrcode.react").then(m => m.QRCodeCanvas), { 
  ssr: false,
  loading: () => <div className="w-[180px] h-[180px] bg-gray-50 animate-pulse rounded-2xl" />
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
    <div className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-xl animate-in zoom-in-95 duration-300 space-y-6 text-center">
      <div className="space-y-2">
        <h4 className="text-lg font-black text-gray-800 flex items-center justify-center gap-2">
          <QrCode size={20} className="text-orange-500" /> Paso 1: Escanea el QR
        </h4>
        <p className="text-xs text-gray-400 font-sans">Abre Google Authenticator y escanea este código.</p>
      </div>

      <div className="flex justify-center p-4 bg-white rounded-3xl border shadow-inner">
        <QRCodeCanvas value={qrUrl} size={180} level="H" />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-gray-700 flex items-center justify-center gap-2">
            <KeyRound size={18} className="text-orange-500" /> Paso 2: Introduce el código
          </h4>
          <p className="text-[10px] text-gray-400 font-sans">Escribe el código de 6 dígitos de tu móvil.</p>
        </div>
        <input
          type="text"
          value={verifyToken}
          onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ""))}
          className="w-full max-w-[200px] mx-auto block px-5 py-4 rounded-xl border bg-gray-50 text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-orange-500/10 outline-none"
          placeholder="000000"
          maxLength={6}
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all font-sans"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg hover:bg-orange-700 transition-all font-sans"
          >
            Activar
          </button>
        </div>
      </div>
    </div>
  );
}

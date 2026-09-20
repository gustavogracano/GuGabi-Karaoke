"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, QrCode } from "lucide-react";

interface DynamicQRCodeProps {
  compact?: boolean;
}

export function DynamicQRCode({ compact = false }: DynamicQRCodeProps) {
  const [url, setUrl] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setUrl(`${origin}/controle`);
    }
  }, []);

  if (!mounted || !url) {
    return (
      <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-center animate-pulse flex items-center gap-2">
        <QrCode className="w-4 h-4 text-cyan-400" />
        <p className="text-xs text-slate-400">Carregando QR...</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="p-1 bg-white rounded-xl shadow shrink-0">
          <QRCodeSVG
            value={url}
            size={46}
            level="M"
            bgColor="#ffffff"
            fgColor="#050510"
          />
        </div>

        <div className="text-left flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-1 text-cyan-300 font-black text-[11px] uppercase tracking-wider">
            <Smartphone className="w-3 h-3 text-pink-400 shrink-0" />
            <span>Peça no celular:</span>
          </div>
          <p className="text-xs text-white font-mono font-bold mt-0.5">
            /controle
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-2xl p-3 rounded-2xl border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.2)] flex items-center gap-3 transition-all hover:scale-105">
      {/* Container do QR Code em tamanho TV para leitura de longe */}
      <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
        <QRCodeSVG
          value={url}
          size={76}
          level="M"
          bgColor="#ffffff"
          fgColor="#050510"
        />
      </div>

      <div className="text-left flex flex-col justify-center max-w-[190px]">
        <div className="flex items-center gap-1 text-cyan-300 font-black text-xs uppercase tracking-wider">
          <Smartphone className="w-3.5 h-3.5 text-pink-400 shrink-0" />
          <span>No Celular</span>
        </div>
        <h4 className="text-xs font-black text-white mt-0.5 leading-snug">
          Peça músicas e vote!
        </h4>
        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
          Sem baixar app • <span className="text-cyan-400 font-bold">/controle</span>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { soundManager } from "@/lib/sound-manager";

interface TomatoSplatterProps {
  active: boolean;
  onFinished: () => void;
}

export function TomatoSplatter({ active, onFinished }: TomatoSplatterProps) {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (active) {
      soundManager.play("splash");
      const trompeteTimer = setTimeout(() => {
        soundManager.play("trompete_triste");
      }, 400);
      setShaking(true);

      const shakeTimer = setTimeout(() => setShaking(false), 600);
      const endTimer = setTimeout(() => {
        onFinished();
      }, 3800);

      return () => {
        clearTimeout(trompeteTimer);
        clearTimeout(shakeTimer);
        clearTimeout(endTimer);
      };
    }
  }, [active, onFinished]);

  if (!active) return null;

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-none flex items-center justify-center animate-splat-fade overflow-hidden ${
        shaking ? "animate-[bounce_0.2s_ease-in-out_infinite]" : ""
      }`}
    >
      {/* Overlay avermelhado translúcido de impacto suave */}
      <div className="absolute inset-0 bg-red-950/25 backdrop-blur-[2px]" />

      {/* Respingos de Tomate Estratégicos */}
      <div className="absolute top-[10%] left-[15%] w-36 h-36 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-900 opacity-95 blur-[1px] transform rotate-12 scale-125 shadow-[0_0_50px_rgba(220,38,38,0.9)]" />
      <div className="absolute bottom-[20%] left-[10%] w-52 h-48 rounded-full bg-gradient-to-tr from-red-600 to-red-950 opacity-90 blur-[1px] transform -rotate-45 shadow-[0_0_60px_rgba(220,38,38,0.8)]" />
      <div className="absolute top-[18%] right-[12%] w-44 h-40 rounded-full bg-gradient-to-bl from-red-500 via-red-600 to-red-900 opacity-95 blur-[1px] transform rotate-45 shadow-[0_0_50px_rgba(220,38,38,0.9)]" />
      <div className="absolute bottom-[15%] right-[20%] w-60 h-52 rounded-full bg-gradient-to-tl from-red-600 to-red-950 opacity-95 blur-[2px]" />

      {/* Escorridos Realistas de Molho */}
      <div className="absolute top-[18%] left-[22%] w-4 h-64 bg-gradient-to-b from-red-600 via-red-700 to-transparent rounded-full opacity-90 animate-pulse" />
      <div className="absolute top-[22%] right-[18%] w-5 h-80 bg-gradient-to-b from-red-600 via-red-800 to-transparent rounded-full opacity-90 animate-pulse" />
      <div className="absolute top-[35%] left-[48%] w-6 h-72 bg-gradient-to-b from-red-700 via-red-800 to-transparent rounded-full opacity-85" />
      <div className="absolute top-[28%] left-[75%] w-3.5 h-60 bg-gradient-to-b from-red-600 via-red-800 to-transparent rounded-full opacity-80" />

      {/* Tomate Central Esmagado com Efeito Sonoro */}
      <div className="relative flex flex-col items-center justify-center p-8 text-center select-none z-10">
        <div className="relative">
          <div className="text-9xl md:text-[15rem] transform scale-125 drop-shadow-[0_20px_40px_rgba(180,0,0,1)] animate-bounce">
            🍅
          </div>
          <div className="absolute inset-0 bg-red-600/40 rounded-full filter blur-3xl -z-10" />
        </div>

        <div className="mt-6 px-10 py-4 bg-gradient-to-r from-red-700 via-red-600 to-red-800 border-4 border-white/90 rounded-3xl shadow-[0_0_60px_rgba(255,0,0,1)] transform -rotate-2">
          <h2 className="text-4xl md:text-7xl font-black text-white tracking-widest uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
            💥 TOMATAÇO GERAL! 💥
          </h2>
          <p className="text-xl md:text-3xl font-black text-yellow-300 drop-shadow mt-1">
            A plateia não perdoou! Alguém desliga esse microfone! 😂🍅
          </p>
        </div>
      </div>
    </div>
  );
}

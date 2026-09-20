"use client";

import { useEffect, useState, useRef } from "react";
import { soundManager } from "@/lib/sound-manager";

interface TomatoSplatterProps {
  active: boolean;
  onFinished: () => void;
  attackerName?: string | null;
  isSoloAttack?: boolean;
}

export function TomatoSplatter({ active, onFinished, attackerName, isSoloAttack }: TomatoSplatterProps) {
  const [shaking, setShaking] = useState(false);
  const hasTriggeredAudioRef = useRef(false);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (active) {
      if (!hasTriggeredAudioRef.current) {
        hasTriggeredAudioRef.current = true;
        soundManager.play("splash");
        const trompeteTimer = setTimeout(() => {
          soundManager.play("trompete_triste");
        }, 550);

        setShaking(true);
        const shakeTimer = setTimeout(() => setShaking(false), 700);

        const endTimer = setTimeout(() => {
          onFinishedRef.current();
        }, 5000);

        return () => {
          clearTimeout(trompeteTimer);
          clearTimeout(shakeTimer);
          clearTimeout(endTimer);
        };
      }
    } else {
      hasTriggeredAudioRef.current = false;
      setShaking(false);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-none flex items-center justify-center animate-splat-fade overflow-hidden ${
        shaking ? "animate-[bounce_0.15s_ease-in-out_infinite]" : ""
      }`}
    >
      {/* Overlay avermelhado translúcido de impacto suave */}
      <div className="absolute inset-0 bg-red-950/30 backdrop-blur-[3px]" />

      {/* Respingos Grandes Orgânicos (Manchas com bordas realistas) */}
      <div className="absolute top-[8%] left-[12%] w-44 h-44 rounded-[42%_58%_70%_30%/45%_45%_55%_55%] bg-gradient-to-br from-red-500 via-red-600 to-red-950 opacity-95 blur-[0.5px] transform rotate-12 scale-125 shadow-[0_0_60px_rgba(239,68,68,0.9)]" />
      <div className="absolute bottom-[16%] left-[8%] w-56 h-52 rounded-[58%_42%_35%_65%/60%_50%_50%_40%] bg-gradient-to-tr from-red-600 via-red-700 to-red-950 opacity-95 blur-[0.5px] transform -rotate-45 shadow-[0_0_70px_rgba(220,38,38,0.85)]" />
      <div className="absolute top-[14%] right-[10%] w-48 h-44 rounded-[65%_35%_50%_50%/40%_60%_40%_60%] bg-gradient-to-bl from-red-500 via-red-600 to-red-900 opacity-95 blur-[0.5px] transform rotate-45 shadow-[0_0_60px_rgba(239,68,68,0.9)]" />
      <div className="absolute bottom-[12%] right-[16%] w-64 h-56 rounded-[50%_50%_60%_40%/55%_45%_55%_45%] bg-gradient-to-tl from-red-600 via-red-800 to-red-950 opacity-95 blur-[1px]" />

      {/* Gotas Menores Espalhadas (Efeito de Impacto Radial) */}
      <div className="absolute top-[25%] left-[32%] w-10 h-10 rounded-full bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.8)] opacity-90" />
      <div className="absolute top-[20%] right-[30%] w-8 h-8 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] opacity-90" />
      <div className="absolute bottom-[28%] left-[28%] w-12 h-12 rounded-full bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.8)] opacity-90" />
      <div className="absolute bottom-[22%] right-[32%] w-9 h-9 rounded-full bg-red-600 shadow-[0_0_18px_rgba(239,68,68,0.8)] opacity-90" />
      <div className="absolute top-[42%] left-[10%] w-7 h-7 rounded-full bg-red-600 opacity-85" />
      <div className="absolute top-[48%] right-[8%] w-8 h-8 rounded-full bg-red-600 opacity-85" />

      {/* Escorridos Realistas de Molho com Gotas na Ponta */}
      <div className="absolute top-[16%] left-[22%] w-4 h-72 bg-gradient-to-b from-red-600 via-red-700 to-red-900 rounded-full opacity-90 shadow-md">
        <div className="absolute -bottom-2 -left-1 w-6 h-6 bg-red-700 rounded-full" />
      </div>
      <div className="absolute top-[20%] right-[18%] w-5 h-88 bg-gradient-to-b from-red-600 via-red-800 to-red-950 rounded-full opacity-90 shadow-md">
        <div className="absolute -bottom-2.5 -left-1 w-7 h-7 bg-red-800 rounded-full" />
      </div>
      <div className="absolute top-[32%] left-[46%] w-5 h-72 bg-gradient-to-b from-red-700 via-red-800 to-transparent rounded-full opacity-85" />
      <div className="absolute top-[25%] left-[78%] w-3.5 h-64 bg-gradient-to-b from-red-600 via-red-800 to-transparent rounded-full opacity-80" />

      {/* Tomate Central Esmagado com Efeito Sonoro */}
      <div className="relative flex flex-col items-center justify-center p-8 text-center select-none z-10">
        <div className="relative">
          <div className="text-9xl md:text-[16rem] transform scale-125 drop-shadow-[0_25px_50px_rgba(180,0,0,1)] animate-bounce select-none">
            🍅
          </div>
          <div className="absolute inset-0 bg-red-600/50 rounded-full filter blur-3xl -z-10" />
        </div>

        <div className="mt-4 px-8 sm:px-10 py-4 bg-gradient-to-r from-red-700 via-red-600 to-red-800 border-4 border-white/95 rounded-3xl shadow-[0_0_80px_rgba(255,0,0,1)] transform -rotate-2 max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-widest uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] leading-tight">
            {isSoloAttack && attackerName
              ? `🎯 TOMATADA DE ${attackerName.toUpperCase()}!`
              : "💥 TOMATAÇO GERAL DA GALERA! 💥"}
          </h2>
          <p className="text-lg sm:text-2xl md:text-3xl font-black text-yellow-300 drop-shadow mt-1.5 leading-snug">
            {isSoloAttack && attackerName
              ? `Hater alert! ${attackerName} pegou ranço e jogou tomate sozinho na TV! 🤣🍅`
              : "Consenso unânime da plateia: alguém desliga esse microfone! 😂🍅"}
          </p>
        </div>
      </div>
    </div>
  );
}

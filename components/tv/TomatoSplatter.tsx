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
        }, 3200);

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
      className={`fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-start pt-8 sm:pt-12 animate-splat-fade overflow-hidden ${
        shaking ? "animate-[bounce_0.15s_ease-in-out_infinite]" : ""
      }`}
    >
      {/* Respingos sutis e elegantes nos cantos superiores sem cobrir as letras centrais */}
      <div className="absolute top-2 left-4 w-24 h-24 rounded-full bg-red-600/60 blur-[1px] opacity-75" />
      <div className="absolute top-4 right-6 w-20 h-20 rounded-full bg-red-600/60 blur-[1px] opacity-75" />
      <div className="absolute top-12 left-1/4 w-8 h-8 rounded-full bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)] opacity-90" />
      <div className="absolute top-10 right-1/4 w-7 h-7 rounded-full bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)] opacity-90" />

      {/* Banner Superior Elegante e Compacto (Não tampa a letra da música no meio/baixo da TV) */}
      <div className="relative flex items-center gap-4 px-6 py-3 bg-gradient-to-r from-red-950/90 via-red-800/95 to-red-950/90 border-2 border-red-400/80 rounded-2xl shadow-[0_10px_40px_rgba(220,38,38,0.6)] backdrop-blur-md max-w-2xl mx-4 transform animate-in fade-in zoom-in-95 duration-300">
        <div className="text-4xl sm:text-5xl animate-bounce flex-shrink-0">
          🍅
        </div>
        <div className="text-left">
          <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide uppercase drop-shadow">
            {isSoloAttack && attackerName
              ? `🎯 TOMATADA DE ${attackerName.toUpperCase()}!`
              : "💥 TOMATAÇO DA GALERA! (3+ VOTOS) 💥"}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-yellow-300 drop-shadow">
            {isSoloAttack && attackerName
              ? `${attackerName} jogou tomate na performance! 🤣🍅`
              : "A plateia se uniu e mandou tomataço coletivo no palco! 😂🍅"}
          </p>
        </div>
        <div className="text-4xl sm:text-5xl animate-bounce flex-shrink-0">
          🍅
        </div>
      </div>
    </div>
  );
}
